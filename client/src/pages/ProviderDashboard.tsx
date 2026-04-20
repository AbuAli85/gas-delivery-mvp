import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import {
  Flame, MapPin, Phone, Package, Clock, CheckCircle2,
  XCircle, Truck, History, ToggleLeft, ToggleRight, Loader2,
  ChevronDown, ChevronUp, TrendingUp, Wallet, Star, AlertCircle, LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getStoredPinHash, clearPinHash } from "./ProviderLogin";

export default function ProviderDashboard() {
  const { providerId } = useParams<{ providerId: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(providerId ?? "0", 10);
  const [showHistory, setShowHistory] = useState(false);

  // PIN guard: redirect to login if no PIN stored
  const pinHash = getStoredPinHash(id);
  if (!pinHash) {
    // Use useEffect to avoid render-phase navigation
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => { navigate(`/provider/${id}/login`); }, []);
    return null;
  }

  const utils = trpc.useUtils();

  const { data: provider, isLoading: providerLoading } = trpc.providers.getById.useQuery(
    { providerId: id },
    { enabled: !!id, refetchInterval: 8000 }
  );

  const { data: incoming, isLoading: incomingLoading } = trpc.providers.getIncomingOrder.useQuery(
    { providerId: id },
    {
      enabled: !!id,
      refetchInterval: (query) => {
        const data = query.state.data;
        return data ? false : 5000;
      },
    }
  );

  const { data: activeOrder } = trpc.providers.getActiveOrder.useQuery(
    { providerId: id },
    { enabled: !!id, refetchInterval: 8000 }
  );

  const { data: history } = trpc.providers.getOrderHistory.useQuery(
    { providerId: id },
    { enabled: !!id && showHistory }
  );

  const toggleAvailability = trpc.providers.toggleAvailability.useMutation({
    onSuccess: (data) => {
      toast.success(data.isAvailable ? "You are now online" : "You are now offline");
      utils.providers.getById.invalidate({ providerId: id });
    },
    onError: (err) => {
      if (err.data?.code === "UNAUTHORIZED") {
        clearPinHash(id);
        navigate(`/provider/${id}/login`);
      } else {
        toast.error("Failed to update availability");
      }
    },
  });

  const acceptOrder = trpc.providers.acceptOrder.useMutation({
    onSuccess: () => {
      toast.success("Order accepted! Head to the customer.");
      utils.providers.getIncomingOrder.invalidate({ providerId: id });
      utils.providers.getActiveOrder.invalidate({ providerId: id });
    },
    onError: (err) => toast.error(err.message || "Failed to accept order"),
  });

  const rejectOrder = trpc.providers.rejectOrder.useMutation({
    onSuccess: () => {
      toast.info("Order rejected. Looking for next provider.");
      utils.providers.getIncomingOrder.invalidate({ providerId: id });
    },
    onError: (err) => toast.error(err.message || "Failed to reject order"),
  });

  const startDelivery = trpc.providers.startDelivery.useMutation({
    onSuccess: () => {
      toast.success("Delivery started!");
      utils.providers.getActiveOrder.invalidate({ providerId: id });
    },
    onError: (err) => toast.error(err.message || "Failed to start delivery"),
  });

  const deliverOrder = trpc.providers.deliverOrder.useMutation({
    onSuccess: () => {
      toast.success("Order delivered! Great work.");
      utils.providers.getActiveOrder.invalidate({ providerId: id });
      utils.providers.getById.invalidate({ providerId: id });
    },
    onError: (err) => toast.error(err.message || "Failed to mark as delivered"),
  });

  if (providerLoading) {
    return (
      <div className="mobile-screen items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-gray-500 mt-3">Loading dashboard…</p>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="mobile-screen items-center justify-center bg-gray-50 px-6 text-center">
        <p className="text-gray-700 font-semibold">Provider not found</p>
        <p className="text-sm text-gray-400 mt-2">Check the URL and try again.</p>
      </div>
    );
  }

  return (
    <div className="mobile-screen bg-gray-50">
      {/* Header */}
      <div
        className="px-5 pt-12 pb-6 text-white"
        style={{ background: "linear-gradient(135deg, oklch(0.12 0 0) 0%, oklch(0.53 0.22 27) 100%)" }}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-white/60">Provider Dashboard</p>
              <p className="font-bold text-lg leading-tight">{provider.name}</p>
            </div>
          </div>
          {/* Availability Toggle */}
          <button
            onClick={() => toggleAvailability.mutate({ providerId: id, pinHash: pinHash! })}
            disabled={toggleAvailability.isPending}
            className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-3 py-2"
          >
            {provider.isAvailable ? (
              <>
                <ToggleRight className="w-5 h-5 text-green-400" />
                <span className="text-xs font-semibold text-green-300">Online</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-5 h-5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-300">Offline</span>
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-white/50 mt-2">
          {provider.activeOrderId ? "Active order in progress" : "Waiting for orders…"}
        </p>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4 pb-8">
        {/* ── Incoming Order Card ── */}
        {incoming && (
          <div className="bg-white rounded-3xl shadow-xl border-2 border-primary/20 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <p className="text-sm font-bold text-primary uppercase tracking-wide">
                New Order — Attempt #{incoming.attemptNumber}
              </p>
            </div>

            <div className="space-y-3 mb-5">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Delivery address</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {incoming.customerAddress || `${incoming.customerLat?.toFixed(4)}, ${incoming.customerLng?.toFixed(4)}`}
                  </p>
                </div>
              </div>
              {incoming.customerPhone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                  <a href={`tel:${incoming.customerPhone}`} className="text-sm text-primary font-medium">
                    {incoming.customerPhone}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4 text-gray-400 shrink-0" />
                <p className="text-sm text-gray-700">
                  <strong>{incoming.gasAmount}</strong> cylinder{Number(incoming.gasAmount) > 1 ? "s" : ""}
                  {" · "}
                  <strong>OMR {parseFloat(incoming.totalPrice).toFixed(3)}</strong>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                <p className="text-sm text-gray-500">ETA: {incoming.estimatedMinutes} min</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                className="h-12 rounded-2xl bg-primary hover:bg-primary/90 font-bold"
                onClick={() => acceptOrder.mutate({ assignmentId: incoming.assignmentId, providerId: id, pinHash: pinHash! })}
                disabled={acceptOrder.isPending || rejectOrder.isPending}
              >
                {acceptOrder.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Accept
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="h-12 rounded-2xl border-red-200 text-red-600 hover:bg-red-50 font-bold"
                onClick={() => rejectOrder.mutate({ assignmentId: incoming.assignmentId, providerId: id, pinHash: pinHash! })}
                disabled={acceptOrder.isPending || rejectOrder.isPending}
              >
                {rejectOrder.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-1.5" />
                    Reject
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── Active Order ── */}
        {activeOrder && !incoming && (
          <div className="bg-white rounded-3xl shadow-sm p-5">
            <p className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" />
              Active Order #{activeOrder.orderId}
            </p>

            <div className="space-y-3 mb-5">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-700">
                  {activeOrder.customerAddress || `${activeOrder.customerLat?.toFixed(4)}, ${activeOrder.customerLng?.toFixed(4)}`}
                </p>
              </div>
              {activeOrder.customerPhone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                  <a href={`tel:${activeOrder.customerPhone}`} className="text-sm text-primary font-medium">
                    {activeOrder.customerPhone}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4 text-gray-400 shrink-0" />
                <p className="text-sm text-gray-700">
                  <strong>{activeOrder.gasAmount}</strong> cylinder{Number(activeOrder.gasAmount) > 1 ? "s" : ""}
                  {" · "}
                  <strong>OMR {parseFloat(activeOrder.totalPrice).toFixed(3)}</strong>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${
                    activeOrder.status === "accepted"
                      ? "bg-emerald-100 text-emerald-700"
                      : activeOrder.status === "out_for_delivery"
                      ? "bg-violet-100 text-violet-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {activeOrder.status.replace(/_/g, " ")}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {activeOrder.status === "accepted" && (
                <Button
                  className="col-span-2 h-12 rounded-2xl bg-violet-600 hover:bg-violet-700 font-bold"
                  onClick={() => startDelivery.mutate({ orderId: activeOrder.orderId, providerId: id, pinHash: pinHash! })}
                  disabled={startDelivery.isPending}
                >
                  {startDelivery.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Truck className="w-4 h-4 mr-2" />
                      Start Delivery
                    </>
                  )}
                </Button>
              )}
              {activeOrder.status === "out_for_delivery" && (
                <Button
                  className="col-span-2 h-12 rounded-2xl bg-green-600 hover:bg-green-700 font-bold"
                  onClick={() => deliverOrder.mutate({ orderId: activeOrder.orderId, providerId: id, pinHash: pinHash! })}
                  disabled={deliverOrder.isPending}
                >
                  {deliverOrder.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Mark as Delivered
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ── Idle State ── */}
        {!incoming && !activeOrder && (
          <div className="bg-white rounded-3xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Flame className="w-8 h-8 text-gray-300" />
            </div>
            <p className="font-semibold text-gray-700 mb-1">
              {provider.isAvailable ? "Waiting for orders…" : "You are offline"}
            </p>
            <p className="text-sm text-gray-400">
              {provider.isAvailable
                ? "New orders will appear here automatically."
                : "Toggle online to start receiving orders."}
            </p>
          </div>
        )}

        {/* ── Stats: Commission + Score ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Commission</p>
            </div>
            <p className="text-xl font-black text-gray-900">
              OMR {parseFloat(String(provider.totalCommission ?? "0")).toFixed(3)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{provider.totalOrders ?? 0} deliveries</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-amber-500" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Score</p>
            </div>
            {(() => {
              const accepted = provider.acceptedOrders ?? 0;
              const rejected = provider.rejectedOrders ?? 0;
              const total = accepted + rejected;
              const rate = total > 0 ? Math.round((accepted / total) * 100) : 100;
              return (
                <>
                  <p className="text-xl font-black text-gray-900">{rate}%</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {accepted} accepted · {rejected} rejected
                  </p>
                </>
              );
            })()}
          </div>
        </div>

        {/* ── Score Warning ── */}
        {(() => {
          const accepted = provider.acceptedOrders ?? 0;
          const rejected = provider.rejectedOrders ?? 0;
          const total = accepted + rejected;
          const rate = total > 0 ? Math.round((accepted / total) * 100) : 100;
          if (total >= 5 && rate < 60) {
            return (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Low acceptance rate</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Your acceptance rate is {rate}%. Accepting more orders improves your ranking and commission opportunities.
                  </p>
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* ── Performance Trend ── */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-gray-700">Performance</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-black text-gray-900">{provider.totalOrders ?? 0}</p>
              <p className="text-xs text-gray-400">Delivered</p>
            </div>
            <div>
              <p className="text-lg font-black text-green-600">{provider.acceptedOrders ?? 0}</p>
              <p className="text-xs text-gray-400">Accepted</p>
            </div>
            <div>
              <p className="text-lg font-black text-red-500">{provider.rejectedOrders ?? 0}</p>
              <p className="text-xs text-gray-400">Rejected</p>
            </div>
          </div>
        </div>

        {/* ── Order History ── */}
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="w-full flex items-center justify-between bg-white rounded-2xl shadow-sm px-5 py-4"
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-700">Order History</span>
          </div>
          {showHistory ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {showHistory && history && (
          <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
            {history.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No orders yet</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {history.map((item) => (
                  <div key={item?.orderId} className="px-5 py-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">
                        Order #{item?.orderId}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {item?.customerAddress || "No address"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-800">
                        OMR {parseFloat(item?.totalPrice ?? "0").toFixed(3)}
                      </p>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                          item?.status === "delivered"
                            ? "bg-green-100 text-green-700"
                            : item?.status === "cancelled"
                            ? "bg-red-100 text-red-600"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {item?.assignmentStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
