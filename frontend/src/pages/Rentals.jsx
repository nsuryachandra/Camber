import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  PlayCircle,
  Clock,
  AlertCircle,
  X,
  FileText,
  KeyRound,
  DollarSign,
  Car,
  User,
} from 'lucide-react';
import api from '../services/api';
import useFetch from '../hooks/useFetch';
import Modal from '../components/Modal';
import { Loading, Empty, ErrorState } from '../components/DataState';
import { formatCurrency, formatDate, statusClass } from '../utils/format';
import { useToast } from '../context/ToastContext';

const EMPTY_BOOKING = {
  customer_id: '',
  vehicle_id: '',
  pickup_date: '',
  expected_return_date: '',
  notes: '',
};

export default function Rentals() {
  const toast = useToast();
  const [searchParams] = useSearchParams();

  // List state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const query = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), limit: '12' });
    if (search) p.set('search', search);
    if (status) p.set('status', status);
    return p.toString();
  }, [search, status, page]);

  const { data, loading, error, refetch } = useFetch(`/rentals?${query}`, [query]);

  // Create flow
  const [createOpen, setCreateOpen] = useState(false);
  const [booking, setBooking] = useState(EMPTY_BOOKING);
  const [availability, setAvailability] = useState(null);
  const [checkingAvail, setCheckingAvail] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const meta = useFetch('/meta/form-data');

  // Detail
  const [detailId, setDetailId] = useState(null);
  const detail = useFetch(detailId ? `/rentals/${detailId}` : null);

  // Return flow
  const [returnFor, setReturnFor] = useState(null);
  const [returnForm, setReturnForm] = useState({
    vehicle_condition: 'GOOD',
    extra_charges: '0',
    needs_maintenance: false,
  });
  const [returning, setReturning] = useState(false);
  const [returnError, setReturnError] = useState('');

  // Cancel flow
  const [cancelFor, setCancelFor] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const customers = meta.data?.active_customers || [];
  const vehicles = meta.data?.available_vehicles || [];

  const openCreate = () => {
    setBooking(EMPTY_BOOKING);
    setAvailability(null);
    setCreateError('');
    setCreateOpen(true);
  };

  // Action from URL (e.g. ?action=new)
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      openCreate();
    }
  }, [searchParams]);

  const selectedVehicle = vehicles.find(
    (v) => String(v.vehicle_id) === String(booking.vehicle_id)
  );

  // Live rental-days calculation
  const days = useMemo(() => {
    if (!booking.pickup_date || !booking.expected_return_date) return 0;
    const d =
      (new Date(booking.expected_return_date) - new Date(booking.pickup_date)) /
      86400000;
    return Number.isFinite(d) ? Math.max(0, Math.floor(d) + 1) : 0;
  }, [booking.pickup_date, booking.expected_return_date]);

  const previewAmount = selectedVehicle
    ? days * Number(selectedVehicle.rental_rate)
    : 0;

  // Server-side availability check
  useEffect(() => {
    const { vehicle_id, pickup_date, expected_return_date } = booking;
    if (!vehicle_id || !pickup_date || !expected_return_date) {
      setAvailability(null);
      return;
    }
    let cancelled = false;
    setCheckingAvail(true);
    api
      .get(`/vehicles/${vehicle_id}/availability`, {
        params: { pickup: pickup_date, return: expected_return_date },
      })
      .then(({ data }) => {
        if (!cancelled) setAvailability(data);
      })
      .catch(() => {
        if (!cancelled)
          setAvailability({ available: false, reason: 'Availability check failed.' });
      })
      .finally(() => {
        if (!cancelled) setCheckingAvail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [booking.vehicle_id, booking.pickup_date, booking.expected_return_date]);

  const createBooking = async () => {
    setCreateError('');
    setCreating(true);
    try {
      await api.post('/rentals', booking);
      toast.success('Rental booking created successfully!');
      setCreateOpen(false);
      refetch();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to create booking.';
      setCreateError(msg);
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const doPickup = async (id) => {
    try {
      await api.post(`/rentals/${id}/pickup`);
      toast.success('Vehicle marked as Picked Up. Rental is now ACTIVE.');
      if (detailId) detail.refetch();
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start rental.');
    }
  };

  const doReturn = async () => {
    setReturnError('');
    setReturning(true);
    try {
      await api.post(`/rentals/${returnFor.rental_id}/return`, {
        ...returnForm,
        extra_charges: Number(returnForm.extra_charges || 0),
      });
      toast.success('Vehicle returned successfully! Rental completed.');
      setReturnFor(null);
      refetch();
      if (detailId) detail.refetch();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to process vehicle return.';
      setReturnError(msg);
      toast.error(msg);
    } finally {
      setReturning(false);
    }
  };

  const doCancel = async () => {
    if (!cancelFor) return;
    setCancelling(true);
    try {
      await api.post(`/rentals/${cancelFor.rental_id}/cancel`);
      toast.success('Rental booking has been cancelled.');
      setCancelFor(null);
      refetch();
      if (detailId) detail.refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel booking.');
    } finally {
      setCancelling(false);
    }
  };

  const doApprove = async (id) => {
    try {
      await api.post(`/rentals/${id}/approve`);
      toast.success(`Booking agreement #${String(id).padStart(4, '0')} approved! Status set to BOOKED.`);
      refetch();
      if (detailId) detail.refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve booking.');
    }
  };

  const statusFilters = [
    { label: 'All Bookings', value: '' },
    { label: 'Pending Approval', value: 'PENDING' },
    { label: 'Booked', value: 'BOOKED' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  const getInitials = (name) => {
    if (!name) return 'C';
    const parts = name.split(' ');
    return parts.length > 1
      ? `${parts[0][0]}${parts[1][0]}`
      : name.slice(0, 2).toUpperCase();
  };

  const rentals = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []));
  const pagination = data?.pagination ?? { page: 1, pages: 1, total: 0 };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Rentals &amp; Bookings</h1>
          <p className="page-subtitle">
            Manage reservation lifecycles, vehicle pickups, returns, and billing adjustments.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} />
          <span>New Reservation</span>
        </button>
      </div>

      {/* Segmented Filter Pills & Search */}
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="segmented-control">
            {statusFilters.map((sf) => (
              <button
                key={sf.value}
                className={`pill-tab ${status === sf.value ? 'active' : ''}`}
                onClick={() => {
                  setStatus(sf.value);
                  setPage(1);
                }}
              >
                {sf.label}
              </button>
            ))}
          </div>

          <div className="search-input-wrap">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              className="form-input"
              placeholder="Search customer, car, or #ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            {search && (
              <button
                className="search-clear-btn"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading && <Loading text="Loading rental reservations…" />}
      {error && <ErrorState message={`Failed to load rentals: ${error}`} onRetry={refetch} />}
      {!loading && !error && rentals.length === 0 && (
        <Empty message="No rental bookings found matching criteria.">
          <button className="btn btn-primary" onClick={openCreate} style={{ marginTop: 14 }}>
            <Plus size={15} /> Create First Reservation
          </button>
        </Empty>
      )}

      {/* Rentals Table */}
      {!loading && !error && rentals.length > 0 && (
        <div className="card">
          <div className="card-body no-pad">
            <div className="table-wrap">
              <table className="dt">
                <thead>
                  <tr>
                    <th>Ref #</th>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    <th>Pickup Date</th>
                    <th>Expected Return</th>
                    <th className="num">Calculated Rate</th>
                    <th>Status</th>
                    <th className="actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rentals.map((r) => (
                    <tr key={r.rental_id}>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>
                          #{String(r.rental_id).padStart(4, '0')}
                        </span>
                      </td>
                      <td>
                        <div className="table-avatar-item">
                          <div className="table-avatar">{getInitials(r.customer_name)}</div>
                          <div>
                            <span style={{ fontWeight: 600 }}>{r.customer_name}</span>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>
                          <div style={{ fontWeight: 600 }}>{r.vehicle_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {r.registration_number}
                          </div>
                        </div>
                      </td>
                      <td>{formatDate(r.pickup_date)}</td>
                      <td>{formatDate(r.expected_return_date)}</td>
                      <td className="num">{formatCurrency(r.final_amount)}</td>
                      <td>
                        <span className={`badge ${statusClass(r.status)}`}>
                          <span className="badge-dot" />
                          {r.status}
                        </span>
                      </td>
                      <td className="actions">
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => setDetailId(r.rental_id)}
                            title="View Full Details"
                          >
                            <Eye size={13} /> View
                          </button>

                          {r.status === 'PENDING' && (
                            <>
                              <button
                                className="btn btn-sm"
                                style={{
                                  background: '#059669',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                                onClick={() => doApprove(r.rental_id)}
                                title="Approve Customer Agreement"
                              >
                                <CheckCircle2 size={13} /> Approve
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => setCancelFor(r)}
                                title="Reject / Cancel Booking"
                              >
                                <XCircle size={13} /> Reject
                              </button>
                            </>
                          )}

                          {r.status === 'BOOKED' && (
                            <>
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => doPickup(r.rental_id)}
                                title="Mark Vehicle Picked Up"
                              >
                                <PlayCircle size={13} /> Pickup
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => setCancelFor(r)}
                                title="Cancel Booking"
                              >
                                <XCircle size={13} />
                              </button>
                            </>
                          )}

                          {r.status === 'ACTIVE' && (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => {
                                setReturnFor(r);
                                setReturnForm({
                                  vehicle_condition: 'GOOD',
                                  extra_charges: '0',
                                  needs_maintenance: false,
                                });
                              }}
                            >
                              <CheckCircle2 size={13} /> Return
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && pagination.pages > 1 && (
        <div className="pagination" style={{ marginTop: 20, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <span>
            Showing page <strong>{pagination.page}</strong> of <strong>{pagination.pages}</strong> ({pagination.total} total bookings)
          </span>
          <div className="pagination-controls">
            <button
              className="btn btn-sm btn-secondary"
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <button
              className="btn btn-sm btn-secondary"
              disabled={pagination.page >= pagination.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* 2-Pane 21st.dev Rental Creation Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create New Rental Reservation"
        subtitle="Select customer, vehicle, and duration for live rate estimation"
        icon={KeyRound}
        size="xl"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={creating || availability?.available === false || days <= 0}
              onClick={createBooking}
            >
              {creating ? 'Creating Booking…' : 'Confirm & Reserve Vehicle'}
            </button>
          </>
        }
      >
        {createError && (
          <div className="state-error-card" style={{ marginBottom: 16 }}>
            {createError}
          </div>
        )}

        <div className="rental-grid">
          {/* Left Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label>Select Customer *</label>
              <select
                className="form-select"
                value={booking.customer_id}
                onChange={(e) => setBooking({ ...booking, customer_id: e.target.value })}
                required
              >
                <option value="">-- Choose verified customer --</option>
                {customers.map((c) => (
                  <option key={c.customer_id} value={c.customer_id}>
                    {c.name} ({c.phone}) — Lic: {c.driving_license_number}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Select Available Vehicle *</label>
              <select
                className="form-select"
                value={booking.vehicle_id}
                onChange={(e) => setBooking({ ...booking, vehicle_id: e.target.value })}
                required
              >
                <option value="">-- Choose vehicle from fleet --</option>
                {vehicles.map((v) => (
                  <option key={v.vehicle_id} value={v.vehicle_id}>
                    {v.brand} {v.model} ({v.registration_number}) — {formatCurrency(v.rental_rate)}/day
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Pickup Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={booking.pickup_date}
                  onChange={(e) => setBooking({ ...booking, pickup_date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Expected Return Date *</label>
                <input
                  type="date"
                  className="form-input"
                  min={booking.pickup_date || undefined}
                  value={booking.expected_return_date}
                  onChange={(e) => setBooking({ ...booking, expected_return_date: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Availability Badge */}
            {checkingAvail && (
              <div style={{ fontSize: 12, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} className="animate-spin" /> Verifying fleet scheduling availability…
              </div>
            )}
            {!checkingAvail && availability && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: availability.available ? '#ecfdf5' : '#fff1f2',
                  border: `1px solid ${availability.available ? '#a7f3d0' : '#fecaca'}`,
                  color: availability.available ? '#065f46' : '#991b1b',
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {availability.available ? (
                  <>
                    <CheckCircle2 size={16} /> Vehicle is verified available for this date window!
                  </>
                ) : (
                  <>
                    <AlertCircle size={16} /> {availability.reason || 'Vehicle is booked during these dates.'}
                  </>
                )}
              </div>
            )}

            <div className="form-group">
              <label>Special Instructions / Notes</label>
              <textarea
                className="form-textarea"
                placeholder="Optional customer requirements or trip details..."
                value={booking.notes}
                onChange={(e) => setBooking({ ...booking, notes: e.target.value })}
              />
            </div>
          </div>

          {/* Right Live Estimate Summary Card */}
          <div className="summary-card">
            <h4 className="summary-card-title">Booking Estimate</h4>
            <div className="summary-list">
              <div className="summary-row">
                <span className="k">Vehicle Model</span>
                <span className="v">
                  {selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : '—'}
                </span>
              </div>
              <div className="summary-row">
                <span className="k">Daily Rate</span>
                <span className="v">
                  {selectedVehicle ? formatCurrency(selectedVehicle.rental_rate) : '—'}
                </span>
              </div>
              <div className="summary-row">
                <span className="k">Rental Duration</span>
                <span className="v">{days > 0 ? `${days} Day(s)` : '0 Days'}</span>
              </div>
              <div className="summary-row total">
                <span className="k">Estimated Total</span>
                <span className="v">{formatCurrency(previewAmount)}</span>
              </div>
            </div>

            <div style={{ marginTop: 20, padding: 12, background: '#f8fafc', borderRadius: 'var(--radius-sm)', fontSize: 11, color: 'var(--text-muted)' }}>
              Final payment schedule and extra adjustments (tolls, fuel, damage) can be settled during check-in or checkout.
            </div>
          </div>
        </div>
      </Modal>

      {/* Return Vehicle Modal */}
      <Modal
        open={Boolean(returnFor)}
        onClose={() => setReturnFor(null)}
        title="Process Vehicle Return"
        subtitle={`Rental #${returnFor?.rental_id} — ${returnFor?.vehicle_name}`}
        icon={CheckCircle2}
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setReturnFor(null)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={doReturn} disabled={returning}>
              {returning ? 'Completing Return…' : 'Finalize & Settle Return'}
            </button>
          </>
        }
      >
        {returnError && <div className="state-error-card" style={{ marginBottom: 16 }}>{returnError}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label>Inspected Vehicle Condition *</label>
            <select
              className="form-select"
              value={returnForm.vehicle_condition}
              onChange={(e) => setReturnForm({ ...returnForm, vehicle_condition: e.target.value })}
            >
              <option value="GOOD">Good — No visible scratches or issues</option>
              <option value="FAIR">Fair — Minor cosmetic wear</option>
              <option value="DAMAGED">Damaged — Needs body/mechanical inspection</option>
            </select>
          </div>

          <div className="form-group">
            <label>Extra Adjustments / Penalty Charges (₹)</label>
            <input
              type="number"
              min="0"
              className="form-input"
              value={returnForm.extra_charges}
              onChange={(e) => setReturnForm({ ...returnForm, extra_charges: e.target.value })}
            />
            <span className="form-hint">Late return fees, fuel shortfall, cleaning, etc.</span>
          </div>

          <label className="check-row" style={{ marginTop: 4 }}>
            <input
              type="checkbox"
              checked={returnForm.needs_maintenance}
              onChange={(e) => setReturnForm({ ...returnForm, needs_maintenance: e.target.checked })}
            />
            <span>Send vehicle directly to workshop for maintenance inspection</span>
          </label>
        </div>
      </Modal>

      {/* Cancel Confirmation */}
      <Modal
        open={Boolean(cancelFor)}
        onClose={() => setCancelFor(null)}
        title="Cancel Reservation"
        icon={XCircle}
        size="sm"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setCancelFor(null)}>
              Keep Booking
            </button>
            <button className="btn btn-danger" onClick={doCancel} disabled={cancelling}>
              {cancelling ? 'Cancelling…' : 'Cancel Booking'}
            </button>
          </>
        }
      >
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          Are you sure you want to cancel reservation <strong>#{cancelFor?.rental_id}</strong> for{' '}
          <strong>{cancelFor?.customer_name}</strong>?
        </p>
      </Modal>

      {/* Detailed Rental View Modal */}
      <Modal
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        title={detail.data?.rental ? `Rental #${String(detail.data.rental.rental_id).padStart(4, '0')}` : 'Rental Details'}
        subtitle="Complete booking agreement and payment ledger"
        icon={FileText}
        size="lg"
        footer={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            {detail.data?.rental?.status === 'PENDING' ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-sm"
                  style={{ background: '#059669', color: '#fff', border: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  onClick={() => doApprove(detail.data.rental.rental_id)}
                >
                  <CheckCircle2 size={14} /> Approve Agreement
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => {
                    setCancelFor(detail.data.rental);
                    setDetailId(null);
                  }}
                >
                  <XCircle size={14} /> Reject
                </button>
              </div>
            ) : <div />}
            <button className="btn btn-secondary" onClick={() => setDetailId(null)}>
              Close
            </button>
          </div>
        }
      >
        {detail.loading && <Loading text="Loading agreement data…" />}
        {detail.error && <ErrorState message={detail.error} />}
        {detail.data?.rental && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="bento-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <div className="summary-card" style={{ padding: '10px 12px' }}>
                <span style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Customer</span>
                <div style={{ fontSize: 13.5, fontWeight: 750, marginTop: 2 }}>{detail.data.rental.customer_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{detail.data.rental.phone}</div>
              </div>

              <div className="summary-card" style={{ padding: '10px 12px' }}>
                <span style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Vehicle</span>
                <div style={{ fontSize: 13.5, fontWeight: 750, marginTop: 2 }}>{detail.data.rental.vehicle_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{detail.data.rental.registration_number}</div>
              </div>

              <div className="summary-card" style={{ padding: '10px 12px' }}>
                <span style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Status</span>
                <div style={{ marginTop: 4 }}>
                  <span className={`badge ${statusClass(detail.data.rental.status)}`}>
                    <span className="badge-dot" />
                    {detail.data.rental.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Financials */}
            <div className="summary-card" style={{ padding: '12px 14px' }}>
              <h4 className="summary-card-title" style={{ fontSize: 12, marginBottom: 8 }}>Billing Breakdown</h4>
              <div className="summary-list" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="summary-row" style={{ fontSize: 12 }}>
                  <span className="k">Total Rental Period</span>
                  <span className="v">{formatDate(detail.data.rental.pickup_date)} → {formatDate(detail.data.rental.return_date || detail.data.rental.expected_return_date)}</span>
                </div>
                <div className="summary-row" style={{ fontSize: 12 }}>
                  <span className="k">Extra / Damage Charges</span>
                  <span className="v">{formatCurrency(detail.data.rental.extra_charges || 0)}</span>
                </div>
                <div className="summary-row total" style={{ fontSize: 13.5, fontWeight: 800, borderTop: '1px dashed var(--border)', paddingTop: 6, marginTop: 2 }}>
                  <span className="k">Final Settled Amount</span>
                  <span className="v" style={{ color: 'var(--primary)', fontFamily: 'var(--font-display)', fontSize: 16 }}>{formatCurrency(detail.data.rental.final_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
