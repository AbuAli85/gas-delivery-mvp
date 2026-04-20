import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowLeft, Lock, CreditCard, Loader2, CheckCircle2 } from "lucide-react";
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

const WA_ICON = (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-green-400">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

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
    onError: (err) => toast.error(err.message || "Payment failed. Try again."),
  });

  const confirmStripe = trpc.orders.confirmStripePayment.useMutation({
    onSuccess: (data) => {
      setPaid(true);
      sessionStorage.removeItem("paymentIntent");
      setTimeout(() => navigate(`/order/placed/${data.orderId}`), 1200);
    },
    onError: (err) => toast.error(err.message || "Payment failed. Try again."),
  });

  if (!intent || !draft) return null;

  const isLoading = confirmMock.isPending || confirmStripe.isPending;
  const isMock = intent.method === "mock";

  const handlePay = () => {
    if (isMock) {
      confirmMock.mutate({ orderId: draft.orderId });
    } else {
      confirmStripe.mutate({ paymentIntentId: intent.paymentIntentId });
    }
  };

  if (paid) {
    return (
      <div className="mobile-screen items-center justify-center" style={{ background: "oklch(0.09 0 0)" }}>
        <div className="flex flex-col items-center gap-4 px-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <p className="text-xl font-bold text-white">Payment Confirmed!</p>
          <p className="text-white/40 text-sm">Finding your nearest provider…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-screen" style={{ background: "oklch(0.09 0 0)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        <button
          onClick={() => navigate("/order/summary")}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-base font-bold text-white">Payment</h1>
        <div className="ml-auto flex items-center gap-1 text-xs text-white/30">
          <Lock className="w-3 h-3" />
          Secure
        </div>
      </div>

      <div className="flex-1 px-4 pb-8 flex flex-col gap-4">
        {/* Amount hero */}
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
          <p className="text-sm text-gray-400 mb-1">Amount due</p>
          <p className="text-5xl font-extrabold text-primary mb-1">
            OMR {parseFloat(intent.totalPrice).toFixed(3)}
          </p>
          <p className="text-xs text-gray-400">
            {draft.gasAmount} cylinder{draft.gasAmount > 1 ? "s" : ""} + delivery
          </p>
        </div>

        {/* Payment method */}
        <div className="bg-white rounded-3xl shadow-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-gray-900">{isMock ? "Demo Payment" : "Stripe"}</p>
              <p className="text-xs text-gray-400">
                {isMock ? "Test mode — no real charge" : "Secure card payment"}
              </p>
            </div>
            <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
          </div>
        </div>

        <div className="flex-1" />

        {/* Pay button */}
        <Button
          size="lg"
          className="w-full rounded-2xl font-extrabold text-lg shadow-lg shadow-primary/30 active:scale-95 transition-transform"
          style={{ height: "64px", background: "oklch(0.53 0.22 27)" }}
          onClick={handlePay}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Pay OMR {parseFloat(intent.totalPrice).toFixed(3)}
            </span>
          )}
        </Button>

        {/* WhatsApp fallback */}
        <a
          href="https://wa.me/96891000001?text=أريد%20طلب%20غاز"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-2xl border border-white/10 py-3 text-sm text-white/40 hover:text-white/60 transition-colors"
        >
          {WA_ICON}
          Need help? WhatsApp us
        </a>
      </div>
    </div>
  );
}
