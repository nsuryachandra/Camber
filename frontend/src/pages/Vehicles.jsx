import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Eye,
  Power,
  Search,
  LayoutGrid,
  List,
  Fuel,
  Settings2,
  Users as UsersIcon,
  Building2,
  Car,
  X,
  ShieldAlert,
  Zap,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import api from '../services/api';
import useFetch from '../hooks/useFetch';
import Modal from '../components/Modal';
import { Loading, Empty, ErrorState } from '../components/DataState';
import { formatCurrency, formatDate, statusClass } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getVehicleImage } from '../utils/vehicleImages';

const EMPTY_FORM = {
  registration_number: '',
  brand: '',
  model: '',
  vehicle_type_id: '',
  manufacturing_year: '',
  fuel_type: 'PETROL',
  transmission: 'MANUAL',
  seating_capacity: '5',
  rental_rate: '',
  branch_id: '',
};

export default function Vehicles() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'ADMIN';
  const [searchParams] = useSearchParams();

  // List + filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [branch, setBranch] = useState('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  const query = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), limit: '12' });
    if (search) p.set('search', search);
    if (status) p.set('status', status);
    if (type) p.set('type', type);
    if (branch) p.set('branch', branch);
    return p.toString();
  }, [search, status, type, branch, page]);

  const { data, loading, error, refetch } = useFetch(`/vehicles?${query}`, [query]);
  const meta = useFetch('/meta/form-data');

  // Modals
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

  const openEdit = (v) => {
    setEditing(v);
    setForm({
      registration_number: v.registration_number,
      brand: v.brand,
      model: v.model,
      vehicle_type_id: String(v.vehicle_type_id),
      manufacturing_year: String(v.manufacturing_year),
      fuel_type: v.fuel_type,
      transmission: v.transmission,
      seating_capacity: String(v.seating_capacity),
      rental_rate: String(v.rental_rate),
      branch_id: String(v.branch_id),
    });
    setFormError('');
    setFormOpen(true);
  };

  const openDetail = async (id) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/vehicles/${id}`);
      setDetail(res.data);
    } catch (err) {
      setDetail({ error: err.response?.data?.error || 'Failed to load vehicle details.' });
    } finally {
      setDetailLoading(false);
    }
  };

  const saveVehicle = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        vehicle_type_id: Number(form.vehicle_type_id),
        manufacturing_year: Number(form.manufacturing_year),
        seating_capacity: Number(form.seating_capacity),
        rental_rate: Number(form.rental_rate),
        branch_id: Number(form.branch_id),
      };
      if (editing) {
        await api.put(`/vehicles/${editing.vehicle_id}`, payload);
        toast.success(`Vehicle ${form.brand} ${form.model} updated successfully.`);
      } else {
        await api.post('/vehicles', payload);
        toast.success(`Vehicle ${form.brand} ${form.model} added to fleet.`);
      }
      setFormOpen(false);
      refetch();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to save vehicle.');
      toast.error(err.response?.data?.error || 'Failed to save vehicle.');
    } finally {
      setSaving(false);
    }
  };

  const applyStatus = async () => {
    if (!confirmStatus) return;
    try {
      await api.patch(`/vehicles/${confirmStatus.vehicle.vehicle_id}/status`, {
        status: confirmStatus.next,
      });
      toast.success(`Vehicle status changed to ${confirmStatus.next}.`);
      setConfirmStatus(null);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update vehicle status.');
    }
  };

  const statusFilters = [
    { label: 'All Fleet', value: '' },
    { label: 'Available', value: 'AVAILABLE' },
    { label: 'Rented', value: 'RENTED' },
    { label: 'Maintenance', value: 'MAINTENANCE' },
    { label: 'Inactive', value: 'INACTIVE' },
  ];

  const vehicles = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []));
  const pagination = data?.pagination ?? { page: 1, pages: 1, total: 0 };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Fleet &amp; Vehicles</h1>
          <p className="page-subtitle">
            Inventory, specifications, rental rates, and operational status across all branches.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} />
          <span>Add New Vehicle</span>
        </button>
      </div>

      {/* Segmented Status Pill Bar & Filters */}
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

          {/* Search Box */}
          <div className="search-input-wrap">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              className="form-input"
              placeholder="Search make, model, reg #..."
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

          {/* Category Filter */}
          <select
            className="form-select"
            style={{ width: 140 }}
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Categories</option>
            {(meta.data?.vehicle_types || []).map((t) => (
              <option key={t.vehicle_type_id} value={t.vehicle_type_id}>
                {t.type_name}
              </option>
            ))}
          </select>

          {/* Branch Filter */}
          <select
            className="form-select"
            style={{ width: 150 }}
            value={branch}
            onChange={(e) => {
              setBranch(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Branches</option>
            {(meta.data?.branches || []).map((b) => (
              <option key={b.branch_id} value={b.branch_id}>
                {b.branch_name}
              </option>
            ))}
          </select>
        </div>

        {/* View Mode Toggle */}
        <div className="toolbar-right">
          <div className="view-mode-toggle">
            <button
              className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading && <Loading text="Loading vehicles..." />}
      {error && <ErrorState message={`Failed to load vehicles: ${error}`} onRetry={refetch} />}
      {!loading && !error && vehicles.length === 0 && (
        <Empty message="No vehicles found in fleet.">
          <button className="btn btn-primary" onClick={openAdd} style={{ marginTop: 14 }}>
            <Plus size={15} /> Add First Vehicle
          </button>
        </Empty>
      )}

      {/* Grid Cards View */}
      {!loading && !error && vehicles.length > 0 && viewMode === 'grid' && (
        <div className="vehicle-grid">
          {vehicles.map((v, idx) => {
            const fuel = v.fuel_type?.toUpperCase();
            const type = (v.type_name || '').toLowerCase();
            let cat = {
              theme: 'theme-sedan',
              pillClass: 'pill-suv',
              label: v.type_name || 'Fleet',
              watermark: 'FLEET',
            };
            if (fuel === 'ELECTRIC') {
              cat = { theme: 'theme-electric', pillClass: 'pill-electric', label: '⚡ Electric EV', watermark: 'EV' };
            } else if (type.includes('suv')) {
              cat = { theme: 'theme-suv', pillClass: 'pill-suv', label: '🛡️ SUV', watermark: 'SUV' };
            } else if (type.includes('luxury')) {
              cat = { theme: 'theme-luxury', pillClass: 'pill-luxury', label: '✨ Luxury', watermark: 'LUX' };
            } else if (type.includes('sedan')) {
              cat = { theme: 'theme-sedan', pillClass: 'pill-sedan', label: '🚗 Sedan', watermark: 'SEDAN' };
            } else if (type.includes('muv') || type.includes('van') || Number(v.seating_capacity) > 5) {
              cat = { theme: 'theme-luxury', pillClass: 'pill-luxury', label: 'Multi-Seater', watermark: 'MPV' };
            }
            const CatIcon = fuel === 'ELECTRIC' ? Zap : (type.includes('suv') ? ShieldCheck : (type.includes('luxury') ? Sparkles : (type.includes('muv') || Number(v.seating_capacity) > 5 ? UsersIcon : Car)));

            return (
              <div
                key={v.vehicle_id}
                className="vehicle-card"
                style={{ animationDelay: `${idx * 0.04}s` }}
              >
                {/* Category Ambient Showcase Banner */}
                <div className={`vehicle-card-banner ${cat.theme}`}>
                  <div className="vehicle-card-banner-top">
                    <span className={`vehicle-category-pill ${cat.pillClass}`}>
                      <CatIcon size={12} strokeWidth={2.2} />
                      <span>{v.type_name || 'Fleet'}</span>
                    </span>
                    <span className="vehicle-card-year-badge">
                      {v.manufacturing_year} Model
                    </span>
                  </div>

                  {/* Authentic Real Photographic Image */}
                  <div className="vehicle-photo-wrapper">
                    <img
                      src={getVehicleImage(v)}
                      alt={`${v.brand} ${v.model}`}
                      className="vehicle-real-photo"
                      loading="lazy"
                    />
                  </div>
                </div>

                <div className="vehicle-card-body">
                  <div className="vehicle-card-top">
                    <div>
                      <div className="vehicle-card-brand">{v.brand}</div>
                      <div className="vehicle-card-brand-model">{v.model}</div>
                      <div className="vehicle-card-reg">{v.registration_number}</div>
                    </div>
                    <span className={`badge ${statusClass(v.status)}`}>
                      <span className="badge-dot" />
                      {v.status}
                    </span>
                  </div>

                  <div className="vehicle-card-specs-clean">
                    <span className="spec-chip-tactile">
                      {fuel === 'ELECTRIC' ? <Zap size={12} style={{ color: '#059669' }} /> : <Fuel size={12} style={{ color: '#2563eb' }} />}
                      <span>{v.fuel_type}</span>
                    </span>
                    <span className="spec-chip-tactile">
                      <Settings2 size={12} style={{ color: '#2563eb' }} />
                      <span>{v.transmission}</span>
                    </span>
                    <span className="spec-chip-tactile">
                      <UsersIcon size={12} style={{ color: '#2563eb' }} />
                      <span>{v.seating_capacity} Seats</span>
                    </span>
                  </div>

                  <div className="vehicle-card-branch-clean">
                    <Building2 size={13} style={{ color: '#94a3b8' }} />
                    <span>{v.branch_name} • {v.city}</span>
                  </div>
                </div>

                {/* Card Pricing & Action Buttons Bar */}
                <div className="vehicle-card-footer" style={{ padding: '12px 16px', background: '#ffffff', borderTop: '1px solid #f1f5f9' }}>
                  <div className="vehicle-card-price">
                    <span className="price-val" style={{ fontSize: 18 }}>{formatCurrency(v.rental_rate)}</span>
                    <span className="price-unit"> / day</span>
                  </div>

                  <div className="vehicle-card-actions" style={{ gap: 6 }}>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => openDetail(v.vehicle_id)}
                      title="View complete specifications & telemetry"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 11px' }}
                    >
                      <Eye size={13} />
                      <span>Details</span>
                    </button>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => openEdit(v)}
                      title="Edit vehicle specifications"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 11px' }}
                    >
                      <Pencil size={13} />
                      <span>Edit</span>
                    </button>
                    {isAdmin && (
                      <button
                        className={`btn btn-sm ${v.status === 'INACTIVE' ? 'btn-secondary' : 'btn-secondary'}`}
                        onClick={() =>
                          setConfirmStatus({
                            vehicle: v,
                            next: v.status === 'INACTIVE' ? 'AVAILABLE' : 'INACTIVE',
                          })
                        }
                        title={v.status === 'INACTIVE' ? 'Activate vehicle' : 'Deactivate vehicle'}
                        style={{ padding: '7px 9px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Power size={13} color={v.status === 'INACTIVE' ? '#059669' : '#e11d48'} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {!loading && !error && vehicles.length > 0 && viewMode === 'table' && (
        <div className="card">
          <div className="card-body no-pad">
            <div className="table-wrap">
              <table className="dt">
                <thead>
                  <tr>
                    <th>Registration</th>
                    <th>Make &amp; Model</th>
                    <th>Category</th>
                    <th>Specs</th>
                    <th>Branch</th>
                    <th className="num">Daily Rate</th>
                    <th>Status</th>
                    <th className="actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v) => (
                    <tr key={v.vehicle_id}>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          {v.registration_number}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{v.brand} {v.model}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Year {v.manufacturing_year}</div>
                      </td>
                      <td><span className="badge badge-booked">{v.type_name}</span></td>
                      <td>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {v.fuel_type} • {v.transmission} • {v.seating_capacity} seats
                        </div>
                      </td>
                      <td>{v.branch_name}</td>
                      <td className="num">{formatCurrency(v.rental_rate)}</td>
                      <td>
                        <span className={`badge ${statusClass(v.status)}`}>
                          <span className="badge-dot" />
                          {v.status}
                        </span>
                      </td>
                      <td className="actions">
                        <div style={{ display: 'inline-flex', gap: 4 }}>
                          <button className="btn btn-sm btn-ghost btn-icon" onClick={() => openDetail(v.vehicle_id)} title="View details">
                            <Eye size={14} />
                          </button>
                          <button className="btn btn-sm btn-ghost btn-icon" onClick={() => openEdit(v)} title="Edit">
                            <Pencil size={14} />
                          </button>
                          {isAdmin && (
                            <button
                              className="btn btn-sm btn-ghost btn-icon"
                              onClick={() =>
                                setConfirmStatus({
                                  vehicle: v,
                                  next: v.status === 'INACTIVE' ? 'AVAILABLE' : 'INACTIVE',
                                })
                              }
                              title={v.status === 'INACTIVE' ? 'Activate' : 'Deactivate'}
                            >
                              <Power size={14} color={v.status === 'INACTIVE' ? 'var(--emerald)' : 'var(--rose)'} />
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

      {/* Pagination Bar */}
      {!loading && !error && pagination.pages > 1 && (
        <div className="pagination" style={{ marginTop: 20, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <span>
            Showing page <strong>{pagination.page}</strong> of <strong>{pagination.pages}</strong> ({pagination.total} vehicles)
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

      {/* Add / Edit Vehicle Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit ${editing.brand} ${editing.model}` : 'Add New Vehicle'}
        subtitle={editing ? 'Update vehicle attributes and pricing' : 'Register a new vehicle to the active fleet'}
        icon={Car}
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" type="button" onClick={() => setFormOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" form="vehicle-form" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Register Vehicle'}
            </button>
          </>
        }
      >
        {formError && <div className="state-error-card" style={{ marginBottom: 16 }}>{formError}</div>}
        <form id="vehicle-form" onSubmit={saveVehicle}>
          <div className="form-row">
            <div className="form-group">
              <label>Registration Number *</label>
              <input
                className="form-input"
                placeholder="e.g. MH12AB1234"
                value={form.registration_number}
                onChange={(e) => setForm({ ...form, registration_number: e.target.value.toUpperCase() })}
                required
              />
            </div>
            <div className="form-group">
              <label>Vehicle Category *</label>
              <select
                className="form-select"
                value={form.vehicle_type_id}
                onChange={(e) => setForm({ ...form, vehicle_type_id: e.target.value })}
                required
              >
                <option value="">Select Category</option>
                {(meta.data?.vehicle_types || []).map((t) => (
                  <option key={t.vehicle_type_id} value={t.vehicle_type_id}>
                    {t.type_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row" style={{ marginTop: 14 }}>
            <div className="form-group">
              <label>Brand / Make *</label>
              <input
                className="form-input"
                placeholder="e.g. Hyundai, Toyota, Tata"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Model *</label>
              <input
                className="form-input"
                placeholder="e.g. Creta SX, Innova Crysta"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row-3" style={{ marginTop: 14 }}>
            <div className="form-group">
              <label>Fuel Type *</label>
              <select
                className="form-select"
                value={form.fuel_type}
                onChange={(e) => setForm({ ...form, fuel_type: e.target.value })}
              >
                <option value="PETROL">Petrol</option>
                <option value="DIESEL">Diesel</option>
                <option value="ELECTRIC">Electric</option>
                <option value="HYBRID">Hybrid</option>
                <option value="CNG">CNG</option>
              </select>
            </div>
            <div className="form-group">
              <label>Transmission *</label>
              <select
                className="form-select"
                value={form.transmission}
                onChange={(e) => setForm({ ...form, transmission: e.target.value })}
              >
                <option value="MANUAL">Manual</option>
                <option value="AUTOMATIC">Automatic</option>
              </select>
            </div>
            <div className="form-group">
              <label>Seats *</label>
              <input
                type="number"
                min="2"
                max="12"
                className="form-input"
                value={form.seating_capacity}
                onChange={(e) => setForm({ ...form, seating_capacity: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row-3" style={{ marginTop: 14 }}>
            <div className="form-group">
              <label>Mfg. Year *</label>
              <input
                type="number"
                min="2000"
                max="2030"
                className="form-input"
                placeholder="2024"
                value={form.manufacturing_year}
                onChange={(e) => setForm({ ...form, manufacturing_year: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Daily Rental Rate (₹) *</label>
              <input
                type="number"
                min="100"
                step="50"
                className="form-input"
                placeholder="2500"
                value={form.rental_rate}
                onChange={(e) => setForm({ ...form, rental_rate: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Assigned Branch *</label>
              <select
                className="form-select"
                value={form.branch_id}
                onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                required
              >
                <option value="">Select Branch</option>
                {(meta.data?.branches || []).map((b) => (
                  <option key={b.branch_id} value={b.branch_id}>
                    {b.branch_name} ({b.city})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* Vehicle Details Drawer Modal */}
      <Modal
        open={Boolean(detail || detailLoading)}
        onClose={() => setDetail(null)}
        title={detail?.vehicle?.brand ? `${detail.vehicle.brand} ${detail.vehicle.model}` : 'Vehicle Details'}
        subtitle={detail?.vehicle?.registration_number}
        icon={Car}
        size="lg"
        footer={
          <button className="btn btn-secondary" onClick={() => setDetail(null)}>
            Close
          </button>
        }
      >
        {detailLoading && <Loading text="Loading vehicle history…" />}
        {detail?.error && <ErrorState message={detail.error} />}
        {detail?.vehicle && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Quick Specs Grid */}
            <div className="bento-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div className="summary-card" style={{ padding: 14 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Daily Rate</span>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)', marginTop: 4 }}>
                  {formatCurrency(detail.vehicle.rental_rate)}
                </div>
              </div>
              <div className="summary-card" style={{ padding: 14 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Current Status</span>
                <div style={{ marginTop: 4 }}>
                  <span className={`badge ${statusClass(detail.vehicle.status)}`}>
                    <span className="badge-dot" />
                    {detail.vehicle.status}
                  </span>
                </div>
              </div>
              <div className="summary-card" style={{ padding: 14 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Branch Hub</span>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>
                  {detail.vehicle.branch_name}
                </div>
              </div>
            </div>

            {/* Rental History */}
            <div className="card">
              <div className="card-header">
                <h3>Recent Rental History</h3>
              </div>
              <div className="card-body no-pad">
                {(detail.rental_history || []).length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    No prior rental trips recorded for this vehicle.
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table className="dt">
                      <thead>
                        <tr>
                          <th>Rental #</th>
                          <th>Customer</th>
                          <th>Pickup</th>
                          <th>Return</th>
                          <th className="num">Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.rental_history.map((rh) => (
                          <tr key={rh.rental_id}>
                            <td>#{rh.rental_id}</td>
                            <td>{rh.customer_name}</td>
                            <td>{formatDate(rh.pickup_date)}</td>
                            <td>{formatDate(rh.return_date || rh.expected_return_date)}</td>
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

      {/* Confirmation Dialog for Status Switch */}
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
          Are you sure you want to set vehicle{' '}
          <strong>
            {confirmStatus?.vehicle?.brand} {confirmStatus?.vehicle?.model} ({confirmStatus?.vehicle?.registration_number})
          </strong>{' '}
          to status <strong>{confirmStatus?.next}</strong>?
        </p>
      </Modal>
    </div>
  );
}
