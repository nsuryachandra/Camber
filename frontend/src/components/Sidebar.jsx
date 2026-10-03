import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Car,
  Users,
  KeyRound,
  CreditCard,
  Wrench,
  MapPin,
  BarChart3,
  LogOut,
  Sparkles,
  Zap,
  Activity,
  Compass,
  ArrowUpRight,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/vehicles', label: 'Vehicles', icon: Car },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/rentals', label: 'Rentals', icon: KeyRound },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
  { to: '/admin/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/admin/branches', label: 'Branches', icon: MapPin },
  { to: '/admin/reports', label: 'Reports & Analytics', icon: BarChart3 },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      {/* Brand Logo & Header */}
      <div className="sidebar-brand">
        <img
          src="/Camber.png"
          alt="CAMBER"
          style={{
            height: 38,
            width: 'auto',
            objectFit: 'contain',
            borderRadius: 6,
          }}
        />
        <div className="sidebar-brand-content">
          <div className="sidebar-brand-title-wrap">
            <span className="sidebar-brand-text">CAMBER</span>
            <span className="sidebar-brand-badge">{user?.role || 'ADMIN'}</span>
          </div>
          <span className="sidebar-brand-sub" title="Built to keep operations in line.">
            Built to keep operations in line.
          </span>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="sidebar-section-label">OPERATIONS &amp; FLEET</div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <Icon size={18} className="sidebar-link-icon" />
            <span className="sidebar-link-text">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Quick Switch to Customer Showroom */}
      <div style={{ padding: '0 12px', marginTop: 16 }}>
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            background: '#ffffff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            textDecoration: 'none',
            color: 'var(--text-primary)',
            fontSize: 12,
            fontWeight: 700,
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Compass size={14} />
            <span>Customer Showroom</span>
          </div>
          <ArrowUpRight size={13} />
        </Link>
      </div>

      {/* Sidebar Footer — Status & User Profile Card */}
      <div className="sidebar-footer">
        {/* Live System Status Pill */}
        <div className="system-health-pill">
          <div className="pulse-beacon" />
          <span className="health-text">MySQL Telemetry Live</span>
        </div>

        {/* User Card with Logout */}
        <div className="sidebar-user-card">
          <div className="sidebar-user-avatar">
            {user?.name ? user.name[0].toUpperCase() : 'A'}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name || 'Administrator'}</div>
            <div className="sidebar-user-role">{user?.role || 'ADMIN'}</div>
          </div>
          <button
            className="sidebar-logout-btn"
            onClick={logout}
            title="Sign Out"
            aria-label="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
