import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Eye,
  Power,
  Search,
  Users,
  Phone,
  Mail,
  X,
  ShieldAlert,
} from 'lucide-react';
import api from '../services/api';
import useFetch from '../hooks/useFetch';
import Modal from '../components/Modal';
import { Loading, Empty, ErrorState } from '../components/DataState';
import { formatCurrency, formatDate, statusClass } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  driving_license_number: '',
  address: '',
};

export default function Customers() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'ADMIN';
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const query = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), limit: '12' });
    if (search) p.set('search', search);
    if (status) p.set('status', status);
    return p.toString();
  }, [search, status, page]);

  const { data, loading, error, refetch } = useFetch(`/customers?${query}`, [query]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(null);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setFormOpen(true);
  };

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      openAdd();
    }
  }, [searchParams]);

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name,
      phone: c.phone,
      email: c.email || '',
      driving_license_number: c.driving_license_number,
      address: c.address || '',
    });
    setFormError('');
    setFormOpen(true);
  };

  const openDetail = async (id) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/customers/${id}`);
      setDetail(res.data);
    } catch (err) {
      setDetail({ error: err.response?.data?.error || 'Failed to load customer profile.' });
    } finally {
      setDetailLoading(false);
    }
  };

  const saveCustomer = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/customers/${editing.customer_id}`, form);
        toast.success(`Customer ${form.name} updated successfully.`);
      } else {
        await api.post('/customers', form);
        toast.success(`Customer ${form.name} registered successfully.`);
      }
      setFormOpen(false);
      refetch();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to save customer.';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const applyStatus = async () => {
    if (!confirmStatus) return;
    try {
      await api.patch(`/customers/${confirmStatus.customer.customer_id}/status`, {
        status: confirmStatus.next,
      });
      toast.success(`Customer status changed to ${confirmStatus.next}.`);
      setConfirmStatus(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status.');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'C';
    const parts = name.split(' ');
    return parts.length > 1
      ? `${parts[0][0]}${parts[1][0]}`
      : name.slice(0, 2).toUpperCase();
  };

  const statusFilters = [
    { label: 'All Customers', value: '' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
  ];

  const customers = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []));
  const pagination = data?.pagination ?? { page: 1, pages: 1, total: 0 };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer Directory</h1>
          <p className="page-subtitle">
            Renter profiles, verification status, contact details, and lifetime booking records.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} />
          <span>Register Customer</span>
        </button>
      </div>

      {/* Toolbar */}
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
              placeholder="Search by name, phone, licence..."
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

      {/* Main Content */}
      {loading && <Loading text="Loading customer directory…" />}
      {error && <ErrorState message={`Failed to load customers: ${error}`} onRetry={refetch} />}
      {!loading && !error && customers.length === 0 && (
        <Empty message="No customers registered yet.">
          <button className="btn btn-primary" onClick={openAdd} style={{ marginTop: 14 }}>
            <Plus size={15} /> Register First Customer
          </button>
        </Empty>
      )}

      {/* Customer Table */}
      {!loading && !error && customers.length > 0 && (
        <div className="card">
          <div className="card-body no-pad">
            <div className="table-wrap">
              <table className="dt">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Contact Phone</th>
                    <th>Email Address</th>
                    <th>Driving License #</th>
                    <th>Address / City</th>
                    <th>Status</th>
                    <th className="actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.customer_id}>
                      <td>
                        <div className="table-avatar-item">
                          <div className="table-avatar">{getInitials(c.name)}</div>
                          <div>
                            <span style={{ fontWeight: 700 }}>{c.name}</span>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID #{c.customer_id}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Phone size={13} color="var(--primary)" />
                          <span style={{ fontWeight: 500 }}>{c.phone}</span>
                        </div>
                      </td>
                      <td>
                        {c.email ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Mail size={13} color="var(--text-muted)" />
                            <span>{c.email}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, background: '#f1f5f9', padding: '2px 8px', borderRadius: 4 }}>
                          {c.driving_license_number}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {c.address || '—'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${statusClass(c.status)}`}>
                          <span className="badge-dot" />
                          {c.status}
                        </span>
                      </td>
                      <td className="actions">
                        <div style={{ display: 'inline-flex', gap: 4 }}>
                          <button
                            className="btn btn-sm btn-ghost btn-icon"
                            onClick={() => openDetail(c.customer_id)}
                            title="View customer profile"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            className="btn btn-sm btn-ghost btn-icon"
                            onClick={() => openEdit(c)}
                            title="Edit details"
                          >
                            <Pencil size={14} />
                          </button>
                          {isAdmin && (
                            <button
                              className="btn btn-sm btn-ghost btn-icon"
                              onClick={() =>
                                setConfirmStatus({
                                  customer: c,
                                  next: c.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE',
                                })
                              }
                              title={c.status === 'INACTIVE' ? 'Activate customer' : 'Deactivate customer'}
                            >
                              <Power size={14} color={c.status === 'INACTIVE' ? 'var(--emerald)' : 'var(--rose)'} />
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
            Showing page <strong>{pagination.page}</strong> of <strong>{pagination.pages}</strong> ({pagination.total} registered renters)
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

      {/* Add / Edit Customer Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit ${editing.name}` : 'Register New Customer'}
        subtitle="Ensure driving license number is accurate for legal rental agreements"
        icon={Users}
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" form="customer-form" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Register Customer'}
            </button>
          </>
        }
      >
        {formError && <div className="state-error-card" style={{ marginBottom: 16 }}>{formError}</div>}
        <form id="customer-form" onSubmit={saveCustomer}>
          <div className="form-group">
            <label>Full Legal Name *</label>
            <input
              className="form-input"
              placeholder="e.g. Vikram Sharma"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="form-row" style={{ marginTop: 14 }}>
            <div className="form-group">
              <label>Phone Number *</label>
              <input
                className="form-input"
                placeholder="e.g. 9876543210"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="e.g. vikram@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 14 }}>
            <label>Driving License Number *</label>
            <input
              className="form-input"
              placeholder="e.g. DL1420110012345"
              value={form.driving_license_number}
              onChange={(e) => setForm({ ...form, driving_license_number: e.target.value.toUpperCase() })}
              required
            />
          </div>

          <div className="form-group" style={{ marginTop: 14 }}>
            <label>Residential Address / City</label>
            <textarea
              className="form-textarea"
              placeholder="Full physical address..."
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Customer Profile & Past Trips Modal */}
      <Modal
        open={Boolean(detail || detailLoading)}
        onClose={() => setDetail(null)}
        title={detail?.customer?.name || 'Customer Profile'}
        subtitle={`Licence: ${detail?.customer?.driving_license_number || '—'}`}
        icon={Users}
        size="lg"
        footer={
          <button className="btn btn-secondary" onClick={() => setDetail(null)}>
            Close
          </button>
        }
      >
        {detailLoading && <Loading text="Loading customer rental ledger…" />}
        {detail?.error && <ErrorState message={detail.error} />}
        {detail?.customer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="bento-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div className="summary-card" style={{ padding: 14 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Phone</span>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{detail.customer.phone}</div>
              </div>
              <div className="summary-card" style={{ padding: 14 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Email</span>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{detail.customer.email || '—'}</div>
              </div>
              <div className="summary-card" style={{ padding: 14 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Status</span>
                <div style={{ marginTop: 4 }}>
                  <span className={`badge ${statusClass(detail.customer.status)}`}>
                    <span className="badge-dot" />
                    {detail.customer.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3>Rental History</h3>
              </div>
              <div className="card-body no-pad">
                {(detail.rental_history || []).length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    No rental trips on record for this customer yet.
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table className="dt">
                      <thead>
                        <tr>
                          <th>Rental Ref</th>
                          <th>Vehicle</th>
                          <th>Dates</th>
                          <th className="num">Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.rental_history.map((rh) => (
                          <tr key={rh.rental_id}>
                            <td>#{rh.rental_id}</td>
                            <td>{rh.vehicle_name}</td>
                            <td>{formatDate(rh.pickup_date)} → {formatDate(rh.return_date || rh.expected_return_date)}</td>
                            <td className="num">{formatCurrency(rh.final_amount)}</td>
                            <td>
                              <span className={`badge ${statusClass(rh.status)}`}>
                                {rh.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation Dialog */}
      <Modal
        open={Boolean(confirmStatus)}
        onClose={() => setConfirmStatus(null)}
        title="Confirm Status Change"
        icon={ShieldAlert}
        size="sm"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setConfirmStatus(null)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={applyStatus}>
              Confirm
            </button>
          </>
        }
      >
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          Are you sure you want to set customer <strong>{confirmStatus?.customer?.name}</strong> to{' '}
          <strong>{confirmStatus?.next}</strong>?
        </p>
      </Modal>
    </div>
  );
}
