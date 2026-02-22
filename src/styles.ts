export const WIDGET_STYLES = `
  :host {
    display: block;
    font-family: system-ui, -apple-system, sans-serif;
    --lsv-primary-color: #06b6d4;
    --lsv-border-radius: 0.5rem;
  }

  :host([theme="light"]) {
    --lsv-bg-color: #ffffff;
    --lsv-text-color: #1e293b;
    --lsv-surface-color: #f8fafc;
    --lsv-border-color: #e2e8f0;
    --lsv-muted-color: #64748b;
    --lsv-input-bg: #ffffff;
  }

  :host([theme="dark"]), :host {
    --lsv-bg-color: #0f172a;
    --lsv-text-color: #e2e8f0;
    --lsv-surface-color: #1e293b;
    --lsv-border-color: #334155;
    --lsv-muted-color: #94a3b8;
    --lsv-input-bg: #0f172a;
  }

  @media (prefers-color-scheme: light) {
    :host([theme="auto"]) {
      --lsv-bg-color: #ffffff;
      --lsv-text-color: #1e293b;
      --lsv-surface-color: #f8fafc;
      --lsv-border-color: #e2e8f0;
      --lsv-muted-color: #64748b;
      --lsv-input-bg: #ffffff;
    }
  }

  @media (prefers-color-scheme: dark) {
    :host([theme="auto"]) {
      --lsv-bg-color: #0f172a;
      --lsv-text-color: #e2e8f0;
      --lsv-surface-color: #1e293b;
      --lsv-border-color: #334155;
      --lsv-muted-color: #94a3b8;
      --lsv-input-bg: #0f172a;
    }
  }

  * { box-sizing: border-box; }

  .widget {
    background: var(--lsv-bg-color);
    color: var(--lsv-text-color);
    border: 1px solid var(--lsv-border-color);
    border-radius: var(--lsv-border-radius);
    padding: 1.5rem;
    max-width: 480px;
    margin: 0 auto;
  }

  .widget-title {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0 0 1rem;
  }

  .step-indicator {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.25rem;
  }

  .step-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--lsv-border-color);
    transition: background 0.2s;
  }

  .step-dot.active {
    background: var(--lsv-primary-color);
  }

  .step-dot.done {
    background: var(--lsv-primary-color);
    opacity: 0.5;
  }

  /* Loading */
  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 2rem 0;
    color: var(--lsv-muted-color);
    font-size: 0.875rem;
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--lsv-border-color);
    border-top-color: var(--lsv-primary-color);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Error */
  .error-box {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.4);
    border-radius: var(--lsv-border-radius);
    padding: 0.875rem 1rem;
    font-size: 0.875rem;
    color: #f87171;
    margin-bottom: 0.75rem;
  }

  .btn-retry {
    display: inline-block;
    margin-top: 0.75rem;
    padding: 0.5rem 1rem;
    background: var(--lsv-surface-color);
    border: 1px solid var(--lsv-border-color);
    border-radius: var(--lsv-border-radius);
    color: var(--lsv-text-color);
    font-size: 0.8125rem;
    cursor: pointer;
  }

  .btn-retry:hover { opacity: 0.8; }

  /* Slot cards */
  .slot-list {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  .slot-card {
    background: var(--lsv-surface-color);
    border: 1px solid var(--lsv-border-color);
    border-radius: var(--lsv-border-radius);
    padding: 0.875rem 1rem;
    cursor: pointer;
    transition: border-color 0.15s;
    text-align: left;
    width: 100%;
    color: var(--lsv-text-color);
  }

  .slot-card:hover {
    border-color: var(--lsv-primary-color);
  }

  .slot-card-title {
    font-weight: 500;
    font-size: 0.9375rem;
    margin: 0 0 0.25rem;
  }

  .slot-card-meta {
    font-size: 0.8125rem;
    color: var(--lsv-muted-color);
    margin: 0;
  }

  /* Date picker */
  .date-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0.25rem;
    margin-bottom: 0.75rem;
  }

  .date-header {
    font-size: 0.6875rem;
    font-weight: 600;
    text-align: center;
    color: var(--lsv-muted-color);
    padding: 0.25rem 0;
  }

  .date-cell {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: calc(var(--lsv-border-radius) * 0.5);
    font-size: 0.8125rem;
    cursor: pointer;
    border: 1px solid transparent;
    background: transparent;
    color: var(--lsv-text-color);
    transition: background 0.15s, border-color 0.15s;
  }

  .date-cell:hover:not(.disabled) {
    background: var(--lsv-surface-color);
    border-color: var(--lsv-border-color);
  }

  .date-cell.selected {
    background: var(--lsv-primary-color);
    color: #0f172a;
    font-weight: 600;
  }

  .date-cell.disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .date-cell.empty {
    cursor: default;
  }

  /* Time slots */
  .time-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }

  .time-btn {
    padding: 0.5rem 0.25rem;
    border: 1px solid var(--lsv-border-color);
    border-radius: var(--lsv-border-radius);
    background: var(--lsv-surface-color);
    color: var(--lsv-text-color);
    font-size: 0.8125rem;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }

  .time-btn:hover {
    border-color: var(--lsv-primary-color);
  }

  .time-btn.selected {
    background: var(--lsv-primary-color);
    border-color: var(--lsv-primary-color);
    color: #0f172a;
    font-weight: 600;
  }

  /* Form */
  .form-group {
    margin-bottom: 0.875rem;
  }

  .form-label {
    display: block;
    font-size: 0.8125rem;
    font-weight: 500;
    margin-bottom: 0.375rem;
    color: var(--lsv-text-color);
  }

  .form-input, .form-textarea {
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: var(--lsv-input-bg);
    border: 1px solid var(--lsv-border-color);
    border-radius: var(--lsv-border-radius);
    color: var(--lsv-text-color);
    font-size: 0.875rem;
    font-family: inherit;
    transition: border-color 0.15s;
  }

  .form-input:focus, .form-textarea:focus {
    outline: none;
    border-color: var(--lsv-primary-color);
  }

  .form-textarea {
    resize: vertical;
    min-height: 80px;
  }

  /* Buttons */
  .btn-primary {
    display: block;
    width: 100%;
    padding: 0.625rem 1rem;
    background: var(--lsv-primary-color);
    border: none;
    border-radius: var(--lsv-border-radius);
    color: #0f172a;
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
    font-family: inherit;
  }

  .btn-primary:hover:not(:disabled) { opacity: 0.85; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  .btn-back {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.375rem 0;
    background: transparent;
    border: none;
    color: var(--lsv-muted-color);
    font-size: 0.8125rem;
    cursor: pointer;
    margin-bottom: 0.75rem;
    font-family: inherit;
  }

  .btn-back:hover { color: var(--lsv-text-color); }

  /* Summary */
  .booking-summary {
    background: var(--lsv-surface-color);
    border: 1px solid var(--lsv-border-color);
    border-radius: var(--lsv-border-radius);
    padding: 0.75rem 1rem;
    margin-bottom: 1rem;
    font-size: 0.8125rem;
    color: var(--lsv-muted-color);
  }

  .booking-summary strong {
    color: var(--lsv-text-color);
    display: block;
    font-size: 0.9375rem;
    margin-bottom: 0.25rem;
  }

  /* Success */
  .success-view {
    text-align: center;
    padding: 1.5rem 0;
  }

  .success-icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(6, 182, 212, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1rem;
    font-size: 1.5rem;
  }

  .success-title {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0 0 0.5rem;
  }

  .success-msg {
    font-size: 0.875rem;
    color: var(--lsv-muted-color);
    margin: 0;
  }

  .section-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--lsv-muted-color);
    margin: 0 0 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .empty-msg {
    padding: 1.5rem 0;
    text-align: center;
    color: var(--lsv-muted-color);
    font-size: 0.875rem;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 1rem;
  }
`;
