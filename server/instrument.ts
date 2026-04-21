/**
 * Sentry ESM instrumentation entry point for PRODUCTION only.
 *
 * In production, this file is pre-compiled to dist/instrument.js and loaded via:
 *   node --import ./dist/instrument.js dist/index.js
 *
 * In development, Sentry is initialized directly in server/_core/sentry.ts
 * which is imported at the top of server/_core/index.ts.
 *
 * See: https://docs.sentry.io/platforms/javascript/guides/express/install/esm/
 */
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

const DSN = process.env.SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.NODE_ENV ?? "production",
    tracesSampleRate: 0.2,
    profilesSampleRate: 0.1,
    integrations: [
      nodeProfilingIntegration(),
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
    ],
  });
  console.log(`[Sentry] Instrumented via --import (env: ${process.env.NODE_ENV ?? "production"})`);
}
