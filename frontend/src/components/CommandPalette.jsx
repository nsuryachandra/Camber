import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  Car,
  Users,
  KeyRound,
  CreditCard,
  Wrench,
  MapPin,
  BarChart3,
  PlusCircle,
  ArrowRight,
  Sparkles,
  Command,
  X
} from 'lucide-react';

export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const actions = [
    { id: 'dash', title: 'Dashboard', category: 'Navigation', icon: LayoutDashboard, path: '/' },
    { id: 'veh', title: 'Vehicles & Fleet', category: 'Navigation', icon: Car, path: '/vehicles' },
    { id: 'cust', title: 'Customers', category: 'Navigation', icon: Users, path: '/customers' },
    { id: 'rent', title: 'Rentals & Bookings', category: 'Navigation', icon: KeyRound, path: '/rentals' },
    { id: 'pay', title: 'Payments & Revenue', category: 'Navigation', icon: CreditCard, path: '/payments' },
    { id: 'maint', title: 'Maintenance Logs', category: 'Navigation', icon: Wrench, path: '/maintenance' },
    { id: 'branch', title: 'Branches & Hubs', category: 'Navigation', icon: MapPin, path: '/branches' },
    { id: 'rep', title: 'Analytics & Reports', category: 'Navigation', icon: BarChart3, path: '/reports' },
    { id: 'new-rent', title: 'New Rental Booking', category: 'Quick Actions', icon: PlusCircle, path: '/rentals?action=new' },
    { id: 'new-veh', title: 'Add New Vehicle', category: 'Quick Actions', icon: Car, path: '/vehicles?action=new' },
    { id: 'new-cust', title: 'Register Customer', category: 'Quick Actions', icon: Users, path: '/customers?action=new' },
  ];

  const filtered = query.trim()
    ? actions.filter(
        (a) =>
          a.title.toLowerCase().includes(query.toLowerCase()) ||
          a.category.toLowerCase().includes(query.toLowerCase())
      )
    : actions;

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(true); // toggle
      }
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          navigate(filtered[selectedIndex].path);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, filtered, selectedIndex, navigate]);

  if (!isOpen) return null;

  return (
    <div className="cmd-backdrop" onClick={onClose}>
      <div className="cmd-modal animate-scale-up" onClick={(e) => e.stopPropagation()}>
        <div className="cmd-input-bar">
          <Search size={18} className="cmd-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="cmd-input"
            placeholder="Type a command or search pages... (e.g. Rentals, Vehicles)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <div className="cmd-badge">ESC</div>
          <button className="cmd-close-btn" onClick={onClose} aria-label="Close command palette">
            <X size={16} />
          </button>
        </div>

        <div className="cmd-results">
          {filtered.length === 0 ? (
            <div className="cmd-empty">
              <Sparkles size={20} className="cmd-empty-icon" />
              <span>No matching results for "{query}"</span>
            </div>
          ) : (
            <div className="cmd-group">
              {filtered.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={item.id}
                    className={`cmd-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      navigate(item.path);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div className="cmd-item-icon">
                      <Icon size={16} />
                    </div>
                    <div className="cmd-item-info">
                      <span className="cmd-item-title">{item.title}</span>
                      <span className="cmd-item-cat">{item.category}</span>
                    </div>
                    <ArrowRight size={14} className="cmd-item-arrow" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="cmd-footer">
          <div className="cmd-shortcut-hint">
            <span><kbd>↑</kbd> <kbd>↓</kbd> to navigate</span>
            <span><kbd>↵</kbd> to select</span>
            <span><kbd>ESC</kbd> to close</span>
          </div>
          <div className="cmd-brand-tag">
            <Command size={12} /> CAMBER Spotlight
          </div>
        </div>
      </div>
    </div>
  );
}
