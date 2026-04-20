import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { CheckCircle2, Flame, MapPin, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

export default function OrderPlaced() {
  const { orderId } = useParams<{ orderId: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(orderId ?? "0", 10);

  const { data: order } = trpc.orders.getOrderStatus.useQuery(
    { orderId: id },
    { enabled: !!id, refetchInterval: 5000 }
  );

  useEffect(() => {
    // Clear session storage since order is placed
    sessionStorage.removeItem("orderDraft");
  }, []);

  return (
    <div className="mobile-screen bg-gray-50">
      {/* Success Hero */}
      <div
        className="flex flex-col items-center justify-center px-6 pt-16 pb-10 text-white"
        style={{
          background: "linear-gradient(160deg, oklch(0.12 0 0) 0%, oklch(0.53 0.22 27) 100%)",
          minHeight: "45vh",
        }}
      >
        <div className="w-20 h-20 rounded-full bg-white/15 backdrop-blur flex items-center justify-center mb-5">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-center mb-2">Order Placed!</h1>
        <p className="text-white/70 text-center text-sm">
          Your gas delivery is confirmed. We're finding a provider near you.
        </p>
        {id > 0 && (
          <div className="mt-4 bg-white/10 backdrop-blur rounded-full px-5 py-2 text-sm font-mono">
            Order #{id}
          </div>
        )}
      </div>

      {/* Status Card */}
      <div className="flex-1 px-4 -mt-6 pb-8">
        <div className="bg-white rounded-3xl shadow-xl p-6 space-y-4">
          {/* Current status */}
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Flame className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Current Status</p>
              <p className="font-bold text-gray-900 capitalize">
                {order
                  ? order.status === "pending"
                    ? "Finding provider…"
                    : order.status === "assigned"
                    ? "Provider assigned"
                    : order.status === "accepted"
                    ? "Order accepted ✓"
                    : order.status
                  : "Processing…"}
              </p>
            </div>
            {order?.providerName && (
              <div className="ml-auto text-right">
                <p className="text-xs text-gray-400">Provider</p>
                <p className="text-sm font-semibold text-gray-800">{order.providerName}</p>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-3">
            {order?.estimatedMinutes && (
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  Estimated: <strong>{order.estimatedMinutes} minutes</strong>
                </span>
              </div>
            )}
            {order?.customerAddress && (
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600 truncate">{order.customerAddress}</span>
              </div>
            )}
            {order?.totalPrice && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  Total paid: <strong>OMR {parseFloat(order.totalPrice).toFixed(3)}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Track Order CTA */}
          <Button
            size="lg"
            className="w-full h-14 text-base font-bold rounded-2xl bg-primary hover:bg-primary/90 mt-2"
            onClick={() => navigate(`/order/track/${id}`)}
          >
            Track My Order
            <ChevronRight className="w-5 h-5 ml-1" />
          </Button>

          <button
            onClick={() => navigate("/")}
            className="w-full text-center text-sm text-gray-400 py-2"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
