import { useEffect, useRef } from 'react';

export default function FrameCanvas({ currentFrame, getFrameImage, isLoaded, subscribeRepaint }) {
  const canvasRef = useRef(null);
  const lastDrawnRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const img = getFrameImage(currentFrame) || lastDrawnRef.current;

      if (img && img.complete && img.naturalWidth > 0) {
        lastDrawnRef.current = img;

        const imgRatio = img.naturalWidth / img.naturalHeight;
        const screenRatio = width / height;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (screenRatio > imgRatio) {
          drawWidth = width;
          drawHeight = width / imgRatio;
          offsetX = 0;
          offsetY = (height - drawHeight) / 2;
        } else {
          drawHeight = height;
          drawWidth = height * imgRatio;
          offsetX = (width - drawWidth) / 2;
          offsetY = 0;
        }

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      } else if (!lastDrawnRef.current) {
        // Only if absolutely no frame has ever loaded
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, width, height);
      }

      ctx.restore();
    };

    draw();

    const handleResize = () => requestAnimationFrame(draw);
    window.addEventListener('resize', handleResize);

    const unsubscribe = subscribeRepaint ? subscribeRepaint(draw) : null;

    return () => {
      window.removeEventListener('resize', handleResize);
      if (unsubscribe) unsubscribe();
    };
  }, [currentFrame, getFrameImage, subscribeRepaint]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'block',
        objectFit: 'cover',
        pointerEvents: 'none',
        background: '#09090b',
      }}
    />
  );
}
