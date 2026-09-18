import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { NATIONAL_HOLIDAYS_2026, isWeekendOrHoliday } from "@/lib/utils";

const STATUS_COLORS = {
  available: "bg-emerald-100 text-emerald-800 border-emerald-300",
  limited: "bg-amber-100 text-amber-800 border-amber-300",
  full: "bg-rose-200 text-rose-900 border-rose-400",
  closed: "bg-slate-100 text-slate-500 border-slate-200",
};

const STATUS_LABEL = {
  available: "Kosong",
  limited: "1 slot",
  full: "Full",
  closed: "Tutup",
};

const AvailabilityCalendar = () => {
  const [month, setMonth] = useState(new Date());
  const [statuses, setStatuses] = useState({});

  useEffect(() => {
    api.get("/availability").then((r) => {
      const map = {};
      r.data.forEach((a) => (map[a.date] = a));
      setStatuses(map);
    });
  }, []);

  const y = month.getFullYear();
  const m = month.getMonth();
  const firstDay = new Date(y, m, 1);
  const lastDay = new Date(y, m + 1, 0);
  const startPad = firstDay.getDay();
  const days = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(y, m, d));

  const monthName = month.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  const getStatus = (d) => {
    if (!d) return null;
    const iso = d.toISOString().slice(0, 10);
    if (!isWeekendOrHoliday(d)) return "closed";
    if (statuses[iso]) return statuses[iso].status;
    return "available";
  };

  const getStatusLabel = (status, record) => {
    if (status === "available" && record?.remaining_slots > 1) {
      return `${record.remaining_slots} slot`;
    }

    return STATUS_LABEL[status];
  };

  return (
    <section
      id="availability"
      className="scroll-section relative py-24 px-6"
      data-testid="calendar-section"
    >
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <p className="text-xs tracking-[0.3em] uppercase text-rose-600 font-semibold mb-3">
            ✧ Cek Ketersediaan ✧
          </p>
          <h2 className="font-serif-display text-4xl md:text-5xl text-rose-950">
            Tanggal <span className="italic text-rose-600">available</span>
          </h2>
          <p className="mt-3 text-rose-800/70 text-sm">
            Kami buka Sabtu, Minggu, dan tanggal merah. Cek slotnya dulu ya kak ✨
          </p>
        </motion.div>

        <div className="glass-heavy rounded-3xl p-6 md:p-10">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setMonth(new Date(y, m - 1, 1))}
              className="rounded-full p-2 hover:bg-rose-100 text-rose-800"
              data-testid="cal-prev"
            >
              <ChevronLeft size={20} />
            </button>
            <h3 className="font-serif-display text-2xl text-rose-950 capitalize">{monthName}</h3>
            <button
              onClick={() => setMonth(new Date(y, m + 1, 1))}
              className="rounded-full p-2 hover:bg-rose-100 text-rose-800"
              data-testid="cal-next"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-rose-700 mb-2">
            {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {days.map((d, i) => {
              if (!d) return <div key={i} />;
              const s = getStatus(d);
              const iso = d.toISOString().slice(0, 10);
              const record = statuses[iso];
              const isHoliday = NATIONAL_HOLIDAYS_2026.includes(iso);
              return (
                <div
                  key={i}
                  className={`aspect-square rounded-xl border ${STATUS_COLORS[s]} flex flex-col items-center justify-center text-xs`}
                  data-testid={`cal-day-${iso}`}
                >
                  <span className="font-bold text-base">{d.getDate()}</span>
                  <span className="text-[10px] leading-none">{getStatusLabel(s, record)}</span>
                  {isHoliday && <span className="text-[9px] text-rose-600">libur</span>}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-6 text-xs text-rose-800 justify-center">
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded ${STATUS_COLORS[k]} border`} /> {v}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AvailabilityCalendar;
