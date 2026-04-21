/**
 * CustomerProfile — Registered customer account page.
 * Tabs: Profile | Orders | Offers | Referrals
 * Route: /customer/profile
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  User, Package, Gift, Users, ChevronLeft, ChevronRight,
  Copy, Check, Share2, LogOut, Edit3, Save, X
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getCustomerPhone, getCustomerToken, clearCustomerSession } from "./CustomerLogin";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const TIER_COLORS: Record<string, { bg: string; text: string; label: string; labelAr: string }> = {
  bronze:   { bg: "#CD7F32", text: "#fff", label: "Bronze",   labelAr: "برونزي" },
  silver:   { bg: "#9CA3AF", text: "#fff", label: "Silver",   labelAr: "فضي" },
  gold:     { bg: "#F59E0B", text: "#fff", label: "Gold",     labelAr: "ذهبي" },
  platinum: { bg: "#6366F1", text: "#fff", label: "Platinum", labelAr: "بلاتيني" },
};

const STATUS_LABELS: Record<string, { ar: string; en: string; color: string }> = {
  pending:          { ar: "معلق",       en: "Pending",       color: "bg-yellow-100 text-yellow-700" },
  assigned:         { ar: "مُسنَد",      en: "Assigned",      color: "bg-blue-100 text-blue-700" },
  accepted:         { ar: "مقبول",      en: "Accepted",      color: "bg-indigo-100 text-indigo-700" },
  out_for_delivery: { ar: "في الطريق",  en: "On the Way",    color: "bg-violet-100 text-violet-700" },
  delivered:        { ar: "مُسلَّم",     en: "Delivered",     color: "bg-emerald-100 text-emerald-700" },
  cancelled:        { ar: "ملغي",       en: "Cancelled",     color: "bg-red-100 text-red-600" },
};

export default function CustomerProfile() {
  const [, navigate] = useLocation();
  const { dir } = useLanguage();
  const isRTL = dir === "rtl";
  const ChevronBack = isRTL ? ChevronRight : ChevronLeft;

  const customerPhone = getCustomerPhone();
  const customerToken = getCustomerToken();

  const [activeTab, setActiveTab] = useState<"profile" | "orders" | "offers" | "referrals">("profile");
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", customerType: "individual" as "individual" | "restaurant" | "business" });

  useEffect(() => {
    if (!customerToken) navigate("/customer/login");
  }, [customerToken, navigate]);

  const profileQuery = trpc.customers.getProfile.useQuery(
    { sessionToken: customerToken! },
    { enabled: !!customerToken }
  );

  const loyaltyQuery = trpc.customers.getLoyalty.useQuery(
    { sessionToken: customerToken! },
    { enabled: !!customerToken }
  );

  const ordersQuery = trpc.customers.getOrderHistory.useQuery(
    { sessionToken: customerToken! },
    { enabled: !!customerToken && activeTab === "orders" }
  );

  const offersQuery = trpc.customers.getOffers.useQuery(
    { sessionToken: customerToken! },
    { enabled: !!customerToken && activeTab === "offers" }
  );

  const upsertProfile = trpc.customers.upsertProfile.useMutation({
    onSuccess: () => {
      toast.success(isRTL ? "تم حفظ الملف الشخصي ✓" : "Profile saved ✓");
      setEditing(false);
      profileQuery.refetch();
      loyaltyQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (profileQuery.data) {
      setEditForm({
        name: profileQuery.data.name ?? "",
        email: profileQuery.data.email ?? "",
        customerType: (profileQuery.data.customerType as "individual" | "restaurant" | "business") ?? "individual",
      });
    }
  }, [profileQuery.data]);

  function handleSaveProfile() {
    if (!customerToken || !customerPhone) return;
    upsertProfile.mutate({
      sessionToken: customerToken,
      phone: customerPhone,
      name: editForm.name || undefined,
      email: editForm.email || undefined,
      customerType: editForm.customerType,
    });
  }

  function handleLogout() {
    clearCustomerSession();
    navigate("/");
  }

  async function copyReferralLink() {
    const link = loyaltyQuery.data?.referralLink ?? "";
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success(isRTL ? "تم نسخ الرابط ✓" : "Link copied ✓");
    } catch {
      toast.error(isRTL ? "تعذّر النسخ" : "Copy failed");
    }
  }

  async function shareReferralLink() {
    const link = loyaltyQuery.data?.referralLink ?? "";
    const code = loyaltyQuery.data?.referralCode ?? "";
    const text = isRTL
      ? `🔥 اطلب الغاز مع أو وصل! استخدم كودي ${code} واحصل على 20 نقطة مجانية: ${link}`
      : `🔥 Order gas with OWASEEL! Use my code ${code} and get 20 bonus points: ${link}`;
    if (navigator.share) {
      await navigator.share({ text, url: link });
    } else {
      await copyReferralLink();
    }
  }

  const profile = profileQuery.data;
  const loyalty = loyaltyQuery.data;
  const tier = loyalty?.tier ?? "bronze";
  const tierStyle = TIER_COLORS[tier];

  if (!customerToken) return null;

  return (
    <div className="mobile-screen bg-gray-50" dir={dir}>
      {/* Header */}
      <div
        className="px-4 pt-12 pb-5 text-white"
        style={{ background: "linear-gradient(135deg, oklch(0.09 0 0), oklch(0.20 0 0))" }}
      >
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate("/")} className="p-2 rounded-xl bg-white/10 hover:bg-white/20">
            <ChevronBack className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button onClick={handleLogout} className="p-2 rounded-xl bg-white/10 hover:bg-white/20">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Loyalty card */}
        <div
          className="rounded-2xl p-4 flex items-center gap-4"
          style={{ background: "linear-gradient(135deg, oklch(0.53 0.22 27), oklch(0.45 0.20 27))" }}
        >
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <User className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base truncate">
              {profile?.name ?? customerPhone}
            </p>
            <p className="text-white/70 text-xs">{customerPhone}</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: tierStyle.bg, color: tierStyle.text }}
              >
                {isRTL ? tierStyle.labelAr : tierStyle.label}
              </span>
              <span className="text-white text-sm font-bold">
                ⭐ {loyalty?.points ?? 0} {isRTL ? "نقطة" : "pts"}
              </span>
            </div>
          </div>
        </div>

        {/* Points progress bar */}
        {loyalty?.pointsToNext != null && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-white/60 mb-1">
              <span>{isRTL ? "نحو المستوى التالي" : "Towards next tier"}</span>
              <span>{loyalty.pointsToNext} {isRTL ? "نقطة متبقية" : "pts to go"}</span>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{
                  width: `${Math.min(100, Math.round(
                    (loyalty.points / ((loyalty.pointsToNext ?? 0) + loyalty.points)) * 100
                  ))}%`
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white overflow-x-auto">
        {(["profile", "orders", "offers", "referrals"] as const).map((tab) => {
          const icons = { profile: User, orders: Package, offers: Gift, referrals: Users };
          const labels = {
            profile:   { ar: "الملف", en: "Profile" },
            orders:    { ar: "الطلبات", en: "Orders" },
            offers:    { ar: "العروض", en: "Offers" },
            referrals: { ar: "الإحالات", en: "Referrals" },
          };
          const Icon = icons[tab];
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-400"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {isRTL ? labels[tab].ar : labels[tab].en}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* ── Profile Tab ── */}
        {activeTab === "profile" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-gray-700">
                  {isRTL ? "معلوماتي" : "My Info"}
                </p>
                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 text-xs text-orange-500 font-bold"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    {isRTL ? "تعديل" : "Edit"}
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(false)} className="text-xs text-gray-400">
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={upsertProfile.isPending}
                      className="flex items-center gap-1 text-xs text-green-600 font-bold"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {isRTL ? "حفظ" : "Save"}
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    {isRTL ? "رقم الهاتف" : "Phone"}
                  </label>
                  <p className="text-sm font-semibold text-gray-800 bg-gray-50 rounded-xl px-3 py-2.5 font-mono">
                    {customerPhone}
                  </p>
                </div>

                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    {isRTL ? "الاسم" : "Name"}
                  </label>
                  {editing ? (
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder={isRTL ? "اسمك الكامل" : "Your full name"}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                  ) : (
                    <p className="text-sm text-gray-800 bg-gray-50 rounded-xl px-3 py-2.5">
                      {profile?.name ?? <span className="text-gray-400">{isRTL ? "غير محدد" : "Not set"}</span>}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    {isRTL ? "البريد الإلكتروني" : "Email"}
                  </label>
                  {editing ? (
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder={isRTL ? "بريدك الإلكتروني" : "your@email.com"}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                  ) : (
                    <p className="text-sm text-gray-800 bg-gray-50 rounded-xl px-3 py-2.5">
                      {profile?.email ?? <span className="text-gray-400">{isRTL ? "غير محدد" : "Not set"}</span>}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    {isRTL ? "نوع الحساب" : "Account Type"}
                  </label>
                  {editing ? (
                    <select
                      value={editForm.customerType}
                      onChange={(e) => setEditForm((p) => ({ ...p, customerType: e.target.value as "individual" | "restaurant" | "business" }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    >
                      <option value="individual">{isRTL ? "فرد" : "Individual"}</option>
                      <option value="restaurant">{isRTL ? "مطعم" : "Restaurant"}</option>
                      <option value="business">{isRTL ? "شركة / منشأة" : "Business"}</option>
                    </select>
                  ) : (
                    <p className="text-sm text-gray-800 bg-gray-50 rounded-xl px-3 py-2.5 capitalize">
                      {isRTL
                        ? profile?.customerType === "individual" ? "فرد"
                          : profile?.customerType === "restaurant" ? "مطعم" : "شركة"
                        : profile?.customerType ?? "individual"}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
                <p className="text-2xl font-extrabold text-gray-900">{loyalty?.totalOrders ?? 0}</p>
                <p className="text-xs text-gray-400 mt-0.5">{isRTL ? "إجمالي الطلبات" : "Total Orders"}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
                <p className="text-2xl font-extrabold text-orange-500">{loyalty?.points ?? 0}</p>
                <p className="text-xs text-gray-400 mt-0.5">{isRTL ? "نقاطي" : "My Points"}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Orders Tab ── */}
        {activeTab === "orders" && (
          <div className="space-y-3">
            {ordersQuery.isLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !ordersQuery.data || ordersQuery.data.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">{isRTL ? "لا توجد طلبات بعد" : "No orders yet"}</p>
                <button
                  onClick={() => navigate("/")}
                  className="mt-4 text-sm font-bold text-orange-500 border border-orange-300 rounded-xl px-4 py-2"
                >
                  {isRTL ? "اطلب الآن" : "Order Now"}
                </button>
              </div>
            ) : (
              ordersQuery.data.map((order) => {
                const statusInfo = STATUS_LABELS[order.status] ?? { ar: order.status, en: order.status, color: "bg-gray-100 text-gray-600" };
                return (
                  <div key={order.id} className="bg-white rounded-2xl shadow-sm p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-gray-800">
                        {isRTL ? "طلب" : "Order"} #{order.id}
                      </p>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusInfo.color}`}>
                        {isRTL ? statusInfo.ar : statusInfo.en}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-1">
                      {new Date(order.createdAt).toLocaleDateString(isRTL ? "ar-OM" : "en-OM", {
                        year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                      })}
                    </p>
                    {order.deliveryAddress && (
                      <p className="text-xs text-gray-500 truncate">{order.deliveryAddress}</p>
                    )}
                    {order.gasAmount && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {isRTL ? "الكمية:" : "Qty:"} {order.gasAmount} {isRTL ? (parseFloat(String(order.gasAmount)) === 1 ? "أسطوانة" : "أسطوانات") : (parseFloat(String(order.gasAmount)) === 1 ? "cylinder" : "cylinders")}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold text-orange-500">
                        OMR {parseFloat(String(order.totalPrice)).toFixed(3)}
                      </span>
                      {order.status === "delivered" && (
                        <span className="text-xs text-green-600 font-semibold">
                          +10 {isRTL ? "نقطة" : "pts"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Offers Tab ── */}
        {activeTab === "offers" && (
          <div className="space-y-3">
            {offersQuery.isLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !offersQuery.data || offersQuery.data.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                <Gift className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">{isRTL ? "لا توجد عروض متاحة" : "No offers available"}</p>
                <p className="text-xs text-gray-300 mt-1">{isRTL ? "اجمع نقاطاً لفتح عروض حصرية" : "Earn points to unlock exclusive offers"}</p>
              </div>
            ) : (
              offersQuery.data.map((offer) => (
                <div key={offer.id} className="bg-white rounded-2xl shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800">
                        {isRTL ? offer.titleAr : offer.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {offer.discountType === "percentage"
                          ? `${parseFloat(String(offer.discountValue))}% ${isRTL ? "خصم" : "off"}`
                          : offer.discountType === "fixed"
                          ? `OMR ${parseFloat(String(offer.discountValue)).toFixed(3)} ${isRTL ? "خصم" : "off"}`
                          : isRTL ? "توصيل مجاني" : "Free delivery"}
                      </p>
                      {offer.pointsCost > 0 && (
                        <p className="text-xs text-orange-500 mt-0.5">
                          {offer.pointsCost} {isRTL ? "نقطة" : "pts"}
                        </p>
                      )}
                    </div>
                    <div className="ms-3">
                      {offer.alreadyRedeemed ? (
                        <span className="text-xs text-gray-400 bg-gray-100 rounded-lg px-3 py-1.5">
                          {isRTL ? "مُستخدَم" : "Used"}
                        </span>
                      ) : offer.canRedeem ? (
                        <span className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 font-bold">
                          {isRTL ? "متاح" : "Available"}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-1.5">
                          {isRTL ? "غير متاح" : "Locked"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Referrals Tab ── */}
        {activeTab === "referrals" && (
          <div className="space-y-4">
            {/* How it works */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <p className="text-sm font-bold text-gray-800 mb-3">
                {isRTL ? "كيف يعمل نظام الإحالة؟" : "How does referral work?"}
              </p>
              <div className="space-y-2">
                {[
                  { icon: "1️⃣", ar: "شارك رابطك الخاص مع أصدقائك", en: "Share your unique link with friends" },
                  { icon: "2️⃣", ar: "يسجّل صديقك ويطلب أول طلب", en: "Friend registers and places first order" },
                  { icon: "3️⃣", ar: "تحصل أنت على 50 نقطة وصديقك على 20 نقطة", en: "You earn 50 pts, friend earns 20 pts" },
                ].map((step) => (
                  <div key={step.icon} className="flex items-start gap-3">
                    <span className="text-lg">{step.icon}</span>
                    <p className="text-sm text-gray-600">{isRTL ? step.ar : step.en}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Referral code card */}
            {loyalty?.referralCode && (
              <div
                className="rounded-2xl p-4"
                style={{ background: "linear-gradient(135deg, oklch(0.09 0 0), oklch(0.20 0 0))" }}
              >
                <p className="text-white/60 text-xs mb-2 text-center">
                  {isRTL ? "كودك الخاص" : "Your Referral Code"}
                </p>
                <p className="text-white text-3xl font-extrabold tracking-[0.3em] text-center mb-3">
                  {loyalty.referralCode}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={copyReferralLink}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    {isRTL ? "نسخ الرابط" : "Copy Link"}
                  </button>
                  <button
                    onClick={shareReferralLink}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white"
                    style={{ background: "oklch(0.53 0.22 27)" }}
                  >
                    <Share2 className="w-4 h-4" />
                    {isRTL ? "مشاركة" : "Share"}
                  </button>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl shadow-sm p-3 text-center">
                <p className="text-xl font-extrabold text-gray-900">{loyalty?.totalReferrals ?? 0}</p>
                <p className="text-xs text-gray-400 mt-0.5">{isRTL ? "مدعوون" : "Invited"}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-3 text-center">
                <p className="text-xl font-extrabold text-green-600">{loyalty?.rewardedReferrals ?? 0}</p>
                <p className="text-xs text-gray-400 mt-0.5">{isRTL ? "مكافأ" : "Rewarded"}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-3 text-center">
                <p className="text-xl font-extrabold text-orange-500">
                  {(loyalty?.rewardedReferrals ?? 0) * 50}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{isRTL ? "نقاط مكتسبة" : "Pts Earned"}</p>
              </div>
            </div>

            {/* Pending referrals note */}
            {(loyalty?.pendingReferrals ?? 0) > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
                <p className="text-sm text-amber-700 font-semibold">
                  ⏳ {loyalty!.pendingReferrals} {isRTL
                    ? "دعوة في الانتظار — ستحصل على النقاط عند أول طلب لصديقك"
                    : "pending — points awarded on friend's first order"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
