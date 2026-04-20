/**
 * LocationPicker — Flexible delivery location selection
 *
 * Flow:
 *   1. Two large option cards: "Use my current location" | "Choose another location"
 *   2. If "Choose another":
 *      a. Saved locations (Home / Work chips) — instant tap
 *      b. Muscat area preset chips — instant tap
 *      c. Full-screen map with draggable pin + reverse geocode
 *   3. Confirm → navigate to /order/summary
 *
 * State is passed via sessionStorage so no URL params are needed.
 * Zone resolution happens server-side in createOrderDraft.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Flame,
  Loader2,
  MapPin,
  Navigation,
  Home as HomeIcon,
  Briefcase,
  ChevronLeft,
  Check,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";

// ── Session key for saved locations (anonymous, no auth) ──────────────────────
function getSessionKey(): string {
  let key = localStorage.getItem("gas_session_key");
  if (!key) {
    key = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem("gas_session_key", key);
  }
  return key;
}

// ── Reverse geocode via Google Maps Geocoder (Manus proxy — no API key needed) ──
// Falls back to coordinate string if geocoder is unavailable.
let _geocoderSingleton: google.maps.Geocoder | null = null;

async function reverseGeocode(lat: number, lng: number, geocoder?: google.maps.Geocoder | null): Promise<string> {
  // Use provided geocoder, or the singleton, or try to create one
  const gc = geocoder ?? _geocoderSingleton;
  if (gc) {
    try {
      const result = await gc.geocode({ location: { lat, lng } });
      if (result.results?.[0]?.formatted_address) {
        // Trim to first 3 address components for brevity
        return result.results[0].formatted_address.split(",").slice(0, 3).join(",").trim();
      }
    } catch {
      // silent — fall through to coordinate fallback
    }
  }
  // Coordinate fallback — always works, no external API
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

// ── Muscat area presets ───────────────────────────────────────────────────────
const MUSCAT_PRESETS = [
  { label: "Old Muscat / Mutrah", lat: 23.6139, lng: 58.5922 },
  { label: "Ruwi / CBD",          lat: 23.6086, lng: 58.5930 },
  { label: "Al Khuwair",          lat: 23.5957, lng: 58.3942 },
  { label: "Ghubrah",             lat: 23.6050, lng: 58.3770 },
  { label: "Madinat Qaboos",      lat: 23.5880, lng: 58.4020 },
  { label: "Bausher",             lat: 23.5820, lng: 58.3600 },
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface LocationResult {
  lat: number;
  lng: number;
  address: string;
}

type Step = "choose" | "map";

// ── Component ─────────────────────────────────────────────────────────────────
export default function LocationPicker() {
  const [, navigate] = useLocation();
  const sessionKey = getSessionKey();

  const [step, setStep] = useState<Step>("choose");
  const [locating, setLocating] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null);
  const [mapAddress, setMapAddress] = useState<string>("");
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [savingLabel, setSavingLabel] = useState<"home" | "work" | null>(null);

  // Saved locations from backend
  const { data: savedLocs, refetch: refetchSaved } = trpc.locations.list.useQuery(
    { sessionKey },
    { staleTime: 0 }
  );

  const saveLocationMutation = trpc.locations.save.useMutation({
    onSuccess: () => {
      refetchSaved();
      setSavingLabel(null);
      toast.success("Location saved!");
    },
  });

  // ── Detect current location ──────────────────────────────────────────────
  const handleUseCurrentLocation = async () => {
    setLocating(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          enableHighAccuracy: true,
        })
      );
      const { latitude: lat, longitude: lng } = pos.coords;
      const address = await reverseGeocode(lat, lng);
      setSelectedLocation({ lat, lng, address });
      proceedWithLocation({ lat, lng, address });
    } catch {
      toast.error("Could not detect location. Please allow location access or choose manually.");
    } finally {
      setLocating(false);
    }
  };

  // ── Proceed with a confirmed location ────────────────────────────────────
  const proceedWithLocation = (loc: LocationResult) => {
    // Persist ordering location from sessionStorage (set by Home page)
    const existing = JSON.parse(sessionStorage.getItem("orderingLocation") || "null");
    sessionStorage.setItem(
      "deliveryLocation",
      JSON.stringify({ lat: loc.lat, lng: loc.lng, address: loc.address })
    );
    // If no ordering location yet, use this as both
    if (!existing) {
      sessionStorage.setItem(
        "orderingLocation",
        JSON.stringify({ lat: loc.lat, lng: loc.lng, address: loc.address })
      );
    }
    navigate("/order/summary");
  };

  // ── Map picker ───────────────────────────────────────────────────────────
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const handleMapReady = useCallback(
    (map: google.maps.Map) => {
      // Store geocoder in both ref and singleton for reverseGeocode calls
      const geocoder = new google.maps.Geocoder();
      geocoderRef.current = geocoder;
      _geocoderSingleton = geocoder;

      // Default center: Muscat
      const defaultCenter = { lat: 23.5880, lng: 58.3829 };
      map.setCenter(defaultCenter);
      map.setZoom(12);

      // Place initial marker
      markerRef.current = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: defaultCenter,
        title: "Delivery location",
        gmpDraggable: true,
      });

      setMapCoords(defaultCenter);

      // Reverse geocode initial position using Google Maps Geocoder
      reverseGeocode(defaultCenter.lat, defaultCenter.lng, geocoder).then(setMapAddress);

      // Update on marker drag
      markerRef.current.addListener("dragend", async () => {
        const pos = markerRef.current?.position;
        if (!pos) return;
        const lat = typeof pos.lat === "function" ? pos.lat() : (pos as google.maps.LatLngLiteral).lat;
        const lng = typeof pos.lng === "function" ? pos.lng() : (pos as google.maps.LatLngLiteral).lng;
        setMapCoords({ lat, lng });
        const addr = await reverseGeocode(lat, lng, geocoder);
        setMapAddress(addr);
      });

      // Update on map click
      map.addListener("click", async (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        if (markerRef.current) markerRef.current.position = { lat, lng };
        setMapCoords({ lat, lng });
        const addr = await reverseGeocode(lat, lng, geocoder);
        setMapAddress(addr);
      });
    },
    []
  );

  const handleConfirmMapLocation = () => {
    if (!mapCoords) return;
    proceedWithLocation({ lat: mapCoords.lat, lng: mapCoords.lng, address: mapAddress });
  };

  const handleSaveMapLocation = (label: "home" | "work") => {
    if (!mapCoords) return;
    setSavingLabel(label);
    saveLocationMutation.mutate({
      sessionKey,
      label,
      lat: mapCoords.lat,
      lng: mapCoords.lng,
      address: mapAddress,
    });
  };

  // ── Render: Map step ─────────────────────────────────────────────────────
  if (step === "map") {
    return (
      <div className="mobile-screen" style={{ background: "oklch(0.09 0 0)" }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-12 pb-3">
          <button
            onClick={() => setStep("choose")}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <p className="text-white font-bold text-base">اختر موقع التوصيل</p>
            <p className="text-white/50 text-xs">Choose delivery location</p>
          </div>
        </div>

        {/* Map */}
        <div className="relative flex-1 mx-4 rounded-2xl overflow-hidden" style={{ height: "52vh" }}>
          <MapView
            className="w-full h-full"
            initialCenter={{ lat: 23.5880, lng: 58.3829 }}
            initialZoom={12}
            onMapReady={handleMapReady}
          />
          {/* Center crosshair hint */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-6 h-6 border-2 border-orange-400 rounded-full opacity-40" />
          </div>
        </div>

        {/* Address display + confirm */}
        <div className="px-4 pt-3 pb-6">
          <div className="bg-white/10 rounded-2xl p-4 mb-3">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white/50 text-[10px] uppercase tracking-wide mb-0.5">
                  Selected location
                </p>
                <p className="text-white text-sm leading-snug truncate">
                  {mapAddress || "Drag the pin to your delivery address"}
                </p>
              </div>
            </div>
          </div>

          {/* Save shortcuts */}
          {mapCoords && (
            <div className="flex gap-2 mb-3">
              {(["home", "work"] as const).map((label) => {
                const existing = savedLocs?.find((l) => l.label === label);
                return (
                  <button
                    key={label}
                    onClick={() => handleSaveMapLocation(label)}
                    disabled={saveLocationMutation.isPending && savingLabel === label}
                    className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/60 hover:text-white/80 transition-colors"
                  >
                    {label === "home" ? (
                      <HomeIcon className="w-3 h-3" />
                    ) : (
                      <Briefcase className="w-3 h-3" />
                    )}
                    {existing ? `Update ${label}` : `Save as ${label}`}
                  </button>
                );
              })}
            </div>
          )}

          <Button
            size="lg"
            className="w-full rounded-2xl font-extrabold text-base"
            style={{ height: "60px", background: "oklch(0.53 0.22 27)" }}
            onClick={handleConfirmMapLocation}
            disabled={!mapCoords}
          >
            <Check className="w-5 h-5 mr-2" />
            تأكيد الموقع — Confirm Location
          </Button>
        </div>
      </div>
    );
  }

  // ── Render: Choose step ──────────────────────────────────────────────────
  return (
    <div className="mobile-screen" style={{ background: "oklch(0.09 0 0)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        <button
          onClick={() => navigate("/")}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <div>
          <p className="text-white font-bold text-lg">موقع التوصيل</p>
          <p className="text-white/50 text-xs">Where should we deliver?</p>
        </div>
      </div>

      <div className="flex-1 px-4 pb-8 overflow-y-auto">
        {/* ── Option 1: Current location ─────────────────────────────── */}
        <button
          onClick={handleUseCurrentLocation}
          disabled={locating}
          className="w-full bg-white/5 border border-white/10 rounded-3xl p-5 mb-3 text-left flex items-center gap-4 active:scale-[0.98] transition-transform"
          style={{ minHeight: "80px" }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "oklch(0.53 0.22 27 / 0.2)" }}
          >
            {locating ? (
              <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
            ) : (
              <Navigation className="w-6 h-6 text-orange-400" />
            )}
          </div>
          <div>
            <p className="text-white font-bold text-base">
              {locating ? "Detecting…" : "استخدم موقعي الحالي"}
            </p>
            <p className="text-white/50 text-sm">
              {locating ? "Getting your GPS location" : "Use my current location"}
            </p>
          </div>
        </button>

        {/* ── Saved locations (Home / Work) ──────────────────────────── */}
        {savedLocs && savedLocs.length > 0 && (
          <div className="mb-3">
            <p className="text-white/40 text-[10px] uppercase tracking-widest px-1 mb-2">
              Saved locations
            </p>
            <div className="flex flex-col gap-2">
              {savedLocs.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() =>
                    proceedWithLocation({
                      lat: loc.lat,
                      lng: loc.lng,
                      address: loc.address ?? `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`,
                    })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-left flex items-center gap-3 active:scale-[0.98] transition-transform"
                  style={{ minHeight: "64px" }}
                >
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    {loc.label === "home" ? (
                      <HomeIcon className="w-5 h-5 text-blue-400" />
                    ) : loc.label === "work" ? (
                      <Briefcase className="w-5 h-5 text-purple-400" />
                    ) : (
                      <MapPin className="w-5 h-5 text-white/50" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm capitalize">{loc.label}</p>
                    <p className="text-white/40 text-xs truncate">
                      {loc.address ?? `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`}
                    </p>
                  </div>
                  <Check className="w-4 h-4 text-green-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Muscat area presets ────────────────────────────────────── */}
        <div className="mb-3">
          <p className="text-white/40 text-[10px] uppercase tracking-widest px-1 mb-2">
            Muscat areas
          </p>
          <div className="grid grid-cols-2 gap-2">
            {MUSCAT_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() =>
                  proceedWithLocation({ lat: preset.lat, lng: preset.lng, address: preset.label })
                }
                className="bg-white/5 border border-white/10 rounded-2xl p-3 text-left flex items-center gap-2 active:scale-[0.98] transition-transform"
                style={{ minHeight: "52px" }}
              >
                <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span className="text-white/80 text-xs font-medium leading-tight">
                  {preset.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Option 2: Choose on map ────────────────────────────────── */}
        <button
          onClick={() => setStep("map")}
          className="w-full bg-white/5 border border-white/10 rounded-3xl p-5 text-left flex items-center gap-4 active:scale-[0.98] transition-transform"
          style={{ minHeight: "80px" }}
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center shrink-0">
            <MapPin className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <p className="text-white font-bold text-base">اختر على الخريطة</p>
            <p className="text-white/50 text-sm">Choose another location on map</p>
          </div>
          <Plus className="w-4 h-4 text-white/30 ml-auto shrink-0" />
        </button>
      </div>
    </div>
  );
}
