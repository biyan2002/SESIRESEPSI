import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const rupiah = (n) =>
  "Rp " + (Number(n) || 0).toLocaleString("id-ID");

export const NATIONAL_HOLIDAYS_2026 = [
  "2026-01-01", "2026-02-17", "2026-03-19", "2026-03-20",
  "2026-04-03", "2026-04-04", "2026-05-01", "2026-05-14",
  "2026-05-25", "2026-05-27", "2026-06-01", "2026-06-16",
  "2026-06-17", "2026-08-17", "2026-08-25", "2026-11-04",
  "2026-12-25",
];

export const isWeekendOrHoliday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const iso = d.toISOString().slice(0, 10);
  return day === 0 || day === 6 || NATIONAL_HOLIDAYS_2026.includes(iso);
};
