import React, { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarDays, ReceiptText, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { rupiah } from "@/lib/utils";

const periodLabels = {
  daily: "Harian",
  weekly: "Mingguan",
  monthly: "Bulanan",
};

const FinanceDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [period, setPeriod] = useState("daily");

  useEffect(() => {
    api.get("/finance/summary")
      .then((response) => setSummary(response.data))
      .catch(() => toast.error("Data finance belum bisa dimuat."));
  }, []);

  const rows = useMemo(() => summary?.[period] || [], [period, summary]);

  if (!summary) {
    return <div className="rounded-2xl p-8 glass" data-testid="finance-loading">Memuat finance...</div>;
  }

  return (
    <section className="space-y-5" data-testid="finance-dashboard">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-600">Arus pembayaran</p>
        <h2 className="mt-1 font-serif-display text-3xl text-rose-950">Ruang Finance</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl p-4 glass" data-testid="finance-overall-incoming">
          <WalletCards className="text-rose-600" size={20} />
          <p className="mt-3 text-sm text-rose-800">Uang masuk keseluruhan</p>
          <b className="mt-1 block font-serif-display text-2xl text-rose-950">{rupiah(summary.overall.incoming)}</b>
        </article>
        <article className="rounded-2xl p-4 glass" data-testid="finance-overall-bookings">
          <ReceiptText className="text-rose-600" size={20} />
          <p className="mt-3 text-sm text-rose-800">Nilai seluruh booking</p>
          <b className="mt-1 block font-serif-display text-2xl text-rose-950">{rupiah(summary.overall.booking_value)}</b>
        </article>
        <article className="rounded-2xl p-4 glass" data-testid="finance-overall-count">
          <BarChart3 className="text-rose-600" size={20} />
          <p className="mt-3 text-sm text-rose-800">Jumlah booking</p>
          <b className="mt-1 block font-serif-display text-2xl text-rose-950">{summary.overall.booking_count}</b>
        </article>
      </div>
      <div className="rounded-2xl p-5 glass-heavy">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-full border border-rose-200 bg-white/60 p-1" data-testid="finance-period-tabs">
            {Object.entries(periodLabels).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPeriod(value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  period === value ? "bg-rose-600 text-white" : "text-rose-800"
                }`}
                data-testid={`finance-period-${value}`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="inline-flex items-center gap-2 text-sm text-rose-700"><CalendarDays size={16} /> {periodLabels[period]}</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm" data-testid="finance-table">
            <thead className="border-b border-rose-100 text-rose-600">
              <tr><th className="pb-2 font-semibold">Periode</th><th className="pb-2 font-semibold">Uang masuk</th><th className="pb-2 font-semibold">Nilai booking</th><th className="pb-2 font-semibold">Booking</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-rose-50 text-rose-900">
                  <td className="py-3">{row.label}</td><td className="py-3 font-semibold">{rupiah(row.incoming)}</td><td className="py-3">{rupiah(row.booking_value)}</td><td className="py-3">{row.booking_count}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan="4" className="py-6 text-center text-rose-700">Belum ada pembayaran tercatat.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default FinanceDashboard;