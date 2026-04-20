import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Flame, MapPin, Clock, Shield, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

interface LocationState {
  lat: number;
  lng: number;
  address: string;
}

export default function Home() {
  const [, navigate] = useLocation();
  const [locating, setLocating] = useState(false);
  const [location, setLocation] = useState<LocationState | null>(null);
  const [gasAmount, setGasAmount] = useState(1);

  const createDraft = trpc.orders.createOrderDraft.useMutation({
    onSuccess: (data) => {
      // Store draft in sessionStorage for the summary page
      sessionStorage.setItem("orderDraft", JSON.stringify(data));
      navigate("/order/summary");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create order. Please try again.");
    },
  });

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        // Reverse geocode using browser-friendly approach
        let address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
          );
          const data = await res.json();
          if (data?.display_name) {
            const parts = data.display_name.split(",");
            address = parts.slice(0, 3).join(", ");
          }
        } catch (_) {}
        setLocation({ lat, lng, address });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          toast.error("Location permission denied. Please enable location access.");
        } else {
          toast.error("Could not detect your location. Please try again.");
        }
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleOrderGas = () => {
    if (!location) {
      detectLocation();
      return;
    }
    createDraft.mutate({
      customerLat: location.lat,
      customerLng: location.lng,
      customerAddress: location.address,
      gasAmount,
    });
  };

  const isLoading = locating || createDraft.isPending;

  return (
    <div className="mobile-screen bg-gray-50">
      {/* Hero Section */}
      <div
        className="relative flex flex-col items-center justify-center px-6 pt-16 pb-10 text-white"
        style={{
          background: "linear-gradient(160deg, oklch(0.12 0 0) 0%, oklch(0.20 0 0) 40%, oklch(0.53 0.22 27) 100%)",
          minHeight: "55vh",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
            <Flame className="w-7 h-7 text-orange-400" />
          </div>
          <div>
            <p className="text-xs text-white/60 uppercase tracking-widest">Gas Delivery</p>
            <p className="text-lg font-bold leading-none">Muscat</p>
          </div>
        </div>

        <h1 className="text-4xl font-extrabold text-center leading-tight mb-3">
          Gas Delivered<br />
          <span className="text-orange-400">in 30 Minutes</span>
        </h1>
        <p className="text-white/70 text-center text-sm max-w-xs">
          Order LPG cylinders directly to your door. No app download required.
        </p>

        {/* Detected location badge */}
        {location && (
          <div className="mt-5 flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-2 text-sm">
            <MapPin className="w-4 h-4 text-orange-400 shrink-0" />
            <span className="truncate max-w-[220px] text-white/90">{location.address}</span>
          </div>
        )}
      </div>

      {/* Order Card */}
      <div className="flex-1 px-4 -mt-6">
        <div className="bg-white rounded-3xl shadow-xl p-6">
          {/* Gas Amount Selector */}
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Cylinders
          </p>
          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setGasAmount(n)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                  gasAmount === n
                    ? "bg-primary text-white shadow-md scale-105"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          {/* Price preview */}
          <div className="flex justify-between items-center mb-6 px-1">
            <div>
              <p className="text-xs text-gray-400">Price per cylinder</p>
              <p className="text-lg font-bold text-gray-900">OMR 3.500</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Delivery fee</p>
              <p className="text-lg font-bold text-gray-900">OMR 1.000</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Total</p>
              <p className="text-xl font-extrabold text-primary">
                OMR {(gasAmount * 3.5 + 1.0).toFixed(3)}
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <Button
            size="lg"
            className="w-full h-14 text-base font-bold rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30"
            onClick={handleOrderGas}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {locating ? "Detecting location…" : "Creating order…"}
              </>
            ) : (
              <>
                <Flame className="w-5 h-5 mr-2" />
                {location ? "Order Gas" : "Detect Location & Order"}
                <ChevronRight className="w-5 h-5 ml-1" />
              </>
            )}
          </Button>

          {!location && (
            <p className="text-center text-xs text-gray-400 mt-3">
              We'll ask for your location to find the nearest provider
            </p>
          )}
        </div>

        {/* Trust badges */}
        <div className="grid grid-cols-3 gap-3 mt-4 pb-8">
          {[
            { icon: Clock, label: "30 min", sub: "Average ETA" },
            { icon: Shield, label: "Secure", sub: "Safe payment" },
            { icon: MapPin, label: "Muscat", sub: "Coverage area" },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="bg-white rounded-2xl p-3 text-center shadow-sm">
              <Icon className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-xs font-bold text-gray-800">{label}</p>
              <p className="text-[10px] text-gray-400">{sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
