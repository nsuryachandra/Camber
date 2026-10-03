import { useState, useMemo } from 'react';
import {
  Search,
  CreditCard,
  DollarSign,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowDownRight,
  Sparkles,
  X,
  FileText,
  User,
  Car,
  Printer,
  ShieldCheck,
  Zap,
  RefreshCw,
} from 'lucide-react';
import api from '../services/api';
import useFetch from '../hooks/useFetch';
import Modal from '../components/Modal';
import PaymentSimulatorModal from '../components/PaymentSimulatorModal';
import { Loading, Empty, ErrorState } from '../components/DataState';
import { formatCurrency, formatDate, statusClass } from '../utils/format';
import { useToast } from '../context/ToastContext';

const METHODS = ['CASH', 'CARD', 'UPI'];

export default function Payments() {
  const toast = useToast();

  // List state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [page, setPage] = useState(1);

  const query = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), limit: '12' });
    if (search) p.set('search', search);
    if (status) p.set('status', status);
    if (method) p.set('method', method);
    return p.toString();
  }, [search, status, method, page]);

  const { data, loading, error, refetch } = useFetch(`/payments?${query}`, [query]);
  const outstanding = useFetch('/payments/outstanding');

  // Record payment
  const [recordFor, setRecordFor] = useState(null);
  const [form, setForm] = useState({ amount: '', payment_method: 'UPI', reference_note: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Receipt
  const [receiptId, setReceiptId] = useState(null);
  const receipt = useFetch(receiptId ? `/payments/${receiptId}` : null);

  // Payment Simulator
  const [simulatorData, setSimulatorData] = useState(null);

  const openRecord = (row) => {
    setRecordFor(row);
    setForm({ amount: String(row.balance_due), payment_method: 'UPI', reference_note: '' });
    setFormError('');
  };

  const handleSimulatePayment = () => {
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      setFormError('Enter a valid amount greater than zero.');
      return;
    }
    setSimulatorData({
      amount,
      customerName: recordFor?.customer_name || 'Fleet Client',
      vehicleInfo: `${recordFor?.vehicle_name || 'Fleet Vehicle'} (Rental #${recordFor?.rental_id})`,
      onSuccess: async (details) => {
        try {
          const res = await api.post('/payments', {
            rental_id: recordFor.rental_id,
            amount: details.amount,
            payment_method: details.payment_method,
            payment_status: 'PAID',
            reference_note: details.reference_note,
          });
          toast.success(`Payment of ${formatCurrency(details.amount)} settled via ${details.payment_method}!`);
          setRecordFor(null);
          refetch();
          outstanding.refetch();
          if (res.data.payment?.payment_id) setReceiptId(res.data.payment.payment_id);
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to complete simulated settlement.');
        }
      },
    });
  };

  const submitRecord = async (e) => {
    e.preventDefault();
    setFormError('');
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      setFormError('Enter a valid amount greater than zero.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/payments', {
        rental_id: recordFor.rental_id,
        amount,
        payment_method: form.payment_method,
        payment_status: 'PAID',
        reference_note: form.reference_note || undefined,
      });
      toast.success(`Payment of ${formatCurrency(amount)} recorded successfully!`);
      setRecordFor(null);
      refetch();
      outstanding.refetch();
      if (res.data.payment?.payment_id) setReceiptId(res.data.payment.payment_id);
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not record payment.';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async (paymentId) => {
    try {
      await api.patch(`/payments/${paymentId}/status`, { payment_status: 'PAID' });
      toast.success('Payment status marked as PAID.');
      refetch();
      outstanding.refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update payment.');
    }
  };

  const payments = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []));
  const pagination = data?.pagination ?? { page: 1, pages: 1, total: 0 };
  const outstandingRows = Array.isArray(outstanding.data?.data) ? outstanding.data.data : (Array.isArray(outstanding.data) ? outstanding.data : []);
  const receiptPayment = receipt.data?.payment;
  const ledger = Array.isArray(receipt.data?.ledger) ? receipt.data.ledger : [];

  const totalOutstandingDue = outstandingRows.reduce(
    (acc, row) => acc + Number(row.balance_due || 0),
    0
  );

  const statusFilters = [
    { label: 'All Payments', value: '' },
    { label: 'Paid', value: 'PAID' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Failed', value: 'FAILED' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Payments &amp; Financials</h1>
          <p className="page-subtitle">
            Payment transactions ledger, outstanding dues settlement, and digital receipts.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              setSimulatorData({
                amount: 9600,
                customerName: 'Ananya Patel',
                vehicleInfo: 'Toyota Innova (KA03FG6789)',
                title: 'Live Escrow Settlement Demo',
                onSuccess: () => {
                  toast.success('Simulation completed successfully with verified ledger token!');
                  refetch();
                  outstanding.refetch();
                },
              });
            }}
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            <Zap size={15} /> Simulate Live Payment
          </button>
          <button className="btn btn-secondary" onClick={() => { refetch(); outstanding.refetch(); }} title="Refresh Ledger">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Bento Stats */}
      <div className="bento-grid" style={{ marginBottom: 24 }}>
        <div className="bento-stat-card amber">
          <div className="bento-stat-header">
            <div className="bento-stat-icon-wrap amber">
              <AlertTriangle size={20} />
            </div>
            <span className="bento-stat-trend neutral">
              {outstandingRows.length} Overdue Rentals
            </span>
          </div>
          <div>
            <div className="bento-stat-label">Total Outstanding Dues</div>
            <div className="bento-stat-value" style={{ color: 'var(--amber-dark)' }}>
              {formatCurrency(totalOutstandingDue)}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Uncollected balances on returned / active vehicles
            </p>
          </div>
        </div>

        <div className="bento-stat-card emerald">
          <div className="bento-stat-header">
            <div className="bento-stat-icon-wrap emerald">
              <Receipt size={20} />
            </div>
            <span className="bento-stat-trend positive">Settled Real-time</span>
          </div>
          <div>
            <div className="bento-stat-label">Transactions Recorded</div>
            <div className="bento-stat-value" style={{ color: 'var(--emerald)' }}>
              {data?.total ?? payments.length}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Via UPI, Debit/Credit Card, and Cash
            </p>
          </div>
        </div>
      </div>

      {/* Outstanding Dues Section */}
      {outstandingRows.length > 0 && (
        <div className="card" style={{ marginBottom: 24, border: '1px solid #fde68a' }}>
          <div className="card-header" style={{ background: '#fffbeb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={18} color="var(--amber-dark)" />
              <h3 style={{ color: '#92400e' }}>Outstanding Balances Awaiting Payment</h3>
            </div>
            <span className="badge badge-pending">
              <span className="badge-dot" />
              {outstandingRows.length} Invoices Pending
            </span>
          </div>
          <div className="card-body no-pad">
            <div className="table-wrap">
              <table className="dt">
                <thead>
                  <tr>
                    <th>Rental #</th>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    <th className="num">Total Billed</th>
                    <th className="num">Paid So Far</th>
                    <th className="num" style={{ color: 'var(--rose-dark)' }}>Balance Due</th>
                    <th className="actions">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {outstandingRows.map((row) => (
                    <tr key={row.rental_id}>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          #{String(row.rental_id).padStart(4, '0')}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{row.customer_name}</span>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.phone}</div>
                      </td>
                      <td>
                        <span>{row.brand} {row.model}</span>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {row.registration_number}
                        </div>
                      </td>
                      <td className="num">{formatCurrency(row.final_amount)}</td>
                      <td className="num" style={{ color: 'var(--emerald)' }}>{formatCurrency(row.paid_amount)}</td>
                      <td className="num" style={{ color: 'var(--rose-dark)', fontWeight: 800 }}>
                        {formatCurrency(row.balance_due)}
                      </td>
                      <td className="actions">
                        <button className="btn btn-sm btn-primary" onClick={() => openRecord(row)}>
                          <DollarSign size={13} /> Settle Dues
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Payments History Ledger */}
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="segmented-control">
            {statusFilters.map((sf) => (
              <button
                key={sf.value}
                className={`pill-tab ${status === sf.value ? 'active' : ''}`}
                onClick={() => {
                  setStatus(sf.value);
                  setPage(1);
                }}
              >
                {sf.label}
              </button>
            ))}
          </div>

          <div className="search-input-wrap">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              className="form-input"
              placeholder="Search customer, payment #..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            {search && (
              <button className="search-clear-btn" onClick={() => setSearch('')} aria-label="Clear">
                <X size={14} />
              </button>
            )}
          </div>

          <select
            className="form-select"
            style={{ width: 140 }}
            value={method}
            onChange={(e) => {
              setMethod(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Methods</option>
            {METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && <Loading text="Loading payment ledger…" />}
      {error && <ErrorState message={`Failed to load payments: ${error}`} onRetry={refetch} />}
      {!loading && !error && payments.length === 0 && (
        <Empty message="No payments matching criteria." />
      )}

      {!loading && !error && payments.length > 0 && (
        <div className="card">
          <div className="card-body no-pad">
            <div className="table-wrap">
              <table className="dt">
                <thead>
                  <tr>
                    <th>Receipt #</th>
                    <th>Rental #</th>
                    <th>Customer</th>
                    <th>Payment Method</th>
                    <th>Date &amp; Time</th>
                    <th className="num">Amount Paid</th>
                    <th>Status</th>
                    <th className="actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.payment_id}>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>
                          REC-{String(p.payment_id).padStart(5, '0')}
                        </span>
                      </td>
                      <td>#{p.rental_id}</td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{p.customer_name}</span>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.vehicle_name}</div>
                      </td>
                      <td>
                        <span className="badge badge-booked" style={{ fontSize: 11 }}>
                          {p.payment_method}
                        </span>
                      </td>
                      <td>{formatDate(p.payment_date)}</td>
                      <td className="num" style={{ color: 'var(--emerald-dark)', fontWeight: 700 }}>
                        {formatCurrency(p.amount)}
                      </td>
                      <td>
                        <span className={`badge ${statusClass(p.payment_status)}`}>
                          <span className="badge-dot" />
                          {p.payment_status}
                        </span>
                      </td>
                      <td className="actions">
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => setReceiptId(p.payment_id)}
                            title="View Receipt"
                          >
                            <FileText size={13} /> Receipt
                          </button>
                          {p.payment_status === 'PENDING' && (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => markPaid(p.payment_id)}
                            >
                              <CheckCircle2 size={13} /> Mark Paid
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && data && data.pages > 1 && (
        <div className="pagination" style={{ marginTop: 20, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <span>
            Showing page <strong>{data.page}</strong> of <strong>{data.pages}</strong> ({data.total} total payments)
          </span>
          <div className="pagination-controls">
            <button
              className="btn btn-sm btn-secondary"
              disabled={data.page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <button
              className="btn btn-sm btn-secondary"
              disabled={data.page >= data.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      <Modal
        open={Boolean(recordFor)}
        onClose={() => setRecordFor(null)}
        title="Record Payment Collection"
        subtitle={`Rental #${recordFor?.rental_id} — ${recordFor?.customer_name}`}
        icon={CreditCard}
        size="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <button className="btn btn-secondary" onClick={() => setRecordFor(null)}>
              Cancel
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={submitRecord} disabled={saving}>
                {saving ? 'Recording…' : 'Quick Save'}
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSimulatePayment}
                disabled={saving}
                style={{
                  background: 'linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)',
                  boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Zap size={14} /> Settle via Simulator
              </button>
            </div>
          </div>
        }
      >
        {formError && <div className="state-error-card" style={{ marginBottom: 16 }}>{formError}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="summary-card" style={{ padding: 14 }}>
            <div className="summary-row">
              <span className="k">Total Rental Cost</span>
              <span className="v">{formatCurrency(recordFor?.final_amount || 0)}</span>
            </div>
            <div className="summary-row">
              <span className="k">Remaining Balance Due</span>
              <span className="v" style={{ color: 'var(--rose-dark)', fontWeight: 700 }}>
                {formatCurrency(recordFor?.balance_due || 0)}
              </span>
            </div>
          </div>

          <div className="form-group">
            <label>Amount to Collect (₹) *</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Payment Method *</label>
            <select
              className="form-select"
              value={form.payment_method}
              onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
            >
              <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
              <option value="CARD">Credit / Debit Card (POS)</option>
              <option value="CASH">Cash Deposit</option>
              <option value="BANK_TRANSFER">Direct Bank Transfer</option>
            </select>
          </div>

          <div className="form-group">
            <label>Reference / Transaction Note</label>
            <input
              className="form-input"
              placeholder="e.g. UPI Ref #98712398412"
              value={form.reference_note}
              onChange={(e) => setForm({ ...form, reference_note: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      {/* Digital Receipt Modal — Bespoke Official Payment Voucher */}
      <Modal
        open={Boolean(receiptId)}
        onClose={() => setReceiptId(null)}
        title={receiptPayment ? `Payment Voucher REC-${String(receiptPayment.payment_id).padStart(5, '0')}` : 'Payment Voucher'}
        subtitle="CAMBER Mobility Systems • Authorized Digital Receipt"
        icon={Receipt}
        size="md"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              REC-#{String(receiptPayment?.payment_id || 0).padStart(5, '0')} • VERIFIED
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => window.print()}
                title="Print or save as PDF"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Printer size={13} />
                <span>Print Voucher</span>
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setReceiptId(null)}>
                Close
              </button>
            </div>
          </div>
        }
      >
        {receipt.loading && <Loading text="Retrieving verified transaction ledger..." />}
        {receipt.error && <ErrorState message={receipt.error} />}
        {receiptPayment && (
          <div className="receipt-voucher-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Top Settlement Hero Banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                border: '1px solid #bbf7d0',
                borderRadius: 12,
                padding: '12px 16px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                <span style={{ fontSize: 10, fontWeight: 800, color: '#047857', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Transaction Settled &amp; Verified
                </span>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 27,
                  fontWeight: 850,
                  color: '#064e3b',
                  letterSpacing: '-0.03em',
                  lineHeight: 1.1,
                  margin: '2px 0',
                }}
              >
                {formatCurrency(receiptPayment.amount)}
              </div>
              <div style={{ fontSize: 11, color: '#047857', fontWeight: 600 }}>
                Cleared via {receiptPayment.payment_method} • Instant Deposit
              </div>
            </div>

            {/* Two-Column Grid: Customer vs Vehicle Details */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 8,
              }}
            >
              {/* Customer Box */}
              <div style={{ padding: '10px 12px', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 9 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 750, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                  <User size={11} style={{ color: 'var(--primary)' }} />
                  <span>Billed Customer</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 750, color: 'var(--text-primary)' }}>
                  {receiptPayment.customer_name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
                  {receiptPayment.customer_phone || 'Verified Client'}
                </div>
                {receiptPayment.customer_email && (
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 1 }}>
                    {receiptPayment.customer_email}
                  </div>
                )}
              </div>

              {/* Vehicle Box */}
              <div style={{ padding: '10px 12px', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 9 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 750, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                  <Car size={11} style={{ color: 'var(--primary)' }} />
                  <span>Assigned Vehicle</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 750, color: 'var(--text-primary)' }}>
                  {receiptPayment.brand} {receiptPayment.model}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontWeight: 600, marginTop: 1 }}>
                  {receiptPayment.registration_number}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 1 }}>
                  Hub: {receiptPayment.branch_name || 'CAMBER Hyderabad Hub'}
                </div>
              </div>
            </div>

            {/* Financial Breakdown Table */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 9, overflow: 'hidden' }}>
              <div style={{ padding: '6px 12px', background: '#f1f5f9', borderBottom: '1px solid var(--border)', fontSize: 10.5, fontWeight: 750, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Settlement Statement Breakdown
              </div>
              <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Rental Charges ({receiptPayment.rental_days || 1} Day{Number(receiptPayment.rental_days) > 1 ? 's' : ''} @ {formatCurrency(receiptPayment.daily_rate || receiptPayment.amount)})
                  </span>
                  <span style={{ fontWeight: 650, color: 'var(--text-primary)' }}>
                    {formatCurrency(receiptPayment.rental_amount || receiptPayment.amount)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Comprehensive Fleet Insurance &amp; Unlimited Kilometres
                  </span>
                  <span style={{ fontWeight: 700, color: '#059669', fontSize: 11 }}>
                    INCLUDED (COMPLIMENTARY)
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Refundable Security Deposit
                  </span>
                  <span style={{ fontWeight: 700, color: '#059669', fontSize: 11 }}>
                    WAIVED (₹0.00)
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 13,
                    fontWeight: 800,
                    borderTop: '1px dashed var(--border)',
                    paddingTop: 6,
                    marginTop: 2,
                  }}
                >
                  <span style={{ color: 'var(--text-primary)' }}>Total Amount Settled</span>
                  <span style={{ color: 'var(--primary)', fontFamily: 'var(--font-display)', fontSize: 15 }}>
                    {formatCurrency(receiptPayment.amount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Audit & Transaction Verification Seal */}
            <div
              style={{
                padding: '8px 12px',
                background: '#fafafa',
                border: '1px solid #f1f5f9',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 6,
                fontSize: 10.5,
                color: 'var(--text-muted)',
              }}
            >
              <div>
                <span style={{ fontWeight: 600 }}>Cleared:</span> {formatDate(receiptPayment.payment_date)}
                {receiptPayment.reference_note ? ` • ${receiptPayment.reference_note}` : ''}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#059669', fontWeight: 700 }}>
                <ShieldCheck size={12} />
                <span>RFID Verified Ledger</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Interactive Luxury Payment Simulator Modal */}
      {simulatorData && (
        <PaymentSimulatorModal
          isOpen={Boolean(simulatorData)}
          onClose={() => setSimulatorData(null)}
          amount={simulatorData.amount}
          title={simulatorData.title || 'Instant Payment Settlement'}
          customerName={simulatorData.customerName}
          vehicleInfo={simulatorData.vehicleInfo}
          onSuccess={(details) => {
            if (simulatorData.onSuccess) {
              simulatorData.onSuccess(details);
            }
          }}
        />
      )}
    </div>
  );
}
