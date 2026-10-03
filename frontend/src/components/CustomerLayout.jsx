import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Zap,
  Car,
  Calendar,
  User,
  LogOut,
  ShieldCheck,
  Phone,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function CustomerLayout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isCustomer = user && user.role === 'CUSTOMER';
  const isStaff = user && (user.role === 'ADMIN' || user.role === 'STAFF');

  const handleSignOut = () => {
    logout();
    toast.info('You have signed out from FleetPro.');
    navigate('/login');
  };

  const navLinks = [
    { label: 'Explore Fleet', path: '/fleet', icon: Car },
    ...(user
      ? [
          { label: 'My Bookings', path: '/my-rentals', icon: Calendar },
          { label: 'Profile', path: '/profile', icon: User },
        ]
      : []),
  ];

  const getInitials = (name) => {
    if (!name) return 'C';
    const parts = name.split(' ');
    return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="customer-app-shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-canvas)' }}>
      {/* Top Banner Notice */}
      <div
        style={{
          background: 'linear-gradient(90deg, #eff6ff 0%, #f0fdf4 50%, #eff6ff 100%)',
          borderBottom: '1px solid #dbeafe',
          color: '#1e40af',
          fontSize: 12,
          fontWeight: 600,
          padding: '8px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 auto' }}>
          <Sparkles size={14} style={{ color: '#2563eb' }} />
          <span>CAMBER Mobility: Built to keep operations in line. 100% verified vehicles &amp; 24/7 assistance.</span>
        </div>
      </div>

      {/* Main Glassmorphic Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          style={{
            maxWidth: 1600,
            width: '100%',
            margin: '0 auto',
            padding: '12px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo */}
          <Link to="/fleet" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
              }}
            >
              <Zap size={18} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 750, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.1, fontFamily: 'var(--font-display)', textRendering: 'geometricPrecision' }}>
                Fleet<span style={{ color: '#2563eb' }}>Pro</span>
              </div>
              <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#2563eb' }}>
                Customer Showroom
              </div>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: 'none',
                    color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                    background: isActive ? 'var(--primary-subtle)' : 'transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={16} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Account / Auth Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Link
                  to="/profile"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '4px 10px',
                    borderRadius: 20,
                    background: 'var(--surface-sunken)',
                    border: '1px solid var(--border)',
                    textDecoration: 'none',
                    color: 'var(--text-primary)',
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {getInitials(user.name)}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{user.name.split(' ')[0]}</span>
                </Link>

                <button
                  className="btn btn-sm btn-secondary"
                  onClick={handleSignOut}
                  title="Sign out"
                  style={{ padding: '6px 10px' }}
                >
                  <LogOut size={14} />
                  <span style={{ fontSize: 12 }}>Sign Out</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Link to="/login" className="btn btn-sm btn-secondary">
                  Sign In
                </Link>
                <Link to="/login" className="btn btn-sm btn-primary">
                  Register / Book
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Portal Content */}
      <main style={{ flex: 1, maxWidth: 1600, width: '100%', margin: '0 auto', padding: '24px 32px' }}>
        <Outlet />
      </main>

      {/* Customer Footer */}
      <footer
        style={{
          background: '#ffffff',
          borderTop: '1px solid var(--border)',
          marginTop: 'auto',
          padding: '40px 24px 24px',
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 32,
            marginBottom: 32,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <img
                src="/Camber.png"
                alt="CAMBER"
                style={{
                  height: 32,
                  width: 'auto',
                  objectFit: 'contain',
                }}
              />
              <span style={{ fontSize: 16, fontWeight: 800 }}>CAMBER</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Built to keep operations in line. Bespoke self-drive mobility, luxury sedans, family MUVs, and electric city vehicles.
            </p>
          </div>

          <div>
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
              Quick Navigation
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <li><Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Browse Fleet Catalogue</Link></li>
              <li><Link to="/my-rentals" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>My Booking History</Link></li>
              <li><Link to="/profile" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Customer Profile</Link></li>
              <li><Link to="/login" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Customer Sign In</Link></li>
            </ul>
          </div>

          <div>
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
              Safety &amp; Assurance
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
              <li>100% Sanitized &amp; Verified Fleet</li>
              <li>Transparent Pricing &amp; Zero Hidden Fees</li>
              <li>Instant Digital Verification</li>
              <li>Comprehensive Roadside Coverage</li>
            </ul>
          </div>

          <div>
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
              24/7 Helpline
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Phone size={14} style={{ color: 'var(--primary)' }} />
                <span>+91 98861 00201</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={14} style={{ color: 'var(--primary)' }} />
                <span>CBD Hub, Bengaluru &amp; Regional Hubs</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={14} style={{ color: 'var(--emerald)' }} />
                <span>24x7 Roadside Dispatch</span>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            borderTop: '1px solid var(--border)',
            paddingTop: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12,
            color: 'var(--text-muted)',
          }}
        >
          <span>&copy; 2026 FleetPro Enterprise Mobility. All rights reserved.</span>
          <span>Powered by MySQL &amp; React</span>
        </div>
      </footer>
    </div>
  );
}
