import { useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Car,
  KeyRound,
  DollarSign,
  Building2,
  Users,
  Award,
  Calendar,
} from 'lucide-react';
import useFetch from '../hooks/useFetch';
import { Loading, Empty, ErrorState } from '../components/DataState';
import { formatCurrency, formatDate, statusClass } from '../utils/format';

function Block({ title, sub, icon: Icon, badge, children }) {
  return (
    <div className="card" style={{ marginTop: 24 }}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {Icon && (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-md)',
                background: '#eef2ff',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon size={16} />
            </div>
          )}
          <div>
            <h3>{title}</h3>
            {sub && <p className="page-subtitle" style={{ margin: '2px 0 0' }}>{sub}</p>}
          </div>
        </div>
        {badge}
      </div>
      <div className="card-body no-pad">{children}</div>
    </div>
  );
}

function ReportTable({ headers, rows, emptyMessage }) {
  if (!rows || rows.length === 0)
    return <Empty message={emptyMessage || 'No data available for this report.'} />;
  return (
    <div className="table-wrap">
      <table className="dt">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h.label} className={h.num ? 'num' : ''}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className={headers[j].num ? 'num' : ''}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Reports() {
  const [days, setDays] = useState(30);
  const fleet = useFetch('/reports/fleet');
  const rentalsRep = useFetch('/reports/rentals');
  const revenueRep = useFetch(`/reports/revenue?days=${days}`, [days]);

  if (fleet.loading || rentalsRep.loading) return <Loading text="Computing SQL analytics models…" />;
  if (fleet.error) return <ErrorState message={`Unable to load fleet reports: ${fleet.error}`} />;
  if (rentalsRep.error) return <ErrorState message={`Unable to load rental reports: ${rentalsRep.error}`} />;

  const f = fleet.data;
  const r = rentalsRep.data;
  const rev = revenueRep.data;

  const dateFilters = [
    { label: '7 Days', value: 7 },
    { label: '30 Days', value: 30 },
    { label: '90 Days', value: 90 },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics &amp; Intelligence</h1>
          <p className="page-subtitle">
            Enterprise fleet metrics, database views, aggregation telemetry, and revenue performance.
          </p>
        </div>
      </div>

      {/* ============================ FLEET INTELLIGENCE ============================ */}
      <Block
        title="Fleet Composition & Health"
        sub="Inventory categorized by vehicle type and current availability rates"
        icon={Car}
      >
        <ReportTable
          headers={[
            { label: 'Vehicle Type' },
            { label: 'Total Fleet', num: true },
            { label: 'Available Now', num: true },
            { label: 'Average Daily Rate', num: true },
            { label: 'Min Rate', num: true },
            { label: 'Max Rate', num: true },
          ]}
          rows={(f.by_type ?? []).map((t) => [
            <span style={{ fontWeight: 600 }}>{t.type_name}</span>,
            t.total,
            <span style={{ color: 'var(--emerald)', fontWeight: 700 }}>{t.available}</span>,
            formatCurrency(t.avg_rate),
            formatCurrency(t.min_rate),
            formatCurrency(t.max_rate),
          ])}
        />
      </Block>

      <Block
        title="Branch Distribution & Fleet Utilization"
        sub="Vehicle stationing across regional hubs"
        icon={Building2}
      >
        <ReportTable
          headers={[
            { label: 'Branch Name' },
            { label: 'City Hub' },
            { label: 'Total Vehicles', num: true },
            { label: 'Available', num: true },
            { label: 'Rented', num: true },
            { label: 'Maintenance', num: true },
            { label: 'Average Daily Rate', num: true },
          ]}
          rows={(f.by_branch ?? []).map((b) => [
            <span style={{ fontWeight: 600 }}>{b.branch_name}</span>,
            b.city,
            b.total,
            <span style={{ color: 'var(--emerald)', fontWeight: 700 }}>{b.available}</span>,
            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{b.rented}</span>,
            <span style={{ color: 'var(--amber-dark)', fontWeight: 700 }}>{b.maintenance}</span>,
            formatCurrency(b.avg_rate),
          ])}
        />
      </Block>

      <Block
        title="Top Utilized Vehicles"
        sub="Highest revenue-generating and most frequently booked fleet assets"
        icon={Award}
      >
        <ReportTable
          headers={[
            { label: 'Vehicle Make & Model' },
            { label: 'Registration #' },
            { label: 'Category' },
            { label: 'Completed Rentals', num: true },
            { label: 'Gross Revenue', num: true },
          ]}
          rows={(f.most_rented ?? []).map((v) => [
            <span style={{ fontWeight: 700 }}>{v.vehicle_name}</span>,
            <span style={{ fontFamily: 'var(--font-mono)' }}>{v.registration_number}</span>,
            <span className="badge badge-booked">{v.type_name}</span>,
            v.total_rentals,
            <span style={{ color: 'var(--emerald-dark)', fontWeight: 700 }}>
              {formatCurrency(v.total_revenue)}
            </span>,
          ])}
        />
      </Block>

      {/* ============================ REVENUE REPORTS ============================ */}
      <Block
        title="Daily Revenue Trend"
        sub="Financial collections within selected historical window"
        icon={TrendingUp}
        badge={
          <div className="segmented-control">
            {dateFilters.map((df) => (
              <button
                key={df.value}
                className={`pill-tab ${days === df.value ? 'active' : ''}`}
                onClick={() => setDays(df.value)}
              >
                {df.label}
              </button>
            ))}
          </div>
        }
      >
        {revenueRep.loading ? (
          <div style={{ padding: 24 }}><Loading /></div>
        ) : revenueRep.error ? (
          <div style={{ padding: 16 }}><ErrorState message={revenueRep.error} /></div>
        ) : (rev?.daily?.length ?? 0) === 0 ? (
          <Empty message="No paid transactions in this time window." />
        ) : (
          <div style={{ padding: 20 }}>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart
                data={rev.daily.map((d) => ({
                  date: formatDate(d.revenue_date),
                  total: Number(d.total),
                }))}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="repRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [formatCurrency(v), 'Revenue']} />
                <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#repRevGrad)" dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Block>

      <Block
        title="Top Renter Customers"
        sub="Most active customers ranked by trips and lifetime spending"
        icon={Users}
      >
        <ReportTable
          headers={[
            { label: 'Customer Name' },
            { label: 'Phone Number' },
            { label: 'Completed Rentals', num: true },
            { label: 'Total Value Spent', num: true },
          ]}
          rows={(r.top_customers ?? []).map((c) => [
            <span style={{ fontWeight: 700 }}>{c.name}</span>,
            c.phone,
            c.total_rentals,
            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{formatCurrency(c.total_spent)}</span>,
          ])}
        />
      </Block>
    </div>
  );
}

function formatMonthSafe(m) {
  if (!m) return '—';
  const [y, mo] = m.split('-');
  const d = new Date(Number(y), Number(mo) - 1);
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}
