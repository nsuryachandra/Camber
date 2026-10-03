import { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Search,
  Wrench,
  CheckCircle2,
  Clock,
  DollarSign,
  AlertTriangle,
  Car,
  X,
  PlayCircle,
  XCircle,
  Calendar,
} from 'lucide-react';
import api from '../services/api';
import useFetch from '../hooks/useFetch';
import Modal from '../components/Modal';
import { Loading, Empty, ErrorState } from '../components/DataState';
import { formatCurrency, formatDate, statusClass } from '../utils/format';
import { useToast } from '../context/ToastContext';

const TYPES = ['SERVICE', 'REPAIR', 'INSPECTION', 'TYRE', 'OTHER'];

const EMPTY_FORM = {
  vehicle_id: '',
  maintenance_type: 'SERVICE',
  description: '',
  maintenance_date: new Date().toISOString().slice(0, 10),
  cost: '',
  service_provider: '',
  next_service_date: '',
};

export default function Maintenance() {
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);

  const query = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), limit: '12' });
    if (search) p.set('search', search);
    if (status) p.set('status', status);
    if (type) p.set('type', type);
    return p.toString();
  }, [search, status, type, page]);

  const { data, loading, error, refetch } = useFetch(`/maintenance?${query}`, [query]);
  const meta = useFetch('/meta/form-data');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [statusFor, setStatusFor] = useState(null);
  const [changing, setChanging] = useState(false);

  const vehicles = Array.isArray(meta.data?.available_vehicles) ? meta.data.available_vehicles : (Array.isArray(meta.data?.vehicles) ? meta.data.vehicles : []);
  const records = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []));
  const pagination = data?.pagination ?? { page: 1, pages: 1, total: 0 };

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (m) => {
    setEditing(m);
    setForm({
      vehicle_id: String(m.vehicle_id),
      maintenance_type: m.maintenance_type,
      description: m.description || '',
      maintenance_date: m.maintenance_date ? String(m.maintenance_date).slice(0, 10) : '',
      cost: String(m.cost ?? ''),
      service_provider: m.service_provider || '',
      next_service_date: m.next_service_date ? String(m.next_service_date).slice(0, 10) : '',
    });
    setFormError('');
    setFormOpen(true);
  };

  const saveRecord = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const payload = {
        vehicle_id: Number(form.vehicle_id),
        maintenance_type: form.maintenance_type,
        description: form.description || undefined,
        maintenance_date: form.maintenance_date,
        cost: form.cost === '' ? 0 : Number(form.cost),
        service_provider: form.service_provider || undefined,
        next_service_date: form.next_service_date || undefined,
      };
      if (editing) {
        await api.put(`/maintenance/${editing.maintenance_id}`, payload);
        toast.success('Maintenance record updated successfully.');
      } else {
        await api.post('/maintenance', payload);
        toast.success('Vehicle logged into maintenance.');
      }
      setFormOpen(false);
      refetch();
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not save maintenance record.';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async () => {
    if (!statusFor) return;
    setChanging(true);
    try {
      await api.patch(`/maintenance/${statusFor.record.maintenance_id}/status`, {
        status: statusFor.next,
      });
      toast.success(`Maintenance status set to ${statusFor.next}.`);
      setStatusFor(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status.');
    } finally {
      setChanging(false);
    }
  };

  const statusFilters = [
    { label: 'All Jobs', value: '' },
    { label: 'Scheduled', value: 'SCHEDULED' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Maintenance &amp; Repairs</h1>
          <p className="page-subtitle">
            Fleet health tracking, workshop workorders, parts replacement, and scheduled servicing.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} />
          <span>Log Service Job</span>
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
              placeholder="Search vehicle, service provider, description..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            {search && (
              <button className="search-clear-btn" onClick={() => setSearch('')} aria-label="Clear">
                <X size={14} />
              </button>
            )}
          </div>

          <select
            className="form-select"
            style={{ width: 140 }}
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content */}
      {loading && <Loading text="Loading maintenance records…" />}
      {error && <ErrorState message={`Failed to load maintenance: ${error}`} onRetry={refetch} />}
      {!loading && !error && records.length === 0 && (
        <Empty message="No maintenance jobs found matching filters.">
          <button className="btn btn-primary" onClick={openAdd} style={{ marginTop: 14 }}>
            <Plus size={15} /> Log First Service
          </button>
        </Empty>
      )}

      {!loading && !error && records.length > 0 && (
        <div className="card">
          <div className="card-body no-pad">
            <div className="table-wrap">
              <table className="dt">
                <thead>
                  <tr>
                    <th>Job Ref</th>
                    <th>Vehicle</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Workshop / Provider</th>
                    <th>Service Date</th>
                    <th className="num">Cost</th>
                    <th>Status</th>
                    <th className="actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((m) => (
                    <tr key={m.maintenance_id}>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>
                          #JOB-{String(m.maintenance_id).padStart(4, '0')}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{m.brand} {m.model}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {m.registration_number}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-booked" style={{ fontSize: 11 }}>
                          {m.maintenance_type}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {m.description || 'Routine Checkup'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{m.service_provider || 'In-house Workshop'}</span>
                      </td>
                      <td>{formatDate(m.maintenance_date)}</td>
                      <td className="num">{formatCurrency(m.cost || 0)}</td>
                      <td>
                        <span className={`badge ${statusClass(m.status)}`}>
                          <span className="badge-dot" />
                          {m.status}
                        </span>
                      </td>
                      <td className="actions">
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            className="btn btn-sm btn-ghost btn-icon"
                            onClick={() => openEdit(m)}
                            title="Edit Job"
                          >
                            <Pencil size={13} />
                          </button>

                          {m.status === 'SCHEDULED' && (
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => setStatusFor({ record: m, next: 'IN_PROGRESS' })}
                            >
                              <PlayCircle size={13} /> Start
                            </button>
                          )}

                          {m.status === 'IN_PROGRESS' && (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => setStatusFor({ record: m, next: 'COMPLETED' })}
                            >
                              <CheckCircle2 size={13} /> Complete
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
      {!loading && !error && data && data.pages > 1 && (
        <div className="pagination" style={{ marginTop: 20, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <span>
            Showing page <strong>{data.page}</strong> of <strong>{data.pages}</strong> ({data.total} service jobs)
          </span>
          <div className="pagination-controls">
            <button
              className="btn btn-sm btn-secondary"
              disabled={data.page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <button
              className="btn btn-sm btn-secondary"
              disabled={data.page >= data.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Maintenance Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit Job #JOB-${String(editing.maintenance_id).padStart(4, '0')}` : 'Log Maintenance Job'}
        subtitle="Record service schedule, repair costs, and workshop notes"
        icon={Wrench}
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" form="maint-form" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Schedule Job'}
            </button>
          </>
        }
      >
        {formError && <div className="state-error-card" style={{ marginBottom: 16 }}>{formError}</div>}
        <form id="maint-form" onSubmit={saveRecord}>
          <div className="form-row">
            <div className="form-group">
              <label>Select Vehicle *</label>
              <select
                className="form-select"
                value={form.vehicle_id}
                onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
                required
              >
                <option value="">-- Choose vehicle --</option>
                {vehicles.map((v) => (
                  <option key={v.vehicle_id} value={v.vehicle_id}>
                    {v.brand} {v.model} ({v.registration_number})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Service Category *</label>
              <select
                className="form-select"
                value={form.maintenance_type}
                onChange={(e) => setForm({ ...form, maintenance_type: e.target.value })}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row" style={{ marginTop: 14 }}>
            <div className="form-group">
              <label>Service Date *</label>
              <input
                type="date"
                className="form-input"
                value={form.maintenance_date}
                onChange={(e) => setForm({ ...form, maintenance_date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Estimated / Final Cost (₹)</label>
              <input
                type="number"
                min="0"
                step="50"
                className="form-input"
                placeholder="0"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row" style={{ marginTop: 14 }}>
            <div className="form-group">
              <label>Service Provider / Workshop</label>
              <input
                className="form-input"
                placeholder="e.g. Authorized Service Center, Apex Tyres"
                value={form.service_provider}
                onChange={(e) => setForm({ ...form, service_provider: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Next Service Date</label>
              <input
                type="date"
                className="form-input"
                value={form.next_service_date}
                onChange={(e) => setForm({ ...form, next_service_date: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 14 }}>
            <label>Workorder Description</label>
            <textarea
              className="form-textarea"
              placeholder="Details of repair, replaced parts, oil change, tyre rotation..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Status Change Confirmation */}
      <Modal
        open={Boolean(statusFor)}
        onClose={() => setStatusFor(null)}
        title="Update Maintenance Status"
        icon={Wrench}
        size="sm"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setStatusFor(null)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={changeStatus} disabled={changing}>
              {changing ? 'Updating…' : 'Confirm Status'}
            </button>
          </>
        }
      >
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          Change status of maintenance job <strong>#JOB-{statusFor?.record?.maintenance_id}</strong> to{' '}
          <strong>{statusFor?.next}</strong>?
        </p>
      </Modal>
    </div>
  );
}
