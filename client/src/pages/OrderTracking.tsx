import { useParams, useLocation } from "wouter";
import { ArrowLeft, MapPin, Clock, Phone, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ORDER_STATUS_LABELS, ORDER_STATUS_STEPS, type OrderStatus } from "../../../shared/domain";

export default function OrderTracking() {
  const { orderId } = useParams<{ orderId: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(orderId ?? "0", 10);

  const { data: order, isLoading } = trpc.orders.getOrderStatus.useQuery(
    { orderId: id },
    {
      enabled: !!id,
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        // Stop polling once delivered or cancelled
        if (status === "delivered" || status === "cancelled") return false;
        return 5000;
      },
    }
  );

  if (isLoading || !order) {
    return (
      <div className="mobile-screen items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-gray-500 mt-3">Loading order status…</p>
      </div>
    );
  }

  const currentStatus = order.status as OrderStatus;
  const currentStepIndex = ORDER_STATUS_STEPS.indexOf(currentStatus);
  const isCancelled = currentStatus === "cancelled";
  const isDelivered = currentStatus === "delivered";

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
        <div>
          <h1 className="text-lg font-bold text-gray-900">Order #{id}</h1>
          <p className="text-xs text-gray-400">
            {isCancelled ? "Cancelled" : isDelivered ? "Delivered" : "Live tracking"}
          </p>
        </div>
        {!isDelivered && !isCancelled && (
          <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </div>
        )}
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
                Provider: <span className="font-semibold text-gray-700">{order.providerName}</span>
              </p>
            )}
          </div>

          {/* Progress Steps */}
          {!isCancelled && (
            <div className="space-y-0">
              {ORDER_STATUS_STEPS.map((step, idx) => {
                const isCompleted = currentStepIndex > idx;
                const isCurrent = currentStepIndex === idx;
                const isPending = currentStepIndex < idx;

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

          {isCancelled && (
            <div className="bg-red-50 rounded-2xl p-4 text-sm text-red-700">
              This order was cancelled. No providers were available in your area.
            </div>
          )}
        </div>

        {/* Delivery Details */}
        <div className="bg-white rounded-3xl shadow-sm p-5 space-y-3">
          {order.customerAddress && (
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Delivery address</p>
                <p className="text-sm font-medium text-gray-800">{order.customerAddress}</p>
              </div>
            </div>
          )}
          {order.estimatedMinutes && !isDelivered && !isCancelled && (
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-gray-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Estimated delivery</p>
                <p className="text-sm font-medium text-gray-800">{order.estimatedMinutes} minutes</p>
              </div>
            </div>
          )}
          {order.providerPhone && (
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-gray-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Provider contact</p>
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
              Total: <strong>OMR {parseFloat(order.totalPrice).toFixed(3)}</strong>
            </p>
            <span
              className={`ml-auto text-xs font-semibold px-2 py-1 rounded-full ${
                order.paymentStatus === "paid"
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {order.paymentStatus === "paid" ? "Paid" : "Pending"}
            </span>
          </div>
        </div>

        {isDelivered && (
          <Button
            size="lg"
            className="w-full rounded-2xl font-extrabold text-base shadow-lg shadow-primary/30 active:scale-95 transition-transform"
            style={{ height: "60px", background: "oklch(0.53 0.22 27)" }}
            onClick={() => navigate("/")}
          >
            Order Again
          </Button>
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
          Need help? WhatsApp support
        </a>
      </div>
    </div>
  );
}
