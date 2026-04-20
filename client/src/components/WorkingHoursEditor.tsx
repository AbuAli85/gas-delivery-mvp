import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Clock, Save, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";

const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

interface DaySchedule {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isActive: boolean;
}

const DEFAULT_SCHEDULE: DaySchedule[] = DAY_NAMES.map((_, i) => ({
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
  const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE);
  const [isDirty, setIsDirty] = useState(false);

  const { data: existing, isLoading } = trpc.providers.getWorkingHours.useQuery({ providerId });

  useEffect(() => {
    if (existing && existing.length > 0) {
      // Merge DB data with defaults
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
      toast.success("تم حفظ ساعات العمل بنجاح");
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
          <div key={i} className="h-12 bg-gray-100 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-red-600" />
          <h3 className="font-bold text-gray-900">ساعات العمل</h3>
        </div>
        {isDirty && (
          <button
            onClick={handleSave}
            disabled={setWorkingHours.isPending}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {setWorkingHours.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
          </button>
        )}
      </div>

      {schedule.map((day) => (
        <div
          key={day.dayOfWeek}
          className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
            day.isActive
              ? "bg-white border-gray-200 shadow-sm"
              : "bg-gray-50 border-gray-100 opacity-60"
          }`}
        >
          {/* Toggle */}
          <button
            onClick={() => updateDay(day.dayOfWeek, "isActive", !day.isActive)}
            className="flex-shrink-0"
          >
            {day.isActive
              ? <ToggleRight className="w-7 h-7 text-green-500" />
              : <ToggleLeft className="w-7 h-7 text-gray-400" />
            }
          </button>

          {/* Day name */}
          <span className={`w-20 text-sm font-semibold ${day.isActive ? "text-gray-900" : "text-gray-400"}`}>
            {DAY_NAMES[day.dayOfWeek]}
          </span>

          {day.isActive ? (
            <div className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">من</span>
                <input
                  type="time"
                  value={day.openTime}
                  onChange={e => updateDay(day.dayOfWeek, "openTime", e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">إلى</span>
                <input
                  type="time"
                  value={day.closeTime}
                  onChange={e => updateDay(day.dayOfWeek, "closeTime", e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                />
              </div>
            </div>
          ) : (
            <span className="text-sm text-gray-400 flex-1">مغلق</span>
          )}
        </div>
      ))}

      {!isDirty && (
        <p className="text-xs text-gray-400 text-center pt-1">
          عدّل أي يوم ثم اضغط "حفظ التغييرات"
        </p>
      )}
    </div>
  );
}
