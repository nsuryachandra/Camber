import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Car,
  Building2,
  Phone,
  CheckCircle2,
  AlertTriangle,
  FileText,
  XCircle,
  ArrowRight,
  Printer,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import useFetch from '../../hooks/useFetch';
import api from '../../services/api';
import Modal from '../../components/Modal';
import PaymentSimulatorModal from '../../components/PaymentSimulatorModal';
import { Loading, Empty, ErrorState } from '../../components/DataState';
import { formatCurrency, formatDate, statusClass } from '../../utils/format';
import { useToast } from '../../context/ToastContext';

export default function MyRentals() {
  const toast = useToast();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useFetch('/customer/rentals');

  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'PENDING' | 'BOOKED' | 'ACTIVE' | 'COMPLETED'
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [cancelModalRental, setCancelModalRental] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [simulatorRental, setSimulatorRental] = useState(null);

  const rentals = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);

  const filteredRentals = rentals.filter((r) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'PENDING') return r.status === 'PENDING';
    if (activeTab === 'BOOKED') return r.status === 'BOOKED';
    if (activeTab === 'ACTIVE') return r.status === 'ACTIVE';
    if (activeTab === 'COMPLETED') return r.status === 'COMPLETED' || r.status === 'CANCELLED';
    return true;
  });

  const handleCancel = async () => {
    if (!cancelModalRental) return;
    setCancelling(true);
    try {
      await api.post(`/customer/rentals/${cancelModalRental.rental_id}/cancel`);
      toast.success(`Booking #${cancelModalRental.rental_id} has been cancelled.`);
      setCancelModalRental(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel booking.');
    } finally {
      setCancelling(false);
    }
  };

  const printReceipt = () => {
    window.print();
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">My Bookings &amp; Rental Trips</h1>
          <p className="page-subtitle">
            Track your ongoing journeys, review upcoming vehicle reservations, and download invoices.
          </p>
        </div>
        <Link to="/" className="btn btn-primary">
          <Car size={15} /> Browse Fleet Showroom
        </Link>
      </div>

      {/* Segmented Tab Filter */}
      <div className="segmented-control" style={{ marginBottom: 24, maxWidth: 640 }}>
        <button
          className={`pill-tab ${activeTab === 'ALL' ? 'active' : ''}`}
          onClick={() => setActiveTab('ALL')}
        >
          All ({rentals.length})
        </button>
        <button
          className={`pill-tab ${activeTab === 'PENDING' ? 'active' : ''}`}
          onClick={() => setActiveTab('PENDING')}
        >
          Pending Review ({rentals.filter((r) => r.status === 'PENDING').length})
        </button>
        <button
          className={`pill-tab ${activeTab === 'BOOKED' ? 'active' : ''}`}
          onClick={() => setActiveTab('BOOKED')}
        >
          Confirmed ({rentals.filter((r) => r.status === 'BOOKED').length})
        </button>
        <button
          className={`pill-tab ${activeTab === 'ACTIVE' ? 'active' : ''}`}
          onClick={() => setActiveTab('ACTIVE')}
        >
          Active Trips ({rentals.filter((r) => r.status === 'ACTIVE').length})
        </button>
        <button
          className={`pill-tab ${activeTab === 'COMPLETED' ? 'active' : ''}`}
          onClick={() => setActiveTab('COMPLETED')}
        >
          Past / Completed
        </button>
      </div>

      {/* Content */}
      {loading && <Loading text="Loading your trips..." />}
      {error && <ErrorState message={`Failed to load your rentals: ${error}`} onRetry={refetch} />}

      {!loading && !error && filteredRentals.length === 0 && (
        <Empty message="No bookings found in this view.">
          <Link to="/" className="btn btn-primary" style={{ marginTop: 14 }}>
            Explore Fleet &amp; Book Your First Car
          </Link>
        </Empty>
      )}

      {!loading && !error && filteredRentals.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredRentals.map((r) => {
            const isPaid = Number(r.paid_amount || 0) >= Number(r.final_amount || 0);
            return (
              <div
                key={r.rental_id}
                className="card animate-fade-in"
                style={{
                  padding: 20,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: 20,
                  alignItems: 'center',
                }}
              >
                {/* Vehicle & Ref Info */}
                <div style={{ display: 'flex', gap: 14 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: 'var(--primary-subtle)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Car size={24} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                        {r.brand} {r.model}
                      </span>
                      <span className={`badge ${statusClass(r.status)}`}>
                        <span className="badge-dot" /> {r.status === 'PENDING' ? 'Pending Staff Approval' : r.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                      Ref #{String(r.rental_id).padStart(4, '0')} • Reg: {r.registration_number}
                    </div>
                    <div style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
                      <span>{r.type_name}</span>
                      <span>•</span>
                      <span>{r.transmission}</span>
                      <span>•</span>
                      <span>{r.fuel_type}</span>
                    </div>
                  </div>
                </div>

                {/* Date & Schedule */}
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Calendar size={14} style={{ color: 'var(--primary)' }} />
                    <span>
                      Pickup: <strong>{formatDate(r.pickup_date)}</strong>
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Clock size={14} style={{ color: 'var(--emerald)' }} />
                    <span>
                      Return: <strong>{formatDate(r.expected_return_date)}</strong> ({r.rental_days} Days)
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                    <Building2 size={13} />
                    <span>{r.branch_name} ({r.city})</span>
                  </div>
                </div>

                {/* Financial Summary & Actions */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    gap: 10,
                  }}
                >
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
                      {formatCurrency(r.final_amount)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginTop: 2 }}>
                      <span
                        className={`badge ${isPaid ? 'badge-available' : 'badge-pending'}`}
                        style={{ fontSize: 10 }}
                      >
                        {isPaid ? 'Payment Cleared' : 'Payment Due at Desk'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {!isPaid && r.status !== 'CANCELLED' && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => setSimulatorRental(r)}
                        style={{
                          background: 'linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)',
                          boxShadow: '0 2px 8px rgba(79, 70, 229, 0.35)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                        title="Simulate instant digital settlement"
                      >
                        <Zap size={13} /> Settle Dues
                      </button>
                    )}
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setSelectedReceipt(r)}
                      title="View digital invoice"
                    >
                      <FileText size={13} /> Invoice
                    </button>
                    {(r.status === 'BOOKED' || r.status === 'PENDING') && (
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => setCancelModalRental(r)}
                        style={{ color: 'var(--rose)' }}
                        title="Cancel reservation"
                      >
                        <XCircle size={13} /> Cancel
                      </button>
                    )}
                  </div>
                </div>

                {r.status === 'PENDING' && (
                  <div
                    style={{
                      gridColumn: '1 / -1',
                      padding: '10px 14px',
                      background: '#fffbeb',
                      border: '1px solid #fef3c7',
                      borderRadius: 8,
                      fontSize: 12,
                      color: '#92400e',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Clock size={15} style={{ color: '#d97706', flexShrink: 0 }} />
                    <span>
                      <strong>Pending Staff Approval:</strong> Your vehicle reservation agreement has been received. Our operations team is verifying the scheduling and handover clearance.
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {cancelModalRental && (
        <Modal
          isOpen={Boolean(cancelModalRental)}
          onClose={() => setCancelModalRental(null)}
          title="Cancel Reservation"
          size="sm"
        >
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'var(--rose-subtle)',
                color: 'var(--rose)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}
            >
              <AlertTriangle size={24} />
            </div>

            <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>
              Confirm Cancellation?
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Are you sure you want to cancel booking #{String(cancelModalRental.rental_id).padStart(4, '0')} for the{' '}
              <strong>{cancelModalRental.brand} {cancelModalRental.model}</strong>?
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-secondary"
                onClick={() => setCancelModalRental(null)}
                disabled={cancelling}
                style={{ flex: 1 }}
              >
                Keep Booking
              </button>
              <button
                className="btn btn-danger"
                onClick={handleCancel}
                disabled={cancelling}
                style={{ flex: 1 }}
              >
                {cancelling ? 'Cancelling…' : 'Yes, Cancel Trip'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Printable Digital Receipt / Invoice Modal */}
      {selectedReceipt && (
        <Modal
          isOpen={Boolean(selectedReceipt)}
          onClose={() => setSelectedReceipt(null)}
          title={`Booking Invoice #${String(selectedReceipt.rental_id).padStart(4, '0')}`}
          size="md"
        >
          <div style={{ padding: '8px 0' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--border)',
                paddingBottom: 14,
                marginBottom: 16,
              }}
            >
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)' }}>
                  CAMBER Mobility Invoice
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Reservation Agreement &amp; Receipt
                </div>
              </div>
              <button className="btn btn-sm btn-secondary" onClick={printReceipt}>
                <Printer size={13} /> Print Invoice
              </button>
            </div>

            {/* Vehicle & Station Info */}
            <div
              style={{
                background: 'var(--surface-sunken)',
                padding: 14,
                borderRadius: 'var(--radius-md)',
                marginBottom: 16,
                fontSize: 13,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--text-muted)' }}>Vehicle Model:</span>
                <strong>{selectedReceipt.brand} {selectedReceipt.model} ({selectedReceipt.registration_number})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--text-muted)' }}>Pickup Hub:</span>
                <span>{selectedReceipt.branch_name} ({selectedReceipt.city})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--text-muted)' }}>Station Contact:</span>
                <span>{selectedReceipt.branch_phone || '+91 98861 00201'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Trip Duration:</span>
                <span>{formatDate(selectedReceipt.pickup_date)} to {formatDate(selectedReceipt.expected_return_date)} ({selectedReceipt.rental_days} Days)</span>
              </div>
            </div>

            {/* Price Breakdown Table */}
            <table className="dt" style={{ marginBottom: 16 }}>
              <thead>
                <tr>
                  <th>Description</th>
                  <th className="num">Rate / Day</th>
                  <th className="num">Days</th>
                  <th className="num">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Base Vehicle Rental ({selectedReceipt.brand} {selectedReceipt.model})</td>
                  <td className="num">{formatCurrency(selectedReceipt.daily_rate)}</td>
                  <td className="num">{selectedReceipt.rental_days}</td>
                  <td className="num">{formatCurrency(selectedReceipt.rental_amount)}</td>
                </tr>
                {Number(selectedReceipt.extra_charges || 0) > 0 && (
                  <tr>
                    <td>Additional Service &amp; Adjustments</td>
                    <td className="num">—</td>
                    <td className="num">—</td>
                    <td className="num">{formatCurrency(selectedReceipt.extra_charges)}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Grand Total */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: '#f8fafc',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 20,
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>FINAL SETTLED AMOUNT</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)' }}>
                  {formatCurrency(selectedReceipt.final_amount)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>PAYMENT STATUS</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: Number(selectedReceipt.paid_amount || 0) >= Number(selectedReceipt.final_amount || 0) ? 'var(--emerald)' : 'var(--amber-dark)' }}>
                  {Number(selectedReceipt.paid_amount || 0) >= Number(selectedReceipt.final_amount || 0) ? 'PAID IN FULL' : 'PAYABLE AT PICKUP'}
                </div>
              </div>
            </div>

            <button className="btn btn-secondary" onClick={() => setSelectedReceipt(null)} style={{ width: '100%' }}>
              Close Receipt
            </button>
          </div>
        </Modal>
      )}

      {/* Interactive Payment Simulator for Customer Settlement */}
      {simulatorRental && (
        <PaymentSimulatorModal
          isOpen={Boolean(simulatorRental)}
          onClose={() => setSimulatorRental(null)}
          amount={Math.max(0, Number(simulatorRental.final_amount) - Number(simulatorRental.paid_amount || 0))}
          title={`Settle Rental #${simulatorRental.rental_id}`}
          customerName="Valued Fleet Client"
          vehicleInfo={`${simulatorRental.brand} ${simulatorRental.model} (${simulatorRental.registration_number})`}
          onSuccess={async (details) => {
            try {
              await api.post(`/customer/rentals/${simulatorRental.rental_id}/pay`, {
                payment_method: details.payment_method,
                payment_reference: details.reference_note,
              });
              toast.success(`Booking #${simulatorRental.rental_id} settled successfully!`);
              setSimulatorRental(null);
              refetch();
            } catch (err) {
              toast.error(err.response?.data?.error || 'Failed to settle payment.');
            }
          }}
        />
      )}
    </div>
  );
}
