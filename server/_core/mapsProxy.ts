/**
 * Maps Proxy — forwards Google Maps JS API requests to the Manus forge proxy,
 * injecting the required `Origin` header that browser <script> tags cannot send.
 *
 * Frontend usage:
 *   script.src = `/api/maps/js?libraries=places,geocoding,geometry&v=weekly`
 *
 * The server appends the forge API key automatically — no key needed in the URL.
 */
import type { Express } from "express";
import { ENV } from "./env";

export function registerMapsProxy(app: Express) {
  // Proxy: /api/maps/* → forge /v1/maps/proxy/*
  // The forge Maps proxy requires:
  //   1. The frontend API key as ?key= query param
  //   2. An Origin header matching the app's public domain
  app.get("/api/maps/*", async (req, res) => {
    const forgeBase = (ENV.forgeApiUrl || "").replace(/\/+$/, "");
    // Use the server-side key (BUILT_IN_FORGE_API_KEY) for static maps and other
    // server-side proxied requests. The frontend key (VITE_FRONTEND_FORGE_API_KEY)
    // is only valid for browser-side JS API requests.
    const forgeKey = ENV.forgeApiKey || process.env.VITE_FRONTEND_FORGE_API_KEY || "";

    if (!forgeBase || !forgeKey) {
      res.status(500).send("Maps proxy not configured");
      return;
    }

    // Build the target URL: strip /api/maps prefix, keep the rest of the path + query
    const subPath = (req.params as unknown as Record<string, string>)[0] || "";
    const targetUrl = new URL(`${forgeBase}/v1/maps/proxy/${subPath}`);

    // Forward all original query params (but NOT the key — we add it ourselves)
    for (const [k, v] of Object.entries(req.query)) {
      if (k !== "key" && typeof v === "string") targetUrl.searchParams.set(k, v);
    }

    // Append the frontend forge API key
    targetUrl.searchParams.set("key", forgeKey);

    // Determine the public origin: prefer the Referer/Origin from the browser request,
    // then fall back to the Host header with protocol.
    const browserOrigin =
      req.get("origin") ||
      (() => {
        const ref = req.get("referer");
        if (ref) {
          try { return new URL(ref).origin; } catch { /* ignore */ }
        }
        return null;
      })() ||
      `${req.protocol}://${req.get("host")}`;

    try {
      const upstream = await fetch(targetUrl.toString(), {
        headers: {
          Origin: browserOrigin,
          "User-Agent": req.get("user-agent") || "manus-maps-proxy",
        },
      });

      // Forward status + headers (content-type is critical for JS)
      res.status(upstream.status);
      const ct = upstream.headers.get("content-type");
      if (ct) res.set("Content-Type", ct);
      // Allow browsers to cache the Maps JS bundle
      res.set("Cache-Control", "public, max-age=3600");

      const body = await upstream.arrayBuffer();
      res.send(Buffer.from(body));
    } catch (err) {
      console.error("[MapsProxy] failed:", err);
      res.status(502).send("Maps proxy error");
    }
  });
}
