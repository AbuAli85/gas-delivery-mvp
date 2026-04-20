import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Banknote,
  CreditCard,
  Building2,
  ChevronRight,
  ArrowLeft,
  ShieldCheck,
  Clock,
  Loader2,
  CheckCircle2,
} from "lucide-react";

type PaymentMethod = "cash" | "online" | "bank_transfer";

interface PaymentOption {
  id: PaymentMethod;
  icon: React.ReactNode;
  label: string;
  labelAr: string;
  description: string;
  badge?: string;
  badgeColor?: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: "cash",
    icon: <Banknote className="w-6 h-6" />,
    label: "Cash on Delivery",
    labelAr: "الدفع عند الاستلام",
    description: "Pay the driver when gas arrives",
    badge: "Most Popular",
    badgeColor: "bg-green-500",
  },
  {
    id: "online",
    icon: <CreditCard className="w-6 h-6" />,
    label: "Pay Online",
    labelAr: "الدفع الإلكتروني",
    description: "Secure card payment (demo mode)",
    badge: "Instant",
    badgeColor: "bg-blue-500",
  },
  {
    id: "bank_transfer",
    icon: <Building2 className="w-6 h-6" />,
    label: "Bank Transfer",
    labelAr: "تحويل بنكي",
    description: "Transfer to Bank Muscat — confirmed manually",
  },
];

const WA_ICON = (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default function Payment() {
  const [, navigate] = useLocation();
  const [selected, setSelected] = useState<PaymentMethod>("cash");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState(0);
  const [totalPrice, setTotalPrice] = useState("3.300");

  useEffect(() => {
    const id = parseInt(sessionStorage.getItem("orderId") ?? "0");
    const price = sessionStorage.getItem("totalPrice") ?? "3.300";
    if (!id) { navigate("/"); return; }
    setOrderId(id);
    setTotalPrice(price);
  }, [navigate]);

  const confirmCash = trpc.orders.confirmCashOrder.useMutation();
  const confirmOnline = trpc.orders.confirmMockPayment.useMutation();
  const createIntent = trpc.orders.createPaymentIntent.useMutation();
  const confirmBank = trpc.orders.confirmBankTransfer.useMutation();

  async function handlePay() {
    if (!orderId) { navigate("/"); return; }
    setLoading(true);
    try {
      if (selected === "cash") {
        await confirmCash.mutateAsync({ orderId });
      } else if (selected === "online") {
        await createIntent.mutateAsync({ orderId });
        await confirmOnline.mutateAsync({ orderId });
      } else if (selected === "bank_transfer") {
        const result = await confirmBank.mutateAsync({ orderId });
        sessionStorage.setItem("bankDetails", JSON.stringify(result.bankDetails));
      }
      setSuccess(true);
      setTimeout(() => navigate(`/order/placed/${orderId}`), 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment failed. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: "oklch(0.12 0.01 240)", color: "white" }}
      >
        <div className="flex flex-col items-center gap-4 px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: "oklch(0.25 0.15 145)" }}>
            <CheckCircle2 className="w-10 h-10" style={{ color: "oklch(0.65 0.22 145)" }} />
          </div>
          <p className="text-xl font-bold">Order Confirmed!</p>
          <p className="text-sm opacity-50">Finding your nearest provider…</p>
        </div>
      </div>
    );
  }

  const selectedOption = PAYMENT_OPTIONS.find((o) => o.id === selected)!;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "oklch(0.12 0.01 240)", color: "white" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        <button
          onClick={() => navigate("/order/summary")}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "oklch(0.2 0.01 240)" }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="text-xs opacity-60">Step 3 of 3</p>
          <h1 className="text-lg font-bold">Choose Payment</h1>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs opacity-60">Total</p>
          <p className="text-xl font-black" style={{ color: "oklch(0.65 0.22 27)" }}>
            OMR {parseFloat(totalPrice).toFixed(3)}
          </p>
        </div>
      </div>

      {/* Payment Options */}
      <div className="flex-1 px-4 py-2 space-y-3">
        {PAYMENT_OPTIONS.map((option) => {
          const isSelected = selected === option.id;
          return (
            <button
              key={option.id}
              onClick={() => setSelected(option.id)}
              className="w-full text-left rounded-2xl p-4 transition-all"
              style={{
                background: isSelected ? "oklch(0.53 0.22 27)" : "oklch(0.18 0.01 240)",
                border: isSelected
                  ? "2px solid oklch(0.65 0.22 27)"
                  : "2px solid transparent",
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isSelected ? "oklch(0.4 0.22 27)" : "oklch(0.25 0.01 240)",
                  }}
                >
                  {option.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-base">{option.label}</span>
                    {option.badge && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full text-white font-semibold ${option.badgeColor}`}
                      >
                        {option.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm opacity-60 mt-0.5">{option.labelAr}</p>
                  <p className="text-xs opacity-40 mt-0.5">{option.description}</p>
                </div>
                <div
                  className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{
                    borderColor: isSelected ? "white" : "oklch(0.4 0.01 240)",
                    background: isSelected ? "white" : "transparent",
                  }}
                >
                  {isSelected && (
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ background: "oklch(0.53 0.22 27)" }}
                    />
                  )}
                </div>
              </div>
            </button>
          );
        })}

        {/* Bank Transfer Details */}
        {selected === "bank_transfer" && (
          <div
            className="rounded-2xl p-4 space-y-2"
            style={{ background: "oklch(0.18 0.01 240)" }}
          >
            <p className="text-sm font-bold opacity-80 mb-3">Bank Muscat Details</p>
            {[
              ["Account Name", "Gas Delivery Muscat LLC"],
              ["Account No.", "0123456789"],
              ["IBAN", "OM810123456789012345678"],
              ["Reference", `ORDER-${orderId}`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="opacity-50">{label}</span>
                <span className="font-mono font-semibold">{value}</span>
              </div>
            ))}
            <p className="text-xs opacity-40 mt-2 pt-2 border-t border-white/10">
              Order dispatched after manual confirmation (within 1 hour).
            </p>
          </div>
        )}

        {/* Trust signals */}
        <div className="flex gap-4 pt-2">
          <div className="flex items-center gap-1.5 text-xs opacity-40">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Secure</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs opacity-40">
            <Clock className="w-3.5 h-3.5" />
            <span>30 min delivery</span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-10 pt-4 space-y-3">
        <Button
          size="lg"
          className="w-full font-black text-lg rounded-2xl active:scale-95 transition-transform"
          style={{
            height: "64px",
            background: loading ? "oklch(0.4 0.22 27)" : "oklch(0.53 0.22 27)",
            color: "white",
            fontSize: "18px",
          }}
          onClick={handlePay}
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              {selectedOption.icon}
              {selected === "cash"
                ? `Confirm — OMR ${parseFloat(totalPrice).toFixed(3)}`
                : selected === "bank_transfer"
                ? "Confirm & Get Bank Details"
                : `Pay OMR ${parseFloat(totalPrice).toFixed(3)}`}
              <ChevronRight className="w-5 h-5" />
            </span>
          )}
        </Button>

        {/* WhatsApp fallback */}
        <a
          href="https://wa.me/96891000001?text=أريد%20طلب%20غاز"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-semibold"
          style={{ background: "oklch(0.18 0.01 240)", color: "oklch(0.7 0.18 145)" }}
        >
          {WA_ICON}
          Need help? Chat on WhatsApp
        </a>
      </div>
    </div>
  );
}
