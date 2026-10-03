import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Car,
  Fuel,
  Users,
  Building2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  X,
  Zap,
  Printer,
} from 'lucide-react';
import Modal from '../../components/Modal';
import PaymentSimulatorModal from '../../components/PaymentSimulatorModal';
import ConfettiPopperCanvas from '../../components/ConfettiPopperCanvas';
import { playSuccessChime } from '../../utils/audio';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatDate } from '../../utils/format';
import { getVehicleImage } from '../../utils/vehicleImages';

export default function BookingModal({ vehicle, isOpen, onClose, onBookingSuccess }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // Date defaults: tomorrow to +3 days
  const today = new Date().toISOString().slice(0, 10);
  const nextDay = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const threeDays = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10);

  const [pickupDate, setPickupDate] = useState(nextDay);
  const [returnDate, setReturnDate] = useState(threeDays);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [showSimulator, setShowSimulator] = useState(false);

  const isCustomer = user && user.role === 'CUSTOMER';

  // Duration & live pricing calculation
  const { rentalDays, rentalAmount, finalAmount } = useMemo(() => {
    if (!pickupDate || !returnDate || !vehicle) {
      return { rentalDays: 1, rentalAmount: 0, finalAmount: 0 };
    }
    const p = new Date(pickupDate);
    const r = new Date(returnDate);
    if (r < p) return { rentalDays: 0, rentalAmount: 0, finalAmount: 0 };
    const diff = Math.round((r - p) / (1000 * 60 * 60 * 24)) + 1;
    const days = Math.max(1, diff);
    const rate = Number(vehicle.rental_rate || 0);
    const amount = days * rate;
    return {
      rentalDays: days,
      rentalAmount: amount,
      finalAmount: amount,
    };
  }, [pickupDate, returnDate, vehicle]);

  const validateDates = () => {
    if (!isCustomer) {
      toast.info('Please sign in or create a customer account to reserve this vehicle.');
      navigate('/login');
      return false;
    }
    if (!pickupDate || !returnDate) {
      setError('Please select valid pickup and return dates.');
      return false;
    }
    if (rentalDays <= 0) {
      setError('Return date must be on or after the pickup date.');
      return false;
    }
    setError('');
    return true;
  };

  const handleLaunchSimulator = (e) => {
    if (e) e.preventDefault();
    if (validateDates()) {
      setShowSimulator(true);
    }
  };

  const handleSimulatorSuccess = async (details) => {
    setShowSimulator(false);
    setSubmitting(true);
    try {
      const res = await api.post('/customer/book', {
        vehicle_id: vehicle.vehicle_id,
        pickup_date: pickupDate,
        expected_return_date: returnDate,
        notes: notes || undefined,
        simulate_payment: true,
        payment_method: details.payment_method,
        payment_reference: details.reference_note,
      });
      toast.success(`Booking confirmed & settled via ${details.payment_method}!`);
      setConfirmedBooking({ ...res.data, paidDetails: details });
      playSuccessChime();
      if (onBookingSuccess) onBookingSuccess(res.data);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to complete booking with payment.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (!validateDates()) return;

    setError('');
    setSubmitting(true);
    try {
      const res = await api.post('/customer/book', {
        vehicle_id: vehicle.vehicle_id,
        pickup_date: pickupDate,
        expected_return_date: returnDate,
        notes: notes || undefined,
      });
      toast.success('Reservation confirmed successfully!');
      setConfirmedBooking(res.data);
      playSuccessChime();
      if (onBookingSuccess) onBookingSuccess(res.data);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to complete booking. Vehicle may be reserved for selected dates.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setConfirmedBooking(null);
    setShowSimulator(false);
    setError('');
    onClose();
  };

  if (!isOpen || !vehicle) return null;

  return (
    <>
      <Modal
        isOpen={isOpen && !showSimulator}
        onClose={resetAndClose}
        title={confirmedBooking ? 'Reservation Submitted (Pending Approval)' : `Reserve ${vehicle.brand} ${vehicle.model}`}
      size="md"
    >
      {confirmedBooking ? (
        <div style={{ textAlign: 'center', padding: '16px 8px', position: 'relative', overflow: 'hidden' }}>
          <ConfettiPopperCanvas active={true} />
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--emerald-subtle)',
              color: 'var(--emerald)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <CheckCircle2 size={32} />
          </div>

          <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
            Booking Request Submitted!
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto 16px', lineHeight: 1.5 }}>
            Reservation <strong>#{String(confirmedBooking.rental_id).padStart(4, '0')}</strong> for the{' '}
            <strong>{vehicle.brand} {vehicle.model}</strong> has been created. Our Operations Desk will verify and approve the agreement before pickup.
          </p>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#fffbeb',
              border: '1px solid #fde68a',
              color: '#92400e',
              padding: '5px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 20,
            }}
          >
            <Clock size={14} /> Status: Pending Staff Approval
          </div>

          <div
            style={{
              background: 'var(--surface-sunken)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 16,
              textAlign: 'left',
              marginBottom: 24,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>Status:</span>
              <strong style={{ color: '#d97706' }}>PENDING (Awaiting Staff Approval)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>Pickup Date:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{formatDate(pickupDate)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>Return Date:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{formatDate(returnDate)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>Station Hub:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{vehicle.branch_name || 'Central Hub'}</strong>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: 8,
                borderTop: '1px dashed var(--border)',
                fontSize: 14,
              }}
            >
              <span style={{ fontWeight: 700 }}>Total Final Amount:</span>
              <strong style={{ color: 'var(--emerald-dark)', fontSize: 16 }}>
                {formatCurrency(finalAmount)}
              </strong>
            </div>
            {confirmedBooking.is_paid && (
              <div
                style={{
                  marginTop: 10,
                  padding: '6px 10px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 11.5,
                  color: '#047857',
                  fontWeight: 700,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <ShieldCheck size={13} /> Payment Settled &amp; Verified
                </span>
                <span>{confirmedBooking.paidDetails?.payment_method || 'UPI'} ESCROW</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => window.print()} style={{ flex: 1 }}>
              <Printer size={15} /> Print Agreement
            </button>
            <button className="btn btn-secondary" onClick={resetAndClose} style={{ flex: 1 }}>
              Close
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                resetAndClose();
                navigate('/my-rentals');
              }}
              style={{ flex: 1.2 }}
            >
              View My Bookings <ArrowRight size={15} />
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleConfirm}>
          {/* Vehicle Snapshot Header */}
          <div className="spec-modal-hero">
            <img
              src={getVehicleImage(vehicle)}
              alt={`${vehicle.brand} ${vehicle.model}`}
              className="spec-modal-hero-img"
            />
            <div className="spec-modal-hero-overlay">
              <div>
                <div className="spec-modal-brand">{vehicle.brand}</div>
                <h3 className="spec-modal-hero-title" style={{ fontSize: 18 }}>{vehicle.model}</h3>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span className="spec-modal-type-pill">{vehicle.type_name}</span>
                <span className="spec-modal-badge">{vehicle.fuel_type}</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="state-error-card" style={{ marginBottom: 16 }}>
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Date Range Selection */}
          <div className="form-row" style={{ marginBottom: 14 }}>
            <div className="form-group">
              <label htmlFor="pickup_date">Pickup Date *</label>
              <input
                id="pickup_date"
                type="date"
                className="form-input"
                min={today}
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="return_date">Expected Return Date *</label>
              <input
                id="return_date"
                type="date"
                className="form-input"
                min={pickupDate || today}
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Station / Hub Info */}
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>Pickup Location &amp; Station Hub</label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 13,
                color: 'var(--text-secondary)',
              }}
            >
              <Building2 size={16} style={{ color: 'var(--primary)' }} />
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>{vehicle.branch_name}</strong>
                <span style={{ marginLeft: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                  ({vehicle.city}) • {vehicle.branch_phone || 'Customer Desk'}
                </span>
              </div>
            </div>
          </div>

          {/* Special Requests / Notes */}
          <div className="form-group" style={{ marginBottom: 18 }}>
            <label htmlFor="notes">Trip Notes or Special Requests (Optional)</label>
            <textarea
              id="notes"
              className="form-textarea"
              rows={2}
              placeholder="e.g. Early morning pickup, booster seat required..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Pricing Computation Box */}
          <div
            style={{
              background: '#f4f4f5',
              border: '1px solid #e4e4e7',
              borderRadius: 'var(--radius-md)',
              padding: 16,
              marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              <span>Daily Rental Rate:</span>
              <span>{formatCurrency(vehicle.rental_rate)} / day</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              <span>Rental Duration:</span>
              <span><strong>{rentalDays}</strong> Day{rentalDays > 1 ? 's' : ''}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
              <span>Security Deposit &amp; Taxes:</span>
              <span style={{ color: 'var(--emerald)', fontWeight: 600 }}>Included (Zero Extra)</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: 10,
                borderTop: '1px solid #c7d2fe',
                fontSize: 16,
                fontWeight: 800,
                color: 'var(--text-primary)',
              }}
            >
              <span>Estimated Total:</span>
              <span style={{ color: 'var(--primary)' }}>{formatCurrency(finalAmount)}</span>
            </div>
          </div>

          {/* Authentication Requirement Check */}
          {!user ? (
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
                fontSize: 13,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#92400e' }}>
                <AlertCircle size={16} />
                <span>Account required to finalize booking</span>
              </div>
              <Link to="/login" className="btn btn-sm btn-primary">
                Sign In / Register
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 12, color: 'var(--text-muted)' }}>
              <ShieldCheck size={14} style={{ color: 'var(--emerald)' }} />
              <span>
                Booking as <strong>{user.name}</strong> • License on file verified
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary" onClick={resetAndClose} disabled={submitting}>
              Cancel
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="submit"
                className="btn btn-secondary"
                disabled={submitting || rentalDays <= 0}
                title="Reserve chassis and pay balance at the station desk"
              >
                {submitting ? 'Reserving…' : 'Reserve (Pay at Station)'}
              </button>
              <button
                type="button"
                onClick={handleLaunchSimulator}
                className="btn btn-primary btn-lg"
                disabled={submitting || rentalDays <= 0}
                style={{
                  background: 'linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)',
                  boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Zap size={15} /> Instant FastPay &amp; Settle
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>

    {/* Luxury Payment Simulator Modal */}
    {showSimulator && (
      <PaymentSimulatorModal
        isOpen={showSimulator}
        onClose={() => setShowSimulator(false)}
        amount={finalAmount}
        title={`FastPay: ${vehicle.brand} ${vehicle.model}`}
        customerName={user?.name || 'Valued Fleet Customer'}
        vehicleInfo={`${vehicle.brand} ${vehicle.model} (${vehicle.registration_number})`}
        onSuccess={handleSimulatorSuccess}
      />
    )}
  </>
  );
}
