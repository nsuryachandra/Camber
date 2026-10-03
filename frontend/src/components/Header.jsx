import { useState, useRef, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Command,
  Bell,
  Sparkles,
  Plus,
  LogOut,
  User,
  ShieldCheck,
  ChevronDown,
  Building2,
  Car,
  KeyRound,
} from 'lucide-react';

const ROUTE_NAMES = {
  '/admin': 'Dashboard Overview',
  '/admin/vehicles': 'Fleet & Vehicles',
  '/admin/customers': 'Customer Directory',
  '/admin/rentals': 'Bookings & Rentals',
  '/admin/payments': 'Payments & Invoicing',
  '/admin/maintenance': 'Vehicle Maintenance',
  '/admin/branches': 'Branch Locations',
  '/admin/reports': 'Analytics & Reports',
  '/': 'Dashboard Overview',
  '/vehicles': 'Fleet & Vehicles',
  '/customers': 'Customer Directory',
  '/rentals': 'Bookings & Rentals',
  '/payments': 'Payments & Invoicing',
  '/maintenance': 'Vehicle Maintenance',
  '/branches': 'Branch Locations',
  '/reports': 'Analytics & Reports',
};

export default function Header({ onOpenCommandPalette }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const profileRef = useRef(null);
  const notifyRef = useRef(null);

  const currentTitle = ROUTE_NAMES[location.pathname] || 'Fleet Management';

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (notifyRef.current && !notifyRef.current.contains(e.target)) {
        setNotifyOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="header-bar">
      <div className="topbar-left">
        <div className="topbar-breadcrumb-wrap">
          <span className="topbar-app-tag">CAMBER</span>
          <span className="topbar-sep">/</span>
          <span className="topbar-title">{currentTitle}</span>
        </div>
      </div>

      <div className="topbar-center">
        <button
          className="topbar-search-pill"
          onClick={() => onOpenCommandPalette(true)}
          title="Search anything (Ctrl+K)"
        >
          <Search size={15} className="topbar-search-icon" />
          <span className="topbar-search-text">Quick search or jump to...</span>
          <span className="topbar-search-kbd">
            <kbd>⌘</kbd>
            <kbd>K</kbd>
          </span>
        </button>
      </div>

      <div className="topbar-right">
        {/* Live system status pill */}
        <div className="system-status-pill">
          <span className="status-indicator-dot" />
          <span className="status-indicator-text">System Live</span>
        </div>

        {/* Quick New Rental Action */}
        <Link to="/rentals" className="btn btn-sm btn-primary header-action-btn">
          <Plus size={14} />
          <span>New Rental</span>
        </Link>

        {/* User Profile Pill Dropdown */}
        {user && (
          <div className="topbar-user-wrap" ref={profileRef}>
            <button
              className="topbar-user-btn"
              onClick={() => setProfileOpen(!profileOpen)}
              aria-expanded={profileOpen}
            >
              <div className="user-avatar-gradient">
                {getInitials(user.name)}
              </div>
              <div className="user-info-text">
                <span className="user-name">{user.name}</span>
                <span className="user-role-badge">{user.role}</span>
              </div>
              <ChevronDown size={14} className="user-chevron" />
            </button>

            {profileOpen && (
              <div className="user-dropdown-card animate-scale-up">
                <div className="user-dropdown-header">
                  <div className="user-dropdown-avatar">{getInitials(user.name)}</div>
                  <div className="user-dropdown-meta">
                    <p className="user-dropdown-name">{user.name}</p>
                    <p className="user-dropdown-email">{user.email || `${user.role.toLowerCase()}@camber.in`}</p>
                  </div>
                </div>

                <div className="user-dropdown-badge">
                  <ShieldCheck size={14} />
                  <span>Access Level: <strong>{user.role}</strong></span>
                </div>

                <div className="user-dropdown-divider" />

                <div className="user-dropdown-links">
                  <button
                    className="user-dropdown-item"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/branches');
                    }}
                  >
                    <Building2 size={15} />
                    <span>Branch Locations</span>
                  </button>
                  <button
                    className="user-dropdown-item"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/reports');
                    }}
                  >
                    <Sparkles size={15} />
                    <span>Analytics Overview</span>
                  </button>
                </div>

                <div className="user-dropdown-divider" />

                <button className="user-dropdown-logout" onClick={logout}>
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
