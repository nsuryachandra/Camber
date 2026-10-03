import { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Mail,
  CreditCard,
  MapPin,
  ShieldCheck,
  Award,
  Calendar,
  DollarSign,
  Save,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import useFetch from '../../hooks/useFetch';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Loading, ErrorState } from '../../components/DataState';
import { formatCurrency, formatDate } from '../../utils/format';

export default function CustomerProfile() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const { data, loading, error, refetch } = useFetch('/customer/profile');

  const [form, setForm] = useState({
    name: '',
    phone: '',
    driving_license_number: '',
    address: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (data?.customer) {
      setForm({
        name: data.customer.name || '',
        phone: data.customer.phone || '',
        driving_license_number: data.customer.driving_license_number || '',
        address: data.customer.address || '',
      });
    }
  }, [data]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (data?.is_staff) {
      if (!form.name.trim()) {
        setFormError('Name is required.');
        return;
      }
      setFormError('');
      setSaving(true);
      try {
        await api.put('/customer/profile', { name: form.name.trim() });
        toast.success('Profile details updated successfully.');
        updateUser({ name: form.name.trim() });
        refetch();
      } catch (err) {
        const msg = err.response?.data?.error || 'Failed to update profile.';
        setFormError(msg);
        toast.error(msg);
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!form.name.trim()) {
      setFormError('Full name is required.');
      return;
    }
    if (!form.phone.trim() || !/^[0-9]{10}$/.test(form.phone.trim())) {
      setFormError('Phone number must be exactly 10 digits.');
      return;
    }
    if (!form.driving_license_number.trim()) {
      setFormError('Driving license number is required.');
      return;
    }

    setFormError('');
    setSaving(true);
    try {
      await api.put('/customer/profile', {
        name: form.name.trim(),
        phone: form.phone.trim(),
        driving_license_number: form.driving_license_number.trim().toUpperCase(),
        address: form.address.trim() || undefined,
      });
      toast.success('Your profile has been updated successfully.');
      updateUser({
        name: form.name.trim(),
        phone: form.phone.trim(),
        driving_license_number: form.driving_license_number.trim().toUpperCase(),
        address: form.address.trim(),
      });
      refetch();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to save profile changes.';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading text="Loading your profile…" />;
  if (error) return <ErrorState message={`Failed to load profile: ${error}`} onRetry={refetch} />;

  const customer = data?.customer || {};
  const stats = data?.stats || { total_trips: 0, total_spent: 0, active_trips: 0, upcoming_trips: 0 };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">
            {data?.is_staff ? 'Staff Profile & Operational Identity' : 'Customer Profile & Preferences'}
          </h1>
          <p className="page-subtitle">
            {data?.is_staff
              ? 'Official CAMBER system credentials and administrative account details.'
              : 'Manage your personal credentials, contact numbers, and driving license on file.'}
          </p>
        </div>
      </div>

      {/* Lifetime Telemetry Bento Cards */}
      <div className="bento-grid" style={{ marginBottom: 28 }}>
        <div className="bento-stat-card primary">
          <div className="bento-stat-header">
            <div className="bento-stat-icon-wrap primary">
              <Calendar size={20} />
            </div>
            <span className="bento-stat-trend positive">{data?.is_staff ? 'Role' : 'Member'}</span>
          </div>
          <div>
            <div className="bento-stat-label">{data?.is_staff ? 'System Role' : 'Total Completed Trips'}</div>
            <div className="bento-stat-value" style={{ fontSize: data?.is_staff ? 20 : 28 }}>
              {data?.is_staff ? (customer.role || user?.role || 'STAFF') : (stats.completed_trips || 0)}
            </div>
            {!data?.is_staff && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {Number(stats.completed_trips || 0) === 0 ? 'No completed journeys yet' : 'Concluded rental journeys'}
              </div>
            )}
          </div>
        </div>

        {!data?.is_staff && (
          <div className="bento-stat-card indigo">
            <div className="bento-stat-header">
              <div className="bento-stat-icon-wrap indigo">
                <ShieldCheck size={20} />
              </div>
              <span className="bento-stat-trend neutral">Fleet</span>
            </div>
            <div>
              <div className="bento-stat-label">Active &amp; Upcoming Trips</div>
              <div className="bento-stat-value" style={{ fontSize: 28 }}>
                {Number(stats.active_trips || 0) + Number(stats.upcoming_trips || 0)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {Number(stats.upcoming_trips || 0) > 0
                  ? `${stats.upcoming_trips} pending/upcoming reservation`
                  : 'No active reservations'}
              </div>
            </div>
          </div>
        )}

        <div className="bento-stat-card emerald">
          <div className="bento-stat-header">
            <div className="bento-stat-icon-wrap emerald">
              <DollarSign size={20} />
            </div>
            <span className="bento-stat-trend positive">{data?.is_staff ? 'Status' : 'Spend'}</span>
          </div>
          <div>
            <div className="bento-stat-label">{data?.is_staff ? 'Account Standing' : 'Lifetime Value Spent'}</div>
            <div className="bento-stat-value" style={{ fontSize: data?.is_staff ? 20 : 28 }}>
              {data?.is_staff ? 'Active Staff' : formatCurrency(stats.total_spent || 0)}
            </div>
            {!data?.is_staff && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {Number(stats.total_spent || 0) > 0 ? 'Total verified cleared payments' : 'No payments settled yet'}
              </div>
            )}
          </div>
        </div>

        <div className="bento-stat-card indigo">
          <div className="bento-stat-header">
            <div className="bento-stat-icon-wrap indigo">
              <Award size={20} />
            </div>
            <span className="bento-stat-trend neutral">Clearance</span>
          </div>
          <div>
            <div className="bento-stat-label">Security Tier</div>
            <div className="bento-stat-value" style={{ fontSize: 18, marginTop: 4 }}>
              {data?.is_staff ? (
                <span className="badge badge-primary">
                  <ShieldCheck size={12} /> Staff Operational Clearance
                </span>
              ) : (
                <span className="badge badge-available">
                  <CheckCircle2 size={12} /> Verified Renter
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Form Card */}
      <div className="card" style={{ padding: 24 }}>
        <div className="card-header" style={{ marginBottom: 20, paddingBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'var(--primary-subtle)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <User size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16 }}>Personal &amp; Driver Details</h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                Registered on {formatDate(customer.registration_date)}
              </p>
            </div>
          </div>
        </div>

        {formError && (
          <div className="state-error-card" style={{ marginBottom: 18 }}>
            <AlertCircle size={15} />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSave}>
          {data?.is_staff ? (
            <div>
              <div className="form-row">
                <div className="form-group">
                  <label>Staff Member Name *</label>
                  <div className="search-input-wrap" style={{ width: '100%' }}>
                    <User size={15} className="search-icon" />
                    <input
                      type="text"
                      className="form-input"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      disabled={saving}
                      style={{ width: '100%' }}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Operations Email (Staff ID)</label>
                  <div className="search-input-wrap" style={{ width: '100%' }}>
                    <Mail size={15} className="search-icon" />
                    <input
                      type="email"
                      className="form-input"
                      value={customer.email || user?.email || ''}
                      disabled
                      style={{ width: '100%', background: 'var(--surface-sunken)' }}
                    />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Assigned System Role</label>
                  <input
                    type="text"
                    className="form-input"
                    value={`${customer.role || user?.role || 'STAFF'} Clearance`}
                    disabled
                    style={{ width: '100%', background: 'var(--surface-sunken)', fontWeight: 600 }}
                  />
                </div>
                <div className="form-group">
                  <label>Operational Hub</label>
                  <input
                    type="text"
                    className="form-input"
                    value="CAMBER Fleet Operations Desk"
                    disabled
                    style={{ width: '100%', background: 'var(--surface-sunken)' }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Legal Name *</label>
                  <div className="search-input-wrap" style={{ width: '100%' }}>
                    <User size={15} className="search-icon" />
                    <input
                      type="text"
                      className="form-input"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      disabled={saving}
                      style={{ width: '100%' }}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Account Email (Primary ID)</label>
                  <div className="search-input-wrap" style={{ width: '100%' }}>
                    <Mail size={15} className="search-icon" />
                    <input
                      type="email"
                      className="form-input"
                      value={customer.email || user?.email || ''}
                      disabled
                      style={{ width: '100%', background: 'var(--surface-sunken)' }}
                    />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>10-Digit Mobile Number *</label>
                  <div className="search-input-wrap" style={{ width: '100%' }}>
                    <Phone size={15} className="search-icon" />
                    <input
                      type="tel"
                      className="form-input"
                      maxLength={10}
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      disabled={saving}
                      style={{ width: '100%' }}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Driving License Number *</label>
                  <div className="search-input-wrap" style={{ width: '100%' }}>
                    <CreditCard size={15} className="search-icon" />
                    <input
                      type="text"
                      className="form-input"
                      value={form.driving_license_number}
                      onChange={(e) => setForm({ ...form, driving_license_number: e.target.value })}
                      disabled={saving}
                      style={{ width: '100%' }}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 24 }}>
                <label>Residential City &amp; Address</label>
                <div className="search-input-wrap" style={{ width: '100%' }}>
                  <MapPin size={15} className="search-icon" />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Plot 24, Koramangala, Bengaluru"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    disabled={saving}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={15} />
              <span>{saving ? 'Saving Changes…' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
