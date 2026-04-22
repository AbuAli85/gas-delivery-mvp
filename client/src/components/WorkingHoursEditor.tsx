import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Clock, Save, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

const DAY_NAMES_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const DAY_NAMES_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface DaySchedule {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isActive: boolean;
}

const DEFAULT_SCHEDULE: DaySchedule[] = DAY_NAMES_AR.map((_, i) => ({
  dayOfWeek: i,
  openTime: "08:00",
  closeTime: "22:00",
  isActive: i !== 5, // Friday off by default
}));

interface Props {
  providerId: number;
  pinHash: string;
}

export function WorkingHoursEditor({ providerId, pinHash }: Props) {
  const { lang, dir } = useLanguage();
  const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE);
  const [isDirty, setIsDirty] = useState(false);

  const DAY_NAMES = lang === "en" ? DAY_NAMES_EN : DAY_NAMES_AR;

  const { data: existing, isLoading } = trpc.providers.getWorkingHours.useQuery({ providerId });

  useEffect(() => {
    if (existing && existing.length > 0) {
      const merged = DEFAULT_SCHEDULE.map(def => {
        const found = existing.find(e => e.dayOfWeek === def.dayOfWeek);
        if (found) {
          return {
            dayOfWeek: found.dayOfWeek,
            openTime: found.openTime,
            closeTime: found.closeTime,
            isActive: Boolean(found.isActive),
          };
        }
        return def;
      });
      setSchedule(merged);
    }
  }, [existing]);

  const setWorkingHours = trpc.providers.setWorkingHours.useMutation({
    onSuccess: () => {
      toast.success(lang === "en" ? "Working hours saved successfully" : "تم حفظ ساعات العمل بنجاح");
      setIsDirty(false);
    },
    onError: (e) => toast.error(e.message),
  });

  function updateDay(dayOfWeek: number, field: keyof DaySchedule, value: string | boolean) {
    setSchedule(prev => prev.map(d =>
      d.dayOfWeek === dayOfWeek ? { ...d, [field]: value } : d
    ));
    setIsDirty(true);
  }

  function handleSave() {
    setWorkingHours.mutate({ providerId, pinHash, schedule });
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="h-12 rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }} />
        ))}
      </div>
    );
  }

  const fromLabel = lang === "en" ? "From" : "من";
  const toLabel = lang === "en" ? "To" : "إلى";
  const closedLabel = lang === "en" ? "Closed" : "مغلق";
  const saveLabel = lang === "en" ? "Save Changes" : "حفظ التغييرات";
  const savingLabel = lang === "en" ? "Saving..." : "جاري الحفظ...";
  const hintLabel = lang === "en" ? 'Edit any day then click "Save Changes"' : 'عدّل أي يوم ثم اضغط "حفظ التغييرات"';

  return (
    <div className="space-y-2" dir={dir}>
      {/* Save button */}
      {isDirty && (
        <div className="flex justify-end mb-3">
          <button
            onClick={handleSave}
            disabled={setWorkingHours.isPending}
            className="flex items-center gap-1.5 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-50"
            style={{ background: "oklch(0.62 0.22 27)" }}
          >
            <Save className="w-4 h-4" />
            {setWorkingHours.isPending ? savingLabel : saveLabel}
          </button>
        </div>
      )}

      {schedule.map((day) => (
        <div
          key={day.dayOfWeek}
          className="flex items-center gap-3 p-3 rounded-xl transition-all"
          style={{
            background: day.isActive ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
            border: day.isActive ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(255,255,255,0.05)",
            opacity: day.isActive ? 1 : 0.6,
          }}
        >
          {/* Toggle */}
          <button
            onClick={() => updateDay(day.dayOfWeek, "isActive", !day.isActive)}
            className="flex-shrink-0"
          >
            {day.isActive
              ? <ToggleRight className="w-7 h-7 text-emerald-400" />
              : <ToggleLeft className="w-7 h-7 text-white/25" />
            }
          </button>

          {/* Day name */}
          <span
            className="text-sm font-semibold"
            style={{ width: lang === "en" ? "88px" : "72px", color: day.isActive ? "white" : "rgba(255,255,255,0.35)" }}
          >
            {DAY_NAMES[day.dayOfWeek]}
          </span>

          {day.isActive ? (
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-white/40">{fromLabel}</span>
                <input
                  type="time"
                  value={day.openTime}
                  onChange={e => updateDay(day.dayOfWeek, "openTime", e.target.value)}
                  className="text-sm rounded-lg px-2 py-1 focus:outline-none focus:ring-2 text-white"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    colorScheme: "dark",
                  }}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-white/40">{toLabel}</span>
                <input
                  type="time"
                  value={day.closeTime}
                  onChange={e => updateDay(day.dayOfWeek, "closeTime", e.target.value)}
                  className="text-sm rounded-lg px-2 py-1 focus:outline-none focus:ring-2 text-white"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    colorScheme: "dark",
                  }}
                />
              </div>
            </div>
          ) : (
            <span className="text-sm flex-1" style={{ color: "rgba(255,255,255,0.3)" }}>{closedLabel}</span>
          )}
        </div>
      ))}

      {!isDirty && (
        <p className="text-xs text-center pt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
          {hintLabel}
        </p>
      )}
    </div>
  );
}
