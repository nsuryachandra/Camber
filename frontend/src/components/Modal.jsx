import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({
  open,
  isOpen,
  title,
  subtitle,
  icon: Icon,
  onClose,
  children,
  footer,
  size = 'md', // sm, md, lg, xl
}) {
  const isVisible = open !== undefined ? open : isOpen;
  const ref = useRef(null);

  useEffect(() => {
    if (!isVisible) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isVisible, onClose]);

  // Trap focus & lock body scroll while modal is active
  useEffect(() => {
    if (isVisible) {
      if (ref.current) ref.current.focus();
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return createPortal(
    <div
      className="modal-overlay animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal modal-${size} animate-scale-up`}
        ref={ref}
        tabIndex={-1}
      >
        <div className="modal-header">
          <div className="modal-header-left">
            {Icon && (
              <div className="modal-header-icon-wrap">
                <Icon size={18} />
              </div>
            )}
            <div>
              <h3 className="modal-title">{title}</h3>
              {subtitle && <p className="modal-subtitle">{subtitle}</p>}
            </div>
          </div>
          <button
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">{children}</div>

        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
