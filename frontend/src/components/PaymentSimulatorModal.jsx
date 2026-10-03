import { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  RefreshCw,
  Printer,
  Smartphone,
  Check,
  Zap,
  Building2,
  CreditCard,
  Download,
} from 'lucide-react';
import QRCode from 'qrcode';
import Modal from './Modal';
import { formatCurrency } from '../utils/format';

// ---------------------------------------------------------------------------
// 1. Web Audio API Harmonic Chime
// ---------------------------------------------------------------------------
function playSuccessChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Elegant dual-harmonic settlement chime
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.07;
      const duration = 0.7;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } catch (e) {}
}

// ---------------------------------------------------------------------------
// 2. Party Popper Confetti Canvas
// ---------------------------------------------------------------------------
function ConfettiPopperCanvas({ active }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = (canvas.width = canvas.offsetWidth);
    const height = (canvas.height = canvas.offsetHeight);

    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ffffff'];
    // Party popper blasts outward from left and right corners
    const particles = [];
    for (let i = 0; i < 90; i++) {
      const fromLeft = i % 2 === 0;
      particles.push({
        x: fromLeft ? 30 : width - 30,
        y: height - 40,
        vx: fromLeft ? Math.random() * 12 + 4 : -(Math.random() * 12 + 4),
        vy: -(Math.random() * 16 + 10),
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 14,
        opacity: 1,
        gravity: 0.38,
      });
    }

    let animId;
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      let alive = false;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.rotation += p.rotSpeed;
        p.opacity -= 0.012;

        if (p.opacity > 0) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
          ctx.restore();
        }
      }
      if (alive) {
        animId = requestAnimationFrame(render);
      }
    };
    render();

    return () => cancelAnimationFrame(animId);
  }, [active]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 60,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// 3. Main Enterprise Payment Gateway & Voucher Component
// ---------------------------------------------------------------------------
export default function PaymentSimulatorModal({
  isOpen,
  onClose,
  amount = 9600,
  title = 'Payment Gateway Settlement',
  customerName = 'N Suryachandra',
  vehicleInfo = 'Toyota Fortuner 4x4 • KA05ZA4567',
  onSuccess,
}) {
  const [stage, setStage] = useState('QR'); // 'QR', 'PROCESSING', 'RECEIPT'
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [progress, setProgress] = useState(0);
  const [processStatus, setProcessStatus] = useState('Connecting to payment gateway…');
  const [transactionRef, setTransactionRef] = useState('');
  const [voucherId, setVoucherId] = useState('');
  const [paymentDate, setPaymentDate] = useState('');

  // Generate authentic UPI QR Code whenever opened or amount changes
  useEffect(() => {
    if (isOpen) {
      setStage('QR');
      setProgress(0);
      setProcessStatus('Connecting to payment gateway…');

      const randTxn = `TXN${Math.floor(100000000 + Math.random() * 900000000)}`;
      const randVoucher = `REC-${Math.floor(10000 + Math.random() * 90000)}`;
      setTransactionRef(randTxn);
      setVoucherId(randVoucher);
      setPaymentDate(
        new Date().toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );

      // Real NPCI standard UPI URI with user's verified UPI handle & formatted amount
      const formattedAmount = Number(amount || 0).toFixed(2);
      const upiUri = `upi://pay?pa=6281163248@upi&pn=CAMBER%20Mobility&am=${formattedAmount}&cu=INR&tn=Camber%20Fleet%20${randTxn}`;

      QRCode.toDataURL(upiUri, {
        width: 260,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR code', err));
    }
  }, [isOpen, amount]);

  // Execute settlement progression
  const handleConfirmPayment = () => {
    setStage('PROCESSING');
    setProgress(15);
    setProcessStatus('Verifying UPI / Bank Escrow Handshake…');

    const t1 = setTimeout(() => {
      setProgress(60);
      setProcessStatus('NPCI Payment Token Authenticated…');
    }, 700);

    const t2 = setTimeout(() => {
      setProgress(90);
      setProcessStatus('Committing Transaction to Vehicle Ledger…');
    }, 1400);

    const t3 = setTimeout(() => {
      setProgress(100);
      setProcessStatus('Payment Settled Successfully!');
      setStage('RECEIPT');
      playSuccessChime();
    }, 2100);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  };

  const handleFinish = () => {
    if (onSuccess) {
      onSuccess({
        payment_method: 'UPI',
        reference_note: `UPI Ref #${transactionRef}`,
        transaction_id: transactionRef,
        voucher_id: voucherId,
        amount,
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={stage === 'PROCESSING' ? () => {} : onClose}
      title={stage === 'RECEIPT' ? 'Payment Receipt & Voucher' : 'Live Payment Settlement'}
      subtitle={stage === 'RECEIPT' ? 'Official CAMBER Mobility Digital Fiscal Receipt' : 'Scan via Any UPI App or Confirm Settlement'}
      icon={stage === 'RECEIPT' ? CheckCircle2 : QrCode}
      size="md"
    >
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <ConfettiPopperCanvas active={stage === 'RECEIPT'} />

        {/* =========================================================================
            STAGE 1: REAL SCANNABLE UPI QR CODE & AMOUNT DISPLAY
            ========================================================================= */}
        {stage === 'QR' && (
          <div>
            {/* Amount Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                background: '#09090b',
                borderRadius: 10,
                color: '#ffffff',
                marginBottom: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 10.5, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                  Payable Amount
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#38bdf8', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
                  {formatCurrency(amount)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10.5, color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 700 }}>
                  Assigned Vehicle
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#f8fafc' }}>
                  {vehicleInfo}
                </div>
              </div>
            </div>

            {/* Real QR Container */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '14px 16px',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                marginBottom: 14,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
                Scan to Pay with Any UPI App
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>
                UPI ID: <strong style={{ color: '#09090b', fontFamily: 'monospace' }}>628XXXXXXX@upi</strong> &bull; Amount pre-filled on scan
              </div>

              {/* Scannable QR Image */}
              <div
                style={{
                  display: 'inline-block',
                  padding: 8,
                  background: '#ffffff',
                  border: '2px solid #0f172a',
                  borderRadius: 10,
                  boxShadow: '0 6px 18px rgba(15, 23, 42, 0.08)',
                  position: 'relative',
                }}
              >
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Scan UPI QR"
                    style={{ width: 150, height: 150, display: 'block' }}
                  />
                ) : (
                  <div style={{ width: 150, height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RefreshCw size={24} className="spin" />
                  </div>
                )}
              </div>

              {/* Accepted UPI Apps Strip */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {['Google Pay', 'PhonePe', 'Paytm', 'BHIM UPI'].map((appName) => (
                  <span
                    key={appName}
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: '#475569',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      padding: '2px 8px',
                      borderRadius: 6,
                    }}
                  >
                    {appName}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmPayment}
                style={{ flex: 1.5, justifyContent: 'center' }}
              >
                <Zap size={15} /> Confirm & Settle Payment
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            STAGE 2: TELEMETRY PROGRESSION BAR
            ========================================================================= */}
        {stage === 'PROCESSING' && (
          <div style={{ textAlign: 'center', padding: '36px 20px' }}>
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: '50%',
                background: '#09090b',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: '0 0 30px rgba(52, 211, 153, 0.3)',
              }}
            >
              <RefreshCw size={32} className="spin" />
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px' }}>
              {processStatus}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 360, margin: '0 auto 24px' }}>
              Communicating with national payment gateway escrow server. Please wait while the transaction clears.
            </p>

            {/* Smooth Dynamic Progress Bar */}
            <div
              style={{
                height: 8,
                background: '#f1f5f9',
                borderRadius: 9999,
                overflow: 'hidden',
                maxWidth: 360,
                margin: '0 auto',
                border: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                  borderRadius: 9999,
                  transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--emerald)', marginTop: 8 }}>
              {progress}% Completed
            </div>
          </div>
        )}

        {/* =========================================================================
            STAGE 3: PROFESSIONAL OFFICIAL PAYMENT RECEIPT VOUCHER
            ========================================================================= */}
        {stage === 'RECEIPT' && (
          <div style={{ padding: '4px 0' }}>
            {/* Top Verified Alert */}
            <div
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: 10,
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#047857' }}>
                <CheckCircle2 size={18} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>
                  Payment Verified & Settle To Fleet Ledger
                </span>
              </div>
              <span className="badge badge-available">
                <span className="badge-dot" /> SETTLED
              </span>
            </div>

            {/* Official Digital Voucher Document */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '22px 20px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
                marginBottom: 18,
              }}
            >
              {/* Receipt Top Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: 14, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                    CAMBER MOBILITY SYSTEMS
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    Hyderabad Fleet Operations &bull; Digital Receipt
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#2563eb', fontFamily: 'var(--font-mono)' }}>
                    {voucherId}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    {paymentDate}
                  </div>
                </div>
              </div>

              {/* Customer & Vehicle Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16, background: '#f8fafc', padding: 12, borderRadius: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Billed Customer</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{customerName}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Assigned Vehicle</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{vehicleInfo}</div>
                </div>
              </div>

              {/* Settlement Statement Breakdown */}
              <div style={{ fontSize: 12.5, lineHeight: 1.8, borderBottom: '1px solid #f1f5f9', paddingBottom: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#475569' }}>Rental Charges (Settled):</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{formatCurrency(amount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#475569' }}>Comprehensive Fleet Insurance:</span>
                  <span style={{ fontWeight: 700, color: '#059669' }}>INCLUDED (₹0)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#475569' }}>Refundable Security Deposit:</span>
                  <span style={{ fontWeight: 700, color: '#059669' }}>WAIVED (₹0)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#475569' }}>Gateway Txn Reference:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#2563eb' }}>{transactionRef}</span>
                </div>
              </div>

              {/* Total Settled Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Total Amount Paid</span>
                <span style={{ fontSize: 24, fontWeight: 900, color: '#059669', fontFamily: 'var(--font-display)' }}>
                  {formatCurrency(amount)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => window.print()}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <Printer size={15} /> Print / Save PDF
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleFinish}
                style={{ flex: 1.2, justifyContent: 'center' }}
              >
                Done <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
