import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Zap,
  ShieldCheck,
  User,
  ArrowRight,
  Lock,
  Mail,
  Phone,
  CreditCard,
  MapPin,
  AlertCircle,
  Car,
  Compass,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Login() {
  const { login, registerCustomer } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // 'customer' | 'staff'
  const [activeTab, setActiveTab] = useState('customer');
  // 'signin' | 'signup' (only applies to customer tab)
  const [customerMode, setCustomerMode] = useState('signin');

  // Sign in fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Sign up fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regLicense, setRegLicense] = useState('');
  const [regAddress, setRegAddress] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const user = await login(email.trim().toLowerCase(), password);
      toast.success(`Welcome back, ${user.name}!`);
      if (user.role === 'ADMIN' || user.role === 'STAFF') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Unable to sign in. Please check your email and password.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regName.trim()) {
      setError('Full name is required.');
      return;
    }
    if (!regPhone.trim() || !/^[0-9]{10}$/.test(regPhone.trim())) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!regLicense.trim()) {
      setError('Driving license number is required for vehicle rentals.');
      return;
    }
    if (!regEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const user = await registerCustomer({
        name: regName.trim(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        phone: regPhone.trim(),
        driving_license_number: regLicense.trim().toUpperCase(),
        address: regAddress.trim() || undefined,
      });
      toast.success(`Welcome to FleetPro, ${user.name}! Your account is ready.`);
      navigate('/');
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Registration failed. Please check your information.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="login-page">
      <div className="login-card animate-scale-up" style={{ maxWidth: activeTab === 'customer' && customerMode === 'signup' ? 520 : 440 }}>
        {/* Brand Header */}
        <div className="login-brand">
          <div className="login-brand-icon">
            <Zap size={24} />
          </div>
          <h1 className="login-brand-name">FleetPro</h1>
          <p className="login-sub">Modern Two-Sided Fleet &amp; Mobility Hub</p>
        </div>

        {/* Portal Selection Tabs (21st.dev segmented pill) */}
        <div className="segmented-control" style={{ marginBottom: 20, width: '100%' }}>
          <button
            type="button"
            className={`pill-tab ${activeTab === 'customer' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('customer');
              setError('');
            }}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <User size={14} /> Customer Portal
          </button>
          <button
            type="button"
            className={`pill-tab ${activeTab === 'staff' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('staff');
              setError('');
            }}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <ShieldCheck size={14} /> Admin / Staff
          </button>
        </div>

        {/* Sub toggle for Customer: Sign In vs Sign Up */}
        {activeTab === 'customer' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
            <button
              type="button"
              className={`btn btn-sm ${customerMode === 'signin' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setCustomerMode('signin'); setError(''); }}
              style={{ flex: 1 }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`btn btn-sm ${customerMode === 'signup' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setCustomerMode('signup'); setError(''); }}
              style={{ flex: 1 }}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="state-error-card" style={{ marginBottom: 18 }}>
            <AlertCircle size={16} />
            <span style={{ fontSize: 13 }}>{error}</span>
          </div>
        )}

        {/* ===================== CUSTOMER SIGN UP FORM ===================== */}
        {activeTab === 'customer' && customerMode === 'signup' && (
          <form onSubmit={handleRegister} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group">
              <label>Full Name *</label>
              <div className="search-input-wrap" style={{ width: '100%' }}>
                <User size={15} className="search-icon" />
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Aarav Sharma"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  disabled={submitting}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>10-Digit Mobile # *</label>
                <div className="search-input-wrap" style={{ width: '100%' }}>
                  <Phone size={15} className="search-icon" />
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="9876543210"
                    maxLength={10}
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    disabled={submitting}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Driving License # *</label>
                <div className="search-input-wrap" style={{ width: '100%' }}>
                  <CreditCard size={15} className="search-icon" />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="KA052021001234"
                    value={regLicense}
                    onChange={(e) => setRegLicense(e.target.value)}
                    disabled={submitting}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>City &amp; Residential Address</label>
              <div className="search-input-wrap" style={{ width: '100%' }}>
                <MapPin size={15} className="search-icon" />
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Indiranagar, Bengaluru"
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                  disabled={submitting}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email Address *</label>
              <div className="search-input-wrap" style={{ width: '100%' }}>
                <Mail size={15} className="search-icon" />
                <input
                  type="email"
                  className="form-input"
                  placeholder="aarav@gmail.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  disabled={submitting}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Create Password *</label>
              <div className="search-input-wrap" style={{ width: '100%' }}>
                <Lock size={15} className="search-icon" />
                <input
                  type="password"
                  className="form-input"
                  placeholder="At least 6 characters"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  disabled={submitting}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={submitting}
              style={{ width: '100%', marginTop: 8 }}
            >
              {submitting ? 'Creating Profile…' : 'Complete Registration & Start Booking'}
              {!submitting && <ArrowRight size={16} />}
            </button>
          </form>
        )}

        {/* ===================== SIGN IN FORM (Customer & Staff) ===================== */}
        {((activeTab === 'customer' && customerMode === 'signin') || activeTab === 'staff') && (
          <form onSubmit={handleSignIn} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <div className="form-group">
              <label htmlFor="email">
                {activeTab === 'staff' ? 'Enterprise Staff Email' : 'Customer Account Email'}
              </label>
              <div className="search-input-wrap" style={{ width: '100%' }}>
                <Mail size={15} className="search-icon" />
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder={activeTab === 'staff' ? 'admin@fleetpro.in' : 'your.email@gmail.com'}
                  value={email}
                  autoComplete="username"
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Security Password</label>
              <div className="search-input-wrap" style={{ width: '100%' }}>
                <Lock size={15} className="search-icon" />
                <input
                  id="password"
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={submitting}
              style={{ width: '100%', marginTop: 6 }}
            >
              {submitting ? 'Authenticating…' : (activeTab === 'staff' ? 'Enter Operations Console' : 'Sign into Customer Portal')}
              {!submitting && <ArrowRight size={16} />}
            </button>
          </form>
        )}

        {/* Staff Quick Demo Credentials Box */}
        {activeTab === 'staff' && (
          <div className="login-demo-box">
            <div className="login-demo-label">1-Click Staff Demo Credentials</div>
            <div className="login-demo-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fillStaffDemo('admin@fleetpro.in', 'Admin@123')}
                style={{ flex: 1 }}
              >
                <ShieldCheck size={14} style={{ color: 'var(--primary)' }} />
                <span>Admin Login</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fillStaffDemo('staff@fleetpro.in', 'Admin@123')}
                style={{ flex: 1 }}
              >
                <User size={14} style={{ color: 'var(--emerald)' }} />
                <span>Staff Login</span>
              </button>
            </div>
          </div>
        )}

        {/* Guest Browse Fleet Link */}
        <div style={{ marginTop: 20, textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <Link
            to="/"
            style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            <Compass size={14} style={{ color: 'var(--primary)' }} />
            <span>Explore Vehicle Showroom as Guest &rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
