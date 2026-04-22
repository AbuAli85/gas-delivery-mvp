import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
export default function NotFound() {
  const [, setLocation] = useLocation();
  const { dir } = useLanguage();
  const isRTL = dir === "rtl";
  const handleGoHome = () => {
    setLocation("/");
  };
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center"
      dir={dir}
      style={{ background: "oklch(0.09 0 0)" }}
    >
      <Card className="w-full max-w-lg mx-4 shadow-2xl border-0" style={{ background: "oklch(0.16 0.010 265)" }}>
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full animate-pulse"
                style={{ background: "oklch(0.53 0.22 27 / 0.2)" }}
              />
              <AlertCircle className="relative h-16 w-16" style={{ color: "oklch(0.72 0.19 50)" }} />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-2" style={{ color: "oklch(0.96 0.005 65)" }}>404</h1>
          <h2 className="text-xl font-semibold mb-4" style={{ color: "oklch(0.75 0.005 65)" }}>
            {isRTL ? "الصفحة غير موجودة" : "Page Not Found"}
          </h2>
          <p className="mb-8 leading-relaxed" style={{ color: "oklch(0.60 0.010 265)" }}>
            {isRTL
              ? "عذراً، الصفحة التي تبحث عنها غير موجودة. ربما تم نقلها أو حذفها."
              : "Sorry, the page you are looking for doesn't exist. It may have been moved or deleted."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={handleGoHome}
              className="text-white px-6 py-2.5 rounded-xl transition-all duration-200 shadow-md font-bold"
              style={{ background: "oklch(0.53 0.22 27)" }}
            >
              <Home className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
              {isRTL ? "العودة للرئيسية" : "Go Home"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
