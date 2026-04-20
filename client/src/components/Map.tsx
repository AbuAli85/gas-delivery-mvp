/**
 * GOOGLE MAPS FRONTEND INTEGRATION - ESSENTIAL GUIDE
 *
 * USAGE FROM PARENT COMPONENT:
 * ======
 *
 * const mapRef = useRef<google.maps.Map | null>(null);
 *
 * <MapView
 *   initialCenter={{ lat: 40.7128, lng: -74.0060 }}
 *   initialZoom={15}
 *   onMapReady={(map) => {
 *     mapRef.current = map; // Store to control map from parent anytime, google map itself is in charge of the re-rendering, not react state.
 * </MapView>
 *
 * ======
 * Available Libraries and Core Features:
 * -------------------------------
 * 📍 MARKER (from `marker` library)
 * - Attaches to map using { map, position }
 * new google.maps.marker.AdvancedMarkerElement({
 *   map,
 *   position: { lat: 37.7749, lng: -122.4194 },
 *   title: "San Francisco",
 * });
 *
 * -------------------------------
 * 🏢 PLACES (from `places` library)
 * - Does not attach directly to map; use data with your map manually.
 * const place = new google.maps.places.Place({ id: PLACE_ID });
 * await place.fetchFields({ fields: ["displayName", "location"] });
 * map.setCenter(place.location);
 * new google.maps.marker.AdvancedMarkerElement({ map, position: place.location });
 *
 * -------------------------------
 * 🧭 GEOCODER (from `geocoding` library)
 * - Standalone service; manually apply results to map.
 * const geocoder = new google.maps.Geocoder();
 * geocoder.geocode({ address: "New York" }, (results, status) => {
 *   if (status === "OK" && results[0]) {
 *     map.setCenter(results[0].geometry.location);
 *     new google.maps.marker.AdvancedMarkerElement({
 *       map,
 *       position: results[0].geometry.location,
 *     });
 *   }
 * });
 *
 * -------------------------------
 * 📐 GEOMETRY (from `geometry` library)
 * - Pure utility functions; not attached to map.
 * const dist = google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
 *
 * -------------------------------
 * 🛣️ ROUTES (from `routes` library)
 * - Combines DirectionsService (standalone) + DirectionsRenderer (map-attached)
 * const directionsService = new google.maps.DirectionsService();
 * const directionsRenderer = new google.maps.DirectionsRenderer({ map });
 * directionsService.route(
 *   { origin, destination, travelMode: "DRIVING" },
 *   (res, status) => status === "OK" && directionsRenderer.setDirections(res)
 * );
 *
 * -------------------------------
 * 🌦️ MAP LAYERS (attach directly to map)
 * - new google.maps.TrafficLayer().setMap(map);
 * - new google.maps.TransitLayer().setMap(map);
 * - new google.maps.BicyclingLayer().setMap(map);
 *
 * -------------------------------
 * ✅ SUMMARY
 * - “map-attached” → AdvancedMarkerElement, DirectionsRenderer, Layers.
 * - “standalone” → Geocoder, DirectionsService, DistanceMatrixService, ElevationService.
 * - “data-only” → Place, Geometry utilities.
 */

/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
  }
}

/** Single shared loader so concurrent MapViews do not append duplicate scripts. */
let mapsScriptPromise: Promise<void> | null = null;

function loadMapScript(): Promise<void> {
  if (typeof window !== "undefined" && window.google?.maps) {
    return Promise.resolve();
  }
  if (!mapsScriptPromise) {
    mapsScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      // Route through the local server proxy (/api/maps/*) which adds the
      // required Origin header that browser <script> tags cannot send.
      script.src = `/api/maps/maps/api/js?v=weekly&libraries=places,geocoding,geometry`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        mapsScriptPromise = null;
        console.error("Failed to load Google Maps script");
        reject(new Error("Failed to load Google Maps script"));
      };
      document.head.appendChild(script);
    });
  }
  return mapsScriptPromise;
}

interface MapViewProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
  /** Called when the script fails to load or the map cannot be created. */
  onLoadError?: (message: string) => void;
  /** Show/hide the map type (Satellite/Map) toggle. Defaults to false. */
  mapTypeControl?: boolean;
  /** Show/hide the Street View pegman. Defaults to false. */
  streetViewControl?: boolean;
  /** Show/hide the fullscreen button. Defaults to false. */
  fullscreenControl?: boolean;
}

export function MapView({
  className,
  initialCenter = { lat: 37.7749, lng: -122.4194 },
  initialZoom = 12,
  onMapReady,
  onLoadError,
  mapTypeControl = false,
  streetViewControl = false,
  fullscreenControl = false,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const init = usePersistFn(async () => {
    setLoadError(null);
    try {
      await loadMapScript();
      if (!mapContainer.current) {
        console.error("Map container not found");
        return;
      }
      if (!window.google?.maps) {
        throw new Error("Google Maps API not available after load");
      }
      map.current = new window.google.maps.Map(mapContainer.current, {
        zoom: initialZoom,
        center: initialCenter,
        mapTypeControl,
        fullscreenControl,
        zoomControl: true,
        streetViewControl,
        gestureHandling: "greedy",
      });
      if (onMapReady) {
        onMapReady(map.current);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Map failed to load";
      setLoadError(message);
      onLoadError?.(message);
    }
  });

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className={cn("relative w-full h-full min-h-[200px]", className)}>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full bg-neutral-950" />
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-950 text-white/85 text-xs leading-relaxed px-4 text-center z-10">
          {loadError}
        </div>
      )}
    </div>
  );
}
