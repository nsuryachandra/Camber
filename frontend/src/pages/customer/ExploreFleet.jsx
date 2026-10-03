import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car,
  Search,
  Fuel,
  Settings2,
  Users,
  Building2,
  Calendar,
  Sparkles,
  ShieldCheck,
  Zap,
  SlidersHorizontal,
  X,
  CheckCircle2,
  ArrowRight,
  Info,
  Clock,
  Compass,
} from 'lucide-react';
import useFetch from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import { Loading, Empty, ErrorState } from '../../components/DataState';
import { formatCurrency } from '../../utils/format';
import BookingModal from './BookingModal';
import Modal from '../../components/Modal';
import { getVehicleImage } from '../../utils/vehicleImages';

/* ── Bespoke Technical Vector Vehicle Silhouette (Studio Blueprint Lineart) ── */
function VehicleSilhouette({ type, fuel, color }) {
  const isEv = fuel?.toUpperCase() === 'ELECTRIC';
  const isSuv = (type || '').toLowerCase().includes('suv');
  const isMpv = (type || '').toLowerCase().includes('muv') || (type || '').toLowerCase().includes('van');

  if (isEv) {
    return (
      <svg viewBox="0 0 200 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="vehicle-studio-silhouette" style={{ color: color || '#059669' }}>
        <path d="M16 46h16m134 0h18M32 46a12 12 0 0 1 24 0m86 0a12 12 0 0 1 24 0M10 44l14-11 26-9 34-11h42l36 11 26 9 6 11H10z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.38" />
        <circle cx="44" cy="46" r="7.5" stroke="currentColor" strokeWidth="2.2" opacity="0.5" fill="#ffffff" />
        <circle cx="154" cy="46" r="7.5" stroke="currentColor" strokeWidth="2.2" opacity="0.5" fill="#ffffff" />
        <path d="M72 18l-8 15h54l-10-15H72z" stroke="currentColor" strokeWidth="1.6" opacity="0.3" />
        <path d="M174 39l6 3" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (isSuv) {
    return (
      <svg viewBox="0 0 200 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="vehicle-studio-silhouette" style={{ color: color || '#2563eb' }}>
        <path d="M14 46h16m138 0h16M30 46a13 13 0 0 1 26 0m88 0a13 13 0 0 1 26 0M8 42l10-10 18-15 36-5h62l26 12 28 8 4 10H8z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.38" />
        <circle cx="43" cy="46" r="8" stroke="currentColor" strokeWidth="2.2" opacity="0.5" fill="#ffffff" />
        <circle cx="157" cy="46" r="8" stroke="currentColor" strokeWidth="2.2" opacity="0.5" fill="#ffffff" />
        <path d="M62 19l-4 13h76l-8-13H62z" stroke="currentColor" strokeWidth="1.6" opacity="0.3" />
        <path d="M50 12h70" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.25" />
      </svg>
    );
  }

  if (isMpv) {
    return (
      <svg viewBox="0 0 200 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="vehicle-studio-silhouette" style={{ color: color || '#0284c7' }}>
        <path d="M14 46h16m138 0h16M30 46a12 12 0 0 1 24 0m90 0a12 12 0 0 1 24 0M8 43l12-14 26-14 42-2h60l24 16 16 4 4 10H8z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.38" />
        <circle cx="42" cy="46" r="7.5" stroke="currentColor" strokeWidth="2.2" opacity="0.5" fill="#ffffff" />
        <circle cx="156" cy="46" r="7.5" stroke="currentColor" strokeWidth="2.2" opacity="0.5" fill="#ffffff" />
        <path d="M52 18l-4 13h88l-6-13H52z" stroke="currentColor" strokeWidth="1.6" opacity="0.3" />
      </svg>
    );
  }

  // Sedan / Saloon / Luxury
  return (
    <svg viewBox="0 0 200 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="vehicle-studio-silhouette" style={{ color: color || '#4f46e5' }}>
      <path d="M14 46h18m136 0h18M32 46a11 11 0 0 1 22 0m90 0a11 11 0 0 1 22 0M10 44l18-9 28-11 44-8h38l32 10 22 8 4 10H10z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.38" />
      <circle cx="43" cy="46" r="7" stroke="currentColor" strokeWidth="2.2" opacity="0.5" fill="#ffffff" />
      <circle cx="155" cy="46" r="7" stroke="currentColor" strokeWidth="2.2" opacity="0.5" fill="#ffffff" />
      <path d="M74 21l-8 12h56l-12-12H74z" stroke="currentColor" strokeWidth="1.6" opacity="0.3" />
    </svg>
  );
}

export default function ExploreFleet() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Search & Filters
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [branch, setBranch] = useState('');
  const [fuel, setFuel] = useState('');
  const [transmission, setTransmission] = useState('');
  const [maxRate, setMaxRate] = useState('');

  // Modals
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [specDetail, setSpecDetail] = useState(null);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (type) p.set('type', type);
    if (branch) p.set('branch', branch);
    if (fuel) p.set('fuel', fuel);
    if (transmission) p.set('transmission', transmission);
    if (maxRate) p.set('maxRate', maxRate);
    return p.toString();
  }, [search, type, branch, fuel, transmission, maxRate]);

  const { data, loading, error, refetch } = useFetch(`/public/vehicles?${query}`, [query]);
  const meta = useFetch('/public/meta');

  const vehicles = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
  const branches = meta.data?.branches || [];
  const vehicleTypes = meta.data?.vehicle_types || [];

  const categoryChips = [
    { label: 'All Fleet', value: '' },
    ...vehicleTypes.map((t) => ({ label: t.type_name, value: String(t.vehicle_type_id) })),
  ];

  const categoryCounts = useMemo(() => {
    const counts = { '': vehicles.length };
    vehicles.forEach((v) => {
      const key = String(v.vehicle_type_id);
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [vehicles]);

  const getCategoryIcon = (label) => {
    const l = (label || '').toLowerCase();
    if (l.includes('electric') || l.includes('ev')) return Zap;
    if (l.includes('suv')) return ShieldCheck;
    if (l.includes('sedan')) return Car;
    if (l.includes('hatchback')) return Sparkles;
    if (l.includes('muv') || l.includes('mpv')) return Users;
    if (l.includes('luxury')) return Sparkles;
    if (l.includes('tempo') || l.includes('van')) return Compass;
    return Car;
  };

  const clearFilters = () => {
    setSearch('');
    setType('');
    setBranch('');
    setFuel('');
    setTransmission('');
    setMaxRate('');
  };

  const hasActiveFilters = search || type || branch || fuel || transmission || maxRate;

  return (
    <div className="animate-fade-in">
      {/* ── Bespoke Architectural Showroom Hero ── */}
      <div className="showroom-hero-lux">
        <div style={{ maxWidth: 640 }}>
          <h1 className="showroom-title">
            Curated Fleet. <span className="text-gradient">Precision Mobility.</span>
          </h1>

          <p className="showroom-desc">
            Direct manufacturer-spec vehicles pre-configured for executive comfort, high-torque touring,
            and emissions-free urban travel. Contactless RFID pickup within 4 minutes.
          </p>

          {/* Trust Guarantees */}
          <div className="showroom-guarantees">
            <span className="guarantee-chip">
              <CheckCircle2 size={14} style={{ color: '#059669' }} /> Unlimited Kilometres
            </span>
            <span className="guarantee-chip">
              <ShieldCheck size={14} style={{ color: '#2563eb' }} /> Comprehensive Insurance
            </span>
            <span className="guarantee-chip">
              <Zap size={14} style={{ color: '#d97706' }} /> Zero Security Deposit
            </span>
          </div>
        </div>

        {/* Showroom Architectural Metric Capsules */}
        <div className="showroom-kpi-capsules">
          <div className="kpi-capsule">
            <div className="kpi-capsule-label">Live Inventory</div>
            <div className="kpi-capsule-value">{vehicles.length} Units</div>
            <div className="kpi-capsule-sub">
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
              Ready Now
            </div>
          </div>
          <div className="kpi-capsule">
            <div className="kpi-capsule-label">Fleet Readiness</div>
            <div className="kpi-capsule-value">100%</div>
            <div className="kpi-capsule-sub" style={{ color: '#2563eb' }}>
              <ShieldCheck size={12} /> Audited
            </div>
          </div>
          <div className="kpi-capsule">
            <div className="kpi-capsule-label">Avg Handover</div>
            <div className="kpi-capsule-value">&lt; 4 Mins</div>
            <div className="kpi-capsule-sub" style={{ color: '#d97706' }}>
              <Clock size={12} /> RFID Keyless
            </div>
          </div>
        </div>
      </div>

      {/* Showroom Interactive Floating Filter Dock */}
      <div className="showroom-filter-dock">
        <div className="dock-controls-row">
          {/* Luxury Search Input */}
          <div className="search-input-lux">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search make, model, chassis, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search ? (
              <button
                className="search-clear-btn"
                onClick={() => setSearch('')}
                style={{ right: 38 }}
              >
                <X size={14} />
              </button>
            ) : null}
            <span className="search-shortcut-badge">⌘K</span>
          </div>

          {/* Branch Hub Selector */}
          <div className="dock-select-wrap" style={{ flex: '1 1 180px' }}>
            <select
              className="dock-select"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">All Mobility Hubs</option>
              {branches.map((b) => (
                <option key={b.branch_id} value={b.branch_id}>
                  {b.branch_name} ({b.city})
                </option>
              ))}
            </select>
          </div>

          {/* Transmission */}
          <div className="dock-select-wrap" style={{ flex: '0 1 140px' }}>
            <select
              className="dock-select"
              value={transmission}
              onChange={(e) => setTransmission(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">Transmission</option>
              <option value="MANUAL">Manual</option>
              <option value="AUTOMATIC">Automatic</option>
            </select>
          </div>

          {/* Fuel Type */}
          <div className="dock-select-wrap" style={{ flex: '0 1 140px' }}>
            <select
              className="dock-select"
              value={fuel}
              onChange={(e) => setFuel(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">Fuel Type</option>
              <option value="PETROL">Petrol</option>
              <option value="DIESEL">Diesel</option>
              <option value="ELECTRIC">Electric (EV)</option>
              <option value="HYBRID">Hybrid</option>
              <option value="CNG">CNG</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={clearFilters}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: '9999px' }}
            >
              <X size={13} /> Reset Filters
            </button>
          )}
        </div>

        {/* Floating Category Segmented Dock with Live Vehicle Counts */}
        <div className="floating-category-dock">
          {categoryChips.map((c) => {
            const count = categoryCounts[c.value] || 0;
            const CatIcon = getCategoryIcon(c.label);
            const isActive = type === c.value;
            return (
              <button
                key={c.value}
                className={`cat-dock-btn ${isActive ? 'active' : ''}`}
                onClick={() => setType(c.value)}
              >
                <CatIcon size={14} style={{ color: isActive ? '#60a5fa' : '#64748b' }} />
                <span>{c.label}</span>
                <span className="cat-dock-badge">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fleet Grid Display */}
      {loading && <Loading text="Loading available fleet..." />}
      {error && <ErrorState message={`Unable to load vehicle showroom: ${error}`} onRetry={refetch} />}

      {!loading && !error && vehicles.length === 0 && (
        <Empty message="No available vehicles matching your filters right now.">
          {hasActiveFilters ? (
            <button className="btn btn-secondary" onClick={clearFilters} style={{ marginTop: 12 }}>
              Reset Filters
            </button>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
              Check back soon as returned vehicles get inspected and re-listed.
            </p>
          )}
        </Empty>
      )}

      {!loading && !error && vehicles.length > 0 && (
        <div className="vehicle-grid" style={{ marginBottom: 40 }}>
          {vehicles.map((v, idx) => {
            const fuel = v.fuel_type?.toUpperCase();
            const type = (v.type_name || '').toLowerCase();
            let cat = {
              theme: 'theme-sedan',
              pillClass: 'pill-sedan',
              Icon: Car,
              label: v.type_name || 'Fleet',
              watermark: 'DRIVE',
              color: '#4f46e5',
            };
            if (fuel === 'ELECTRIC') {
              cat = {
                theme: 'theme-electric',
                pillClass: 'pill-electric',
                Icon: Zap,
                label: 'Electric EV',
                watermark: 'EV',
                color: '#059669',
              };
            } else if (type.includes('suv')) {
              cat = {
                theme: 'theme-suv',
                pillClass: 'pill-suv',
                Icon: ShieldCheck,
                label: 'All-Terrain SUV',
                watermark: 'SUV',
                color: '#2563eb',
              };
            } else if (type.includes('luxury')) {
              cat = {
                theme: 'theme-luxury',
                pillClass: 'pill-luxury',
                Icon: Sparkles,
                label: 'Executive Luxury',
                watermark: 'LUX',
                color: '#d97706',
              };
            } else if (type.includes('sedan')) {
              cat = {
                theme: 'theme-sedan',
                pillClass: 'pill-sedan',
                Icon: Car,
                label: 'Premium Sedan',
                watermark: 'SEDAN',
                color: '#4f46e5',
              };
            } else if (type.includes('muv') || type.includes('van') || Number(v.seating_capacity) > 5) {
              cat = {
                theme: 'theme-luxury',
                pillClass: 'pill-luxury',
                Icon: Users,
                label: 'Multi-Passenger MPV',
                watermark: 'MPV',
                color: '#0284c7',
              };
            }

            const CatIcon = cat.Icon;

            return (
              <div
                key={v.vehicle_id}
                className="vehicle-card"
                style={{ animationDelay: `${idx * 0.04}s` }}
              >
                {/* Category Ambient Showcase Banner with Studio Lineart Silhouette */}
                <div className={`vehicle-card-banner ${cat.theme}`}>
                  <div className="vehicle-card-banner-top">
                    <span className={`vehicle-category-pill ${cat.pillClass}`}>
                      <CatIcon size={12} strokeWidth={2.2} />
                      <span>{cat.label}</span>
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

                {/* Card Core Content */}
                <div className="vehicle-card-body">
                  <div className="vehicle-card-top">
                    <div>
                      <div className="vehicle-card-brand">{v.brand}</div>
                      <div className="vehicle-card-brand-model">{v.model}</div>
                    </div>
                    {v.status === 'AVAILABLE' ? (
                      <span className="badge badge-available">
                        <span className="badge-dot" /> Available
                      </span>
                    ) : (
                      <span className="badge badge-maintenance">
                        <span className="badge-dot" /> Reserved
                      </span>
                    )}
                  </div>

                  {/* Sleek Tactile Micro-Chips Row */}
                  <div className="vehicle-card-specs-clean">
                    <span className="spec-chip-tactile">
                      <Users size={12} style={{ color: '#2563eb' }} />
                      <span>{v.seating_capacity} Seats</span>
                    </span>
                    <span className="spec-chip-tactile">
                      {fuel === 'ELECTRIC' ? (
                        <Zap size={12} style={{ color: '#059669' }} />
                      ) : (
                        <Fuel size={12} style={{ color: '#2563eb' }} />
                      )}
                      <span>{v.fuel_type}</span>
                    </span>
                    <span className="spec-chip-tactile">
                      <Settings2 size={12} style={{ color: '#2563eb' }} />
                      <span>{v.transmission}</span>
                    </span>
                  </div>

                  {/* Clean Branch Location */}
                  <div className="vehicle-card-branch-clean">
                    <Building2 size={13} style={{ color: '#94a3b8' }} />
                    <span>{v.branch_name}, {v.city}</span>
                  </div>
                </div>

                {/* Card Pricing & Booking Actions */}
                <div className="vehicle-card-footer">
                  <div className="vehicle-card-price">
                    <span className="price-val">{formatCurrency(v.rental_rate)}</span>
                    <span className="price-unit"> / 24-hr day</span>
                    <span className="price-subtag">
                      <CheckCircle2 size={11} /> Zero Deposit
                    </span>
                  </div>

                  <div className="vehicle-card-actions">
                    <button
                      className="btn-spec-action"
                      onClick={() => setSpecDetail(v)}
                      title="View vehicle specifications"
                    >
                      Specs
                    </button>
                    {v.status === 'AVAILABLE' ? (
                      <button
                        className="btn-book-action"
                        onClick={() => setSelectedVehicle(v)}
                      >
                        Reserve Drive <ArrowRight size={13} />
                      </button>
                    ) : (
                      <button
                        className="btn-book-action"
                        disabled
                        style={{ opacity: 0.55, cursor: 'not-allowed', background: '#94a3b8' }}
                      >
                        Reserved
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Booking Checkout Modal */}
      {selectedVehicle && (
        <BookingModal
          vehicle={selectedVehicle}
          isOpen={Boolean(selectedVehicle)}
          onClose={() => setSelectedVehicle(null)}
          onBookingSuccess={() => refetch()}
        />
      )}

      {/* Vehicle Specification Modal */}
      {specDetail && (
        <Modal
          isOpen={Boolean(specDetail)}
          onClose={() => setSpecDetail(null)}
          title={`${specDetail.brand} ${specDetail.model}`}
          subtitle={`${specDetail.type_name} • ${specDetail.manufacturing_year} Model`}
          size="md"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 12 }}>
              <div>
                <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Daily Rental Rate
                </span>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)', lineHeight: 1.1 }}>
                  {formatCurrency(specDetail.rental_rate)}{' '}
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>/ 24-hr day</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setSpecDetail(null)}>
                  Close
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    const target = specDetail;
                    setSpecDetail(null);
                    setSelectedVehicle(target);
                  }}
                >
                  Book This Vehicle <ArrowRight size={13} />
                </button>
              </div>
            </div>
          }
        >
          {/* Full-Bleed Elegant Vehicle Showcase Hero */}
          <div className="spec-modal-hero">
            <img
              src={getVehicleImage(specDetail)}
              alt={`${specDetail.brand} ${specDetail.model}`}
              className="spec-modal-hero-img"
            />
            <div className="spec-modal-hero-overlay">
              <div>
                <div className="spec-modal-brand">{specDetail.brand}</div>
                <h3 className="spec-modal-hero-title">{specDetail.model}</h3>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span className="spec-modal-type-pill">{specDetail.type_name}</span>
                <span className="spec-modal-badge">{specDetail.manufacturing_year} Model</span>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 10,
              marginBottom: 16,
            }}
          >
            <div style={{ padding: '10px 12px', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 8 }}>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>FUEL TYPE</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2, color: 'var(--text-primary)' }}>{specDetail.fuel_type}</div>
            </div>
            <div style={{ padding: '10px 12px', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 8 }}>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>TRANSMISSION</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2, color: 'var(--text-primary)' }}>{specDetail.transmission}</div>
            </div>
            <div style={{ padding: '10px 12px', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 8 }}>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>SEATING CAPACITY</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2, color: 'var(--text-primary)' }}>{specDetail.seating_capacity} Passengers</div>
            </div>
            <div style={{ padding: '10px 12px', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 8 }}>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>MANUFACTURING YEAR</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2, color: 'var(--text-primary)' }}>{specDetail.manufacturing_year}</div>
            </div>
          </div>

          <div style={{ padding: '12px 14px', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 8 }}>
            <h4 style={{ fontSize: 11, fontWeight: 750, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
              Station Pickup Point
            </h4>
            <div style={{ fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.4, fontWeight: 600 }}>
              {specDetail.branch_name}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>
              {specDetail.branch_address || 'Regional Mobility Hub'}, {specDetail.city}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
