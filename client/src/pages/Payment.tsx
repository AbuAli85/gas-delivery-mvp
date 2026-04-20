import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowLeft, CreditCard, Lock, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

interface PaymentIntent {
  method: "stripe" | "mock";
  clientSecret: string | null;
  paymentIntentId: string;
  totalPrice: string;
  currency: string;
}

interface OrderDraft {
  orderId: number;
  gasAmount: number;
  totalPrice: number;
}

export default function Payment() {
  const [, navigate] = useLocation();
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [draft, setDraft] = useState<OrderDraft | null>(null);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    const storedIntent = sessionStorage.getItem("paymentIntent");
    const storedDraft = sessionStorage.getItem("orderDraft");
    if (!storedIntent || !storedDraft) { navigate("/"); return; }
    try {
      setIntent(JSON.parse(storedIntent));
      setDraft(JSON.parse(storedDraft));
    } catch { navigate("/"); }
  }, [navigate]);

  const confirmMock = trpc.orders.confirmMockPayment.useMutation({
    onSuccess: (data) => {
      setPaid(true);
      sessionStorage.removeItem("paymentIntent");
      setTimeout(() => navigate(`/order/placed/${data.orderId}`), 1200);
    },
    onError: (err) => toast.error(err.message || "Payment failed. Please try again."),
  });

  const confirmStripe = trpc.orders.confirmStripePayment.useMutation({
    onSuccess: (data) => {
      setPaid(true);
      sessionStorage.removeItem("paymentIntent");
      setTimeout(() => navigate(`/order/placed/${data.orderId}`), 1200);
    },
    onError: (err) => toast.error(err.message || "Payment confirmation failed."),
  });

  if (!intent || !draft) return null;

  const isLoading = confirmMock.isPending || confirmStripe.isPending;
  const isMock = intent.method === "mock";

  const handlePay = () => {
    if (isMock) {
      confirmMock.mutate({ orderId: draft.orderId });
    } else {
      // For Stripe, in a real implementation you'd use Stripe.js confirmPayment
      // For MVP, we confirm via our procedure after Stripe client-side success
      confirmStripe.mutate({ paymentIntentId: intent.paymentIntentId });
    }
  };

  if (paid) {
    return (
      <div className="mobile-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4 px-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <p className="text-xl font-bold text-gray-900">Payment Confirmed!</p>
          <p className="text-gray-500 text-sm">Finding your nearest provider…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        <button
          onClick={() => navigate("/order/summary")}
          className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Payment</h1>
        <div className="ml-auto flex items-center gap-1 text-xs text-gray-400">
          <Lock className="w-3 h-3" />
          Secure
        </div>
      </div>

      <div className="flex-1 px-4 pb-8 space-y-4">
        {/* Amount Card */}
        <div className="bg-white rounded-3xl shadow-sm p-6 text-center">
          <p className="text-sm text-gray-500 mb-1">Amount to pay</p>
          <p className="text-4xl font-extrabold text-primary">
            OMR {parseFloat(intent.totalPrice).toFixed(3)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {draft.gasAmount} cylinder{draft.gasAmount > 1 ? "s" : ""} + delivery
          </p>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-3xl shadow-sm p-6">
          <p className="text-sm font-semibold text-gray-700 mb-4">Payment Method</p>

          {isMock ? (
            <div className="border-2 border-primary rounded-2xl p-4 bg-primary/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Demo Payment</p>
                  <p className="text-xs text-gray-500">Test mode — no real charge</p>
                </div>
                <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              </div>
            </div>
          ) : (
            <div className="border-2 border-primary rounded-2xl p-4 bg-primary/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Stripe</p>
                  <p className="text-xs text-gray-500">Secure card payment</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Security note */}
        <div className="flex items-center gap-2 px-2">
          <Lock className="w-4 h-4 text-gray-400 shrink-0" />
          <p className="text-xs text-gray-400">
            Your payment is encrypted and processed securely. We never store card details.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-8 pt-2">
        <Button
          size="lg"
          className="w-full h-14 text-base font-bold rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30"
          onClick={handlePay}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processing payment…
            </>
          ) : (
            <>
              <Lock className="w-5 h-5 mr-2" />
              Pay OMR {parseFloat(intent.totalPrice).toFixed(3)}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
