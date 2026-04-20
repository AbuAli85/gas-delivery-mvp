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
            className="w-full h-14 text-base font-bold rounded-2xl bg-primary hover:bg-primary/90"
            onClick={() => navigate("/")}
          >
            Order Again
          </Button>
        )}
      </div>
    </div>
  );
}
