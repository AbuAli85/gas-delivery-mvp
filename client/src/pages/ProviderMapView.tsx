import { useEffect, useRef, useState, useCallback } from "react";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import { Loader2, Navigation, RefreshCw, Route, Package, Phone, MapPin, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Oman center fallback
const OMAN_CENTER = { lat: 23.5859, lng: 58.4059 };

interface MapOrder {
  orderId: number;
  status: string;
  deliveryLat: number | null;
  deliveryLng: number | null;
  deliveryAddress: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  gasAmount?: string;
  totalPrice?: string;
  estimatedMinutes?: number | null;
  paymentMethod?: string | null;
}

interface RouteStep {
  instruction: string;
  distance: string;
  duration: string;
}

interface ProviderMapViewProps {
  providerId: number;
}

export function ProviderMapView({ providerId }: ProviderMapViewProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const providerMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<MapOrder | null>(null);
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const { data: mapData, isLoading, refetch } = trpc.providers.getMapData.useQuery(
    { providerId },
    { enabled: !!providerId, refetchInterval: 10_000 }
  );

  const handleRefresh = useCallback(() => {
    refetch();
    setLastRefresh(Date.now());
  }, [refetch]);

  // ── Build/update markers whenever map or data changes ──────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;
    const map = mapRef.current;

    // Clear old markers
    markersRef.current.forEach(m => { m.map = null; });
    markersRef.current = [];

    // ── Provider marker (blue dot) ──────────────────────────────────────────
    const provLoc = mapData?.providerLocation;
    if (providerMarkerRef.current) providerMarkerRef.current.map = null;
    if (provLoc) {
      const el = document.createElement("div");
      el.innerHTML = `
        <div style="
          width:36px;height:36px;border-radius:50%;
          background:oklch(0.55 0.22 240);
          border:3px solid white;
          box-shadow:0 0 0 3px oklch(0.55 0.22 240 / 0.4), 0 4px 12px rgba(0,0,0,0.4);
          display:flex;align-items:center;justify-content:center;
          animation: pulse-blue 2s infinite;
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <circle cx="12" cy="12" r="5"/>
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="white" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>`;
      providerMarkerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: provLoc.lat, lng: provLoc.lng },
        title: "موقعك الحالي",
        content: el,
        zIndex: 100,
      });
    }

    // ── My active order markers (orange flame) ─────────────────────────────
    (mapData?.myActiveOrders ?? []).forEach((order, idx) => {
      if (!order.deliveryLat || !order.deliveryLng) return;
      const el = document.createElement("div");
      el.style.cursor = "pointer";
      el.innerHTML = `
        <div style="
          position:relative;
          width:44px;height:52px;
          display:flex;flex-direction:column;align-items:center;
        ">
          <div style="
            width:44px;height:44px;border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            background:oklch(0.62 0.22 27);
            border:2px solid white;
            box-shadow:0 4px 14px rgba(0,0,0,0.5);
            display:flex;align-items:center;justify-content:center;
          ">
            <span style="transform:rotate(45deg);color:white;font-weight:bold;font-size:13px;">${idx + 1}</span>
          </div>
        </div>`;
      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: order.deliveryLat, lng: order.deliveryLng },
        title: order.deliveryAddress ?? `طلب #${order.orderId}`,
        content: el,
        zIndex: 50,
      });
      el.addEventListener("click", () => setSelectedOrder(order));
      markersRef.current.push(marker);
    });

    // ── Zone pending order markers (gray) ──────────────────────────────────
    (mapData?.zoneOrders ?? []).forEach(order => {
      if (!order.deliveryLat || !order.deliveryLng) return;
      // Skip if already in myActiveOrders
      const isMyOrder = (mapData?.myActiveOrders ?? []).some(o => o.orderId === order.orderId);
      if (isMyOrder) return;
      const el = document.createElement("div");
      el.style.cursor = "pointer";
      el.innerHTML = `
        <div style="
          width:28px;height:28px;border-radius:50%;
          background:oklch(0.4 0 0);
          border:2px solid oklch(0.6 0 0);
          box-shadow:0 2px 8px rgba(0,0,0,0.4);
          display:flex;align-items:center;justify-content:center;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>`;
      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: order.deliveryLat, lng: order.deliveryLng },
        title: order.deliveryAddress ?? `طلب #${order.orderId}`,
        content: el,
        zIndex: 10,
      });
      el.addEventListener("click", () => setSelectedOrder(order as MapOrder));
      markersRef.current.push(marker);
    });

    // Auto-fit bounds if we have active orders
    const allPoints: google.maps.LatLngLiteral[] = [];
    if (provLoc) allPoints.push({ lat: provLoc.lat, lng: provLoc.lng });
    (mapData?.myActiveOrders ?? []).forEach(o => {
      if (o.deliveryLat && o.deliveryLng) allPoints.push({ lat: o.deliveryLat, lng: o.deliveryLng });
    });
    if (allPoints.length >= 2) {
      const bounds = new window.google.maps.LatLngBounds();
      allPoints.forEach(p => bounds.extend(p));
      map.fitBounds(bounds, { top: 80, right: 20, bottom: 200, left: 20 });
    } else if (allPoints.length === 1) {
      map.setCenter(allPoints[0]);
      map.setZoom(14);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, mapData]);

  // ── Calculate optimized route for all active orders ────────────────────────
  const calculateRoute = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return;
    const activeOrders = mapData?.myActiveOrders ?? [];
    const provLoc = mapData?.providerLocation;
    if (activeOrders.length === 0 || !provLoc) {
      setRouteError("لا توجد طلبات نشطة لحساب المسار");
      return;
    }

    setRouteLoading(true);
    setRouteError(null);

    // Clear old route
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }

    const validOrders = activeOrders.filter(o => o.deliveryLat && o.deliveryLng);
    if (validOrders.length === 0) {
      setRouteLoading(false);
      setRouteError("إحداثيات التوصيل غير متوفرة");
      return;
    }

    const origin = { lat: provLoc.lat, lng: provLoc.lng };
    const destination = { lat: validOrders[validOrders.length - 1].deliveryLat!, lng: validOrders[validOrders.length - 1].deliveryLng! };
    const waypoints = validOrders.slice(0, -1).map(o => ({
      location: { lat: o.deliveryLat!, lng: o.deliveryLng! },
      stopover: true,
    }));

    const directionsService = new window.google.maps.DirectionsService();
    const renderer = new window.google.maps.DirectionsRenderer({
      map: mapRef.current,
      suppressMarkers: true, // We use our own custom markers
      polylineOptions: {
        strokeColor: "oklch(0.62 0.22 27)",
        strokeWeight: 4,
        strokeOpacity: 0.85,
      },
    });
    directionsRendererRef.current = renderer;

    directionsService.route(
      {
        origin,
        destination,
        waypoints,
        optimizeWaypoints: waypoints.length > 1, // Let Google optimize order if multiple stops
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        setRouteLoading(false);
        if (status === "OK" && result) {
          renderer.setDirections(result);
          // Extract steps
          const steps: RouteStep[] = [];
          result.routes[0].legs.forEach(leg => {
            leg.steps.forEach(step => {
              steps.push({
                instruction: step.instructions.replace(/<[^>]+>/g, ""),
                distance: step.distance?.text ?? "",
                duration: step.duration?.text ?? "",
              });
            });
          });
          setRouteSteps(steps);
          setShowSteps(true);
        } else {
          setRouteError("تعذّر حساب المسار. حاول مرة أخرى.");
        }
      }
    );
  }, [mapData]);

  const clearRoute = useCallback(() => {
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }
    setRouteSteps([]);
    setShowSteps(false);
    setRouteError(null);
  }, []);

  const myActiveOrders = mapData?.myActiveOrders ?? [];
  const zoneOrders = mapData?.zoneOrders ?? [];
  const provLoc = mapData?.providerLocation;

  return (
    <div className="relative w-full h-full flex flex-col" style={{ minHeight: "calc(100vh - 120px)" }}>
      {/* ── Map ── */}
      <div className="flex-1 relative">
        <MapView
          className="absolute inset-0"
          initialCenter={provLoc ? { lat: provLoc.lat, lng: provLoc.lng } : OMAN_CENTER}
          initialZoom={13}
          mapTypeControl={false}
          fullscreenControl={false}
          streetViewControl={false}
          onMapReady={(map) => {
            mapRef.current = map;
            setMapReady(true);
          }}
        />

        {/* ── Top HUD ── */}
        <div className="absolute top-3 left-3 right-3 flex items-center gap-2 z-10">
          {/* Stats pill */}
          <div
            className="flex items-center gap-3 px-3 py-2 rounded-2xl text-xs font-semibold"
            style={{ background: "oklch(0.12 0 0 / 0.92)", backdropFilter: "blur(12px)", border: "1px solid oklch(0.3 0 0)" }}
          >
            <span className="flex items-center gap-1 text-orange-400">
              <Package className="w-3.5 h-3.5" />
              {myActiveOrders.length} نشط
            </span>
            <span className="w-px h-4 bg-white/20" />
            <span className="flex items-center gap-1 text-white/60">
              <MapPin className="w-3.5 h-3.5" />
              {zoneOrders.length} في المنطقة
            </span>
          </div>

          <div className="flex-1" />

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "oklch(0.12 0 0 / 0.92)", backdropFilter: "blur(12px)", border: "1px solid oklch(0.3 0 0)" }}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-white/60 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 text-white/60" />
            )}
          </button>
        </div>

        {/* ── Legend ── */}
        <div
          className="absolute top-16 right-3 flex flex-col gap-1.5 px-2.5 py-2 rounded-xl text-xs z-10"
          style={{ background: "oklch(0.12 0 0 / 0.88)", backdropFilter: "blur(12px)", border: "1px solid oklch(0.3 0 0)" }}
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: "oklch(0.55 0.22 240)" }} />
            <span className="text-white/70">موقعك</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: "oklch(0.62 0.22 27)" }} />
            <span className="text-white/70">طلباتك</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: "oklch(0.4 0 0)" }} />
            <span className="text-white/70">طلبات المنطقة</span>
          </div>
        </div>

        {/* ── Route button ── */}
        {myActiveOrders.length > 0 && (
          <div className="absolute bottom-4 left-3 right-3 z-10">
            {routeSteps.length === 0 ? (
              <Button
                className="w-full h-12 rounded-2xl font-bold text-sm gap-2"
                style={{ background: "oklch(0.62 0.22 27)", color: "white" }}
                onClick={calculateRoute}
                disabled={routeLoading}
              >
                {routeLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />جاري حساب المسار...</>
                ) : (
                  <><Route className="w-4 h-4" />تحسين مسار التوصيل</>
                )}
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full h-10 rounded-2xl text-sm gap-2 border-red-500/30 text-red-400 bg-transparent hover:bg-red-500/10"
                onClick={clearRoute}
              >
                <X className="w-4 h-4" />
                إلغاء المسار
              </Button>
            )}
            {routeError && (
              <p className="text-center text-xs text-red-400 mt-2">{routeError}</p>
            )}
          </div>
        )}
      </div>

      {/* ── Selected Order Card ── */}
      {selectedOrder && (
        <div
          className="absolute bottom-20 left-3 right-3 rounded-2xl p-4 z-20"
          style={{ background: "oklch(0.13 0.04 27)", border: "1.5px solid oklch(0.62 0.22 27 / 0.5)", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: myActiveOrders.some(o => o.orderId === selectedOrder.orderId) ? "oklch(0.62 0.22 27)" : "oklch(0.4 0 0)" }}
              >
                {myActiveOrders.findIndex(o => o.orderId === selectedOrder.orderId) + 1 || "•"}
              </div>
              <span className="text-white font-semibold text-sm">طلب #{selectedOrder.orderId}</span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: selectedOrder.status === "out_for_delivery" ? "oklch(0.35 0.15 145 / 0.3)" : "oklch(0.35 0.15 27 / 0.3)",
                  color: selectedOrder.status === "out_for_delivery" ? "oklch(0.7 0.2 145)" : "oklch(0.75 0.15 27)",
                }}
              >
                {selectedOrder.status === "accepted" ? "مقبول" : selectedOrder.status === "out_for_delivery" ? "في الطريق" : selectedOrder.status === "pending" ? "انتظار" : selectedOrder.status}
              </span>
            </div>
            <button onClick={() => setSelectedOrder(null)} className="text-white/40 hover:text-white/70 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <span className="text-white/80 leading-snug">{selectedOrder.deliveryAddress}</span>
            </div>
            {selectedOrder.customerName && (
              <div className="flex items-center gap-2">
                <span className="text-white/40 text-xs">العميل:</span>
                <span className="text-white/70">{selectedOrder.customerName}</span>
              </div>
            )}
            {selectedOrder.customerPhone && (
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-white/40" />
                <a href={`tel:${selectedOrder.customerPhone}`} className="text-orange-300 font-medium" dir="ltr">{selectedOrder.customerPhone}</a>
              </div>
            )}
            {selectedOrder.gasAmount && (
              <div className="flex items-center gap-3 pt-1">
                <span className="text-white/60 text-xs">{selectedOrder.gasAmount} أسطوانة</span>
                {selectedOrder.totalPrice && <span className="text-orange-300 font-semibold text-xs">OMR {parseFloat(selectedOrder.totalPrice).toFixed(3)}</span>}
                {selectedOrder.estimatedMinutes && <span className="text-white/40 text-xs">~{selectedOrder.estimatedMinutes} دقيقة</span>}
              </div>
            )}
          </div>
          {selectedOrder.deliveryLat && selectedOrder.deliveryLng && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedOrder.deliveryLat},${selectedOrder.deliveryLng}&travelmode=driving`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 w-full h-9 rounded-xl text-xs font-bold text-white"
              style={{ background: "oklch(0.62 0.22 27)" }}
            >
              <Navigation className="w-3.5 h-3.5" />
              فتح في Google Maps
            </a>
          )}
        </div>
      )}

      {/* ── Route Steps Panel ── */}
      {routeSteps.length > 0 && (
        <div
          className="absolute bottom-0 left-0 right-0 rounded-t-3xl z-30 overflow-hidden"
          style={{ background: "oklch(0.12 0 0 / 0.97)", backdropFilter: "blur(16px)", border: "1px solid oklch(0.25 0 0)", maxHeight: showSteps ? "55vh" : "48px" }}
        >
          <button
            className="w-full flex items-center justify-between px-4 py-3"
            onClick={() => setShowSteps(s => !s)}
          >
            <div className="flex items-center gap-2">
              <Route className="w-4 h-4 text-orange-400" />
              <span className="text-white font-semibold text-sm">خطوات المسار ({routeSteps.length})</span>
            </div>
            {showSteps ? <ChevronDown className="w-4 h-4 text-white/50" /> : <ChevronUp className="w-4 h-4 text-white/50" />}
          </button>
          {showSteps && (
            <div className="overflow-y-auto px-4 pb-4 space-y-2" style={{ maxHeight: "calc(55vh - 48px)" }}>
              {routeSteps.map((step, i) => (
                <div key={i} className="flex gap-3 items-start py-2 border-b border-white/5 last:border-0">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
                    style={{ background: "oklch(0.62 0.22 27 / 0.7)" }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/85 text-xs leading-relaxed">{step.instruction}</p>
                    <div className="flex gap-3 mt-1">
                      <span className="text-white/40 text-xs">{step.distance}</span>
                      <span className="text-white/40 text-xs">{step.duration}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── No location warning ── */}
      {mapReady && !provLoc && (
        <div
          className="absolute top-16 left-3 right-3 rounded-xl px-3 py-2 text-xs text-center z-10"
          style={{ background: "oklch(0.2 0.08 27 / 0.9)", color: "oklch(0.85 0.15 27)", border: "1px solid oklch(0.62 0.22 27 / 0.3)" }}
        >
          موقعك غير محدد — تأكد من تفعيل مشاركة الموقع
        </div>
      )}
    </div>
  );
}
