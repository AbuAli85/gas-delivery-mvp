/**
 * Sentry backend initialization.
 *
 * Must be imported BEFORE any other server code so Sentry can instrument
 * modules at load time. Import at the very top of server/_core/index.ts.
 *
 * Set SENTRY_DSN in environment variables to enable.
 * If SENTRY_DSN is absent the module is a no-op (safe for dev / CI).
 */
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import type { Application } from "express";

const DSN = process.env.SENTRY_DSN;

export function initSentry() {
  if (!DSN) {
    if (process.env.NODE_ENV !== "test") {
      console.log("[Sentry] SENTRY_DSN not set — monitoring disabled");
    }
    return;
  }

  Sentry.init({
    dsn: DSN,
    environment: process.env.NODE_ENV ?? "production",
    release: process.env.npm_package_version,

    // Performance tracing — capture 20% of transactions in production
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

    // Profiling — profile 10% of sampled transactions
    profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    integrations: [
      nodeProfilingIntegration(),
      // Automatically instrument HTTP requests, DB queries, etc.
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
    ],
  });

  console.log(`[Sentry] Initialized (env: ${process.env.NODE_ENV ?? "production"})`);
}

/**
 * Register Sentry error handler AFTER all routes.
 * Must be the LAST middleware registered before the 404 handler.
 */
export function sentryErrorHandler(app: Application) {
  if (!DSN) return;
  Sentry.setupExpressErrorHandler(app);
}

/**
 * Manually capture an exception with optional context.
 * Safe to call even if Sentry is not initialized.
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>
) {
  if (!DSN) return;
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureException(error);
  });
}

/**
 * Set the authenticated user on the current Sentry scope.
 * Call after auth middleware resolves the user.
 */
export function setSentryUser(user: { id: string | number; phone?: string; role?: string }) {
  if (!DSN) return;
  Sentry.setUser({
    id: String(user.id),
    username: user.phone,
    segment: user.role,
  });
}

export { Sentry };
