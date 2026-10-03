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

/* ── Floating label input with animated underline ── */
function FloatInput({ label, icon: Icon, type = 'text', value, onChange, disabled, autoComplete, maxLength }) {
  const [focused, setFocused] = useState(false);
  const filled = value && value.length > 0;
  const active = focused || filled;

  return (
    <div className="fi-outer" style={{ animationDelay: `${Math.random() * 0.1}s` }}>
      <div className={`fi-box ${focused ? 'fi-focused' : ''}`}>
        <div className="fi-icon-wrap">
          <Icon size={16} />
        </div>
        <div className="fi-inner">
          <label className={`fi-label ${active ? 'fi-label-up' : ''}`}>{label}</label>
          <input
            type={type}
            value={value}
            onChange={onChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={disabled}
            autoComplete={autoComplete}
            maxLength={maxLength}
            className="fi-input"
          />
        </div>
        {/* animated underline */}
        <div className={`fi-underline ${focused ? 'fi-underline-active' : ''}`} />
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
        <div className="lp-scene">
          {/* Subtle architectural dot grid */}
          <div className="lp-dot-grid" />

          {/* Main column */}
          <div className="lp-col">
            {/* Logo row */}
            <div className="lp-logo-row lp-anim-slide-down">
              <img
                src="/Camber.png"
                alt="CAMBER"
                style={{
                  height: 44,
                  width: 'auto',
                  objectFit: 'contain',
                }}
              />
              <div className="lp-logo-text">
                <span className="lp-logo-name">CAMBER</span>
                <span className="lp-logo-sub">Built to keep operations in line.</span>
              </div>
              <button
                type="button"
                className="lp-replay-btn"
                onClick={() => { setStage('intro'); window.scrollTo({ top: 0, behavior: 'instant' }); }}
              >
                <RotateCcw size={13} /> Replay
              </button>
            </div>

            {/* Glass card */}
            <div className="lp-card lp-anim-card-rise">
              {/* Shimmer top line */}
              <div className="lp-shimmer-bar" />

              {/* Tab selector with glider */}
              <div className="lp-tabs">
                <div className="lp-tab-glider" style={{ transform: activeTab === 'customer' ? 'translateX(0)' : 'translateX(100%)' }} />
                <button type="button" className={`lp-tab ${activeTab === 'customer' ? 'active' : ''}`} onClick={() => switchTab('customer')}>
                  <User size={14} /> Customer
                </button>
                <button type="button" className={`lp-tab ${activeTab === 'staff' ? 'active' : ''}`} onClick={() => switchTab('staff')}>
                  <ShieldCheck size={14} /> Staff / Admin
                </button>
              </div>

              {/* Customer sub-mode */}
              {activeTab === 'customer' && (
                <div className="lp-mode-row">
                  <button type="button" className={`lp-mode-pill ${customerMode === 'signin' ? 'active' : ''}`} onClick={() => switchMode('signin')}>Sign In</button>
                  <button type="button" className={`lp-mode-pill ${customerMode === 'signup' ? 'active' : ''}`} onClick={() => switchMode('signup')}>Create Account</button>
                </div>
              )}

              {/* Animated form area */}
              <div key={animKey} className="lp-form-area lp-anim-form-enter">
                <div className="lp-form-heading">
                  <h1 className="lp-title">
                    {activeTab === 'staff' ? 'Staff Login' : customerMode === 'signup' ? 'Create Account' : 'Welcome back'}
                  </h1>
                  <p className="lp-subtitle">
                    {activeTab === 'staff'
                      ? 'Access fleet operations and management console'
                      : customerMode === 'signup'
                        ? 'Start booking premium vehicles in minutes'
                        : 'Sign in to manage your bookings and trips'}
                  </p>
                </div>

                {error && (
                  <div className="lp-error" role="alert">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                      <AlertCircle size={15} style={{ flexShrink: 0 }} />
                      <span>{error}</span>
                    </div>
                    {(error.toLowerCase().includes('already registered') || error.toLowerCase().includes('already exists')) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (regEmail) setEmail(regEmail);
                          switchMode('signin');
                          setError('');
                        }}
                        style={{
                          background: '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 6,
                          padding: '3px 10px',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 1px 3px rgba(37,99,235,0.3)',
                        }}
                      >
                        Sign In Now &rarr;
                      </button>
                    )}
                  </div>
                )}

                {/* SIGN IN */}
                {((activeTab === 'customer' && customerMode === 'signin') || activeTab === 'staff') && (
                  <form onSubmit={handleSignIn} noValidate className="lp-form">
                    <FloatInput label={activeTab === 'staff' ? 'Staff Email' : 'Email Address'} icon={Mail} type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={submitting} autoComplete="username" />
                    <FloatInput label="Password" icon={Lock} type="password" value={password} onChange={e => setPassword(e.target.value)} disabled={submitting} autoComplete="current-password" />
                    <button type="submit" disabled={submitting} className="lp-cta">
                      <span className="lp-cta-content">
                        <span>{submitting ? 'Signing in…' : activeTab === 'staff' ? 'Enter Console' : 'Sign In'}</span>
                        {!submitting && <ArrowRight size={16} className="lp-cta-arrow" />}
                      </span>
                      <span className="lp-cta-shimmer" />
                    </button>
                  </form>
                )}

                {/* SIGN UP */}
                {activeTab === 'customer' && customerMode === 'signup' && (
                  <form onSubmit={handleRegister} noValidate className="lp-form">
                    <FloatInput label="Full Name" icon={User} value={regName} onChange={e => setRegName(e.target.value)} disabled={submitting} />
                    <div className="lp-form-2col">
                      <FloatInput label="Mobile (10 digits)" icon={Phone} type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} disabled={submitting} maxLength={10} />
                      <FloatInput label="License #" icon={CreditCard} value={regLicense} onChange={e => setRegLicense(e.target.value)} disabled={submitting} />
                    </div>
                    <FloatInput label="City / Address" icon={MapPin} value={regAddress} onChange={e => setRegAddress(e.target.value)} disabled={submitting} />
                    <FloatInput label="Email Address" icon={Mail} type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} disabled={submitting} />
                    <FloatInput label="Password (min 6)" icon={Lock} type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} disabled={submitting} />
                    <button type="submit" disabled={submitting} className="lp-cta">
                      <span className="lp-cta-content">
                        <span>{submitting ? 'Creating…' : 'Create Account'}</span>
                        {!submitting && <ArrowRight size={16} className="lp-cta-arrow" />}
                      </span>
                      <span className="lp-cta-shimmer" />
                    </button>
                  </form>
                )}

                <Link to="/fleet" className="lp-guest-link">
                  <Compass size={14} /> Browse Fleet as Guest <ArrowRight size={12} />
                </Link>
              </div>
            </div>

            <p className="lp-footer lp-anim-slide-down" style={{ animationDelay: '0.35s' }}>
              Insured Fleet • Instant Dispatch • 24/7 Roadside Assist
            </p>
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

        /* === SCENE === */
        .lp-scene {
          position: relative; min-height: 100vh;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden; padding: 32px 16px;
          background: #f8fafc;
          background-image:
            radial-gradient(at 15% 15%, rgba(99,102,241,0.07) 0px, transparent 55%),
            radial-gradient(at 85% 20%, rgba(6,182,212,0.05) 0px, transparent 50%),
            radial-gradient(at 50% 90%, rgba(16,185,129,0.05) 0px, transparent 55%);
        }

        .lp-blob {
          position: absolute; border-radius: 50%; pointer-events: none;
          filter: blur(60px); opacity: 0.5;
        }
        .lp-blob-1 {
          width: 380px; height: 380px; left: -8%; top: -12%;
          background: rgba(99,102,241,0.12);
          animation: blobMove1 14s ease-in-out infinite;
        }
        .lp-blob-2 {
          width: 300px; height: 300px; right: -6%; bottom: -8%;
          background: rgba(16,185,129,0.1);
          animation: blobMove2 18s ease-in-out infinite;
        }
        .lp-blob-3 {
          width: 220px; height: 220px; right: 20%; top: -8%;
          background: rgba(245,158,11,0.08);
          animation: blobMove3 12s ease-in-out infinite;
        }
        @keyframes blobMove1 { 0%,100%{transform:translate(0,0)} 33%{transform:translate(30px,-20px)} 66%{transform:translate(-20px,15px)} }
        @keyframes blobMove2 { 0%,100%{transform:translate(0,0)} 33%{transform:translate(-35px,18px)} 66%{transform:translate(20px,-25px)} }
        @keyframes blobMove3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(15px,25px)} }

        .lp-dot-grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image: radial-gradient(circle, rgba(79,70,229,0.06) 1px, transparent 1px);
          background-size: 32px 32px;
          mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, black 30%, transparent 100%);
        }

        /* === ANIMATIONS === */
        .lp-anim-slide-down { animation: lpSlideDown 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        .lp-anim-card-rise  { animation: lpCardRise 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s both; }
        .lp-anim-form-enter { animation: lpFormEnter 0.35s cubic-bezier(0.22,1,0.36,1) both; }

        @keyframes lpSlideDown { from { opacity:0; transform: translateY(-14px); } to { opacity:1; transform: translateY(0); } }
        @keyframes lpCardRise  { from { opacity:0; transform: translateY(24px) scale(0.97); } to { opacity:1; transform: translateY(0) scale(1); } }
        @keyframes lpFormEnter { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }

        /* === COLUMN === */
        .lp-col {
          position: relative; z-index: 10; width: 100%; max-width: 420px;
          display: flex; flex-direction: column; align-items: center; gap: 16px;
        }

        /* === LOGO === */
        .lp-logo-row {
          display: flex; align-items: center; gap: 12px; width: 100%;
          justify-content: space-between;
        }
        .lp-logo-mark {
          width: 42px; height: 42px; border-radius: 12px;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
          flex-shrink: 0;
        }
        .lp-logo-text { flex: 1; display: flex; flex-direction: column; }
        .lp-logo-name {
          font-family: var(--font-display); font-size: 22px; font-weight: 800;
          color: #0f172a; letter-spacing: -0.025em;
          text-rendering: geometricPrecision; -webkit-font-smoothing: antialiased;
        }
        .lp-logo-accent { color: #2563eb; }
        .lp-logo-sub { font-size: 11.5px; font-weight: 600; color: #475569; letter-spacing: 0.02em; }

        .lp-replay-btn {
          background: #ffffff; border: 1.5px solid #cbd5e1;
          color: #334155; font-size: 12px; font-weight: 700;
          padding: 6px 12px; border-radius: 8px; cursor: pointer;
          display: inline-flex; align-items: center; gap: 6px;
          transition: all 0.2s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .lp-replay-btn:hover { border-color: #2563eb; color: #2563eb; background: #eff6ff; }

        /* === CARD === */
        .lp-card {
          width: 100%;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 22px;
          padding: 30px 28px;
          box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.10), 0 2px 8px rgba(15, 23, 42, 0.04);
          position: relative; overflow: hidden;
        }

        .lp-shimmer-bar {
          position: absolute; top: 0; left: -100%; width: 60%; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(37, 99, 235, 0.5), transparent);
          animation: shimmerSweep 4s ease 0.8s infinite;
        }

        /* === TABS === */
        .lp-tabs {
          position: relative; display: flex;
          background: #f1f5f9; border: 1px solid #cbd5e1;
          border-radius: 12px; padding: 4px; margin-bottom: 16px;
        }
        .lp-tab-glider {
          position: absolute; top: 4px; left: 4px;
          width: calc(50% - 4px); height: calc(100% - 8px);
          background: #ffffff; border-radius: 9px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05);
          transition: transform 0.3s cubic-bezier(0.22,1,0.36,1);
        }
        .lp-tab {
          flex: 1; display: flex; align-items: center; justify-content: center;
          gap: 7px; padding: 9px 12px; border: none; background: transparent;
          font-size: 13.5px; font-weight: 700; color: #475569; cursor: pointer;
          position: relative; z-index: 1; border-radius: 9px;
          transition: color 0.25s ease;
          text-rendering: geometricPrecision; -webkit-font-smoothing: antialiased;
        }
        .lp-tab.active { color: #2563eb; }

        /* === MODE PILLS === */
        .lp-mode-row {
          display: flex; gap: 6px; margin-bottom: 18px;
          padding: 4px; background: #f1f5f9;
          border: 1px solid #e2e8f0; border-radius: 10px;
        }
        .lp-mode-pill {
          flex: 1; padding: 8px 12px; border-radius: 7px; border: none;
          background: transparent; font-size: 12.5px; font-weight: 700;
          color: #475569; cursor: pointer;
          transition: all 0.22s cubic-bezier(0.22,1,0.36,1);
          text-rendering: geometricPrecision; -webkit-font-smoothing: antialiased;
        }
        .lp-mode-pill.active {
          background: #2563eb;
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.32);
        }

        /* === HEADING === */
        .lp-form-heading { margin-bottom: 20px; }
        .lp-title {
          font-family: var(--font-display);
          font-size: 26px; font-weight: 800; color: #0f172a;
          margin: 0; letter-spacing: -0.025em; line-height: 1.15;
          text-rendering: geometricPrecision; -webkit-font-smoothing: antialiased;
        }
        .lp-subtitle { font-size: 13.5px; color: #475569; margin: 6px 0 0; font-weight: 500; }

        /* === ERROR === */
        .lp-error {
          display: flex; align-items: center; gap: 8px;
          background: #fef2f2; border: 1.5px solid #fecaca; color: #b91c1c;
          padding: 10px 14px; border-radius: 9px;
          font-size: 13px; font-weight: 600; margin-bottom: 16px;
          animation: lpFormEnter 0.25s ease both;
        }

        /* === FLOAT INPUT === */
        .fi-outer { animation: fiEntrance 0.4s cubic-bezier(0.22,1,0.36,1) both; }
        .fi-outer:nth-child(1) { animation-delay: 0.04s; }
        .fi-outer:nth-child(2) { animation-delay: 0.08s; }
        .fi-outer:nth-child(3) { animation-delay: 0.12s; }
        .fi-outer:nth-child(4) { animation-delay: 0.16s; }
        .fi-outer:nth-child(5) { animation-delay: 0.20s; }
        @keyframes fiEntrance { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

        .fi-box {
          position: relative; display: flex; align-items: center;
          background: #ffffff; border: 1.5px solid #cbd5e1;
          border-radius: 11px; transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        }
        .fi-box.fi-focused {
          border-color: #2563eb;
          box-shadow: 0 0 0 3.5px rgba(37, 99, 235, 0.15);
        }
        .fi-icon-wrap {
          position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
          color: #64748b; display: flex; align-items: center;
          transition: color 0.2s ease;
        }
        .fi-focused .fi-icon-wrap { color: #2563eb; }

        .fi-inner { flex: 1; position: relative; padding-left: 44px; padding-right: 14px; }

        .fi-label {
          position: absolute; left: 44px; top: 50%; transform: translateY(-50%) scale(1);
          transform-origin: left center; font-size: 13.5px; font-weight: 600;
          color: #64748b; pointer-events: none;
          transition: all 0.2s cubic-bezier(0.22,1,0.36,1);
          text-rendering: geometricPrecision; -webkit-font-smoothing: antialiased;
        }
        .fi-label-up {
          top: 8px; transform: translateY(0) scale(0.78);
          color: #2563eb; font-weight: 700;
        }

        .fi-input {
          width: 100%; background: transparent; border: none; outline: none;
          padding: 21px 0 8px; font-size: 14.5px; font-weight: 600;
          color: #0f172a; font-family: var(--font-sans);
          text-rendering: geometricPrecision; -webkit-font-smoothing: antialiased;
        }

        .fi-underline {
          position: absolute; bottom: 0; left: 50%; right: 50%;
          height: 2px; background: #2563eb;
          border-radius: 0 0 11px 11px;
          transition: left 0.25s cubic-bezier(0.22,1,0.36,1), right 0.25s cubic-bezier(0.22,1,0.36,1);
        }
        .fi-underline-active { left: 0; right: 0; }

        /* === FORM === */
        .lp-form { display: flex; flex-direction: column; gap: 11px; }
        .lp-form-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; }

        /* === CTA === */
        .lp-cta {
          width: 100%; margin-top: 10px; position: relative; overflow: hidden;
          background: #2563eb;
          color: #ffffff; border: 1px solid #1d4ed8;
          border-radius: 11px; padding: 13.5px 20px;
          font-size: 15px; font-weight: 700; cursor: pointer;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
          transition: all 0.2s cubic-bezier(0.22,1,0.36,1);
          text-rendering: geometricPrecision; -webkit-font-smoothing: antialiased;
          font-family: var(--font-sans);
        }
        .lp-cta:hover:not(:disabled) {
          background: #1d4ed8;
          border-color: #1e40af;
          transform: translateY(-1px);
          box-shadow: 0 6px 22px rgba(37, 99, 235, 0.45);
        }
        .lp-cta:active:not(:disabled) { transform: scale(0.985); }
        .lp-cta:disabled { opacity: 0.65; cursor: not-allowed; }

        .lp-cta-content {
          position: relative; z-index: 1;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .lp-cta-arrow { animation: arrowBounce 1.2s ease-in-out infinite; }
        @keyframes arrowBounce { 0%,100%{transform:translateX(0)} 50%{transform:translateX(4px)} }

        .lp-cta-shimmer {
          position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          animation: shimmerSweep 2.5s ease 0.5s infinite;
          pointer-events: none;
        }

        /* === GUEST === */
        .lp-guest-link {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12.5px; font-weight: 600; color: #64748b;
          text-decoration: none; margin-top: 14px; align-self: center;
          transition: all 0.2s ease;
        }
        .lp-guest-link:hover { color: #2563eb; gap: 8px; }

        /* === FOOTER === */
        .lp-footer {
          font-size: 11.5px; font-weight: 500; color: #94a3b8;
          text-align: center; letter-spacing: 0.04em;
        }


        @keyframes glowBreath {
          0%,100% { box-shadow: 0 4px 16px rgba(79,70,229,0.2); }
          50%     { box-shadow: 0 4px 24px rgba(79,70,229,0.4); }
        }

        @keyframes shimmerSweep {
          0%   { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(300%) skewX(-12deg); }
        }

        @media (max-width: 480px) {
          .lp-card { padding: 22px 18px; border-radius: 18px; }
          .lp-form-2col { grid-template-columns: 1fr; }
          .lp-col { max-width: 100%; }
          .lp-blob { display: none; }
        }
      `}</style>
    </div>
  );
}
