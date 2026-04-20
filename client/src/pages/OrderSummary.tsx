import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowLeft, Flame, MapPin, Clock, ChevronRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

interface OrderDraft {
  orderId: number;
  gasAmount: number;
  unitPrice: number;
  deliveryFee: number;
  totalPrice: number;
  currency: string;
  estimatedMinutes: number;
  zoneLabel: string;
  hasProviders: boolean;
  address?: string;
}

export default function OrderSummary() {
  const [, navigate] = useLocation();
  const [draft, setDraft] = useState<OrderDraft | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("orderDraft");
    if (!stored) { navigate("/"); return; }
    try { setDraft(JSON.parse(stored)); } catch { navigate("/"); }
  }, [navigate]);

  const createIntent = trpc.orders.createPaymentIntent.useMutation({
    onSuccess: (data) => {
      sessionStorage.setItem("paymentIntent", JSON.stringify(data));
      navigate("/order/payment");
    },
    onError: (err) => toast.error(err.message || "Payment setup failed"),
  });

  if (!draft) return null;

  return (
    <div className="mobile-screen" style={{ background: "oklch(0.09 0 0)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        <button
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-base font-bold text-white">Order Summary</h1>
      </div>

      <div className="flex-1 px-4 pb-8 space-y-3">
        {/* Main order card */}
        <div className="bg-white rounded-3xl shadow-xl p-5">
          {/* Item row */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Flame className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900">LPG Gas Cylinder</p>
              <p className="text-sm text-gray-500">{draft.gasAmount} cylinder{draft.gasAmount > 1 ? "s" : ""}</p>
            </div>
          </div>

          {/* Price breakdown */}
          <div className="space-y-2 border-t border-gray-100 pt-4 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Gas × {draft.gasAmount}</span>
              <span className="font-semibold">OMR {(draft.gasAmount * draft.unitPrice).toFixed(3)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Delivery</span>
              <span className="font-semibold">OMR {draft.deliveryFee.toFixed(3)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2">
              <span className="font-extrabold text-gray-900 text-base">Total</span>
              <span className="font-extrabold text-xl text-primary">
                OMR {draft.totalPrice.toFixed(3)}
              </span>
            </div>
          </div>

          {/* Delivery meta */}
          <div className="flex gap-4 text-sm text-gray-500 mb-5">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary" />
              <span>{draft.estimatedMinutes} min</span>
            </div>
            {draft.address && (
              <div className="flex items-center gap-1.5 truncate">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span className="truncate text-xs">{draft.address}</span>
              </div>
            )}
          </div>

          {!draft.hasProviders && (
            <div className="bg-amber-50 rounded-xl p-3 text-sm text-amber-700 mb-4">
              ⚠️ Limited availability in your area — your order will be queued.
            </div>
          )}

          {/* CTA */}
          <Button
            size="lg"
            className="w-full rounded-2xl font-extrabold text-base shadow-lg shadow-primary/30 active:scale-95 transition-transform"
            style={{ height: "60px", background: "oklch(0.53 0.22 27)" }}
            onClick={() => createIntent.mutate({ orderId: draft.orderId })}
            disabled={createIntent.isPending}
          >
            {createIntent.isPending ? "Setting up payment…" : (
              <>
                Confirm & Pay — OMR {draft.totalPrice.toFixed(3)}
                <ChevronRight className="w-5 h-5 ml-1" />
              </>
            )}
          </Button>
        </div>

        {/* Trust note */}
        <div className="flex items-center gap-2 px-2">
          <ShieldCheck className="w-4 h-4 text-green-400 shrink-0" />
          <p className="text-xs text-white/40">
            Guaranteed delivery or full refund. No hidden fees.
          </p>
        </div>

        {/* WhatsApp fallback */}
        <a
          href="https://wa.me/96891000001?text=أريد%20طلب%20غاز"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-2xl border border-white/10 py-3 text-sm text-white/40 hover:text-white/60 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-green-400">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Need help? WhatsApp us
        </a>
      </div>
    </div>
  );
}
