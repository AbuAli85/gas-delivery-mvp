import { describe, it, expect } from "vitest";

describe("Sentry Configuration", () => {
  it("should have SENTRY_DSN set in environment", () => {
    const dsn = process.env.SENTRY_DSN;
    expect(dsn, "SENTRY_DSN must be set").toBeTruthy();
    // Validate DSN format: https://<key>@<host>/<project-id>
    expect(dsn).toMatch(/^https:\/\/[a-f0-9]+@[^/]+\/\d+$/);
  });

  it("should initialize Sentry without throwing", async () => {
    const { initSentry } = await import("./_core/sentry");
    expect(() => initSentry()).not.toThrow();
  });

  it("should be able to capture an exception without throwing", async () => {
    const { captureException } = await import("./_core/sentry");
    expect(() =>
      captureException(new Error("test error"), { source: "sentry.test.ts" })
    ).not.toThrow();
  });
});
