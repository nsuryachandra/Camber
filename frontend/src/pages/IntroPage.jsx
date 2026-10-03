import { useState, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import VehicleIntro from '../components/cinematic/VehicleIntro';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Zap, ShieldCheck, User, ArrowRight, Lock, Mail, Phone,
  CreditCard, MapPin, AlertCircle, Compass, RotateCcw, Sparkles,
  Car, Database, Activity, Key
} from 'lucide-react';

/* ── Precision floating label input with automotive instrument aesthetic ── */
function FloatInput({ label, icon: Icon, type = 'text', value, onChange, disabled, autoComplete, maxLength }) {
  const [focused, setFocused] = useState(false);
  const filled = value && value.length > 0;
  const active = focused || filled;

  return (
    <div className={`cb-input-wrap ${focused ? 'wrap-focused' : ''} ${filled ? 'wrap-filled' : ''}`}>
      {/* Outer ambient blur glow aura */}
      <div className="cb-input-ambient-glow" />
      {/* Precision razor laser contour line */}
      <div className="cb-input-laser-border" />

      <div className={`cb-input-box ${focused ? 'cb-focused' : ''} ${filled ? 'cb-filled' : ''}`}>
        <div className="cb-input-icon">
          <Icon size={16} />
        </div>
        <div className="cb-input-core">
          <label className={`cb-input-label ${active ? 'cb-label-floated' : ''}`}>{label}</label>
          <input
            type={type}
            value={value}
            onChange={onChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={disabled}
            autoComplete={autoComplete}
            maxLength={maxLength}
            className="cb-native-input"
          />
        </div>
      </div>
    </div>
  );
}

export default function IntroPage() {
  const { login, registerCustomer } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const isDirectLogin = location.pathname === '/login';
  const [stage, setStage] = useState(isDirectLogin ? 'auth' : 'intro');
  const [activeTab, setActiveTab] = useState('customer');
  const [customerMode, setCustomerMode] = useState('signin');
  const [animKey, setAnimKey] = useState(0);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regLicense, setRegLicense] = useState('');
  const [regAddress, setRegAddress] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleIntroComplete = () => {
    if (stage === 'auth' || stage === 'transitioning') return;
    setStage('transitioning');
    setTimeout(() => { setStage('auth'); window.scrollTo({ top: 0, behavior: 'instant' }); }, 450);
  };

  const switchTab = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab); setError(''); setAnimKey(k => k + 1);
  };

  const switchMode = (mode) => {
    if (mode === customerMode) return;
    setCustomerMode(mode); setError(''); setAnimKey(k => k + 1);
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email address.'); return; }
    if (!password) { setError('Password is required.'); return; }
    setError(''); setSubmitting(true);
    try {
      const u = await login(email.trim().toLowerCase(), password);
      toast.success(`Welcome back, ${u.name}!`);
      navigate(u.role === 'ADMIN' || u.role === 'STAFF' ? '/admin' : '/fleet');
    } catch (err) {
      const msg = err.response?.data?.error || (err.response?.status === 401 ? 'Invalid email or password. Please verify your credentials.' : 'Unable to sign in. Please try again.');
      setError(msg);
      toast.error(msg);
    }
    finally { setSubmitting(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regName.trim()) { setError('Full name is required.'); return; }
    if (!/^[0-9]{10}$/.test(regPhone.trim())) { setError('Enter a valid 10-digit mobile number.'); return; }
    if (!regLicense.trim()) { setError('Driving license is required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) { setError('Enter a valid email address.'); return; }
    if (!regPassword || regPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setError(''); setSubmitting(true);
    try {
      const u = await registerCustomer({
        name: regName.trim(), email: regEmail.trim().toLowerCase(), password: regPassword,
        phone: regPhone.trim(), driving_license_number: regLicense.trim().toUpperCase(),
        address: regAddress.trim() || undefined,
      });
      toast.success(`Account created! Welcome, ${u.name}!`);
      navigate('/fleet');
    } catch (err) {
      const msg = err.response?.data?.error || (err.response?.status === 409 ? 'An account with this email or mobile is already registered.' : 'Registration failed.');
      setError(msg);
      toast.error(msg);
    }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', background: '#f8fafc', overflowX: 'hidden' }}>
      {stage !== 'auth' && <VehicleIntro onComplete={handleIntroComplete} onSkip={handleIntroComplete} />}

      {stage === 'transitioning' && (
        <div className="intro-wipe-curtain" />
      )}

      {stage === 'auth' && (
        <div className="cb-scene">
          {/* Subtle architectural dot grid & ambient highway light sweeps */}
          <div className="cb-grid-mesh" />
          <div className="cb-ambient-radial" />
          <div className="cb-gold-accent-blur" />

          {/* Master 2-Pane Console Container */}
          <div className="cb-stage-card">

            {/* PANE 1: LUXURY AUTOMOTIVE STUDIO SHOWCASE */}
            <div className="cb-studio-pane">
              {/* Studio Daylight Vehicle Visual */}
              <div className="cb-studio-media">
                <img
                  src="/studio_hero_real.jpg"
                  alt="Camber Fleet Executive Studio"
                  className="cb-studio-img"
                />
                <div className="cb-studio-gradient-overlay" />
                <div className="cb-studio-sheen" />
              </div>

              {/* Floating Top Bar Over Studio */}
              <div className="cb-studio-top">
                <div className="cb-glass-brand">
                  <img
                    src="/Camber.png"
                    alt="CAMBER"
                    className="cb-studio-logo"
                  />
                </div>

                <div className="cb-studio-top-actions">
                  <button
                    type="button"
                    className="cb-replay-glass-btn"
                    onClick={() => { setStage('intro'); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                    title="Replay cinematic experience"
                  >
                    <RotateCcw size={12} />
                    <span>Replay</span>
                  </button>
                </div>
              </div>

              {/* Bottom Frosted Glass Showcase Dock */}
              <div className="cb-studio-dock">
                <div className="cb-dock-item">
                  <div className="cb-dock-val">50+ CARS</div>
                  <div className="cb-dock-lbl">Luxury & Electric</div>
                </div>
                <div className="cb-dock-sep" />
                <div className="cb-dock-item">
                  <div className="cb-dock-val">INSTANT</div>
                  <div className="cb-dock-lbl">Verified Rentals</div>
                </div>
                <div className="cb-dock-sep" />
                <div className="cb-dock-item">
                  <div className="cb-dock-val">3 CITIES</div>
                  <div className="cb-dock-lbl">BLR • BOM • HYD</div>
                </div>
              </div>
            </div>

            {/* PANE 2: AUTHENTICATION CONSOLE */}
            <div className="cb-terminal-pane">
              
              {/* Refined Single Segmented Mode Controller */}
              <div className="cb-role-switcher">
                <button
                  type="button"
                  className={`cb-role-btn ${activeTab === 'customer' ? 'active' : ''}`}
                  onClick={() => switchTab('customer')}
                >
                  <Car size={15} />
                  <span>Customer</span>
                </button>
                <button
                  type="button"
                  className={`cb-role-btn ${activeTab === 'staff' ? 'active' : ''}`}
                  onClick={() => switchTab('staff')}
                >
                  <ShieldCheck size={15} />
                  <span>Admin / Staff</span>
                </button>
              </div>

              {/* Terminal Heading & Seamless Mode Switch */}
              <div className="cb-terminal-header">
                <div className="cb-title-row">
                  <h2 className="cb-term-title">
                    {activeTab === 'staff'
                      ? 'Staff & Admin Login'
                      : customerMode === 'signup'
                        ? 'Create an Account'
                        : 'Welcome Back'}
                  </h2>
                </div>

                <div className="cb-subtitle-row">
                  {activeTab === 'staff' ? (
                    <p className="cb-term-sub">
                      Sign in to manage fleet vehicles, reservations, and customer rentals.
                    </p>
                  ) : customerMode === 'signin' ? (
                    <p className="cb-term-sub">
                      Sign in to book and manage your rentals. New user?{' '}
                      <button
                        type="button"
                        onClick={() => switchMode('signup')}
                        className="cb-text-toggle-btn"
                      >
                        Sign up &rarr;
                      </button>
                    </p>
                  ) : (
                    <p className="cb-term-sub">
                      Sign up to rent premium sedans, electrics, and SUVs. Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => switchMode('signin')}
                        className="cb-text-toggle-btn"
                      >
                        Sign in &rarr;
                      </button>
                    </p>
                  )}
                </div>
              </div>

              {/* SIGN IN FORM */}
              {((activeTab === 'customer' && customerMode === 'signin') || activeTab === 'staff') && (
                <form onSubmit={handleSignIn} noValidate className="cb-form" key={`signin-${animKey}`}>
                  <FloatInput
                    label={activeTab === 'staff' ? 'Staff Work Email' : 'Email Address'}
                    icon={Mail}
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={submitting}
                    autoComplete="username"
                  />
                  <FloatInput
                    label="Password"
                    icon={Lock}
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={submitting}
                    autoComplete="current-password"
                  />

                  {/* Options: Remember device & Forgot password */}
                  <div className="cb-form-options">
                    <label className="cb-checkbox-label">
                      <input type="checkbox" defaultChecked className="cb-checkbox" />
                      <span>Remember this device</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => toast.info('For credential assistance, please contact support@camber.in or visit the yard counter.')}
                      className="cb-forgot-link"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <button type="submit" disabled={submitting} className="cb-cta-btn">
                    <span className="cb-cta-laser" />
                    <span className="cb-cta-light-flare" />
                    <span className="cb-cta-content">
                      <span className="cb-cta-text">
                        {submitting ? 'Signing in…' : (activeTab === 'staff' ? 'Sign In as Staff' : 'Sign In')}
                      </span>
                      {!submitting && <ArrowRight size={15} className="cb-cta-arrow" />}
                    </span>
                  </button>


                  {/* High-trust assurance strip */}
                  <div className="cb-trust-strip">
                    <div className="cb-trust-item">
                      <ShieldCheck size={13} className="cb-trust-icon" />
                      <span>Instant Booking</span>
                    </div>
                    <span className="cb-trust-dot">•</span>
                    <div className="cb-trust-item">
                      <Zap size={13} className="cb-trust-icon" />
                      <span>Zero Deposit</span>
                    </div>
                    <span className="cb-trust-dot">•</span>
                    <div className="cb-trust-item">
                      <Lock size={13} className="cb-trust-icon" />
                      <span>256-Bit SSL</span>
                    </div>
                  </div>
                </form>
              )}

              {/* SIGN UP FORM */}
              {activeTab === 'customer' && customerMode === 'signup' && (
                <form onSubmit={handleRegister} noValidate className="cb-form" key={`signup-${animKey}`}>
                  <FloatInput label="Full Name" icon={User} value={regName} onChange={e => setRegName(e.target.value)} disabled={submitting} />
                  <div className="cb-form-2col">
                    <FloatInput label="Mobile Number" icon={Phone} type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} disabled={submitting} maxLength={10} />
                    <FloatInput label="Driving License #" icon={CreditCard} value={regLicense} onChange={e => setRegLicense(e.target.value)} disabled={submitting} />
                  </div>
                  <FloatInput label="City / Delivery Address" icon={MapPin} value={regAddress} onChange={e => setRegAddress(e.target.value)} disabled={submitting} />
                  <FloatInput label="Email Address" icon={Mail} type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} disabled={submitting} />
                  <FloatInput label="Password (min 6 chars)" icon={Lock} type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} disabled={submitting} />
                  <button type="submit" disabled={submitting} className="cb-cta-btn">
                    <span className="cb-cta-laser" />
                    <span className="cb-cta-light-flare" />
                    <span className="cb-cta-content">
                      <span className="cb-cta-text">
                        {submitting ? 'Creating Account…' : 'Create Account'}
                      </span>
                      {!submitting && <ArrowRight size={15} className="cb-cta-arrow" />}
                    </span>
                  </button>

                  <div className="cb-trust-strip">
                    <div className="cb-trust-item">
                      <ShieldCheck size={13} className="cb-trust-icon" />
                      <span>Instant Verification</span>
                    </div>
                    <span className="cb-trust-dot">•</span>
                    <div className="cb-trust-item">
                      <Car size={13} className="cb-trust-icon" />
                      <span>50+ Luxury Cars</span>
                    </div>
                  </div>
                </form>
              )}

              {/* Guest Link */}
              <div className="cb-terminal-bottom">
                <Link to="/fleet" className="cb-guest-link">
                  <Compass size={14} />
                  <span>Browse Vehicles as Guest</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>

          </div>
        </div>
      )}

      <style>{`
        /* === CURTAIN === */
        .intro-wipe-curtain {
          position: fixed; inset: 0; z-index: 9999; pointer-events: none;
          background: #ffffff;
          animation: wipeFade 0.45s cubic-bezier(0.76,0,0.24,1) forwards;
        }
        @keyframes wipeFade {
          from { opacity: 0; } to { opacity: 1; }
        }

        /* === SCENE (STRICT LUXURY ARCHITECTURAL LIGHT THEME) === */
        .cb-scene {
          position: relative; min-height: 100vh;
          display: flex; align-items: center; justify-content: center;
          padding: 40px 20px;
          background: #f8fafc;
          background-image:
            radial-gradient(at 10% 15%, rgba(14, 165, 233, 0.08) 0px, transparent 65%),
            radial-gradient(at 90% 85%, rgba(200, 157, 82, 0.10) 0px, transparent 60%),
            radial-gradient(at 50% 50%, #f1f5f9 0px, #ffffff 100%);
          overflow: hidden;
        }

        .cb-grid-mesh {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(to right, rgba(15, 23, 42, 0.035) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(15, 23, 42, 0.035) 1px, transparent 1px);
          background-size: 38px 38px;
          mask-image: radial-gradient(ellipse 75% 75% at 50% 50%, black 40%, transparent 100%);
        }

        .cb-ambient-radial {
          position: absolute; width: 600px; height: 600px;
          top: -150px; left: -100px; border-radius: 50%;
          background: radial-gradient(circle, rgba(14, 165, 233, 0.12) 0%, transparent 70%);
          filter: blur(80px); pointer-events: none;
        }

        .cb-gold-accent-blur {
          position: absolute; width: 450px; height: 450px;
          bottom: -100px; right: -80px; border-radius: 50%;
          background: radial-gradient(circle, rgba(200, 157, 82, 0.12) 0%, transparent 70%);
          filter: blur(90px); pointer-events: none;
        }

        /* === 2-PANE LUXURY STAGE CARD === */
        .cb-stage-card {
          position: relative; z-index: 10;
          display: grid; grid-template-columns: 460px 480px;
          max-width: 940px; width: 100%; min-height: 520px;
          background: #ffffff;
          border-radius: 28px;
          overflow: hidden;
          box-shadow:
            0 32px 80px -20px rgba(15, 23, 42, 0.12),
            0 0 0 1px #e2e8f0,
            0 12px 36px rgba(14, 165, 233, 0.08);
        }

        /* === PANE 1: LUXURY AUTOMOTIVE STUDIO SHOWCASE === */
        .cb-studio-pane {
          position: relative;
          display: flex; flex-direction: column; justify-content: space-between;
          padding: 26px; overflow: hidden;
          background: #f1f5f9;
          border-right: 1px solid #e2e8f0;
        }

        .cb-studio-media {
          position: absolute; inset: 0; z-index: 1;
        }

        .cb-studio-img {
          width: 100%; height: 100%;
          object-fit: cover; object-position: center bottom;
          filter: saturate(1.06) contrast(1.02);
          transition: transform 12s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .cb-studio-pane:hover .cb-studio-img {
          transform: scale(1.03);
        }

        .cb-studio-gradient-overlay {
          position: absolute; inset: 0;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.88) 0%, rgba(255, 255, 255, 0.2) 32%, rgba(255, 255, 255, 0.15) 60%, rgba(255, 255, 255, 0.94) 100%),
            linear-gradient(90deg, rgba(255, 255, 255, 0.35) 0%, transparent 50%, rgba(255, 255, 255, 0.4) 100%);
          pointer-events: none;
        }

        .cb-studio-sheen {
          position: absolute; inset: 0;
          background: radial-gradient(circle at 80% 20%, rgba(200, 157, 82, 0.15) 0%, transparent 60%);
          pointer-events: none;
        }

        /* Top Bar Over Studio */
        .cb-studio-top {
          position: relative; z-index: 2;
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px;
        }

        .cb-glass-brand {
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1.5px solid rgba(255, 255, 255, 0.95);
          border-radius: 16px;
          padding: 7px 14px;
          box-shadow: 0 8px 24px -4px rgba(15, 23, 42, 0.08);
          display: inline-flex; align-items: center; justify-content: center;
        }

        .cb-studio-logo {
          height: 36px; width: auto; object-fit: contain;
        }

        .cb-studio-top-actions {
          display: flex; align-items: center; gap: 8px;
        }

        .cb-live-pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 12px; border-radius: 20px;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(226, 232, 240, 0.9);
          color: #0284c7; font-size: 10px; font-weight: 800;
          letter-spacing: 0.12em;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }

        .cb-live-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 6px #10b981;
          animation: dotBlink 2s infinite ease-in-out;
        }

        .cb-replay-glass-btn {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(226, 232, 240, 0.9);
          color: #334155; font-size: 11.5px; font-weight: 700;
          padding: 6px 12px; border-radius: 20px; cursor: pointer;
          display: inline-flex; align-items: center; gap: 5px;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .cb-replay-glass-btn:hover {
          background: #ffffff;
          border-color: #0284c7;
          color: #0284c7;
          transform: translateY(-1px);
        }

        /* Bottom Frosted Glass Telemetry Dock */
        .cb-studio-dock {
          position: relative; z-index: 2;
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 18px; border-radius: 18px;
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.95);
          box-shadow: 0 16px 36px -10px rgba(15, 23, 42, 0.12);
        }

        .cb-dock-item {
          display: flex; flex-direction: column; gap: 2px;
          text-align: center; flex: 1;
        }

        .cb-dock-val {
          font-family: var(--font-display);
          font-size: 13.5px; font-weight: 850;
          color: #0f172a; letter-spacing: 0.03em;
        }

        .cb-dock-lbl {
          font-size: 9.5px; font-weight: 700;
          color: #64748b; letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .cb-dock-sep {
          width: 1px; height: 24px;
          background: #cbd5e1;
        }

        /* === PANE 2: PRECISION AUTHENTICATION CONSOLE === */
        .cb-terminal-pane {
          background: #ffffff;
          padding: 38px 36px;
          display: flex; flex-direction: column; justify-content: space-between;
        }

        /* Sleek Segmented Role Controller */
        .cb-role-switcher {
          display: flex; gap: 6px;
          background: #f1f5f9; padding: 5px; border-radius: 14px;
          border: 1px solid #e2e8f0; margin-bottom: 18px;
        }

        .cb-role-btn {
          flex: 1; display: flex; align-items: center; justify-content: center;
          gap: 8px; padding: 10px 14px; border-radius: 10px; border: none;
          background: transparent; font-size: 13px; font-weight: 700;
          color: #64748b; cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .cb-role-btn.active {
          background: #ffffff; color: #0f172a;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(0,0,0,0.04);
          font-weight: 800;
        }

        /* Terminal Header */
        .cb-terminal-header {
          margin-bottom: 16px;
        }

        .cb-term-title {
          font-family: var(--font-display);
          font-size: 26px; font-weight: 850; color: #0f172a;
          margin: 0 0 6px; letter-spacing: -0.025em; line-height: 1.15;
        }

        .cb-term-sub {
          font-size: 13px; color: #64748b; font-weight: 500;
          line-height: 1.5; margin: 0;
        }

        .cb-text-toggle-btn {
          background: none; border: none;
          color: #0284c7; font-size: 13px; font-weight: 750;
          cursor: pointer; padding: 0; margin-left: 4px;
          text-decoration: underline; text-underline-offset: 3px;
          transition: color 0.2s ease;
        }
        .cb-text-toggle-btn:hover {
          color: #0369a1;
        }

        /* Form Options: Remember Me & Forgot Password */
        .cb-form-options {
          display: flex; align-items: center; justify-content: space-between;
          margin: 2px 2px 4px;
        }

        .cb-checkbox-label {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 12px; font-weight: 550; color: #64748b;
          cursor: pointer; user-select: none;
        }

        .cb-checkbox {
          accent-color: #0284c7; width: 14px; height: 14px; cursor: pointer;
        }

        .cb-forgot-link {
          background: none; border: none;
          font-size: 12px; font-weight: 650; color: #0284c7;
          cursor: pointer; padding: 0;
          text-decoration: underline; text-underline-offset: 2px;
          transition: color 0.2s ease;
        }
        .cb-forgot-link:hover {
          color: #0369a1;
        }

        /* Form & Floating Inputs */
        .cb-form { display: flex; flex-direction: column; gap: 12px; }
        .cb-form-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        /* === GLOWING PERIMETER LINES AROUND TYPING BOXES === */
        @property --tracer-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }

        @keyframes spinLaser {
          0%   { --tracer-angle: 0deg; }
          100% { --tracer-angle: 360deg; }
        }

        @keyframes laserAuraPulse {
          0%, 100% {
            opacity: 0.75;
            filter: blur(8px) brightness(1.15);
          }
          50% {
            opacity: 0.95;
            filter: blur(12px) brightness(1.4);
          }
        }

        .cb-input-wrap {
          position: relative;
          border-radius: 13px;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .cb-input-wrap:hover {
          transform: translateY(-1px);
        }

        .cb-input-wrap.wrap-focused {
          transform: translateY(-1.5px);
        }

        /* 1. Ambient Diffuse Halo Aura */
        .cb-input-ambient-glow {
          position: absolute;
          inset: -3px;
          border-radius: 15px;
          background: conic-gradient(
            from var(--tracer-angle, 0deg),
            rgba(200, 157, 82, 0.85) 0%,
            rgba(0, 242, 254, 0.9) 25%,
            rgba(16, 185, 129, 0.85) 50%,
            rgba(14, 165, 233, 0.9) 75%,
            rgba(200, 157, 82, 0.85) 100%
          );
          filter: blur(8px);
          opacity: 0;
          pointer-events: none;
          z-index: 1;
          transition: opacity 0.35s ease;
          animation: spinLaser 4s linear infinite;
        }

        /* 2. Razor-Sharp Glowing Laser Border Line */
        .cb-input-laser-border {
          position: absolute;
          inset: -1.5px;
          border-radius: 12.5px;
          background: conic-gradient(
            from var(--tracer-angle, 0deg),
            #dfb873 0%,
            #00f2fe 25%,
            #10b981 50%,
            #38bdf8 75%,
            #dfb873 100%
          );
          opacity: 0;
          pointer-events: none;
          z-index: 2;
          transition: opacity 0.25s ease;
          animation: spinLaser 4s linear infinite;
        }

        /* Subtle trace on hover */
        .cb-input-wrap:hover .cb-input-laser-border {
          opacity: 0.38;
        }
        .cb-input-wrap:hover .cb-input-ambient-glow {
          opacity: 0.22;
        }

        /* High-energy glow when actively typing / focused */
        .cb-input-wrap.wrap-focused .cb-input-laser-border {
          opacity: 1;
        }
        .cb-input-wrap.wrap-focused .cb-input-ambient-glow {
          opacity: 0.85;
          animation: spinLaser 4s linear infinite, laserAuraPulse 2.5s ease-in-out infinite;
        }

        /* 3. The Core Input Box Surface */
        .cb-input-box {
          position: relative;
          z-index: 3;
          display: flex;
          align-items: center;
          background: #ffffff;
          border: 1.5px solid #cbd5e1;
          border-radius: 11px;
          transition: all 0.25s ease;
        }

        .cb-input-wrap.wrap-focused .cb-input-box {
          border-color: transparent;
          background: #ffffff;
          box-shadow:
            inset 0 0 0 1px rgba(255, 255, 255, 0.95),
            0 4px 18px -2px rgba(0, 242, 254, 0.18),
            0 2px 10px rgba(200, 157, 82, 0.2);
        }

        .cb-input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          display: flex;
          align-items: center;
          transition: all 0.25s ease;
          z-index: 4;
        }

        .cb-input-wrap.wrap-focused .cb-input-icon {
          color: #0284c7;
          transform: translateY(-50%) scale(1.15);
          filter: drop-shadow(0 0 8px rgba(14, 165, 233, 0.6));
        }

        .cb-input-core {
          flex: 1;
          position: relative;
          padding-left: 44px;
          padding-right: 14px;
          z-index: 4;
        }

        .cb-input-label {
          position: absolute;
          left: 44px;
          top: 50%;
          transform: translateY(-50%) scale(1);
          transform-origin: left center;
          font-size: 13.5px;
          font-weight: 600;
          color: #64748b;
          pointer-events: none;
          transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .cb-label-floated {
          top: 8px;
          transform: translateY(0) scale(0.78);
          color: #092027;
          font-weight: 750;
          letter-spacing: 0.02em;
        }

        .cb-input-wrap.wrap-focused .cb-label-floated {
          color: #0369a1;
        }

        .cb-native-input {
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          padding: 21px 0 8px;
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
          font-family: var(--font-sans);
        }

        /* === BESPOKE LUXURY KINETIC CTA BUTTON === */
        .cb-cta-btn {
          width: 100%;
          margin-top: 6px;
          position: relative;
          display: block;
          overflow: hidden;
          background: linear-gradient(180deg, #0284c7 0%, #0369a1 100%);
          border: 1px solid rgba(2, 132, 199, 0.85);
          border-radius: 12px;
          padding: 13.5px 22px;
          cursor: pointer;
          outline: none;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.35),
            inset 0 -1px 0 rgba(0, 0, 0, 0.18),
            0 4px 14px -2px rgba(2, 132, 199, 0.35),
            0 1px 3px rgba(15, 23, 42, 0.08);
          transition:
            transform 0.28s cubic-bezier(0.16, 1, 0.3, 1),
            box-shadow 0.28s cubic-bezier(0.16, 1, 0.3, 1),
            background 0.3s ease;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* 1. Dynamic Rotating Conic Laser Rim on Hover */
        .cb-cta-laser {
          position: absolute;
          inset: -1.5px;
          border-radius: 13.5px;
          background: conic-gradient(
            from var(--tracer-angle, 0deg),
            rgba(200, 157, 82, 0.95) 0%,
            rgba(0, 242, 254, 1) 25%,
            rgba(16, 185, 129, 0.95) 50%,
            rgba(56, 189, 248, 1) 75%,
            rgba(200, 157, 82, 0.95) 100%
          );
          opacity: 0;
          pointer-events: none;
          z-index: 1;
          transition: opacity 0.35s ease;
          animation: spinLaser 3.5s linear infinite;
        }

        .cb-cta-btn:hover .cb-cta-laser {
          opacity: 0.95;
        }

        /* 2. Fluid Photonic Light-Sweep Flare */
        .cb-cta-light-flare {
          position: absolute;
          top: -60%;
          left: -80%;
          width: 50%;
          height: 220%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.32) 50%,
            transparent 100%
          );
          transform: rotate(26deg);
          transition: left 0.75s cubic-bezier(0.19, 1, 0.22, 1);
          pointer-events: none;
          z-index: 2;
        }

        .cb-cta-btn:hover .cb-cta-light-flare {
          left: 140%;
        }

        /* 3. Surface & Elevation Hover State */
        .cb-cta-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          background: linear-gradient(180deg, #0369a1 0%, #075985 100%);
          box-shadow:
            inset 0 1px 1px rgba(255, 255, 255, 0.45),
            0 12px 28px -4px rgba(2, 132, 199, 0.45),
            0 4px 14px rgba(0, 242, 254, 0.25),
            0 2px 8px rgba(200, 157, 82, 0.2);
        }

        /* 4. Active / Press State */
        .cb-cta-btn:active:not(:disabled) {
          transform: translateY(0.5px) scale(0.992);
          box-shadow:
            inset 0 2px 4px rgba(0, 0, 0, 0.3),
            0 2px 8px rgba(2, 132, 199, 0.3);
        }

        /* 5. Button Content & High-Definition Typography */
        .cb-cta-content {
          position: relative;
          z-index: 3;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
        }

        .cb-cta-text {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          font-weight: 650;
          color: #ffffff;
          letter-spacing: 0.03em;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* 6. Kinetic Arrow Slide & Luminous Bloom */
        .cb-cta-arrow {
          color: #ffffff;
          transition:
            transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1),
            filter 0.32s ease;
        }

        .cb-cta-btn:hover .cb-cta-arrow {
          transform: translateX(5px) scale(1.1);
          filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.85));
        }

        /* High-Trust Assurance Strip */
        .cb-trust-strip {
          display: flex; align-items: center; justify-content: center;
          gap: 12px; margin-top: 14px; padding: 10px 14px;
          background: #f8fafc; border-radius: 10px;
          border: 1px solid #f1f5f9;
        }

        .cb-trust-item {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 11.5px; font-weight: 650; color: #475569;
        }

        .cb-trust-icon {
          color: #0284c7; flex-shrink: 0;
        }

        .cb-trust-dot {
          color: #cbd5e1; font-size: 10px;
        }

        /* Bottom Link */
        .cb-terminal-bottom {
          display: flex; justify-content: center;
          margin-top: 10px;
        }

        .cb-guest-link {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 650; color: #64748b;
          text-decoration: none; transition: all 0.2s ease;
        }
        .cb-guest-link:hover { color: #0284c7; gap: 8px; }

        /* Responsive */
        @media (max-width: 900px) {
          .cb-stage-card {
            grid-template-columns: 1fr;
            max-width: 480px;
          }
          .cb-studio-pane {
            min-height: 260px;
            padding: 20px;
          }
          .cb-studio-dock {
            display: none;
          }
          .cb-terminal-pane {
            padding: 28px 24px;
          }
        }
      `}</style>
    </div>
  );
}
