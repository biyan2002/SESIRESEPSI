import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogOut, Plus, Trash2, Edit, Save, Package as Pkg, Sparkles, Calendar, Star, Film, Users, ExternalLink, CreditCard, Download, UserRoundCog } from "lucide-react";
import { toast } from "sonner";
import { api, fileUrl } from "@/lib/api";
import { rupiah } from "@/lib/utils";
import AdminBookingModal from "@/components/AdminBookingModal";
import TeamManager from "@/components/TeamManager";
import CrewManager from "@/components/CrewManager";
import PaymentManager from "@/components/PaymentManager";
import BookingAssignmentsModal from "@/components/BookingAssignmentsModal";

const TABS = [
  { id: "bookings", label: "Bookings", icon: Users },
  { id: "calendar", label: "Kalender", icon: Calendar },
  { id: "packages", label: "Paket", icon: Pkg },
  { id: "additionals", label: "Additional", icon: Sparkles },
  { id: "team", label: "Tim", icon: Users },
  { id: "crew", label: "Crew", icon: UserRoundCog },
  { id: "payments", label: "Pembayaran", icon: CreditCard },
  { id: "portfolio", label: "Portfolio", icon: Film },
  { id: "testimonials", label: "Testimoni", icon: Star },
];

const AdminDashboard = () => {
  const nav = useNavigate();
  const [tab, setTab] = useState("bookings");
  const [user, setUser] = useState("");
  const [bookings, setBookings] = useState([]);
  const [packages, setPackages] = useState([]);
  const [additionals, setAdditionals] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [availability, setAvailability] = useState({});
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    if (!localStorage.getItem("sr_token")) return nav("/admin/login");
    setUser(localStorage.getItem("sr_user") || "Admin");
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [b, p, a, po, t, av, team] = await Promise.all([
        api.get("/bookings"), api.get("/packages"), api.get("/additionals"),
        api.get("/portfolio"), api.get("/testimonials/all"), api.get("/availability"),
        api.get("/team"),
      ]);
      setBookings(b.data); setPackages(p.data); setAdditionals(a.data);
      setPortfolio(po.data); setTestimonials(t.data);
      const map = {}; av.data.forEach((x) => (map[x.date] = x));
      setAvailability(map);
      setTeamMembers(team.data);
    } catch (e) {
      if (e.response?.status === 401) { localStorage.clear(); nav("/admin/login"); }
    }
  };

  const logout = () => { localStorage.clear(); nav("/admin/login"); };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-rose-100">
      <header className="glass-heavy sticky top-0 z-40 border-b border-rose-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-serif-display text-2xl text-rose-950">HAI KA {user.toUpperCase()} 💌</h1>
            <p className="text-xs text-rose-700">Private Admin Space — SESI RESEPSI</p>
          </div>
          <button onClick={logout} className="rounded-full bg-white/70 hover:bg-white text-rose-700 px-4 py-2 flex items-center gap-2 border border-rose-200"
            data-testid="admin-logout">
            <LogOut size={16} /> Keluar
          </button>
        </div>
        <div className="max-w-7xl mx-auto px-6 pb-3 flex gap-2 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`rounded-full px-4 py-2 text-sm flex items-center gap-2 whitespace-nowrap ${tab === t.id ? "bg-rose-600 text-white" : "bg-white/60 text-rose-800 hover:bg-white"}`}
              data-testid={`tab-${t.id}`}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <motion.div key={tab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {tab === "bookings" && <BookingsTab bookings={bookings} packages={packages} additionals={additionals} teamMembers={teamMembers} reload={loadAll} />}
          {tab === "calendar" && <CalendarTab availability={availability} teamCount={teamMembers.length} reload={loadAll} />}
          {tab === "packages" && <PackagesTab items={packages} reload={loadAll} />}
          {tab === "additionals" && <AdditionalsTab items={additionals} reload={loadAll} />}
          {tab === "team" && <TeamManager members={teamMembers} reload={loadAll} />}
          {tab === "crew" && <CrewManager members={teamMembers} />}
          {tab === "payments" && <PaymentManager />}
          {tab === "portfolio" && <PortfolioTab items={portfolio} reload={loadAll} />}
          {tab === "testimonials" && <TestimonialsTab items={testimonials} reload={loadAll} />}
        </motion.div>
      </main>
    </div>
  );
};

const BookingsTab = ({ bookings, packages, additionals, teamMembers, reload }) => {
  const [showAddBooking, setShowAddBooking] = useState(false);
  const [assignmentBooking, setAssignmentBooking] = useState(null);
  const [bookingSpace, setBookingSpace] = useState("active");
  const [query, setQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [workDrafts, setWorkDrafts] = useState({});
  const del = async (id) => {
    if (!window.confirm("Hapus booking ini?")) return;
    await api.delete(`/bookings/${id}`); toast.success("Deleted"); reload();
  };
  const updateCompletion = async (id, status) => {
    try {
      await api.patch(`/bookings/${id}/completion`, { status });
      toast.success(
        status === "completed"
          ? "Booking ditandai sudah selesai."
          : "Booking ditandai belum selesai.",
      );
      reload();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Status booking belum bisa diubah.");
    }
  };
  const downloadInvoice = async (booking) => {
    try {
      const response = await api.get(`/invoices/${booking.id}/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `Invoice-${booking.invoice_number || booking.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Invoice belum bisa diunduh.");
    }
  };
  const updateWorkDrive = async (booking) => {
    try {
      const workDriveUrl = workDrafts[booking.id] ?? booking.work_drive_url ?? "";
      await api.patch(`/bookings/${booking.id}/work`, { work_drive_url: workDriveUrl });
      toast.success("Link hasil kerja tersimpan.");
      reload();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Link hasil belum bisa disimpan.");
    }
  };
  const filteredBookings = bookings.filter((booking) => {
    const completionMatches = bookingSpace === "archive"
      ? booking.status === "completed"
      : booking.status !== "completed";
    const queryMatches = `${booking.name} ${booking.event_date}`.toLowerCase().includes(query.toLowerCase());
    const dateMatches = !selectedDate || booking.event_date === selectedDate;
    const monthMatches = !selectedMonth || booking.event_date.startsWith(selectedMonth);
    return completionMatches && queryMatches && dateMatches && monthMatches;
  });
  const activeCount = bookings.filter((booking) => booking.status !== "completed").length;
  const archiveCount = bookings.filter((booking) => booking.status === "completed").length;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif-display text-3xl text-rose-950">
          {bookingSpace === "archive" ? "Arsip Client Selesai" : "Client Belum Selesai"} ({filteredBookings.length})
        </h2>
        <button
          type="button"
          onClick={() => setShowAddBooking(true)}
          className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-600/20 transition-colors hover:bg-rose-700"
          data-testid="admin-add-booking-button"
        >
          <Plus size={16} /> Tambah booking
        </button>
      </div>
      <div className="grid gap-3 rounded-2xl p-4 glass sm:grid-cols-[auto_auto_1fr_auto_auto]" data-testid="bookings-filter-bar">
        <button type="button" onClick={() => setBookingSpace("active")} className={`rounded-full px-4 py-2 text-sm font-semibold ${bookingSpace === "active" ? "bg-rose-600 text-white" : "bg-white/75 text-rose-800"}`} data-testid="bookings-active-space">Belum Selesai ({activeCount})</button>
        <button type="button" onClick={() => setBookingSpace("archive")} className={`rounded-full px-4 py-2 text-sm font-semibold ${bookingSpace === "archive" ? "bg-emerald-600 text-white" : "bg-white/75 text-rose-800"}`} data-testid="bookings-archive-space">Arsip Selesai ({archiveCount})</button>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama client atau tanggal" className="rounded-xl border border-rose-200 bg-white/75 px-3 py-2 text-sm" data-testid="bookings-search-input" />
        <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="rounded-xl border border-rose-200 bg-white/75 px-3 py-2 text-sm" data-testid="bookings-date-filter" />
        <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="rounded-xl border border-rose-200 bg-white/75 px-3 py-2 text-sm" data-testid="bookings-month-filter" />
      </div>
      {filteredBookings.length === 0 && <div className="glass rounded-2xl p-8 text-center text-rose-700">Tidak ada client pada ruang ini</div>}
      {filteredBookings.map((b) => (
        <div key={b.id} className="glass-heavy rounded-2xl p-6" data-testid={`booking-row-${b.id}`}>
          <div className="flex justify-between flex-wrap gap-2">
            <div>
              <div className="font-serif-display text-xl text-rose-950">{b.name} — {b.event_type}</div>
              <div className="text-sm text-rose-700">📅 {b.event_date} • {b.event_time} • 📱 {b.whatsapp}</div>
              <div className="text-sm text-rose-800 mt-1">📍 {b.address}</div>
              {b.maps_link && <a href={b.maps_link} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-rose-600 underline" data-testid={`booking-maps-link-${b.id}`}><ExternalLink size={12} /> Buka lokasi di Google Maps</a>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setAssignmentBooking(b)} className="rounded-full bg-white/75 p-2 text-rose-700" data-testid={`booking-assign-crew-${b.id}`} aria-label={`Atur Crew ${b.name}`}><Users size={16} /></button>
              <button onClick={() => downloadInvoice(b)} className="rounded-full bg-white/75 p-2 text-rose-700" data-testid={`booking-download-invoice-${b.id}`} aria-label={`Unduh invoice ${b.name}`}><Download size={16} /></button>
              <button onClick={() => del(b.id)} className="text-rose-600 hover:text-red-700" data-testid={`booking-delete-${b.id}`} aria-label={`Hapus booking ${b.name}`}><Trash2 size={18} /></button>
            </div>
          </div>
          <div className="mt-3 grid md:grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl bg-white/60 p-3">
              <b>Paket:</b> {b.package_name} — {rupiah(b.package_price)}<br/>
              <b>Jarak:</b> {b.distance_km} km • Transport: {rupiah(b.transport_cost)}<br/>
              <b>Additional:</b> {b.additionals?.map(a => `${a.name} x${a.qty}`).join(", ") || "-"}<br/>
              <b>Total:</b> <span className="text-rose-700 font-bold">{rupiah(b.total_price)}</span><br/>
              <b>Pembayaran:</b> {b.payment_type.toUpperCase()} — {rupiah(b.payment_amount)}
            </div>
            <div className="rounded-xl bg-white/60 p-3">
              <b>Bukti Transfer:</b>
              {b.payment_proof_path ? (
                <a href={fileUrl(b.payment_proof_path)} target="_blank" rel="noreferrer">
                  <img src={fileUrl(b.payment_proof_path)} alt="proof" className="mt-2 rounded-lg max-h-48" />
                </a>
              ) : <div className="italic text-rose-600 mt-1">Tidak ada</div>}
              {b.notes && <div className="mt-2"><b>Catatan:</b> {b.notes}</div>}
            </div>
          </div>
          <div className="mt-4 border-t border-rose-100 pt-4" data-testid={`booking-completion-${b.id}`}>
            <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">
              Progres pekerjaan
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => updateCompletion(b.id, "pending")}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  b.status !== "completed"
                    ? "bg-amber-100 text-amber-800 ring-1 ring-amber-300"
                    : "bg-white/70 text-rose-700 hover:bg-white"
                }`}
                data-testid={`booking-mark-pending-${b.id}`}
              >
                Belum Selesai
              </button>
              <button
                type="button"
                onClick={() => updateCompletion(b.id, "completed")}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  b.status === "completed"
                    ? "bg-emerald-600 text-white"
                    : "bg-white/70 text-rose-700 hover:bg-white"
                }`}
                data-testid={`booking-mark-completed-${b.id}`}
              >
                Sudah Selesai
              </button>
            </div>
          </div>
          <div className="mt-4 border-t border-rose-100 pt-4" data-testid={`booking-work-drive-${b.id}`}>
            <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">Hasil kerja Google Drive</p>
            {b.work_drive_url && <a href={b.work_drive_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-rose-600 underline" data-testid={`booking-work-drive-link-${b.id}`}><ExternalLink size={14} /> Buka hasil kerja</a>}
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input value={workDrafts[b.id] ?? b.work_drive_url ?? ""} onChange={(event) => setWorkDrafts({ ...workDrafts, [b.id]: event.target.value })} placeholder="Tempel link Google Drive hasil kerja" className="flex-1 rounded-xl border border-rose-200 bg-white/75 px-3 py-2 text-sm" data-testid={`booking-work-drive-input-${b.id}`} />
              <button type="button" onClick={() => updateWorkDrive(b)} className="rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700" data-testid={`booking-work-drive-save-${b.id}`}>Simpan link</button>
            </div>
          </div>
        </div>
      ))}
      {showAddBooking && (
        <AdminBookingModal
          packages={packages}
          additionals={additionals}
          onClose={() => setShowAddBooking(false)}
          onSaved={reload}
        />
      )}
      {assignmentBooking && (
        <BookingAssignmentsModal
          booking={assignmentBooking}
          members={teamMembers}
          onClose={() => setAssignmentBooking(null)}
          onSaved={reload}
        />
      )}
    </div>
  );
};

const CalendarTab = ({ availability, teamCount, reload }) => {
  const [month, setMonth] = useState(new Date());
  const y = month.getFullYear(); const m = month.getMonth();
  const firstDay = new Date(y, m, 1); const lastDay = new Date(y, m + 1, 0);
  const startPad = firstDay.getDay();
  const days = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(y, m, d));

  const setRemainingSlots = async (date, value) => {
    const payload = value === "closed"
      ? { date, status: "closed" }
      : { date, remaining_slots: Number(value) };
    await api.post("/availability", payload);
    reload();
  };

  const COLORS = { available: "bg-emerald-500", limited: "bg-amber-500", full: "bg-rose-600", closed: "bg-slate-400" };
  return (
    <div>
      <h2 className="font-serif-display text-3xl text-rose-950 mb-4">Kelola Tanggal</h2>
      <div className="glass-heavy rounded-2xl p-6">
        <p className="mb-4 text-sm text-rose-800" data-testid="calendar-team-capacity">
          Kapasitas maksimal per hari: <b>{teamCount} slot</b>, sesuai jumlah personel tim.
        </p>
        <div className="flex justify-between mb-4">
          <button onClick={() => setMonth(new Date(y, m - 1, 1))} className="text-rose-700">← Prev</button>
          <h3 className="font-serif-display text-xl">{month.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</h3>
          <button onClick={() => setMonth(new Date(y, m + 1, 1))} className="text-rose-700">Next →</button>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-rose-700 mb-2">
          {["Min","Sen","Sel","Rab","Kam","Jum","Sab"].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((d, i) => {
            if (!d) return <div key={i} />;
            const iso = d.toISOString().slice(0,10);
            const record = availability[iso];
            const status = record?.status === "full" || record?.status === "limited"
              ? record.status
              : "available";
            const selectedSlots = String(record?.remaining_slots ?? teamCount);
            return (
              <div key={i} className="rounded-xl border border-rose-200 p-2 text-center text-xs bg-white/60">
                <div className="font-bold text-rose-950">{d.getDate()}</div>
                <div className={`h-1 rounded-full my-1 ${status ? COLORS[status] : "bg-slate-200"}`} />
                <select
                  value={selectedSlots}
                  onChange={(event) => setRemainingSlots(iso, event.target.value)}
                  className="mt-1 w-full rounded bg-white px-1 py-1 text-[10px] text-rose-800"
                  data-testid={`calendar-slots-${iso}`}
                >
                  {Array.from({ length: teamCount + 1 }, (_, slots) => (
                    <option key={slots} value={slots}>
                      {slots === 0 ? "Penuh" : `${slots} slot`}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const emptyPkg = { name: "", price: 0, features: [""], highlight: false, order: 99 };
const PackagesTab = ({ items, reload }) => {
  const [edit, setEdit] = useState(null);
  const save = async () => {
    if (edit.id) await api.put(`/packages/${edit.id}`, edit);
    else await api.post("/packages", edit);
    toast.success("Tersimpan"); setEdit(null); reload();
  };
  const del = async (id) => { if (window.confirm("Hapus paket?")) { await api.delete(`/packages/${id}`); reload(); } };
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-serif-display text-3xl text-rose-950">Kelola Paket</h2>
        <button onClick={() => setEdit({ ...emptyPkg })} className="rounded-full bg-rose-600 text-white px-4 py-2 flex items-center gap-2" data-testid="add-package"><Plus size={16}/> Tambah</button>
      </div>
      {items.map((p) => (
        <div key={p.id} className="glass rounded-2xl p-4 flex justify-between items-center">
          <div>
            <div className="font-semibold text-rose-950">{p.name} {p.highlight && "⭐"}</div>
            <div className="text-rose-700">{rupiah(p.price)} • {p.features.length} fitur</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEdit({ ...p })} className="rounded-full bg-white/70 p-2"><Edit size={16}/></button>
            <button onClick={() => del(p.id)} className="rounded-full bg-white/70 p-2 text-red-600"><Trash2 size={16}/></button>
          </div>
        </div>
      ))}
      {edit && (
        <div className="fixed inset-0 bg-rose-950/50 z-50 flex items-center justify-center p-4" onClick={() => setEdit(null)}>
          <div className="glass-heavy rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e)=>e.stopPropagation()}>
            <h3 className="font-serif-display text-xl mb-4">{edit.id ? "Edit" : "Tambah"} Paket</h3>
            <input placeholder="Nama" value={edit.name} onChange={(e)=>setEdit({...edit, name: e.target.value})} className="w-full rounded-xl px-3 py-2 border border-rose-200 mb-2"/>
            <input type="number" placeholder="Harga" value={edit.price} onChange={(e)=>setEdit({...edit, price: parseInt(e.target.value)||0})} className="w-full rounded-xl px-3 py-2 border border-rose-200 mb-2"/>
            <input type="number" placeholder="Order" value={edit.order} onChange={(e)=>setEdit({...edit, order: parseInt(e.target.value)||0})} className="w-full rounded-xl px-3 py-2 border border-rose-200 mb-2"/>
            <label className="flex items-center gap-2 mb-3"><input type="checkbox" checked={edit.highlight} onChange={(e)=>setEdit({...edit, highlight: e.target.checked})}/> Paling laris</label>
            <div className="text-sm font-semibold mb-1">Fitur:</div>
            {edit.features.map((f, i) => (
              <div key={i} className="flex gap-2 mb-1">
                <input value={f} onChange={(e)=>{const nf=[...edit.features]; nf[i]=e.target.value; setEdit({...edit, features: nf});}} className="flex-1 rounded-xl px-3 py-2 border border-rose-200"/>
                <button onClick={()=>setEdit({...edit, features: edit.features.filter((_,x)=>x!==i)})} className="text-red-600"><Trash2 size={14}/></button>
              </div>
            ))}
            <button onClick={()=>setEdit({...edit, features: [...edit.features, ""]})} className="text-sm text-rose-600 mb-3">+ Tambah fitur</button>
            <div className="flex gap-2">
              <button onClick={save} className="flex-1 rounded-full bg-rose-600 text-white py-2" data-testid="save-package"><Save size={14} className="inline"/> Simpan</button>
              <button onClick={()=>setEdit(null)} className="flex-1 rounded-full bg-white/70 py-2">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdditionalsTab = ({ items, reload }) => {
  const [edit, setEdit] = useState(null);
  const save = async () => {
    if (edit.id) await api.put(`/additionals/${edit.id}`, edit);
    else await api.post("/additionals", edit);
    toast.success("Tersimpan"); setEdit(null); reload();
  };
  const del = async (id) => { if (window.confirm("Hapus?")) { await api.delete(`/additionals/${id}`); reload(); }};
  return (
    <div className="space-y-4">
      <div className="flex justify-between"><h2 className="font-serif-display text-3xl">Kelola Additional</h2>
        <button onClick={() => setEdit({ name: "", price: 0, unit: "jam", max_quantity: 10 })} className="rounded-full bg-rose-600 text-white px-4 py-2"><Plus size={16} className="inline"/> Tambah</button>
      </div>
      {items.map((a) => (
        <div key={a.id} className="glass rounded-2xl p-4 flex justify-between items-center">
          <div><b>{a.name}</b> — {rupiah(a.price)}/{a.unit}</div>
          <div className="flex gap-2">
            <button onClick={() => setEdit({ ...a })} className="rounded-full bg-white/70 p-2"><Edit size={16}/></button>
            <button onClick={() => del(a.id)} className="rounded-full bg-white/70 p-2 text-red-600"><Trash2 size={16}/></button>
          </div>
        </div>
      ))}
      {edit && (
        <div className="fixed inset-0 bg-rose-950/50 z-50 flex items-center justify-center p-4" onClick={()=>setEdit(null)}>
          <div className="glass-heavy rounded-3xl p-6 w-full max-w-md" onClick={(e)=>e.stopPropagation()}>
            <input placeholder="Nama" value={edit.name} onChange={(e)=>setEdit({...edit, name: e.target.value})} className="w-full rounded-xl px-3 py-2 border border-rose-200 mb-2"/>
            <input type="number" placeholder="Harga" value={edit.price} onChange={(e)=>setEdit({...edit, price: parseInt(e.target.value)||0})} className="w-full rounded-xl px-3 py-2 border border-rose-200 mb-2"/>
            <input placeholder="Unit (jam/km)" value={edit.unit} onChange={(e)=>setEdit({...edit, unit: e.target.value})} className="w-full rounded-xl px-3 py-2 border border-rose-200 mb-2"/>
            <label className="block text-sm font-semibold text-rose-800 mb-1">Maksimal jumlah yang bisa dipilih client</label>
            <input type="number" min="1" max="99" value={edit.max_quantity || 10} onChange={(e)=>setEdit({...edit, max_quantity: Math.max(1, parseInt(e.target.value) || 1)})} className="w-full rounded-xl px-3 py-2 border border-rose-200 mb-3" data-testid="additional-max-quantity-input"/>
            <div className="flex gap-2">
              <button onClick={save} className="flex-1 rounded-full bg-rose-600 text-white py-2">Simpan</button>
              <button onClick={()=>setEdit(null)} className="flex-1 rounded-full bg-white/70 py-2">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PortfolioTab = ({ items, reload }) => {
  const [edit, setEdit] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const save = async () => {
    let payload = { ...edit };
    if (payload.media_type === "photo" && imageFiles.length === 0) {
      toast.error("Pilih minimal satu foto portfolio.");
      return;
    }
    if (payload.media_type === "upload" && videoFile) {
      const fd = new FormData(); fd.append("file", videoFile);
      const up = await api.post("/upload?folder=portfolio", fd, { headers: {"Content-Type": "multipart/form-data"}});
      payload.file_path = up.data.path;
    }
    if (imageFiles.length > 0) {
      const uploads = await Promise.all(imageFiles.map(async (imageFile) => {
        const fd = new FormData(); fd.append("file", imageFile);
        return api.post("/upload?folder=portfolio", fd, { headers: {"Content-Type": "multipart/form-data"}});
      }));
      payload.image_paths = [...(payload.image_paths || []), ...uploads.map((up) => up.data.path)];
    }
    if (payload.id) await api.put(`/portfolio/${payload.id}`, payload);
    else await api.post("/portfolio", payload);
    toast.success("Tersimpan"); setEdit(null); setVideoFile(null); setImageFiles([]); reload();
  };
  const del = async (id) => { if (window.confirm("Hapus?")) { await api.delete(`/portfolio/${id}`); reload(); }};
  return (
    <div className="space-y-4">
      <div className="flex justify-between"><h2 className="font-serif-display text-3xl">Kelola Portfolio</h2>
        <button onClick={() => setEdit({ title:"", couple_name:"", event_date:"", description:"", media_type:"youtube", youtube_url:"", drive_url:"", file_path:"", image_paths:[] })}
          className="rounded-full bg-rose-600 text-white px-4 py-2" data-testid="add-portfolio"><Plus size={16} className="inline"/> Tambah</button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {items.map((p) => (
          <div key={p.id} className="glass rounded-2xl p-4">
            <div className="font-semibold text-rose-950">{p.title}</div>
            <div className="text-sm text-rose-700">{p.couple_name} • {p.event_date}</div>
            <div className="text-xs text-rose-600 italic mt-1">{p.media_type === "youtube" ? p.youtube_url : "File upload"}</div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setEdit({ ...p })} className="rounded-full bg-white/70 px-3 py-1 text-sm">Edit</button>
              <button onClick={() => del(p.id)} className="rounded-full bg-white/70 px-3 py-1 text-red-600 text-sm">Hapus</button>
            </div>
          </div>
        ))}
      </div>
      {edit && (
        <div className="fixed inset-0 bg-rose-950/50 z-50 flex items-center justify-center p-4" onClick={()=>setEdit(null)}>
          <div className="glass-heavy rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e)=>e.stopPropagation()}>
            <h3 className="font-serif-display text-xl mb-3">Portfolio</h3>
            <input placeholder="Judul" value={edit.title} onChange={(e)=>setEdit({...edit, title: e.target.value})} className="w-full rounded-xl px-3 py-2 border border-rose-200 mb-2"/>
            <input placeholder="Nama Pasangan" value={edit.couple_name} onChange={(e)=>setEdit({...edit, couple_name: e.target.value})} className="w-full rounded-xl px-3 py-2 border border-rose-200 mb-2"/>
            <input type="date" value={edit.event_date} onChange={(e)=>setEdit({...edit, event_date: e.target.value})} className="w-full rounded-xl px-3 py-2 border border-rose-200 mb-2"/>
            <textarea placeholder="Deskripsi" value={edit.description} onChange={(e)=>setEdit({...edit, description: e.target.value})} className="w-full rounded-xl px-3 py-2 border border-rose-200 mb-2"/>
            <div className="flex gap-2 mb-2">
              <button onClick={()=>setEdit({...edit, media_type:"youtube"})} className={`flex-1 rounded-xl py-2 ${edit.media_type==="youtube"?"bg-rose-600 text-white":"bg-white/70"}`}>YouTube</button>
              <button onClick={()=>setEdit({...edit, media_type:"upload"})} className={`flex-1 rounded-xl py-2 ${edit.media_type==="upload"?"bg-rose-600 text-white":"bg-white/70"}`}>Upload</button>
              <button onClick={()=>setEdit({...edit, media_type:"photo"})} className={`flex-1 rounded-xl py-2 ${edit.media_type==="photo"?"bg-rose-600 text-white":"bg-white/70"}`} data-testid="portfolio-media-photo-button">Foto</button>
              <button onClick={()=>setEdit({...edit, media_type:"drive"})} className={`flex-1 rounded-xl py-2 ${edit.media_type==="drive"?"bg-rose-600 text-white":"bg-white/70"}`} data-testid="portfolio-media-drive-button">Drive</button>
            </div>
            {edit.media_type === "youtube" ? (
              <input placeholder="YouTube URL" value={edit.youtube_url} onChange={(e)=>setEdit({...edit, youtube_url: e.target.value})} className="w-full rounded-xl px-3 py-2 border border-rose-200 mb-3"/>
            ) : edit.media_type === "drive" ? (
              <input placeholder="Google Drive share link" value={edit.drive_url || ""} onChange={(e)=>setEdit({...edit, drive_url: e.target.value})} className="w-full rounded-xl px-3 py-2 border border-rose-200 mb-3" data-testid="portfolio-drive-url-input"/>
            ) : edit.media_type === "upload" ? (
              <input type="file" accept="video/*" onChange={(e)=>setVideoFile(e.target.files?.[0])} className="w-full mb-3"/>
            ) : (
              <input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(e)=>setImageFiles(Array.from(e.target.files || []))} className="w-full mb-3" data-testid="portfolio-photo-input"/>
            )}
            <div className="flex gap-2">
              <button onClick={save} className="flex-1 rounded-full bg-rose-600 text-white py-2">Simpan</button>
              <button onClick={()=>setEdit(null)} className="flex-1 rounded-full bg-white/70 py-2">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TestimonialsTab = ({ items, reload }) => {
  const del = async (id) => { if (window.confirm("Hapus?")) { await api.delete(`/testimonials/${id}`); reload(); }};
  return (
    <div className="space-y-4">
      <h2 className="font-serif-display text-3xl">Testimoni ({items.length})</h2>
      {items.map((t) => (
        <div key={t.id} className="glass rounded-2xl p-4">
          <div className="flex justify-between">
            <div>
              <b>{t.name}</b> • ⭐{t.rating}
              <p className="text-rose-800 italic mt-1">"{t.message}"</p>
            </div>
            <button onClick={() => del(t.id)} className="text-red-600"><Trash2 size={18}/></button>
          </div>
          {t.media_paths?.[0] && <img src={fileUrl(t.media_paths[0])} alt="" className="mt-2 rounded-lg max-h-40"/>}
        </div>
      ))}
    </div>
  );
};

export default AdminDashboard;
