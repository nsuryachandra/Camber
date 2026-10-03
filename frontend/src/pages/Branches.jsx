import { useState } from 'react';
import {
  Building2,
  Plus,
  Pencil,
  Eye,
  MapPin,
  Phone,
  User,
  Car,
  Power,
  ShieldAlert,
  Layers,
} from 'lucide-react';
import api from '../services/api';
import useFetch from '../hooks/useFetch';
import Modal from '../components/Modal';
import { Loading, Empty, ErrorState } from '../components/DataState';
import { formatCurrency, statusClass } from '../utils/format';
import { useToast } from '../context/ToastContext';

const EMPTY_FORM = {
  branch_name: '',
  address: '',
  city: '',
  phone: '',
  manager_name: '',
};

export default function Branches() {
  const toast = useToast();
  const { data, loading, error, refetch } = useFetch('/branches');

  // Create / edit
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Detail
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Deactivate confirm
  const [confirmStatus, setConfirmStatus] = useState(null);
  const [changing, setChanging] = useState(false);

  const branches = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (b) => {
    setEditing(b);
    setForm({
      branch_name: b.branch_name,
      address: b.address,
      city: b.city,
      phone: b.phone,
      manager_name: b.manager_name,
    });
    setFormError('');
    setFormOpen(true);
  };

  const openDetail = async (id) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/branches/${id}`);
      setDetail(res.data);
    } catch (err) {
      setDetail({ error: err.response?.data?.error || 'Failed to load branch details.' });
    } finally {
      setDetailLoading(false);
    }
  };

  const saveBranch = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/branches/${editing.branch_id}`, form);
        toast.success(`Branch ${form.branch_name} updated successfully.`);
      } else {
        await api.post('/branches', form);
        toast.success(`Branch ${form.branch_name} created successfully.`);
      }
      setFormOpen(false);
      refetch();
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not save the branch.';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async () => {
    if (!confirmStatus) return;
    setChanging(true);
    try {
      await api.patch(`/branches/${confirmStatus.branch.branch_id}/status`, {
        status: confirmStatus.next,
      });
      toast.success(`Branch status updated to ${confirmStatus.next}.`);
      setConfirmStatus(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not update branch status.');
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Branch Locations &amp; Hubs</h1>
          <p className="page-subtitle">
            Station hubs, station managers, and live vehicle allocations across India.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} />
          <span>Add New Branch</span>
        </button>
      </div>

      {loading && <Loading text="Loading branch networks…" />}
      {error && <ErrorState message={`Failed to load branches: ${error}`} onRetry={refetch} />}
      {!loading && !error && branches.length === 0 && (
        <Empty message="No branch locations configured.">
          <button className="btn btn-primary" onClick={openAdd} style={{ marginTop: 14 }}>
            <Plus size={15} /> Add First Branch
          </button>
        </Empty>
      )}

      {/* 21st.dev Branch Cards Grid */}
      {!loading && !error && branches.length > 0 && (
        <div className="branch-grid">
          {branches.map((b) => {
            const availPct = b.total_vehicles > 0 ? Math.round((b.available_vehicles / b.total_vehicles) * 100) : 0;
            return (
              <div key={b.branch_id} className="branch-card-modern">
                <div className="branch-card-head">
                  <div className="branch-title-group">
                    <div className="branch-map-icon-box">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <div className="branch-name">{b.branch_name}</div>
                      <div className="branch-city">
                        <MapPin size={12} style={{ display: 'inline', marginRight: 3 }} />
                        {b.city}
                      </div>
                    </div>
                  </div>
                  <span className={`badge ${statusClass(b.status)}`}>
                    <span className="badge-dot" />
                    {b.status}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Manager</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.manager_name || 'Unassigned'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Contact</span>
                    <span style={{ fontWeight: 500 }}>{b.phone}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Address</span>
                    <span style={{ fontSize: 12, textAlign: 'right', maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {b.address}
                    </span>
                  </div>
                </div>

                {/* 4-Stat Strip */}
                <div className="branch-stats-strip">
                  <div className="branch-stat-item">
                    <span className="branch-stat-item-num">{b.total_vehicles}</span>
                    <span className="branch-stat-item-lbl">Total</span>
                  </div>
                  <div className="branch-stat-item">
                    <span className="branch-stat-item-num green">{b.available_vehicles}</span>
                    <span className="branch-stat-item-lbl">Ready</span>
                  </div>
                  <div className="branch-stat-item">
                    <span className="branch-stat-item-num blue">{b.rented_vehicles}</span>
                    <span className="branch-stat-item-lbl">Rented</span>
                  </div>
                  <div className="branch-stat-item">
                    <span className="branch-stat-item-num amber">{b.maintenance_vehicles}</span>
                    <span className="branch-stat-item-lbl">In Shop</span>
                  </div>
                </div>

                {/* Footer Actions */}
                <div style={{ display: 'flex', gap: 8, paddingTop: 6 }}>
                  <button
                    className="btn btn-sm btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => openDetail(b.branch_id)}
                  >
                    <Eye size={13} /> View Fleet ({b.total_vehicles})
                  </button>
                  <button
                    className="btn btn-sm btn-ghost btn-icon"
                    onClick={() => openEdit(b)}
                    title="Edit Branch"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="btn btn-sm btn-ghost btn-icon"
                    onClick={() =>
                      setConfirmStatus({
                        branch: b,
                        next: b.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE',
                      })
                    }
                    title={b.status === 'INACTIVE' ? 'Activate Branch' : 'Deactivate Branch'}
                  >
                    <Power size={14} color={b.status === 'INACTIVE' ? 'var(--emerald)' : 'var(--rose)'} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Branch Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit ${editing.branch_name}` : 'Add Branch Location'}
        subtitle="Operational hub details and contact information"
        icon={Building2}
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" form="branch-form" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Branch'}
            </button>
          </>
        }
      >
        {formError && <div className="state-error-card" style={{ marginBottom: 16 }}>{formError}</div>}
        <form id="branch-form" onSubmit={saveBranch}>
          <div className="form-group">
            <label>Branch Name *</label>
            <input
              className="form-input"
              placeholder="e.g. Pune Central Hub"
              value={form.branch_name}
              onChange={(e) => setForm({ ...form, branch_name: e.target.value })}
              required
            />
          </div>

          <div className="form-row" style={{ marginTop: 14 }}>
            <div className="form-group">
              <label>City *</label>
              <input
                className="form-input"
                placeholder="e.g. Pune, Mumbai, Bengaluru"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Contact Phone *</label>
              <input
                className="form-input"
                placeholder="e.g. 020-25678901"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 14 }}>
            <label>Station Manager Name *</label>
            <input
              className="form-input"
              placeholder="e.g. Ramesh Kulkarni"
              value={form.manager_name}
              onChange={(e) => setForm({ ...form, manager_name: e.target.value })}
              required
            />
          </div>

          <div className="form-group" style={{ marginTop: 14 }}>
            <label>Physical Address</label>
            <textarea
              className="form-textarea"
              placeholder="Full station street address..."
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Branch Fleet Vehicles Modal */}
      <Modal
        open={Boolean(detail || detailLoading)}
        onClose={() => setDetail(null)}
        title={detail?.branch?.branch_name || 'Branch Fleet'}
        subtitle={`City: ${detail?.branch?.city || '—'} | Manager: ${detail?.branch?.manager_name || '—'}`}
        icon={Building2}
        size="lg"
        footer={
          <button className="btn btn-secondary" onClick={() => setDetail(null)}>
            Close
          </button>
        }
      >
        {detailLoading && <Loading text="Loading stationed vehicles…" />}
        {detail?.error && <ErrorState message={detail.error} />}
        {detail?.vehicles && (
          <div className="card">
            <div className="card-body no-pad">
              {detail.vehicles.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                  No vehicles currently stationed at this branch hub.
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="dt">
                    <thead>
                      <tr>
                        <th>Registration #</th>
                        <th>Make &amp; Model</th>
                        <th>Category</th>
                        <th className="num">Daily Rate</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.vehicles.map((v) => (
                        <tr key={v.vehicle_id}>
                          <td>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                              {v.registration_number}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600 }}>{v.brand} {v.model}</span>
                          </td>
                          <td>{v.type_name}</td>
                          <td className="num">{formatCurrency(v.rental_rate)}</td>
                          <td>
                            <span className={`badge ${statusClass(v.status)}`}>
                              <span className="badge-dot" />
                              {v.status}
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
        )}
      </Modal>

      {/* Confirmation Dialog */}
      <Modal
        open={Boolean(confirmStatus)}
        onClose={() => setConfirmStatus(null)}
        title="Confirm Branch Status Change"
        icon={ShieldAlert}
        size="sm"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setConfirmStatus(null)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={changeStatus} disabled={changing}>
              {changing ? 'Updating…' : 'Confirm'}
            </button>
          </>
        }
      >
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          Are you sure you want to change branch <strong>{confirmStatus?.branch?.branch_name}</strong> to{' '}
          <strong>{confirmStatus?.next}</strong>?
        </p>
      </Modal>
    </div>
  );
}
