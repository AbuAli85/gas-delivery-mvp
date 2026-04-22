import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { ChevronRight, ChevronLeft, MapPin, Clock, Phone, CheckCircle2, Circle, Loader2, XCircle, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
// MapView removed - using static map to avoid Google Maps API key popup
import { FAILURE_REASON_LABELS, ORDER_STATUS_LABELS, ORDER_STATUS_STEPS, type OrderStatus, type FailureReason } from "../../../shared/domain";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function OrderTracking() {
  const { orderId } = useParams<{ orderId: string }>();
  const [, navigate] = useLocation();
  const { t, dir } = useLanguage();
  const id = parseInt(orderId ?? "0", 10);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const utils = trpc.useUtils();
  const cancelOrder = trpc.orders.cancelOrder.useMutation({
    onSuccess: () => {
      toast.success(t("tracking.status.cancelled"));
      utils.orders.getOrderStatus.invalidate({ orderId: id });
      setConfirmCancel(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const [showMap, setShowMap] = useState(false);

  const { data: order, isLoading } = trpc.orders.getOrderStatus.useQuery(
    { orderId: id },
    {
      enabled: !!id,
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        if (status === "delivered" || status === "cancelled" || status === "failed_delivery") return false;
        return 5000;
      },
    }
  );

  // Live provider location — poll every 8s when order is out for delivery
  const { data: providerLoc } = trpc.providers.getLocationForOrder.useQuery(
    { orderId: id },
    {
      enabled: !!id && (order?.status === "out_for_delivery" || order?.status === "accepted"),
      refetchInterval: 8000,
    }
  );

  // Static map auto-refreshes via React re-render when providerLoc changes

  const ChevronBack = dir === "rtl" ? ChevronRight : ChevronLeft;

  if (isLoading || !order) {
    return (
      <div className="mobile-screen items-center justify-center bg-gray-50" dir={dir}>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-gray-500 mt-3">{dir === "rtl" ? "جارٍ تحميل حالة الطلب…" : "Loading order status…"}</p>
      </div>
    );
  }

  const currentStatus = order.status as OrderStatus;
  const stepStatus = currentStatus === "failed_delivery" ? "out_for_delivery" : currentStatus;
  const currentStepIndex = ORDER_STATUS_STEPS.indexOf(stepStatus);
  const isCancelled = currentStatus === "cancelled";
  const isDelivered = currentStatus === "delivered";
  const isFailed = currentStatus === "failed_delivery";
  const isArrived = currentStatus === "arrived";
  const failureReasonLabel = order.failureReason
    ? FAILURE_REASON_LABELS[order.failureReason as FailureReason] ?? order.failureReason
    : null;

  function paymentLabel(status: string): string {
    if (status === "confirmed") return dir === "rtl" ? "مدفوع إلكترونياً" : "Paid Online";
    if (status === "pending")   return dir === "rtl" ? "الدفع عند الاستلام" : "Cash on Delivery";
    return status;
  }

  return (
    <div className="mobile-screen bg-gray-50" dir={dir}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        <button
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center"
        >
          <ChevronBack className="w-5 h-5 text-gray-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">{t("placed.order.id")} #{id}</h1>
          <p className="text-xs text-gray-400">
            {isCancelled
              ? t("tracking.status.cancelled")
              : isFailed
              ? (dir === "rtl" ? "تعذر التوصيل" : "Delivery Failed")
              : isDelivered
              ? t("tracking.status.delivered")
              : dir === "rtl"
              ? "تتبع مباشر"
              : "Live Tracking"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isDelivered && !isCancelled && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {dir === "rtl" ? "مباشر" : "Live"}
            </div>
          )}
          <LanguageSwitcher />
        </div>
      </div>

      <div className="flex-1 px-4 pb-8 space-y-4">
        {/* Status Card */}
        <div className="bg-white rounded-3xl shadow-sm p-6">
          <div className="mb-5">
            <p className="text-2xl font-extrabold text-gray-900">
              {ORDER_STATUS_LABELS[currentStatus]}
            </p>
            {order.providerName && (
              <p className="text-sm text-gray-500 mt-1">
                {t("tracking.provider")}: <span className="font-semibold text-gray-700">{order.providerName}</span>
              </p>
            )}
          </div>

          {/* Progress Steps */}
          {!isCancelled && !isFailed && (
            <div className="space-y-0">
              {ORDER_STATUS_STEPS.map((step, idx) => {
                const isCompleted = currentStepIndex > idx;
                const isCurrent = currentStepIndex === idx;

                return (
                  <div key={step} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                          isCompleted
                            ? "bg-primary text-white"
                            : isCurrent
                            ? "bg-primary/10 border-2 border-primary"
                            : "bg-gray-100"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : isCurrent ? (
                          <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-gray-300" />
                        )}
                      </div>
                      {idx < ORDER_STATUS_STEPS.length - 1 && (
                        <div
                          className={`w-0.5 h-6 mt-0.5 ${
                            isCompleted ? "bg-primary" : "bg-gray-100"
                          }`}
                        />
                      )}
                    </div>
                    <div className="pb-4 pt-0.5">
                      <p
                        className={`text-sm font-semibold ${
                          isCurrent
                            ? "text-primary"
                            : isCompleted
                            ? "text-gray-700"
                            : "text-gray-300"
                        }`}
                      >
                        {ORDER_STATUS_LABELS[step]}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {isArrived && (
            <div className="bg-amber-50 rounded-2xl p-4 text-sm text-amber-800">
              {dir === "rtl"
                ? "المندوب وصل إلى موقع التسليم. يرجى الاستعداد للاستلام."
                : "Your provider has arrived at the delivery location. Please be ready to receive your order."}
            </div>
          )}

          {isCancelled && (
            <div className="bg-red-50 rounded-2xl p-4 text-sm text-red-700">
              {dir === "rtl" ? "تم إلغاء هذا الطلب. لا يوجد مزودون متاحون في منطقتك حالياً." : "This order has been cancelled. No providers are currently available in your area."}
            </div>
          )}

          {isFailed && (
            <div className="bg-red-50 rounded-2xl p-4 text-sm text-red-700 space-y-1">
              <p className="font-semibold">
                {dir === "rtl" ? "تعذر إكمال عملية التوصيل." : "We could not complete this delivery."}
              </p>
              {failureReasonLabel && (
                <p>
                  {dir === "rtl" ? "السبب:" : "Reason:"} <span className="font-medium">{failureReasonLabel}</span>
                </p>
              )}
              {order.failureNotes && (
                <p className="text-xs text-red-600">{order.failureNotes}</p>
              )}
            </div>
          )}
        </div>

        {/* Live Map — shown when provider is on the way */}
        {(order.status === "out_for_delivery" || order.status === "accepted" || order.status === "arrived") && (
          <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
            <button
              onClick={() => setShowMap((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4"
            >
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-gray-700">
                  {providerLoc ? (dir === "rtl" ? "تتبع المزود مباشرة" : "Track Provider Live") : (dir === "rtl" ? "خريطة التوصيل" : "Delivery Map")}
                </span>
                {providerLoc && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </div>
              <span className="text-xs text-gray-400">{showMap ? (dir === "rtl" ? "إخفاء" : "Hide") : (dir === "rtl" ? "عرض" : "Show")}</span>
            </button>
            {showMap && (
              <div className="h-56 relative overflow-hidden rounded-2xl">
                {(() => {
                  // Use delivery location (where gas is delivered), fall back to customer location
                  const cLat = order.deliveryLat ? Number(order.deliveryLat) : (order.customerLat ? Number(order.customerLat) : 23.5859);
                  const cLng = order.deliveryLng ? Number(order.deliveryLng) : (order.customerLng ? Number(order.customerLng) : 58.4059);
                  const pLat = providerLoc?.lat ?? cLat;
                  const pLng = providerLoc?.lng ?? cLng;
                  const centerLat = providerLoc ? (cLat + pLat) / 2 : cLat;
                  const centerLng = providerLoc ? (cLng + pLng) / 2 : cLng;
                  const markers = [
                    `color:blue%7Clabel:D%7C${cLat},${cLng}`,
                    ...(providerLoc ? [`color:orange%7Clabel:P%7C${pLat},${pLng}`] : []),
                  ].join("&markers=");
                  return (
                    <img
                      src={`/api/maps/maps/api/staticmap?center=${centerLat},${centerLng}&zoom=14&size=600x280&scale=2&maptype=roadmap&markers=${markers}`}
                      alt="خريطة التوصيل"
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  );
                })()}
                {providerLoc && (
                  <div className="absolute top-2 left-2 bg-white/90 rounded-full px-2 py-0.5 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    <span className="text-xs font-medium text-gray-700">{dir === "rtl" ? "مباشر" : "Live"}</span>
                  </div>
                )}
              </div>
            )}
            {!providerLoc && showMap && (
              <p className="text-xs text-gray-400 text-center pb-4">
                {dir === "rtl" ? "سيظهر موقع المزود عند بدء التوصيل" : "Provider location will appear when delivery starts"}
              </p>
            )}
          </div>
        )}

        {/* Delivery Details */}
        <div className="bg-white rounded-3xl shadow-sm p-5 space-y-3">
          {(order.deliveryAddress || order.customerAddress) && (
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">{t("summary.location")}</p>
                <p className="text-sm font-medium text-gray-800">{order.deliveryAddress || order.customerAddress}</p>
              </div>
            </div>
          )}
          {order.estimatedMinutes && !isDelivered && !isCancelled && !isFailed && (
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-gray-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">{t("tracking.eta")}</p>
                <p className="text-sm font-medium text-gray-800">{order.estimatedMinutes} {t("summary.minutes")}</p>
              </div>
            </div>
          )}
          {order.providerPhone && (
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-gray-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">{t("tracking.contact")}</p>
                <a
                  href={`tel:${order.providerPhone}`}
                  className="text-sm font-medium text-primary"
                >
                  {order.providerPhone}
                </a>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
            <p className="text-sm text-gray-600">
              {t("summary.total")}: <strong>OMR {parseFloat(order.totalPrice).toFixed(3)}</strong>
            </p>
            <span
              className={`mr-auto text-xs font-semibold px-2 py-1 rounded-full ${
                order.paymentStatus === "confirmed"
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {paymentLabel(order.paymentStatus)}
            </span>
          </div>
        </div>

        {isDelivered && (
          <div className="space-y-3">
            {/* Review CTA */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
              <p className="text-sm font-bold text-yellow-800 mb-1">{dir === "rtl" ? "🌟 كيف كانت تجربتك؟" : "🌟 How was your experience?"}</p>
              <p className="text-xs text-yellow-600 mb-3">{dir === "rtl" ? "قيّم الخدمة وساعدنا على التحسين" : "Rate the service and help us improve"}</p>
              <Button
                size="sm"
                className="w-full rounded-xl font-bold text-white active:scale-95 transition-transform"
                style={{ background: "oklch(0.53 0.22 27)" }}
                onClick={() => navigate(`/order/${id}/review/${order.assignedProviderId ?? 0}`)}
              >
                {t("tracking.rate")} ★
              </Button>
            </div>
            <Button
              size="lg"
              variant="outline"
              className="w-full rounded-2xl font-extrabold text-base border-gray-200 active:scale-95 transition-transform"
              style={{ height: "56px" }}
              onClick={() => navigate("/")}
            >
              {dir === "rtl" ? "اطلب مجدداً" : "Order Again"}
            </Button>
          </div>
        )}

        {isFailed && (
          <Button
            size="lg"
            variant="outline"
            className="w-full rounded-2xl font-extrabold text-base border-gray-200 active:scale-95 transition-transform"
            style={{ height: "56px" }}
            onClick={() => navigate("/")}
          >
            {dir === "rtl" ? "طلب جديد" : "Place New Order"}
          </Button>
        )}

        {/* Cancel Order */}
        {["draft", "pending", "assigned"].includes(currentStatus) && (
          <div className="pt-1">
            {!confirmCancel ? (
              <button
                onClick={() => setConfirmCancel(true)}
                className="w-full flex items-center justify-center gap-2 text-sm text-red-400 hover:text-red-600 py-2 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                {dir === "rtl" ? "إلغاء الطلب" : "Cancel Order"}
              </button>
            ) : (
              <div className="bg-red-50 rounded-2xl p-4 text-center space-y-3">
                <p className="text-sm font-semibold text-red-700">{dir === "rtl" ? "هل تريد إلغاء هذا الطلب؟" : "Cancel this order?"}</p>
                <p className="text-xs text-red-500">{dir === "rtl" ? "لا يمكن التراجع عن هذا الإجراء." : "This action cannot be undone."}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmCancel(false)}
                    className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600"
                  >
                    {dir === "rtl" ? "الإبقاء على الطلب" : "Keep Order"}
                  </button>
                  <button
                    onClick={() => cancelOrder.mutate({ orderId: id })}
                    disabled={cancelOrder.isPending}
                    className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-bold disabled:opacity-50"
                  >
                    {cancelOrder.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      dir === "rtl" ? "نعم، إلغاء" : "Yes, Cancel"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* WhatsApp support */}
        <a
          href={`https://wa.me/96891000001?text=${encodeURIComponent(`مساعدة في الطلب #${id}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-2xl border border-gray-200 py-3 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-green-500">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          {dir === "rtl" ? "تحتاج مساعدة؟ دعم عبر واتساب" : "Need help? WhatsApp support"}
        </a>
      </div>
    </div>
  );
}
