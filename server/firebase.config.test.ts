/**
 * Firebase config validation test
 * Verifies that all required Firebase environment variables are set
 * and that the Firebase project is reachable.
 */
import { describe, it, expect } from "vitest";

describe("Firebase Configuration", () => {
  it("should have all required Firebase env vars set", () => {
    // These are VITE_ vars — available via process.env in vitest
    const required = [
      "VITE_FIREBASE_API_KEY",
      "VITE_FIREBASE_AUTH_DOMAIN",
      "VITE_FIREBASE_PROJECT_ID",
      "VITE_FIREBASE_APP_ID",
    ];

    for (const key of required) {
      const val = process.env[key];
      expect(val, `${key} must be set`).toBeTruthy();
      expect(val!.length, `${key} must not be empty`).toBeGreaterThan(0);
    }
  });

  it("should have correct Firebase project ID format", () => {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
    expect(projectId).toBeTruthy();
    // Firebase project IDs are lowercase alphanumeric with hyphens
    expect(projectId).toMatch(/^[a-z0-9-]+$/);
  });

  it("should reach Firebase REST API with the provided API key", async () => {
    const apiKey = process.env.VITE_FIREBASE_API_KEY;
    expect(apiKey).toBeTruthy();

    // Lightweight check: call Firebase Identity Toolkit to verify key is valid
    // Using the accounts:lookup endpoint with an empty idToken to get a 400 (not 403)
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: "invalid" }),
    });

    // 400 = API key valid but token invalid (expected)
    // 403 = API key invalid or restricted
    // We accept 400 as proof the key works
    expect(res.status).not.toBe(403);
    expect([400, 200]).toContain(res.status);
  });
});
