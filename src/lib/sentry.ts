import * as Sentry from '@sentry/react';

// ─── Financial field scrubber ─────────────────────────────────────────────────

const FINANCIAL_FIELDS = new Set([
  'loanAmount',
  'propertyPrice',
  'downPayment',
  'interestRate',
  'fixedRate',
  'floatingRate',
]);

function scrubRecord(o: Record<string, unknown>): void {
  for (const key of Object.keys(o)) {
    if (FINANCIAL_FIELDS.has(key)) {
      delete o[key];
    } else if (o[key] !== null && typeof o[key] === 'object' && !Array.isArray(o[key])) {
      scrubRecord(o[key] as Record<string, unknown>);
    }
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  const isProd = import.meta.env.VITE_APP_ENV === 'production';

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_APP_ENV ?? 'development',
    release: import.meta.env.VITE_APP_VERSION,
    tracesSampleRate: isProd ? 0.2 : 1.0,
    replaysSessionSampleRate: isProd ? 0.05 : 0,
    replaysOnErrorSampleRate: isProd ? 1.0 : 0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    beforeSend(event) {
      if (event.extra) scrubRecord(event.extra as Record<string, unknown>);
      if (event.contexts) {
        for (const ctx of Object.values(event.contexts)) {
          if (ctx && typeof ctx === 'object') scrubRecord(ctx as Record<string, unknown>);
        }
      }
      return event;
    },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function captureError(err: unknown, tags: Record<string, string | number>): void {
  Sentry.captureException(err, { tags });
}
