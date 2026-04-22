import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Banknote,
  CreditCard,
  Building2,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Clock,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

type PaymentMethod = "cash" | "online" | "bank_transfer";

const WA_ICON = (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default function Payment() {
  const [, navigate] = useLocation();
  const { t, dir } = useLanguage();
  const [selected, setSelected] = useState<PaymentMethod>("cash");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState(0);
  const [totalPrice, setTotalPrice] = useState("3.300");

  const ChevronBack = dir === "rtl" ? ChevronRight : ChevronLeft;
  const ChevronFwd  = dir === "rtl" ? ChevronLeft  : ChevronRight;

  useEffect(() => {
    const id = parseInt(sessionStorage.getItem("orderId") ?? "0");
    const price = sessionStorage.getItem("totalPrice") ?? "3.300";
    if (!id) { navigate("/"); return; }
    setOrderId(id);
    setTotalPrice(price);
  }, [navigate]);

  const confirmCash   = trpc.orders.confirmCashOrder.useMutation();
  const confirmOnline = trpc.orders.confirmMockPayment.useMutation();
  const createIntent  = trpc.orders.createPaymentIntent.useMutation();
  const confirmBank   = trpc.orders.confirmBankTransfer.useMutation();

  const PAYMENT_OPTIONS = [
    {
      id: "cash" as PaymentMethod,
      icon: <Banknote className="w-6 h-6" />,
      label: t("payment.cash"),
      description: dir === "rtl" ? "ادفع للسائق عند وصول الغاز" : "Pay the driver when gas arrives",
      badge: dir === "rtl" ? "الأكثر شيوعاً" : "Most Popular",
      badgeColor: "bg-green-500",
    },
    {
      id: "online" as PaymentMethod,
      icon: <CreditCard className="w-6 h-6" />,
      label: t("payment.card"),
      description: dir === "rtl" ? "دفع آمن بالبطاقة (وضع تجريبي)" : "Secure card payment (demo mode)",
      badge: dir === "rtl" ? "فوري" : "Instant",
      badgeColor: "bg-orange-500",
    },
    {
      id: "bank_transfer" as PaymentMethod,
      icon: <Building2 className="w-6 h-6" />,
      label: t("payment.transfer"),
      description: dir === "rtl" ? "تحويل إلى بنك مسقط — تأكيد يدوي" : "Transfer to Bank Muscat — manual confirmation",
    },
  ];

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
      const msg = err instanceof Error ? err.message : (dir === "rtl" ? "فشل الدفع. يرجى المحاولة مجدداً." : "Payment failed. Please try again.");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center" dir={dir}>
        <div className="flex flex-col items-center gap-4 px-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <p className="text-xl font-bold text-gray-900">{t("placed.title")}</p>
          <p className="text-sm text-gray-500">{t("placed.subtitle")}</p>
        </div>
      </div>
    );
  }

  const selectedOption = PAYMENT_OPTIONS.find((o) => o.id === selected)!;

  const bankRows = dir === "rtl"
    ? [["اسم الحساب", "Gas Delivery Muscat LLC"], ["رقم الحساب", "0123456789"], ["رقم IBAN", "OM810123456789012345678"], ["المرجع", `ORDER-${orderId}`]]
    : [["Account Name", "Gas Delivery Muscat LLC"], ["Account No.", "0123456789"], ["IBAN", "OM810123456789012345678"], ["Reference", `ORDER-${orderId}`]];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir={dir}>
      {/* Header */}
      <div
        className="px-4 pt-12 pb-6"
        style={{ background: "linear-gradient(135deg, oklch(0.25 0.15 27) 0%, oklch(0.15 0.08 27) 100%)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/order/summary")}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
          >
            <ChevronBack className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/60">{dir === "rtl" ? "الخطوة ٣ من ٣" : "Step 3 of 3"}</p>
            <h1 className="text-lg font-bold text-white">{t("payment.title")}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className={dir === "rtl" ? "text-left" : "text-right"}>
              <p className="text-xs text-white/60">{t("payment.total")}</p>
              <p className="text-xl font-black text-orange-300">
                OMR {parseFloat(totalPrice).toFixed(3)}
              </p>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      {/* Payment Options */}
      <div className="flex-1 px-4 py-4 space-y-3">
        {PAYMENT_OPTIONS.map((option) => {
          const isSelected = selected === option.id;
          return (
            <button
              key={option.id}
              onClick={() => setSelected(option.id)}
              className={`w-full rounded-2xl p-4 transition-all border-2 ${
                isSelected ? "bg-white border-red-500 shadow-md" : "bg-white border-gray-200 shadow-sm"
              }`}
              style={{ textAlign: dir === "rtl" ? "right" : "left" }}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-600"}`}>
                  {option.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-base text-gray-900">{option.label}</span>
                    {option.badge && (
                      <span className={`text-xs px-2 py-0.5 rounded-full text-white font-semibold ${option.badgeColor}`}>
                        {option.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{option.description}</p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? "border-red-500 bg-red-500" : "border-gray-300"}`}>
                  {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                </div>
              </div>
            </button>
          );
        })}

        {/* Bank Transfer Details */}
        {selected === "bank_transfer" && (
          <div className="rounded-2xl p-4 space-y-2" style={{ background: "oklch(0.97 0.005 65)", border: "1px solid oklch(0.72 0.19 50 / 0.25)" }}>
            <p className="text-sm font-bold mb-3" style={{ color: "oklch(0.35 0.15 50)" }}>{dir === "rtl" ? "بيانات بنك مسقط" : "Bank Muscat Details"}</p>
            {bankRows.map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="font-mono font-semibold" style={{ color: "oklch(0.20 0.010 265)" }}>{value}</span>
                <span style={{ color: "oklch(0.45 0.010 265)" }}>{label}</span>
              </div>
            ))}
            <p className="text-xs mt-2 pt-2" style={{ color: "oklch(0.55 0.010 265)", borderTop: "1px solid oklch(0.88 0.004 286.32)" }}>
              {dir === "rtl" ? "يُرسَل الطلب بعد التأكيد اليدوي (خلال ساعة واحدة)." : "Order is sent after manual confirmation (within 1 hour)."}
            </p>
          </div>
        )}

        {/* Trust signals */}
        <div className="flex gap-4 pt-2 justify-end">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span>{t("payment.secure")}</span>
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span>{t("home.features.speed")} {t("home.features.speed.sub")}</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-10 pt-4 space-y-3 bg-gray-50">
        <Button
          size="lg"
          className="w-full font-black text-lg rounded-2xl active:scale-95 transition-transform text-white"
          style={{
            height: "64px",
            background: loading ? "oklch(0.4 0.22 27)" : "linear-gradient(135deg, oklch(0.53 0.22 27) 0%, oklch(0.45 0.22 27) 100%)",
          }}
          onClick={handlePay}
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              {dir === "rtl" ? "جارٍ المعالجة…" : "Processing…"}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              {selectedOption.icon}
              {selected === "cash"
                ? `${t("payment.confirm")} — OMR ${parseFloat(totalPrice).toFixed(3)}`
                : selected === "bank_transfer"
                ? (dir === "rtl" ? "تأكيد والحصول على بيانات التحويل" : "Confirm & Get Transfer Details")
                : `${dir === "rtl" ? "ادفع" : "Pay"} OMR ${parseFloat(totalPrice).toFixed(3)}`}
              <ChevronFwd className="w-5 h-5" />
            </span>
          )}
        </Button>

        <a
          href="https://wa.me/96891000001?text=أريد%20طلب%20غاز"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-semibold bg-green-50 text-green-700 border border-green-200"
        >
          {WA_ICON}
          {t("home.whatsapp")}
        </a>
      </div>
    </div>
  );
}
