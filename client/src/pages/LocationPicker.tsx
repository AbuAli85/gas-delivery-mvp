/**
 * LocationPicker — اختيار موقع التوصيل
 *
 * Flow:
 *   1. خيارات: "استخدم موقعي الحالي" | "اختر موقعاً آخر"
 *   2. عند اختيار "موقع آخر":
 *      a. المواقع المحفوظة (المنزل / العمل)
 *      b. مناطق مسقط المحددة مسبقاً
 *      c. خريطة كاملة مع دبوس قابل للسحب وحدود مناطق التوصيل
 *   3. تأكيد → الانتقال إلى /order/summary
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Loader2,
  MapPin,
  Navigation,
  Home as HomeIcon,
  Briefcase,
  ChevronLeft,
  Check,
  Plus,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
let _geocoderSingleton: google.maps.Geocoder | null = null;

/** Filter a geocoder result to only accept Oman addresses. */
function isOmanResult(result: google.maps.GeocoderResult): boolean {
  return result.address_components?.some(
    (c) => c.types.includes("country") && (c.short_name === "OM" || c.long_name === "Oman")
  ) ?? false;
}

/** Returns true if the address is a Google Plus Code (e.g. "M5J5+C67, Seeb, Oman") */
function isPlusCode(address: string): boolean {
  return /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}/.test(address);
}

/** Build a clean human-readable address from geocoder components (Oman only). */
function buildCleanAddress(result: google.maps.GeocoderResult): string {
  const comps = result.address_components ?? [];
  const get = (type: string) => comps.find((c) => c.types.includes(type))?.long_name ?? "";
  const sublocality = get("sublocality_level_1") || get("sublocality");
  const locality = get("locality");
  const admin2 = get("administrative_area_level_2");
  const admin1 = get("administrative_area_level_1");
  const country = get("country");
  const parts = [sublocality, locality || admin2, admin1, country].filter(Boolean);
  return parts.length >= 2 ? parts.join("، ") : result.formatted_address?.trim() ?? "";
}

async function reverseGeocode(lat: number, lng: number, geocoder?: google.maps.Geocoder | null): Promise<string> {
  const gc = geocoder ?? _geocoderSingleton;
  if (gc) {
    try {
      const result = await gc.geocode({ location: { lat, lng }, region: "om" });
      // Only use Oman results, skip Plus Codes
      const omanResult = result.results?.find(
        (r) => isOmanResult(r) && !isPlusCode(r.formatted_address ?? "")
      );
      if (omanResult) {
        return buildCleanAddress(omanResult);
      }
    } catch {
      // silent — fall through to coordinate fallback
    }
  }
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

/** JS Geocoder is callback-based in many builds; `await geocoder.geocode()` can be undefined and throw on destructuring. */
function forwardGeocodeWithCallback(
  geocoder: google.maps.Geocoder,
  request: google.maps.GeocoderRequest
): Promise<google.maps.GeocoderResult[]> {
  return new Promise((resolve, reject) => {
    geocoder.geocode(request, (results, status) => {
      if (status === "OK" && results?.length) {
        resolve(results);
        return;
      }
      if (status === "ZERO_RESULTS") {
        resolve([]);
        return;
      }
      reject(new Error(String(status)));
    });
  });
}

// ── Zone colour palette ───────────────────────────────────────────────────────
// Each zone gets a distinct colour. Colours cycle if there are more than 6 zones.
const ZONE_COLORS = [
  { stroke: "#f97316", fill: "#f97316" }, // orange
  { stroke: "#3b82f6", fill: "#3b82f6" }, // blue
  { stroke: "#22c55e", fill: "#22c55e" }, // green
  { stroke: "#a855f7", fill: "#a855f7" }, // purple
  { stroke: "#eab308", fill: "#eab308" }, // yellow
  { stroke: "#ec4899", fill: "#ec4899" }, // pink
];

// ── Muscat area presets (Arabic names) ───────────────────────────────────────
const MUSCAT_PRESETS = [
  { label: "مسقط القديمة / مطرح", lat: 23.6139, lng: 58.5922 },
  { label: "الروي / المركز التجاري", lat: 23.6086, lng: 58.5930 },
  { label: "الخوير",               lat: 23.5957, lng: 58.3942 },
  { label: "الغبرة",               lat: 23.6050, lng: 58.3770 },
  { label: "مدينة قابوس",          lat: 23.5880, lng: 58.4020 },
  { label: "بوشر",                 lat: 23.5820, lng: 58.3600 },
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface LocationResult {
  lat: number;
  lng: number;
  address: string;
}

interface ZoneData {
  id: number;
  name: string;
  centerLat: number;
  centerLng: number;
  polygon: Array<{ lat: number; lng: number }>;
}

type Step = "choose" | "map";

// ── Component ─────────────────────────────────────────────────────
export default function LocationPicker() {
  const [, navigate] = useLocation();
  const { t, dir } = useLanguage();
  const sessionKey = getSessionKey();

  const [step, setStep] = useState<Step>("choose");
  const [locating, setLocating] = useState(false);
  const [mapAddress, setMapAddress] = useState<string>("");
  const [addressQuery, setAddressQuery] = useState<string>("");
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [savingLabel, setSavingLabel] = useState<"home" | "work" | null>(null);
  const [searchBusy, setSearchBusy] = useState(false);
  const [activeZoneId, setActiveZoneId] = useState<number | null>(null);

  // Saved locations from backend
  const { data: savedLocs, refetch: refetchSaved } = trpc.locations.list.useQuery(
    { sessionKey },
    { staleTime: 0 }
  );

  // Zone boundaries from backend
  const { data: zones } = trpc.locations.listZones.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // zones rarely change
  });

  const saveLocationMutation = trpc.locations.save.useMutation({
    onSuccess: () => {
      refetchSaved();
      setSavingLabel(null);
      toast.success(dir === "rtl" ? "تم حفظ الموقع!" : "Location saved!");
    },
  });

  const geocodeAddressMutation = trpc.locations.geocodeAddress.useMutation();

  // ── Map refs ─────────────────────────────────────────────────────────────
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  // Keep refs to drawn polygons and their label markers so we can update styles
  const zonePolygonsRef = useRef<Map<number, google.maps.Polygon>>(new Map());
  const zoneLabelMarkersRef = useRef<Map<number, google.maps.Marker>>(new Map());
  // Places Autocomplete
  const autocompleteInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [acReady, setAcReady] = useState(false);

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
      proceedWithLocation({ lat, lng, address });
    } catch {
      toast.error(dir === "rtl" ? "تعذّر تحديد موقعك. يرجى السماح بالوصول إلى الموقع أو الاختيار يدوياً." : "Could not detect your location. Please allow location access or choose manually.");
    } finally {
      setLocating(false);
    }
  };

  // ── Proceed with a confirmed location ────────────────────────────────────
  const proceedWithLocation = (loc: LocationResult) => {
    const existing = JSON.parse(sessionStorage.getItem("orderingLocation") || "null");
    sessionStorage.setItem(
      "deliveryLocation",
      JSON.stringify({ lat: loc.lat, lng: loc.lng, address: loc.address })
    );
    if (!existing) {
      sessionStorage.setItem(
        "orderingLocation",
        JSON.stringify({ lat: loc.lat, lng: loc.lng, address: loc.address })
      );
    }
    navigate("/order/summary");
  };

  // ── Point-in-polygon check (ray casting) ─────────────────────────────────
  const findActiveZone = useCallback(
    (lat: number, lng: number, zoneList: ZoneData[]): number | null => {
      for (const zone of zoneList) {
        const poly = zone.polygon;
        let inside = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
          const xi = poly[i].lng, yi = poly[i].lat;
          const xj = poly[j].lng, yj = poly[j].lat;
          const intersect =
            yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
          if (intersect) inside = !inside;
        }
        if (inside) return zone.id;
      }
      return null;
    },
    []
  );

  // ── Update polygon highlight when active zone changes ────────────────────
  const updateZoneHighlights = useCallback((newActiveId: number | null) => {
    zonePolygonsRef.current.forEach((poly, zoneId) => {
      const idx = Array.from(zonePolygonsRef.current.keys()).indexOf(zoneId);
      const color = ZONE_COLORS[idx % ZONE_COLORS.length];
      const isActive = zoneId === newActiveId;
      poly.setOptions({
        strokeOpacity: isActive ? 1 : 0.9,
        strokeWeight: isActive ? 3.5 : 2.5,
        fillOpacity: isActive ? 0.22 : 0.12,
        strokeColor: color.stroke,
        fillColor: color.fill,
        zIndex: isActive ? 2 : 1,
      });
    });
  }, []);

  // ── Draw zone polygons on the map ─────────────────────────────────────────
  const drawZones = useCallback(
    (map: google.maps.Map, zoneList: ZoneData[]) => {
      // Clear any previously drawn polygons
      zonePolygonsRef.current.forEach((p) => p.setMap(null));
      zonePolygonsRef.current.clear();
      zoneLabelMarkersRef.current.forEach((m) => m.setMap(null));
      zoneLabelMarkersRef.current.clear();

      zoneList.forEach((zone, idx) => {
        const color = ZONE_COLORS[idx % ZONE_COLORS.length];

        // Draw polygon boundary — strong visible stroke
        const polygon = new google.maps.Polygon({
          paths: zone.polygon,
          strokeColor: color.stroke,
          strokeOpacity: 0.9,
          strokeWeight: 2.5,
          fillColor: color.fill,
          fillOpacity: 0.12,
          map,
          zIndex: 1,
          clickable: false,
        });
        zonePolygonsRef.current.set(zone.id, polygon);

        // Zone name label — white text with dark shadow for legibility on any map tile
        const labelMarker = new google.maps.Marker({
          position: { lat: zone.centerLat, lng: zone.centerLng },
          map,
          icon: {
            // Use a small rounded rectangle as background for the label
            url: `data:image/svg+xml;utf8,${encodeURIComponent(
              `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="none"/></svg>`
            )}`,
            scaledSize: new google.maps.Size(1, 1),
            anchor: new google.maps.Point(0, 0),
          },
          label: {
            text: zone.name,
            color: "#ffffff",
            fontSize: "12px",
            fontWeight: "800",
            fontFamily: "Cairo, sans-serif",
          },
          clickable: false,
          zIndex: 3,
        });
        zoneLabelMarkersRef.current.set(zone.id, labelMarker);
      });
    },
    []
  );

  // ── Re-draw zones when map becomes ready and zone data arrives ────────────
  const applyResolvedAddress = useCallback((addr: string) => {
    setMapAddress(addr);
    setAddressQuery(addr);
  }, []);

  const handleMapReady = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      const geocoder = new google.maps.Geocoder();
      geocoderRef.current = geocoder;
      _geocoderSingleton = geocoder;

      const defaultCenter = { lat: 23.5880, lng: 58.3829 };
      map.setCenter(defaultCenter);
      map.setZoom(11); // zoom 11 shows all 3 Muscat zones clearly

      markerRef.current = new google.maps.Marker({
        map,
        position: defaultCenter,
        title: "موقع التوصيل",
        draggable: true,
        zIndex: 10,
      });

      setMapCoords(defaultCenter);
      reverseGeocode(defaultCenter.lat, defaultCenter.lng, geocoder).then(applyResolvedAddress);

      markerRef.current.addListener("dragend", async () => {
        const pos = markerRef.current?.getPosition();
        if (!pos) return;
        const lat = pos.lat();
        const lng = pos.lng();
        setMapCoords({ lat, lng });
        const addr = await reverseGeocode(lat, lng, geocoder);
        applyResolvedAddress(addr);
        setSearchInput(""); // clear search box when user drags pin manually
      });

      map.addListener("click", async (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        markerRef.current?.setPosition(e.latLng);
        setMapCoords({ lat, lng });
        const addr = await reverseGeocode(lat, lng, geocoder);
        applyResolvedAddress(addr);
        setSearchInput(""); // clear search box when user taps map
      });

      // Signal that the map is ready so the Autocomplete effect can run
      setAcReady(true);
    },
    [applyResolvedAddress]
  );

  // Draw zones whenever the map is ready and zone data is loaded
  useEffect(() => {
    if (mapRef.current && zones && zones.length > 0) {
      drawZones(mapRef.current, zones);
    }
  }, [zones, drawZones]);

  // ── Init Places Autocomplete once the map is ready ────────────────────────
  useEffect(() => {
    if (!acReady || !autocompleteInputRef.current || autocompleteRef.current) return;
    const ac = new google.maps.places.Autocomplete(autocompleteInputRef.current, {
      componentRestrictions: { country: "om" },
      fields: ["geometry", "formatted_address", "name"],
      types: ["geocode", "establishment"],
    });
    autocompleteRef.current = ac;
    ac.addListener("place_changed", async () => {
      const place = ac.getPlace();
      const loc = place.geometry?.location;
      if (!loc) {
        toast.error("لم يُعثر على الموقع. جرّب صياغة أخرى.");
        return;
      }
      const lat = loc.lat();
      const lng = loc.lng();
      // Move map and pin immediately for instant feedback
      markerRef.current?.setPosition({ lat, lng });
      mapRef.current?.panTo({ lat, lng });
      mapRef.current?.setZoom(16);
      setMapCoords({ lat, lng });
      // Reverse-geocode to get a sanitized Oman-validated address string
      const geocoded = await reverseGeocode(lat, lng, geocoderRef.current);
      // Fall back to the Places API formatted_address if reverse-geocode returns coords
      const finalAddr = geocoded.includes(",") && !geocoded.match(/^\d/) 
        ? geocoded 
        : (place.formatted_address || place.name || geocoded);
      applyResolvedAddress(finalAddr);
      setSearchInput(place.name || place.formatted_address || "");
    });
  }, [acReady, applyResolvedAddress]);

  // Update active zone highlight whenever pin moves
  useEffect(() => {
    if (!mapCoords || !zones) return;
    const newActiveId = findActiveZone(mapCoords.lat, mapCoords.lng, zones);
    setActiveZoneId(newActiveId);
    updateZoneHighlights(newActiveId);
  }, [mapCoords, zones, findActiveZone, updateZoneHighlights]);

  const handleAddressSearch = useCallback(async () => {
    const q = addressQuery.trim();
    if (!q) {
      toast.error(dir === "rtl" ? "اكتب عنواناً للبحث" : "Enter an address to search");
      return;
    }
    const geocoder = geocoderRef.current;
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) {
      toast.error(dir === "rtl" ? "انتظر حتى تظهر الخريطة ثم أعد المحاولة." : "Wait for the map to load then try again.");
      return;
    }
    setSearchBusy(true);
    try {
      let lat: number | null = null;
      let lng: number | null = null;
      let formatted = q;

      try {
        const res = await geocodeAddressMutation.mutateAsync({ address: q });
        if (res.ok) {
          lat = res.lat;
          lng = res.lng;
          formatted = (res.formattedAddress ?? q).trim();
        }
      } catch {
        // Server geocode unavailable — try browser Geocoder below.
      }

      if ((lat == null || lng == null) && geocoder) {
        try {
          const results = await forwardGeocodeWithCallback(geocoder, {
            address: q,
            region: "om",
          });
          const hit = results[0];
          const loc = hit?.geometry?.location;
          if (hit && loc) {
            lat = (typeof loc.lat === "function" ? loc.lat() : loc.lat) as number;
            lng = (typeof loc.lng === "function" ? loc.lng() : loc.lng) as number;
            formatted = hit.formatted_address?.trim() || q;
          }
        } catch {
          // Both paths failed
        }
      }

      if (lat == null || lng == null) {
        toast.error(dir === "rtl" ? "لم يُعثر على عنوان مطابق. جرّب صياغة أخرى أو اختر من الخريطة." : "No matching address found. Try a different search or pick on the map.");
        return;
      }

      marker.setPosition({ lat, lng });
      map.panTo({ lat, lng });
      map.setZoom(15);
      setMapCoords({ lat, lng });
      applyResolvedAddress(formatted);
    } catch {
      toast.error(dir === "rtl" ? "تعذّر البحث عن العنوان." : "Address search failed.");
    } finally {
      setSearchBusy(false);
    }
  }, [addressQuery, applyResolvedAddress, geocodeAddressMutation]);

  const confirmedAddress = () =>
    addressQuery.trim() ||
    mapAddress.trim() ||
    (mapCoords ? `${mapCoords.lat.toFixed(4)}, ${mapCoords.lng.toFixed(4)}` : "");

  const handleConfirmMapLocation = () => {
    if (!mapCoords) return;
    proceedWithLocation({
      lat: mapCoords.lat,
      lng: mapCoords.lng,
      address: confirmedAddress(),
    });
  };

  const handleSaveMapLocation = (label: "home" | "work") => {
    if (!mapCoords) return;
    setSavingLabel(label);
    saveLocationMutation.mutate({
      sessionKey,
      label,
      lat: mapCoords.lat,
      lng: mapCoords.lng,
      address: confirmedAddress(),
    });
  };

  // ── Render: Map step ──────────────────────────────────────────────
  if (step === "map") {
    return (
      <div className="mobile-screen" style={{ background: "oklch(0.09 0 0)" }} dir={dir}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-12 pb-3">
          <button
            onClick={() => setStep("choose")}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <p className="text-white font-bold text-base">{dir === "rtl" ? "اختر موقع التوصيل" : "Choose Delivery Location"}</p>
            <p className="text-white/50 text-xs">
              {dir === "rtl" ? "اضغط على الخريطة أو اكتب العنوان ثم اضغط بحث" : "Tap the map or type an address then search"}
            </p>
          </div>
        </div>

        {/* Map */}
        <div className="relative mx-4 rounded-2xl overflow-hidden" style={{ height: "58vh", minHeight: "320px" }}>
          <MapView
            className="w-full h-full"
            initialCenter={{ lat: 23.5880, lng: 58.3829 }}
            initialZoom={12}
            onMapReady={handleMapReady}
            onLoadError={(msg) => toast.error(msg)}
          />

          {/* Places Autocomplete search bar — overlaid at top of map */}
          <div
            className="absolute top-3 left-3 right-3 z-20 flex items-center gap-2"
            dir="rtl"
          >
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
              <input
                ref={autocompleteInputRef}
                type="text"
                dir={dir}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={dir === "rtl" ? "ابحث عن عنوان أو مكان..." : "Search for address or place..."}
                className="w-full h-11 pr-10 pl-9 rounded-xl text-sm text-white placeholder:text-white/40 outline-none border border-white/20 focus:border-orange-400/60 transition-colors text-right"
                style={{
                  background: "rgba(10,10,10,0.88)",
                  backdropFilter: "blur(10px)",
                }}
              />
              {searchInput && (
                <button
                  onClick={() => {
                    setSearchInput("");
                    if (autocompleteInputRef.current) autocompleteInputRef.current.value = "";
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Zone legend overlay — bottom-right to avoid overlapping zoom controls */}
          {zones && zones.length > 0 && (
            <div
              className="absolute bottom-3 right-3 rounded-xl p-2.5 flex flex-col gap-1.5"
              style={{
                background: "rgba(0,0,0,0.78)",
                backdropFilter: "blur(8px)",
                maxWidth: "170px",
                zIndex: 20,
              }}
              dir="rtl"
            >
              <p className="text-white/50 text-[9px] uppercase tracking-widest mb-0.5">
                {dir === "rtl" ? "مناطق التوصيل" : "Delivery Zones"}
              </p>
              {zones.map((zone, idx) => {
                const color = ZONE_COLORS[idx % ZONE_COLORS.length];
                const isActive = zone.id === activeZoneId;
                return (
                  <div key={zone.id} className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0 transition-all"
                      style={{
                        background: color.fill,
                        opacity: isActive ? 1 : 0.5,
                        boxShadow: isActive ? `0 0 6px ${color.fill}` : "none",
                      }}
                    />
                    <span
                      className="text-[10px] font-medium leading-tight transition-colors"
                      style={{ color: isActive ? color.stroke : "rgba(255,255,255,0.55)" }}
                    >
                      {zone.name}
                    </span>
                    {isActive && (
                      <Check className="w-2.5 h-2.5 shrink-0" style={{ color: color.stroke }} />
                    )}
                  </div>
                );
              })}
              {activeZoneId === null && mapCoords && (
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                  <p className="text-orange-300 text-[10px] font-semibold leading-tight">
                    {dir === "rtl" ? "خارج نطاق التوصيل" : "Outside delivery zone"}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Address: type / select full text + search */}
        <div className="px-4 pt-3 pb-6">
          <div className="bg-white/10 rounded-2xl p-4 mb-3">
            <div className="flex items-start gap-3 mb-3">
              <MapPin className="w-4 h-4 text-orange-400 mt-1 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white/50 text-[10px] uppercase tracking-wide mb-1">
                  {dir === "rtl" ? "عنوان التوصيل (يمكنك التعديل والبحث)" : "Delivery address (you can edit and search)"}
                </p>
                <Textarea
                  value={addressQuery}
                  onChange={(e) => setAddressQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleAddressSearch();
                    }
                  }}
                  placeholder={dir === "rtl" ? "اكتب العنوان أو الحيّ، ثم Enter أو «بحث»" : "Type address or neighborhood, then Enter or Search"}
                  rows={3}
                  disabled={searchBusy}
                  className="min-h-[88px] resize-y bg-black/25 border-white/15 text-white text-sm leading-relaxed placeholder:text-white/35 focus-visible:border-orange-400/50 focus-visible:ring-orange-400/20"
                />
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full rounded-xl bg-white/10 text-white border border-white/15 hover:bg-white/15"
              disabled={searchBusy}
              onClick={() => void handleAddressSearch()}
            >
              {searchBusy ? (
                <Loader2 className="w-4 h-4 animate-spin ms-2" />
              ) : (
                <Search className="w-4 h-4 ms-2" />
              )}
              {dir === "rtl" ? "بحث عن العنوان" : "Search Address"}
            </Button>
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
                    {existing
                      ? label === "home" ? (dir === "rtl" ? "تحديث المنزل" : "Update Home") : (dir === "rtl" ? "تحديث العمل" : "Update Work")
                      : label === "home" ? (dir === "rtl" ? "حفظ كمنزل" : "Save as Home") : (dir === "rtl" ? "حفظ كعمل" : "Save as Work")}
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
            <Check className="w-5 h-5 me-2" />
            {t("location.confirm")}
          </Button>
        </div>
      </div>
    );
  }

  // ── Render: Choose step ──────────────────────────────────────────────
  return (
    <div className="mobile-screen" style={{ background: "oklch(0.09 0 0)" }} dir={dir}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        <button
          onClick={() => navigate("/")}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <div>
          <p className="text-white font-bold text-lg">{t("location.title")}</p>
          <p className="text-white/50 text-xs">{dir === "rtl" ? "إلى أين نوصّل؟" : "Where should we deliver?"}</p>
        </div>
      </div>

      <div className="flex-1 px-4 pb-8 overflow-y-auto">
        {/* ── Option 1: Current location ─────────────────────────────── */}
        <button
          onClick={handleUseCurrentLocation}
          disabled={locating}
          className="w-full bg-white/5 border border-white/10 rounded-3xl p-5 mb-3 text-right flex items-center gap-4 active:scale-[0.98] transition-transform"
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
          <div className="text-right flex-1">
            <p className="text-white font-bold text-base">
              {locating ? t("location.detecting") : t("location.use.gps")}
            </p>
            <p className="text-white/50 text-sm">
              {locating ? (dir === "rtl" ? "جارٍ الحصول على موقع GPS" : "Getting GPS location") : (dir === "rtl" ? "تحديد تلقائي بالـ GPS" : "Automatic GPS detection")}
            </p>
          </div>
        </button>

        {/* ── Saved locations (Home / Work) ──────────────────────────── */}
        {savedLocs && savedLocs.length > 0 && (
          <div className="mb-3">
            <p className="text-white/40 text-[10px] uppercase tracking-widest px-1 mb-2">
              {dir === "rtl" ? "المواقع المحفوظة" : "Saved Locations"}
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
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-right flex items-center gap-3 active:scale-[0.98] transition-transform"
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
                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-white font-semibold text-sm">
                      {loc.label === "home" ? (dir === "rtl" ? "المنزل" : "Home") : loc.label === "work" ? (dir === "rtl" ? "العمل" : "Work") : (dir === "rtl" ? "موقع آخر" : "Other")}
                    </p>
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
            {dir === "rtl" ? "مناطق مسقط" : "Muscat Areas"}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {MUSCAT_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() =>
                  proceedWithLocation({ lat: preset.lat, lng: preset.lng, address: preset.label })
                }
                className="bg-white/5 border border-white/10 rounded-2xl p-3 text-right flex items-center gap-2 active:scale-[0.98] transition-transform"
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
          className="w-full bg-white/5 border border-white/10 rounded-3xl p-5 text-right flex items-center gap-4 active:scale-[0.98] transition-transform"
          style={{ minHeight: "80px" }}
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center shrink-0">
            <MapPin className="w-6 h-6 text-blue-400" />
          </div>
          <div className="flex-1 text-right">
          <p className="text-white font-bold text-base">{dir === "rtl" ? "اختر على الخريطة" : "Choose on Map"}</p>
          <p className="text-white/50 text-sm">{dir === "rtl" ? "تحديد موقع مخصص على الخريطة" : "Pin a custom location on the map"}</p>
          </div>
          <Plus className="w-4 h-4 text-white/30 shrink-0" />
        </button>
      </div>
    </div>
  );
}
