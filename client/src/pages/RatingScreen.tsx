import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Star, CheckCircle2, ChevronRight, ChevronLeft, MessageSquare } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const RATING_LABELS_AR: Record<number, string> = {
  1: "سيء جداً",
  2: "سيء",
  3: "مقبول",
  4: "جيد",
  5: "ممتاز",
};

const RATING_LABELS_EN: Record<number, string> = {
  1: "Very Bad",
  2: "Bad",
  3: "Acceptable",
  4: "Good",
  5: "Excellent",
};

const QUICK_COMMENTS_AR = [
  "توصيل سريع",
  "المزود محترف",
  "الغاز وصل سليماً",
  "سعر مناسب",
  "سأطلب مجدداً",
  "تأخر قليلاً",
];

const QUICK_COMMENTS_EN = [
  "Fast delivery",
  "Professional provider",
  "Gas arrived safely",
  "Fair price",
  "Will order again",
  "Slightly late",
];

export default function RatingScreen() {
  const { orderId, providerId } = useParams<{ orderId: string; providerId: string }>();
  const [, navigate] = useLocation();
  const { dir } = useLanguage();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const isRTL = dir === "rtl";
  const RATING_LABELS = isRTL ? RATING_LABELS_AR : RATING_LABELS_EN;
  const QUICK_COMMENTS = isRTL ? QUICK_COMMENTS_AR : QUICK_COMMENTS_EN;

  const phone = localStorage.getItem("customerPhone") ?? undefined;

  const submitReview = trpc.reviews.submitReview.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setTimeout(() => navigate("/"), 2500);
    },
    onError: (err) => {
      // Duplicate review detection — check both Arabic and English substrings
      if (err.message.includes("مسبقاً") || err.message.toLowerCase().includes("already")) {
        toast.info(isRTL ? "لقد قيّمت هذا الطلب مسبقاً." : "You have already rated this order.");
        setTimeout(() => navigate("/"), 1500);
      } else {
        toast.error(err.message);
      }
    },
  });

  function handleSubmit() {
    if (!rating) {
      toast.error(isRTL ? "يرجى اختيار تقييم من 1 إلى 5 نجوم." : "Please select a rating from 1 to 5 stars.");
      return;
    }
    submitReview.mutate({
      orderId: parseInt(orderId),
      providerId: parseInt(providerId),
      rating,
      comment: comment.trim() || undefined,
      customerPhone: phone,
    });
  }

  function toggleQuick(q: string) {
    setComment((prev) => {
      if (prev.includes(q)) return prev.replace(q, "").replace(/،\s*،/g, "،").trim().replace(/^،|،$/g, "").trim();
      return prev ? `${prev}، ${q}` : q;
    });
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center" dir={dir}>
        <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mb-6">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">
          {isRTL ? "شكراً على تقييمك!" : "Thank you for your review!"}
        </h1>
        <p className="text-gray-500 text-sm">
          {isRTL ? "رأيك يساعدنا على تحسين الخدمة." : "Your feedback helps us improve our service."}
        </p>
        <div className="flex gap-1 mt-4">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              className={`w-7 h-7 ${s <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
            />
          ))}
        </div>
      </div>
    );
  }

  const activeRating = hovered || rating;
  const ChevronBack = isRTL ? ChevronRight : ChevronLeft;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir={dir}>
      {/* Header */}
      <div
        className="px-4 pt-12 pb-6"
        style={{
          background: "linear-gradient(135deg, oklch(0.25 0.15 27) 0%, oklch(0.15 0.08 27) 100%)",
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
          >
            <ChevronBack className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white">
              {isRTL ? "قيّم الخدمة" : "Rate the Service"}
            </h1>
            <p className="text-xs text-white/60">
              {isRTL ? `طلب رقم #${orderId}` : `Order #${orderId}`}
            </p>
          </div>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="flex-1 px-4 py-6 space-y-6">
        {/* Star Rating */}
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
          <p className="text-gray-700 font-semibold mb-1">
            {isRTL ? "كيف كانت تجربتك؟" : "How was your experience?"}
          </p>
          <p className="text-sm text-gray-400 mb-5">
            {isRTL ? "اضغط على النجوم لتقييم الخدمة" : "Tap the stars to rate the service"}
          </p>

          <div className="flex justify-center gap-3 mb-3">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onMouseEnter={() => setHovered(s)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(s)}
                className="transition-transform active:scale-90"
              >
                <Star
                  className={`w-12 h-12 transition-colors ${
                    s <= activeRating
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-200 fill-gray-200"
                  }`}
                />
              </button>
            ))}
          </div>

          {activeRating > 0 && (
            <p
              className="text-sm font-bold transition-all"
              style={{ color: activeRating >= 4 ? "#16a34a" : activeRating === 3 ? "#d97706" : "#dc2626" }}
            >
              {RATING_LABELS[activeRating]}
            </p>
          )}
        </div>

        {/* Quick Comments */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-gray-400" />
            <p className="text-sm font-semibold text-gray-700">
              {isRTL ? "اختر ما ينطبق (اختياري)" : "Select what applies (optional)"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_COMMENTS.map((q) => {
              const active = comment.includes(q);
              return (
                <button
                  key={q}
                  onClick={() => toggleQuick(q)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    active
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-gray-50 text-gray-600 border-gray-200"
                  }`}
                >
                  {q}
                </button>
              );
            })}
          </div>
        </div>

        {/* Free Text Comment */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-2">
            {isRTL ? "تعليق إضافي (اختياري)" : "Additional comment (optional)"}
          </p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={isRTL ? "اكتب تعليقك هنا…" : "Write your comment here…"}
            maxLength={500}
            rows={3}
            className="w-full text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
          />
          <p className="text-xs text-gray-400 text-start mt-1">{comment.length}/500</p>
        </div>
      </div>

      {/* Submit Button */}
      <div className="px-4 pb-10 pt-2">
        <Button
          size="lg"
          className="w-full font-black text-lg rounded-2xl text-white active:scale-95 transition-transform"
          style={{
            height: "64px",
            background:
              rating === 0
                ? "oklch(0.7 0 0)"
                : "linear-gradient(135deg, oklch(0.53 0.22 27) 0%, oklch(0.45 0.22 27) 100%)",
            fontSize: "18px",
          }}
          onClick={handleSubmit}
          disabled={submitReview.isPending || rating === 0}
        >
          {submitReview.isPending
            ? (isRTL ? "جارٍ الإرسال…" : "Submitting…")
            : (isRTL ? "إرسال التقييم" : "Submit Review")}
        </Button>

        <button
          onClick={() => navigate("/")}
          className="w-full mt-3 py-3 text-sm text-gray-400 text-center"
        >
          {isRTL ? "تخطي" : "Skip"}
        </button>
      </div>
    </div>
  );
}
