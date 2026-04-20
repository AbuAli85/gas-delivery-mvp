import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Flame, Loader2, ChevronRight, ShieldCheck, Zap, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

interface LocationResult {
  lat: number;
  lng: number;
  address: string;
}

async function detectLocation(): Promise<LocationResult> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        let address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const data = await res.json();
          if (data?.display_name) {
            const parts = data.display_name.split(",").slice(0, 3);
            address = parts.join(", ");
          }
        } catch {
          // Use coordinates as fallback
        }
        resolve({ lat, lng, address });
      },
      (err) => reject(new Error(err.message)),
      { timeout: 10000, enableHighAccuracy: true }
    );
  });
}

export default function Home() {
  const [, navigate] = useLocation();
  const [locating, setLocating] = useState(false);
  const [location, setLocation] = useState<LocationResult | null>(null);

  // Live provider count for urgency signal
  const { data: providers } = trpc.providers.list.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const onlineCount = providers?.filter((p) => p.isAvailable).length ?? 0;

  const createDraft = trpc.orders.createOrderDraft.useMutation({
    onSuccess: (data) => {
      sessionStorage.setItem(
        "orderDraft",
        JSON.stringify({
          orderId: data.orderId,
          gasAmount: 1,
          unitPrice: data.unitPrice,
          deliveryFee: data.deliveryFee,
          totalPrice: data.totalPrice,
          currency: data.currency,
          estimatedMinutes: data.estimatedMinutes,
          zoneLabel: data.zoneLabel,
          hasProviders: data.hasProviders,
          address: location?.address,
        })
      );
      navigate("/order/summary");
    },
    onError: (err) => {
      toast.error(err.message || "Could not create order. Try again.");
      setLocating(false);
    },
  });

  const handleOrder = async () => {
    setLocating(true);
    try {
      let loc = location;
      if (!loc) {
        loc = await detectLocation();
        setLocation(loc);
      }
      createDraft.mutate({
        customerLat: loc.lat,
        customerLng: loc.lng,
        customerAddress: loc.address,
        gasAmount: 1,
      });
    } catch {
      toast.error("Could not detect your location. Please allow location access.");
      setLocating(false);
    }
  };

  const isLoading = locating || createDraft.isPending;

  return (
    <div className="mobile-screen" style={{ background: "oklch(0.09 0 0)" }}>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div
        className="relative flex flex-col items-center justify-center px-6 pt-14 pb-8 text-white"
        style={{
          background:
            "linear-gradient(170deg, oklch(0.09 0 0) 0%, oklch(0.16 0 0) 45%, oklch(0.48 0.22 27) 100%)",
          minHeight: "52vh",
        }}
      >
        {/* Brand mark */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
            <Flame className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <p className="text-[10px] text-white/50 uppercase tracking-widest">Gas Delivery</p>
            <p className="text-base font-bold leading-none">Muscat</p>
          </div>
          {/* Live provider badge */}
          {onlineCount > 0 && (
            <div className="ml-3 flex items-center gap-1.5 bg-green-500/20 border border-green-500/30 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[11px] text-green-300 font-semibold">
                {onlineCount} online
              </span>
            </div>
          )}
        </div>

        {/* Arabic headline */}
        <p className="text-2xl font-bold text-center text-white/90 mb-1" dir="rtl">
          توصيل غاز خلال ٣٠ دقيقة
        </p>
        <h1 className="text-4xl font-extrabold text-center leading-tight mb-3">
          Gas in <span className="text-orange-400">30 Minutes</span>
        </h1>
        <p className="text-white/50 text-center text-sm max-w-xs">
          No app. No login. One tap.
        </p>

        {/* Detected location pill */}
        {location && (
          <div className="mt-4 flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-2 text-sm max-w-xs">
            <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
            <span className="truncate text-white/80 text-xs">{location.address}</span>
          </div>
        )}
      </div>

      {/* ── Order card ───────────────────────────────────────────────── */}
      <div className="flex-1 px-4 -mt-5 pb-6">
        <div className="bg-white rounded-3xl shadow-2xl p-5">
          {/* Price strip */}
          <div className="flex items-center justify-between mb-5 px-1">
            <div className="text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Per cylinder</p>
              <p className="text-xl font-extrabold text-gray-900">OMR 3.500</p>
            </div>
            <div className="h-8 w-px bg-gray-100" />
            <div className="text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Delivery</p>
              <p className="text-xl font-extrabold text-gray-900">OMR 1.000</p>
            </div>
            <div className="h-8 w-px bg-gray-100" />
            <div className="text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Total</p>
              <p className="text-xl font-extrabold text-primary">OMR 4.500</p>
            </div>
          </div>

          {/* THE button */}
          <Button
            size="lg"
            className="w-full rounded-2xl font-extrabold text-lg shadow-lg shadow-primary/30 transition-transform active:scale-95"
            style={{ height: "64px", background: "oklch(0.53 0.22 27)" }}
            onClick={handleOrder}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                {locating && !createDraft.isPending ? "Finding your location…" : "Creating order…"}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Flame className="w-5 h-5" />
                اطلب الغاز الآن — Order Gas
                <ChevronRight className="w-5 h-5" />
              </span>
            )}
          </Button>

          <p className="text-center text-[11px] text-gray-400 mt-3">
            {location
              ? "Tap to confirm your order"
              : "We'll ask for your location — takes 2 seconds"}
          </p>
        </div>

        {/* ── Trust strip ─────────────────────────────────────────── */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { icon: ShieldCheck, line1: "Guaranteed", line2: "delivery or refund" },
            { icon: Zap,         line1: "30 minutes",  line2: "average ETA" },
            { icon: Phone,       line1: "Cash OK",     line2: "or card payment" },
          ].map(({ icon: Icon, line1, line2 }) => (
            <div
              key={line1}
              className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center"
            >
              <Icon className="w-4 h-4 text-orange-400 mx-auto mb-1" />
              <p className="text-[11px] font-bold text-white">{line1}</p>
              <p className="text-[9px] text-white/40 leading-tight">{line2}</p>
            </div>
          ))}
        </div>

        {/* ── FAQ accordion ───────────────────────────────────────── */}
        <FAQ />

        {/* ── WhatsApp fallback ───────────────────────────────────── */}
        <a
          href="https://wa.me/96891000001?text=أريد%20طلب%20غاز"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-2 w-full rounded-2xl border border-white/10 py-3 text-sm text-white/60 hover:text-white/80 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-green-400">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Need help? WhatsApp us
        </a>

        {/* ── Provider portal ─────────────────────────────────────── */}
        <div className="mt-3 flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
          <p className="text-xs text-white/40">Provider login</p>
          <div className="flex gap-2">
            {[4, 5, 6].map((pid) => (
              <a
                key={pid}
                href={`/provider/${pid}`}
                className="text-xs font-bold text-primary border border-primary/30 rounded-lg px-2 py-1 hover:bg-primary/10"
              >
                #{pid}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── FAQ ─────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "How long does delivery take?",
    a: "Usually 20–30 minutes. You'll see live status updates after ordering.",
  },
  {
    q: "Do I need to create an account?",
    a: "No. Just tap Order Gas, allow location, and pay. That's it.",
  },
  {
    q: "What payment methods are accepted?",
    a: "Card payment online, or cash on delivery — your choice.",
  },
  {
    q: "What if no provider is available?",
    a: "We'll notify you immediately and offer a full refund or reschedule.",
  },
  {
    q: "Which areas in Muscat do you cover?",
    a: "Old Muscat / Mutrah, Ruwi / CBD, and Al Khuwair / Ghubrah. More zones coming soon.",
  },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="mt-4 rounded-2xl overflow-hidden border border-white/10">
      {FAQS.map((faq, i) => (
        <div key={i} className="border-b border-white/5 last:border-0">
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-left"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className="text-xs font-semibold text-white/70">{faq.q}</span>
            <ChevronRight
              className={`w-4 h-4 text-white/30 shrink-0 transition-transform ${
                open === i ? "rotate-90" : ""
              }`}
            />
          </button>
          {open === i && (
            <div className="px-4 pb-3 text-xs text-white/50 leading-relaxed">{faq.a}</div>
          )}
        </div>
      ))}
    </div>
  );
}
