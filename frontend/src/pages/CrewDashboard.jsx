import React, { useEffect, useState } from "react";
import { CalendarDays, LogOut, MapPin, Navigation, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function CrewDashboard() {
  const [jobs, setJobs] = useState([]);
  const [name, setName] = useState(localStorage.getItem("sr_crew_name") || "Crew");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("sr_crew_token");
    if (!token) {
      navigate("/crew/login");
      return;
    }
    api.get("/crew/jobs", { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => setJobs(response.data))
      .catch(() => {
        localStorage.removeItem("sr_crew_token");
        toast.error("Sesi Crew berakhir. Silakan login lagi.");
        navigate("/crew/login");
      });
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("sr_crew_token");
    localStorage.removeItem("sr_crew_name");
    navigate("/crew/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-rose-100 px-4 py-6 sm:px-6">
      <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 rounded-2xl p-5 glass-heavy">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-600">SESI RESEPSI</p>
          <h1 className="mt-1 font-serif-display text-3xl text-rose-950">Hai, {name}</h1>
          <p className="mt-1 text-sm text-rose-800/75">Ini job yang ditugaskan khusus untukmu.</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-2 rounded-full bg-white/75 px-4 py-2 text-sm font-semibold text-rose-700"
          data-testid="crew-logout-button"
        >
          <LogOut size={16} /> Keluar
        </button>
      </header>
      <main className="mx-auto mt-6 max-w-5xl">
        {jobs.length === 0 ? (
          <div className="rounded-2xl p-10 text-center glass" data-testid="crew-empty-jobs">
            <UsersRound className="mx-auto text-rose-500" size={30} />
            <h2 className="mt-3 font-serif-display text-2xl text-rose-950">Belum ada job</h2>
            <p className="mt-1 text-sm text-rose-800/75">Admin akan mengabari saat ada penugasan baru.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {jobs.map(({ assignment, booking }) => (
              <article key={assignment.id} className="rounded-2xl p-5 glass" data-testid={`crew-job-${assignment.id}`}>
                <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">{assignment.job_title}</p>
                <h2 className="mt-1 font-serif-display text-2xl text-rose-950">{booking.name}</h2>
                <p className="mt-2 flex items-center gap-2 text-sm text-rose-800"><CalendarDays size={16} /> {booking.event_date} • {booking.event_time}</p>
                <p className="mt-2 flex items-start gap-2 text-sm text-rose-800"><MapPin size={16} className="mt-0.5 shrink-0" /> {booking.address}</p>
                <p className="mt-2 text-sm text-rose-800">WhatsApp client: {booking.whatsapp}</p>
                {assignment.notes && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{assignment.notes}</p>}
                {booking.maps_link && (
                  <a href={booking.maps_link} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-rose-600 underline" data-testid={`crew-job-map-${assignment.id}`}><Navigation size={15} /> Buka lokasi</a>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}