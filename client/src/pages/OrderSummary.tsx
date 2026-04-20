import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Flame, Clock, CreditCard, ChevronRight } from "lucide-react";
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
    <div className="mobile-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        <button
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Order Summary</h1>
      </div>

      <div className="flex-1 px-4 pb-8 space-y-4">
        {/* Order Details Card */}
        <div className="bg-white rounded-3xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Flame className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-bold text-gray-900">LPG Gas Cylinder</p>
              <p className="text-sm text-gray-500">{draft.gasAmount} × cylinder{draft.gasAmount > 1 ? "s" : ""}</p>
            </div>
          </div>

          <div className="space-y-3 border-t border-gray-100 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Gas ({draft.gasAmount} × OMR {draft.unitPrice.toFixed(3)})</span>
              <span className="font-semibold text-gray-800">
                OMR {(draft.gasAmount * draft.unitPrice).toFixed(3)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Delivery fee</span>
              <span className="font-semibold text-gray-800">OMR {draft.deliveryFee.toFixed(3)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-3">
              <span className="font-bold text-gray-900">Total</span>
              <span className="font-extrabold text-xl text-primary">
                OMR {draft.totalPrice.toFixed(3)}
              </span>
            </div>
          </div>
        </div>

        {/* Delivery Info */}
        <div className="bg-white rounded-3xl shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-800">Estimated Delivery</p>
              <p className="text-sm text-gray-500">{draft.estimatedMinutes} minutes</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-800">Delivery Zone</p>
              <p className="text-sm text-gray-500">{draft.zoneLabel}</p>
            </div>
          </div>
          {!draft.hasProviders && (
            <div className="bg-amber-50 rounded-xl p-3 text-sm text-amber-700">
              ⚠️ Limited provider availability in your area. Your order will be queued.
            </div>
          )}
        </div>

        {/* Payment Note */}
        <div className="bg-gray-100 rounded-2xl p-4 flex items-center gap-3">
          <CreditCard className="w-5 h-5 text-gray-500 shrink-0" />
          <p className="text-sm text-gray-600">
            Payment is processed securely. You will only be charged after confirmation.
          </p>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="px-4 pb-8 pt-2 bg-gray-50">
        <Button
          size="lg"
          className="w-full h-14 text-base font-bold rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30"
          onClick={() => createIntent.mutate({ orderId: draft.orderId })}
          disabled={createIntent.isPending}
        >
          {createIntent.isPending ? (
            "Setting up payment…"
          ) : (
            <>
              Confirm & Pay — OMR {draft.totalPrice.toFixed(3)}
              <ChevronRight className="w-5 h-5 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
