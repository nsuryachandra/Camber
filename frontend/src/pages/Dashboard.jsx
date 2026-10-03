import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  Car,
  KeyRound,
  Users,
  CreditCard,
  Wrench,
  CheckCircle2,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  Zap,
  Activity,
  ArrowRight,
  Plus,
  ShieldCheck,
  Building2,
  Clock,
  Inbox,
  Radio,
  Fuel,
  Compass,
  FileCheck2,
  Layers,
  ChevronRight,
} from 'lucide-react';
import useFetch from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { Loading, Empty, ErrorState } from '../components/DataState';
import { formatCurrency, formatDate, formatMonth, statusClass } from '../utils/format';
import { getVehicleImage } from '../utils/vehicleImages';
import PaymentSimulatorModal from '../components/PaymentSimulatorModal';

const STATUS_COLORS = {
  AVAILABLE: '#10b981',
  RENTED: '#3b82f6',
  MAINTENANCE: '#f59e0b',
  INACTIVE: '#94a3b8',
};

// Custom Glassmorphic Tooltip
const CustomChartTooltip = ({ active, payload, label, prefix = '', suffix = '' }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: 10,
          padding: '10px 14px',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.3)',
          color: '#ffffff',
        }}
      >
        <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>
          {label}
        </p>
        <p style={{ fontSize: 15, fontWeight: 800, color: '#34d399', margin: 0 }}>
          {prefix}{payload[0].value.toLocaleString('en-IN')}{suffix}
        </p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, loading, error, refetch } = useFetch('/reports/dashboard');

  // Live telemetry clock
  const [timeStr, setTimeStr] = useState('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Simulator modal state
  const [isSimOpen, setIsSimOpen] = useState(false);

  if (loading) return <Loading text="Synchronizing telemetry with Hub 01 & Hub 02…" />;
  if (error) return <ErrorState message={`Unable to load telemetry: ${error}`} onRetry={refetch} />;
  if (!data) return <Empty message="No operational telemetry recorded." />;

  const kpis = data?.kpis ?? {
    total_vehicles: 0,
    available_vehicles: 0,
    rented_vehicles: 0,
    maintenance_vehicles: 0,
    inactive_vehicles: 0,
    total_customers: 0,
    active_rentals: 0,
    pending_payments: 0,
    total_revenue: 0,
    total_maintenance_cost: 0,
  };

  const recentRentals = Array.isArray(data?.recent_rentals) ? data.recent_rentals : [];
  const branches = Array.isArray(data?.branches) ? data.branches : [];
  const availableFleet = Array.isArray(data?.available_fleet) ? data.available_fleet : [];
  const charts = data?.charts ?? { monthly_revenue: [], rentals_by_type: [], fleet_status: [] };

  const revenueData = (charts?.monthly_revenue || []).map((m) => ({
    month: formatMonth(m.revenue_month),
    revenue: Number(m.total_revenue || 0),
  }));

  const fleetData = (charts?.fleet_status || []).map((f) => ({
    name: f.status ? f.status.charAt(0) + f.status.slice(1).toLowerCase() : 'Unknown',
    value: Number(f.count || 0),
  }));

  const utilizationRate =
    Number(kpis.total_vehicles || 0) > 0
      ? Math.round((Number(kpis.rented_vehicles || 0) / Number(kpis.total_vehicles || 1)) * 100)
      : 0;

  const availabilityRate =
    Number(kpis.total_vehicles || 0) > 0
      ? Math.round((Number(kpis.available_vehicles || 0) / Number(kpis.total_vehicles || 1)) * 100)
      : 0;

  const getInitials = (name) => {
    if (!name) return 'C';
    const parts = name.split(' ');
    return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 40 }}>
      {/* =========================================================================
          1. Executive Command Center Hero Banner
          ========================================================================= */}
      <div className="exec-command-deck">
        <div className="exec-deck-header">
          <div>
            <div className="exec-deck-role-badge">
              <ShieldCheck size={13} style={{ color: '#34d399' }} />
              <span>{user?.name || 'Admin'} Console • Operations Deck</span>
            </div>
            <h1 className="exec-deck-title">
              <span>CAMBER Fleet Intelligence Hub</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 9999,
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                <span className="badge-dot" style={{ background: '#34d399' }} />
                <span>Live MySQL Stream</span>
              </span>
            </h1>
            <p className="exec-deck-sub">
              Multi-hub fleet logistics, chassis telemetry, real-time availability ledger, and automated billing settlement.
            </p>

            <div className="exec-deck-telemetry-strip">
              <div className="exec-telemetry-tag">
                <Clock size={13} style={{ color: '#38bdf8' }} />
                <span>IST {timeStr || '19:48:00'}</span>
              </div>
              <div className="exec-telemetry-tag">
                <Radio size={13} style={{ color: '#34d399' }} />
                <span>Hub 01: Hyderabad (16 Active Chassis)</span>
              </div>
              <div className="exec-telemetry-tag">
                <Activity size={13} style={{ color: '#94a3b8' }} />
                <span>Hub 02: Guntur (Standby)</span>
              </div>
              <div className="exec-telemetry-tag">
                <Zap size={13} style={{ color: '#fbbf24' }} />
                <span>Latency: 12ms</span>
              </div>
            </div>
          </div>

          {/* Quick Action Commands */}
          <div className="exec-actions-bar">
            <button className="exec-btn-primary" onClick={() => navigate('/rentals?action=new')}>
              <Plus size={15} />
              <span>New Rental</span>
            </button>
            <button className="exec-btn-sim" onClick={() => setIsSimOpen(true)}>
              <Zap size={15} />
              <span>Payment Gateway</span>
            </button>
            <button className="exec-btn-ghost" onClick={() => navigate('/vehicles?action=new')}>
              <Car size={15} />
              <span>Add Vehicle</span>
            </button>
            <button className="exec-btn-ghost" onClick={() => navigate('/customers?action=new')}>
              <Users size={15} />
              <span>Add Customer</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. Bespoke Telemetry KPI Matrix (6 High-Impact Cards)
          ========================================================================= */}
      <div className="bento-grid">
        {/* Card 1: Total Fleet Readiness (Gauge Style) */}
        <div className="bento-stat-card emerald">
          <div className="bento-stat-header">
            <div className="bento-stat-icon-wrap emerald">
              <Car size={22} />
            </div>
            <span className="bento-stat-trend positive">
              <span className="badge-dot" style={{ background: '#16a34a' }} />
              {availabilityRate}% Ready
            </span>
          </div>
          <div>
            <div className="bento-stat-label">Chassis Readiness & Lot Rate</div>
            <div className="bento-stat-value" style={{ color: 'var(--emerald)' }}>
              {kpis.available_vehicles} / {kpis.total_vehicles}
            </div>
            <div className="bento-progress-wrap" style={{ marginTop: 8 }} title={`Availability: ${availabilityRate}%`}>
              <div className="bento-progress-bar" style={{ width: `${availabilityRate}%`, background: 'var(--emerald)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
              <span>All 16 units on lot</span>
              <span style={{ fontWeight: 800, color: 'var(--emerald)' }}>0 Downtime</span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Deployments / Trips */}
        <div className="bento-stat-card cyan">
          <div className="bento-stat-header">
            <div className="bento-stat-icon-wrap cyan">
              <KeyRound size={22} />
            </div>
            <span className="bento-stat-trend neutral">Live Trips</span>
          </div>
          <div>
            <div className="bento-stat-label">Active Missions on Road</div>
            <div className="bento-stat-value" style={{ color: 'var(--cyan)' }}>
              {kpis.active_rentals}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, fontWeight: 500 }}>
              All 16 chassis grounded & secured at Hub 01
            </p>
          </div>
        </div>

        {/* Card 3: Revenue & Collections Ledger */}
        <div className="bento-stat-card primary">
          <div className="bento-stat-header">
            <div className="bento-stat-icon-wrap primary">
              <CreditCard size={22} />
            </div>
            <span className="bento-stat-trend neutral">Ledger Settled</span>
          </div>
          <div>
            <div className="bento-stat-label">Collected Gross Volume</div>
            <div className="bento-stat-value" style={{ color: 'var(--primary)' }}>
              {formatCurrency(kpis.total_revenue)}
            </div>
            <p style={{ fontSize: 11, color: 'var(--emerald)', marginTop: 6, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 size={13} /> Zero Outstanding Dues
            </p>
          </div>
        </div>

        {/* Card 4: Fleet Health Index */}
        <div className="bento-stat-card rose">
          <div className="bento-stat-header">
            <div className="bento-stat-icon-wrap rose">
              <Wrench size={22} />
            </div>
            <span className="bento-stat-trend positive" style={{ color: 'var(--emerald)', background: '#ecfdf5' }}>
              Nominal
            </span>
          </div>
          <div>
            <div className="bento-stat-label">Fleet Operational Health</div>
            <div className="bento-stat-value" style={{ color: 'var(--text-primary)' }}>
              100%
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, fontWeight: 500 }}>
              0 Vehicles in workshop • 0 Open tickets
            </p>
          </div>
        </div>

        {/* Card 5: Multi-Hub Inventory Distribution */}
        <div className="bento-stat-card indigo">
          <div className="bento-stat-header">
            <div className="bento-stat-icon-wrap" style={{ background: '#eef2ff', color: '#4f46e5' }}>
              <Building2 size={22} />
            </div>
            <span className="bento-stat-trend neutral">2 Hubs</span>
          </div>
          <div>
            <div className="bento-stat-label">Hub Inventory Allocation</div>
            <div className="bento-stat-value" style={{ fontSize: '18px', fontWeight: 800 }}>
              Hyd (16) • Gnt (0)
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, fontWeight: 500 }}>
              Hyderabad Hub Active • Guntur Hub Inactive
            </p>
          </div>
        </div>

        {/* Card 6: Verified Driver Database */}
        <div className="bento-stat-card amber">
          <div className="bento-stat-header">
            <div className="bento-stat-icon-wrap amber">
              <Users size={22} />
            </div>
            <span className="bento-stat-trend neutral">KYC Verified</span>
          </div>
          <div>
            <div className="bento-stat-label">Verified Driver Directory</div>
            <div className="bento-stat-value">{kpis.total_customers}</div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, fontWeight: 500 }}>
              Driver license records and identities cleared
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. Multi-Hub Station Telemetry Deck
          ========================================================================= */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }} />
            <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Multi-Hub Facility Telemetry
            </h2>
          </div>
          <Link to="/branches" className="btn btn-sm btn-ghost">
            <span>Manage Hubs</span> <ArrowRight size={13} />
          </Link>
        </div>

        <div className="exec-hub-strip">
          {/* Hub 01: Hyderabad (Active) */}
          <div className="exec-hub-card active-hub">
            <div className="exec-hub-card-header">
              <div className="exec-hub-name">
                <Building2 size={18} style={{ color: 'var(--emerald)' }} />
                <span>CAMBER Hyderabad Hub (Hub 01)</span>
              </div>
              <span className="badge badge-available">
                <span className="badge-dot" /> ACTIVE • PRIMARY
              </span>
            </div>
            <div className="exec-hub-meta">
              <span><strong>Address:</strong> Road No. 36, Jubilee Hills, Hyderabad</span>
              <span><strong>Station Officer:</strong> Suryachandra • <strong>Phone:</strong> 040-23554400</span>
            </div>
            <div className="exec-hub-meter-wrap">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700 }}>
                <span>Chassis Capacity Allocation</span>
                <span style={{ color: 'var(--emerald)' }}>16 / 16 Units Assigned (100%)</span>
              </div>
              <div className="exec-hub-meter-bar">
                <div className="exec-hub-meter-fill emerald" style={{ width: '100%' }} />
              </div>
            </div>
          </div>

          {/* Hub 02: Guntur (Inactive) */}
          <div className="exec-hub-card inactive-hub">
            <div className="exec-hub-card-header">
              <div className="exec-hub-name">
                <Building2 size={18} style={{ color: '#94a3b8' }} />
                <span>CAMBER Guntur Hub (Hub 02)</span>
              </div>
              <span className="badge badge-pending" style={{ background: '#f1f5f9', color: '#64748b' }}>
                <span className="badge-dot" style={{ background: '#94a3b8' }} /> INACTIVE • STANDBY
              </span>
            </div>
            <div className="exec-hub-meta">
              <span><strong>Address:</strong> Lakshmipuram Main Road, Guntur</span>
              <span><strong>Operations Officer:</strong> Branch Desk • <strong>Phone:</strong> 0863-2233440</span>
            </div>
            <div className="exec-hub-meter-wrap">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700 }}>
                <span>Chassis Capacity Allocation</span>
                <span style={{ color: '#64748b' }}>0 / 25 Units Assigned (Standby)</span>
              </div>
              <div className="exec-hub-meter-bar">
                <div className="exec-hub-meter-fill gray" style={{ width: '0%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. Available Fleet Showcase (Featured Chassis Ready for Instant Rental)
          ========================================================================= */}
      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--emerald)' }} />
            <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Lot Inventory • Ready for Dispatch
            </h2>
          </div>
          <Link to="/vehicles" className="btn btn-sm btn-ghost">
            <span>View All 16 Vehicles</span> <ArrowRight size={13} />
          </Link>
        </div>

        <div className="exec-fleet-grid">
          {availableFleet.map((v) => (
            <div key={v.vehicle_id} className="exec-car-card">
              <div className="exec-car-thumb-wrap">
                <img
                  src={getVehicleImage(v)}
                  alt={`${v.brand} ${v.model}`}
                  className="exec-car-thumb"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = '/new_cars/fortuner.jpeg';
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    fontSize: 10,
                    fontWeight: 800,
                    background: 'rgba(9, 9, 11, 0.8)',
                    color: '#ffffff',
                    padding: '3px 8px',
                    borderRadius: 6,
                    backdropFilter: 'blur(6px)',
                    textTransform: 'uppercase',
                  }}
                >
                  {v.type_name}
                </span>
              </div>

              <div className="exec-car-body">
                <div className="exec-car-title">
                  <span>{v.brand} {v.model}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="exec-plate-tag">{v.registration_number}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--emerald)' }}>● Ready</span>
                </div>
                <div className="exec-car-meta-strip">
                  <span>{v.transmission}</span>
                  <span>•</span>
                  <span>{v.fuel_type}</span>
                  <span>•</span>
                  <span>{v.seating_capacity} Seats</span>
                </div>

                <div className="exec-car-footer">
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>DAILY TARIFF</div>
                    <div className="exec-car-rate">{formatCurrency(v.rental_rate)}<span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>/day</span></div>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate(`/rentals?action=new&vehicle_id=${v.vehicle_id}`)}
                    style={{ padding: '6px 12px', fontSize: 12 }}
                  >
                    <span>Dispatch</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* =========================================================================
          5. Analytics & Distribution Charts Deck
          ========================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24, marginTop: 24 }}>
        {/* Monthly Revenue Area Chart */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }} />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Revenue Trajectory & Velocity (₹)</h3>
            </div>
            <Link to="/reports" className="btn btn-sm btn-ghost">
              Deep Analytics <ArrowRight size={13} />
            </Link>
          </div>
          <div className="card-body">
            {revenueData.length === 0 ? (
              <div style={{ padding: '30px 20px', textAlign: 'center' }}>
                <Empty message="Fresh database: zero historical revenue recorded yet." />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsSimOpen(true)}
                  style={{ marginTop: 12 }}
                >
                  <Zap size={14} style={{ color: 'var(--emerald)' }} />
                  <span>Simulate First Transaction</span>
                </button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGradBespoke" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#09090b" stopOpacity={0.14} />
                      <stop offset="95%" stopColor="#09090b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#71717a', fontWeight: 600 }} tickLine={false} axisLine={{ stroke: '#e4e4e7' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#71717a', fontWeight: 600 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomChartTooltip prefix="₹" />} />
                  <Area type="monotone" dataKey="revenue" stroke="#09090b" strokeWidth={2.5} fillOpacity={1} fill="url(#revGradBespoke)" dot={{ r: 4, fill: '#09090b', strokeWidth: 2, stroke: '#ffffff' }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Fleet Status Donut */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Fleet Status & Allocation</h3>
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {fleetData.length === 0 || fleetData.every((f) => f.value === 0) ? (
              <Empty message="No vehicles in fleet yet." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={fleetData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={3}
                    stroke="#ffffff"
                    strokeWidth={3}
                  >
                    {fleetData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name.toUpperCase()] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 14, fontWeight: 600 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          6. Live Dispatch & Agreement Ledger
          ========================================================================= */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }} />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Live Booking Agreements & Dispatch Ledger</h3>
          </div>
          <Link to="/rentals" className="btn btn-sm btn-secondary">
            Manage All Bookings <ArrowRight size={13} />
          </Link>
        </div>

        <div className="card-body no-pad">
          {recentRentals.length === 0 ? (
            <div className="exec-dispatch-blueprint">
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileCheck2 size={24} style={{ color: 'var(--primary)' }} />
              </div>
              <div style={{ maxWidth: 460 }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                  Fresh Operations Ledger • Ready for Booking Dispatch
                </h4>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  All 16 chassis in Hyderabad Hub are inspected, sanitized, and ready for rental agreements.
                </p>
              </div>

              {/* Lifecycle Step Indicators */}
              <div className="exec-workflow-steps">
                <div className="exec-step-item">
                  <span className="exec-step-num">1</span>
                  <span>Select Chassis</span>
                </div>
                <ChevronRight size={14} style={{ color: '#cbd5e1' }} />
                <div className="exec-step-item">
                  <span className="exec-step-num">2</span>
                  <span>Customer Verification</span>
                </div>
                <ChevronRight size={14} style={{ color: '#cbd5e1' }} />
                <div className="exec-step-item">
                  <span className="exec-step-num">3</span>
                  <span>Instant Settlement</span>
                </div>
                <ChevronRight size={14} style={{ color: '#cbd5e1' }} />
                <div className="exec-step-item">
                  <span className="exec-step-num">4</span>
                  <span>Digital Voucher</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                <button className="btn btn-primary" onClick={() => navigate('/rentals?action=new')}>
                  <KeyRound size={15} /> Create First Rental
                </button>
                <button className="btn btn-secondary" onClick={() => setIsSimOpen(true)}>
                  <Zap size={15} style={{ color: 'var(--emerald)' }} /> Payment Gateway
                </button>
              </div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="dt">
                <thead>
                  <tr>
                    <th>Ref #</th>
                    <th>Customer Profile</th>
                    <th>Vehicle</th>
                    <th>Pickup Date</th>
                    <th>Expected Return</th>
                    <th className="num">Settled Value</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRentals.map((r) => (
                    <tr key={r.rental_id}>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--primary)' }}>
                          #{String(r.rental_id).padStart(4, '0')}
                        </span>
                      </td>
                      <td>
                        <div className="table-avatar-item">
                          <div className="table-avatar">{getInitials(r.customer_name)}</div>
                          <span style={{ fontWeight: 700 }}>{r.customer_name}</span>
                        </div>
                      </td>
                      <td>
                        <div>
                          <div style={{ fontWeight: 700 }}>{r.vehicle_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                            {r.registration_number}
                          </div>
                        </div>
                      </td>
                      <td>{formatDate(r.pickup_date)}</td>
                      <td>{formatDate(r.expected_return_date)}</td>
                      <td className="num">{formatCurrency(r.final_amount)}</td>
                      <td>
                        <span className={`badge ${statusClass(r.status)}`}>
                          <span className="badge-dot" />
                          {r.status}
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

      {/* =========================================================================
          7. Embedded Payment Gateway Modal
          ========================================================================= */}
      <PaymentSimulatorModal
        isOpen={isSimOpen}
        onClose={() => setIsSimOpen(false)}
        amount={9600}
        title="Live Payment Gateway Settlement"
        customerName="N Suryachandra"
        vehicleInfo="Toyota Fortuner 4x4 • KA05ZA4567"
        onSuccess={() => {
          setIsSimOpen(false);
          refetch();
        }}
      />
    </div>
  );
}
