import { useScrollFrameAnimation } from '../../hooks/useScrollFrameAnimation';
import FrameCanvas from './FrameCanvas';
import { ChevronDown, ArrowRight, Zap, Sparkles } from 'lucide-react';

export default function VehicleIntro({ onComplete, onSkip }) {
  const {
    currentFrame,
    totalFrames,
    progress,
    isLoaded,
    isFastForwarding,
    fastForward,
    getFrameImage,
    subscribeRepaint,
  } = useScrollFrameAnimation({
    onComplete,
  });

  const handleSkipClick = () => {
    fastForward();
  };

  // Calculate phase opacities cleanly for cinematic text overlays
  // Phase 1: 0.02 - 0.20
  const p1Opacity = progress < 0.22 ? Math.min(1, Math.max(0, 1 - Math.abs(progress - 0.10) / 0.10)) : 0;
  // Phase 2: 0.25 - 0.48
  const p2Opacity = progress >= 0.22 && progress < 0.50 ? Math.min(1, Math.max(0, 1 - Math.abs(progress - 0.36) / 0.14)) : 0;
  // Phase 3: 0.52 - 0.74
  const p3Opacity = progress >= 0.50 && progress < 0.76 ? Math.min(1, Math.max(0, 1 - Math.abs(progress - 0.63) / 0.13)) : 0;
  // Phase 4: 0.78 - 0.95
  const p4Opacity = progress >= 0.76 && progress < 0.98 ? Math.min(1, Math.max(0, 1 - Math.abs(progress - 0.87) / 0.11)) : 0;

  return (
    <div
      className="vehicle-intro-fixed-container"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#09090b',
        color: '#ffffff',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        userSelect: 'none',
        fontFamily: 'var(--font-sans)',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        textRendering: 'geometricPrecision',
      }}
    >
      {/* Render Canvas Frame Sequence */}
      <FrameCanvas
        currentFrame={currentFrame}
        getFrameImage={getFrameImage}
        isLoaded={isLoaded}
        subscribeRepaint={subscribeRepaint}
      />

      {/* Top Floating Bar: Minimal Logo + Subtle Skip CTA */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          padding: '24px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pointerEvents: 'auto',
        }}
      >
        {/* Brand Mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
          <div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, letterSpacing: '0.02em', color: '#ffffff' }}>
              CAMBER
            </span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10.5, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.8)', marginLeft: 10, textTransform: 'uppercase', fontWeight: 600 }}>
              Built to keep operations in line.
            </span>
          </div>
        </div>

        {/* Skip Intro Control */}
        <button
          onClick={handleSkipClick}
          style={{
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            color: '#ffffff',
            padding: '9px 20px',
            borderRadius: 24,
            fontSize: 12.5,
            fontWeight: 700,
            letterSpacing: '0.04em',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            fontFamily: 'var(--font-sans)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(37, 99, 235, 0.85)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(15, 23, 42, 0.75)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
            e.currentTarget.style.transform = 'none';
          }}
        >
          <span>{isFastForwarding ? 'Fast-Forwarding (1.5x)…' : 'Skip to Login'}</span>
          <ArrowRight size={14} style={{ transform: isFastForwarding ? 'translateX(3px)' : 'none', transition: 'transform 0.2s ease' }} />
        </button>
      </div>

      {/* ================= CINEMATIC TYPOGRAPHY PHASES ================= */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        {/* Phase 1: Reveal */}
        <div
          style={{
            position: 'absolute',
            textAlign: 'center',
            opacity: p1Opacity,
            transform: `translateY(${p1Opacity * 10 - 10}px)`,
            transition: 'opacity 0.15s ease, transform 0.15s ease',
            maxWidth: 640,
            padding: '0 20px',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#93c5fd',
              marginBottom: 10,
              textRendering: 'geometricPrecision',
            }}
          >
            The Fleet Mobility Standard
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(32px, 5.5vw, 52px)',
              fontWeight: 900,
              letterSpacing: '-0.025em',
              lineHeight: 1.1,
              color: '#ffffff',
              textRendering: 'geometricPrecision',
              textShadow: '0 8px 32px rgba(0,0,0,0.85)',
            }}
          >
            INTELLIGENT VEHICLE RENTALS
          </h2>
        </div>

        {/* Phase 2: Detail */}
        <div
          style={{
            position: 'absolute',
            bottom: '18%',
            left: '8%',
            opacity: p2Opacity,
            transform: `translateY(${p2Opacity * 10 - 10}px)`,
            transition: 'opacity 0.15s ease, transform 0.15s ease',
            maxWidth: 480,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#93c5fd',
              marginBottom: 6,
              textRendering: 'geometricPrecision',
            }}
          >
            Verified Performance
          </div>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(24px, 3.8vw, 36px)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: '#ffffff',
              lineHeight: 1.18,
              textRendering: 'geometricPrecision',
              textShadow: '0 6px 28px rgba(0,0,0,0.9)',
            }}
          >
            POWER, PRECISION &amp; SAFETY IN EVERY TRIP.
          </h3>
        </div>

        {/* Phase 3: Movement */}
        <div
          style={{
            position: 'absolute',
            bottom: '18%',
            right: '8%',
            textAlign: 'right',
            opacity: p3Opacity,
            transform: `translateY(${p3Opacity * 10 - 10}px)`,
            transition: 'opacity 0.15s ease, transform 0.15s ease',
            maxWidth: 480,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#34d399',
              marginBottom: 6,
              textRendering: 'geometricPrecision',
            }}
          >
            Multi-Category Fleet
          </div>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(24px, 3.8vw, 36px)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: '#ffffff',
              lineHeight: 1.18,
              textRendering: 'geometricPrecision',
              textShadow: '0 6px 28px rgba(0,0,0,0.9)',
            }}
          >
            ELECTRIC, SEDANS, SUVS &amp; LUXURY CARS.
          </h3>
        </div>

        {/* Phase 4: The Open Road */}
        <div
          style={{
            position: 'absolute',
            textAlign: 'center',
            opacity: p4Opacity,
            transform: `translateY(${p4Opacity * 10 - 10}px)`,
            transition: 'opacity 0.15s ease, transform 0.15s ease',
            maxWidth: 620,
            padding: '0 20px',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#fbbf24',
              marginBottom: 10,
              textRendering: 'geometricPrecision',
            }}
          >
            Ready for the Open Road
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(32px, 5vw, 48px)',
              fontWeight: 900,
              letterSpacing: '-0.025em',
              lineHeight: 1.12,
              color: '#ffffff',
              textRendering: 'geometricPrecision',
              textShadow: '0 8px 32px rgba(0,0,0,0.92)',
            }}
          >
            YOUR JOURNEY BEGINS HERE.
          </h2>
        </div>
      </div>

      {/* Bottom Floating Bar: Subtle Scroll Cue + Progress Line */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          padding: '24px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          pointerEvents: 'none',
        }}
      >
        {/* Scroll Cue (fades out gently after initial scroll) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'rgba(255, 255, 255, 0.75)',
            opacity: Math.max(0, 1 - progress * 4),
            transition: 'opacity 0.2s ease',
            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
          }}
        >
          <span>Scroll Mouse Wheel / Swipe to Drive</span>
          <ChevronDown size={14} className="animate-bounce" />
        </div>

        {/* Minimalist Progress Track */}
        <div
          style={{
            width: '100%',
            maxWidth: 240,
            height: 2,
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #6366f1 0%, #34d399 100%)',
              transition: 'width 0.05s linear',
            }}
          />
        </div>
      </div>
    </div>
  );
}
