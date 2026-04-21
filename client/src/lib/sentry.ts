/**
 * Sentry browser/React initialization.
 *
 * Import this at the very top of client/src/main.tsx BEFORE React renders.
 * Set VITE_SENTRY_DSN in environment variables to enable.
 * If absent the module is a no-op (safe for dev / CI).
 */
import * as Sentry from "@sentry/react";
import type React from "react";

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

export function initSentryBrowser() {
  if (!DSN) {
    if (import.meta.env.DEV) {
      console.log("[Sentry] VITE_SENTRY_DSN not set — browser monitoring disabled");
    }
    return;
  }

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Mask all text and inputs in session replays for privacy
        maskAllText: true,
        blockAllMedia: false,
      }),
    ],

    // Capture 10% of transactions in production, 100% in dev
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    // Capture 10% of sessions for replay in production
    replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 0,
    // Always capture replays for sessions with errors
    replaysOnErrorSampleRate: 1.0,
  });
}

/**
 * Wrap the root component with Sentry's error boundary.
 * Falls back to a passthrough if Sentry is not configured.
 */
export const SentryErrorBoundary: typeof Sentry.ErrorBoundary = DSN
  ? Sentry.ErrorBoundary
  : (({ children }: { children: React.ReactNode }) => children) as unknown as typeof Sentry.ErrorBoundary;

/**
 * Manually capture a frontend exception with optional context.
 * Safe to call even if Sentry is not initialized.
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>
) {
  if (!DSN) return;
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
}

export { Sentry };
