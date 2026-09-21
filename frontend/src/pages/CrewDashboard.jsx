import React, { useEffect, useState } from "react";
import { CalendarDays, Link, LogOut, MapPin, MessageCircle, Navigation, Save, Trash2, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { rupiah } from "@/lib/utils";

export default function CrewDashboard() {
  const [jobs, setJobs] = useState([]);
  const [workDrafts, setWorkDrafts] = useState({});
  const [name, setName] = useState(localStorage.getItem("sr_crew_name") || "Crew");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("sr_crew_token");
    if (!token) {
      navigate("/crew/login");
      return;
    }
    api.get("/crew/jobs", { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        setJobs(response.data);
        const drafts = {};
        response.data.forEach(({ assignment }) => {
          drafts[assignment.id] = {
            work_drive_url: assignment.work_drive_url || "",
            work_status: assignment.work_status || "pending",
          };
        });
        setWorkDrafts(drafts);
      })
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

  const updateWorkDraft = (assignmentId, key, value) => {
    setWorkDrafts({
      ...workDrafts,
      [assignmentId]: { ...workDrafts[assignmentId], [key]: value },
    });
  };

  const saveWork = async (assignmentId) => {
    const token = localStorage.getItem("sr_crew_token");
    try {
      const response = await api.patch(
        `/crew/jobs/${assignmentId}/work`,
        workDrafts[assignmentId],
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setJobs(jobs.map((job) => (
        job.assignment.id === assignmentId
          ? { ...job, assignment: response.data }
          : job
      )));
      toast.success("Link hasil dan progres job tersimpan.");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Pembaruan job belum tersimpan.");
    }
  };

  const deleteCompletedJob = async (assignmentId) => {
    if (!window.confirm("Hapus job selesai ini dari ruang Crew?")) {
      return;
    }
    const token = localStorage.getItem("sr_crew_token");
    try {
      await api.delete(`/crew/jobs/${assignmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setJobs(jobs.filter((job) => job.assignment.id !== assignmentId));
      toast.success("Job selesai dihapus dari ruang Crew.");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Job belum bisa dihapus.");
    }
  };

  const whatsappUrl = (number) => {
    const digits = (number || "").replace(/\D/g, "").replace(/^0/, "62");
    const message = "Haii kak...✨ Perkenalkan aku dari tim SESI RESEPSI yang akan bertugas di acara kakak☺️🙏";
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
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
            {jobs.map(({ assignment, booking, team_fee }) => (
              <article key={assignment.id} className="rounded-2xl p-5 glass" data-testid={`crew-job-${assignment.id}`}>
                <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">{assignment.job_title}</p>
                <h2 className="mt-1 font-serif-display text-2xl text-rose-950">{booking.name}</h2>
                <p className="mt-2 flex items-center gap-2 text-sm text-rose-800"><CalendarDays size={16} /> {booking.event_date} • {booking.event_time}</p>
                <p className="mt-2 flex items-start gap-2 text-sm text-rose-800"><MapPin size={16} className="mt-0.5 shrink-0" /> {booking.address}</p>
                <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800" data-testid={`crew-job-fee-${assignment.id}`}>Fee tim job ini: <b>{rupiah(team_fee)}</b></p>
                <a href={whatsappUrl(booking.whatsapp)} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 underline" data-testid={`crew-job-whatsapp-${assignment.id}`}><MessageCircle size={15} /> Chat client di WhatsApp</a>
                {assignment.notes && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{assignment.notes}</p>}
                {booking.maps_link && (
                  <a href={booking.maps_link} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-rose-600 underline" data-testid={`crew-job-map-${assignment.id}`}><Navigation size={15} /> Buka lokasi</a>
                )}
                {booking.work_drive_url && (
                  <a href={booking.work_drive_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-rose-600 underline" data-testid={`crew-booking-work-drive-${assignment.id}`}><Link size={15} /> Hasil kerja dari admin</a>
                )}
                <div className="mt-4 border-t border-rose-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">Update hasil kerja</p>
                  <input
                    value={workDrafts[assignment.id]?.work_drive_url || ""}
                    onChange={(event) => updateWorkDraft(assignment.id, "work_drive_url", event.target.value)}
                    placeholder="Link Google Drive hasil kerja"
                    className="mt-2 w-full rounded-xl border border-rose-200 bg-white/75 px-3 py-2 text-sm"
                    data-testid={`crew-work-drive-input-${assignment.id}`}
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[{ value: "pending", label: "BELUM SELESAI" }, { value: "completed", label: "SUDAH SELESAI" }].map((option) => <button key={option.value} type="button" onClick={() => updateWorkDraft(assignment.id, "work_status", option.value)} className={`rounded-full px-3 py-2 text-xs font-semibold ${workDrafts[assignment.id]?.work_status === option.value ? "bg-rose-600 text-white" : "bg-white/75 text-rose-700"}`} data-testid={`crew-work-status-${option.value}-${assignment.id}`}>{option.label}</button>)}
                  </div>
                  <button type="button" onClick={() => saveWork(assignment.id)} className="mt-3 inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white" data-testid={`crew-save-work-${assignment.id}`}><Save size={15} /> Simpan update</button>
                  {workDrafts[assignment.id]?.work_status === "completed" && (
                    <button type="button" onClick={() => deleteCompletedJob(assignment.id)} className="mt-3 ml-2 inline-flex items-center gap-2 rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700" data-testid={`crew-delete-completed-${assignment.id}`}><Trash2 size={15} /> Hapus job selesai</button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}