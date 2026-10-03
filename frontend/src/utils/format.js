// Currency: Indian Rupees — always two decimals, comma-grouped.
export function formatCurrency(val) {
  const n = Number(val);
  if (!Number.isFinite(n)) return '₹0';
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function formatCurrencyFull(val) {
  const n = Number(val);
  if (!Number.isFinite(n)) return '₹0.00';
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Dates: "10 Sep 2026"
export function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date)) return '—';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Short date: "10 Sep"
export function formatDateShort(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date)) return '—';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// Month label: "Sep 2026"
export function formatMonth(m) {
  if (!m) return '—';
  const [y, mo] = m.split('-');
  const d = new Date(Number(y), Number(mo) - 1);
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

// Classify string → CSS class for badge
export function statusClass(s) {
  const key = String(s).toLowerCase().replace(/[\s-]/g, '');
  const map = {
    available: 'badge-available', rented: 'badge-rented',
    maintenance: 'badge-maintenance', inactive: 'badge-inactive',
    booked: 'badge-booked', active: 'badge-active',
    completed: 'badge-completed', cancelled: 'badge-cancelled',
    paid: 'badge-paid', pending: 'badge-pending',
    good: 'badge-good', fair: 'badge-fair', damaged: 'badge-damaged',
    scheduled: 'badge-scheduled', inprogress: 'badge-in-progress',
  };
  return map[key] || 'badge';
}
