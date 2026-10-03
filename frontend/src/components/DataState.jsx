import { AlertCircle, Inbox, Loader2 } from 'lucide-react';

export function Loading({ text = 'Loading data…' }) {
  return (
    <div className="state-loading">
      <div className="state-loading-spinner-wrap">
        <Loader2 className="spinner-icon animate-spin" size={28} />
      </div>
      <p className="state-loading-text">{text}</p>
    </div>
  );
}

export function Empty({ message = 'No records found.', action, children }) {
  return (
    <div className="state-empty">
      <div className="state-empty-icon-wrap">
        <Inbox size={32} />
      </div>
      <h4 className="state-empty-title">{message}</h4>
      <p className="state-empty-sub">Try adjusting your filters or search criteria, or add a new record.</p>
      {action && <div className="state-empty-action">{action}</div>}
      {children}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="state-error-card">
      <div className="state-error-icon-wrap">
        <AlertCircle size={22} />
      </div>
      <div className="state-error-content">
        <h4 className="state-error-title">Unable to load data</h4>
        <p className="state-error-msg">{message || 'An unexpected error occurred while communicating with the server.'}</p>
        {onRetry && (
          <button className="btn btn-sm btn-secondary" onClick={onRetry} style={{ marginTop: 8 }}>
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
