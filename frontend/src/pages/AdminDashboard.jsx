import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogOut, Plus, Trash2, Edit, Save, Package as Pkg, Sparkles, Calendar, Star, Film, Users } from "lucide-react";
import { toast } from "sonner";
import { api, fileUrl } from "@/lib/api";
import { rupiah } from "@/lib/utils";

const TABS = [
  { id: "bookings", label: "Bookings", icon: Users },
  { id: "calendar", label: "Kalender", icon: Calendar },
  { id: "packages", label: "Paket", icon: Pkg },
  { id: "additionals", label: "Additional", icon: Sparkles },
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

  useEffect(() => {
    if (!localStorage.getItem("sr_token")) return nav("/admin/login");
    setUser(localStorage.getItem("sr_user") || "Admin");
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [b, p, a, po, t, av] = await Promise.all([
        api.get("/bookings"), api.get("/packages"), api.get("/additionals"),
        api.get("/portfolio"), api.get("/testimonials/all"), api.get("/availability"),
      ]);
      setBookings(b.data); setPackages(p.data); setAdditionals(a.data);
      setPortfolio(po.data); setTestimonials(t.data);
      const map = {}; av.data.forEach((x) => (map[x.date] = x.status));
      setAvailability(map);
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
          {tab === "bookings" && <BookingsTab bookings={bookings} reload={loadAll} />}
          {tab === "calendar" && <CalendarTab availability={availability} reload={loadAll} />}
          {tab === "packages" && <PackagesTab items={packages} reload={loadAll} />}
          {tab === "additionals" && <AdditionalsTab items={additionals} reload={loadAll} />}
          {tab === "portfolio" && <PortfolioTab items={portfolio} reload={loadAll} />}
          {tab === "testimonials" && <TestimonialsTab items={testimonials} reload={loadAll} />}
        </motion.div>
      </main>
    </div>
  );
};

const BookingsTab = ({ bookings, reload }) => {
  const del = async (id) => {
    if (!window.confirm("Hapus booking ini?")) return;
    await api.delete(`/bookings/${id}`); toast.success("Deleted"); reload();
  };
  return (
    <div className="space-y-4">
      <h2 className="font-serif-display text-3xl text-rose-950">Semua Booking ({bookings.length})</h2>
      {bookings.length === 0 && <div className="glass p-8 rounded-2xl text-center text-rose-700">Belum ada booking</div>}
      {bookings.map((b) => (
        <div key={b.id} className="glass-heavy rounded-2xl p-6" data-testid={`booking-row-${b.id}`}>
          <div className="flex justify-between flex-wrap gap-2">
            <div>
              <div className="font-serif-display text-xl text-rose-950">{b.name} — {b.event_type}</div>
              <div className="text-sm text-rose-700">📅 {b.event_date} • {b.event_time} • 📱 {b.whatsapp}</div>
              <div className="text-sm text-rose-800 mt-1">📍 {b.address}</div>
              {b.maps_link && <a href={b.maps_link} target="_blank" rel="noreferrer" className="text-xs text-rose-500 underline">Maps</a>}
            </div>
            <button onClick={() => del(b.id)} className="text-rose-600 hover:text-red-700"><Trash2 size={18} /></button>
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
        </div>
      ))}
    </div>
  );
};

const CalendarTab = ({ availability, reload }) => {
  const [month, setMonth] = useState(new Date());
  const y = month.getFullYear(); const m = month.getMonth();
  const firstDay = new Date(y, m, 1); const lastDay = new Date(y, m + 1, 0);
  const startPad = firstDay.getDay();
  const days = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(y, m, d));

  const setStatus = async (date, status) => {
    await api.post("/availability", { date, status }); reload();
  };
  const clear = async (date) => { await api.delete(`/availability/${date}`); reload(); };

  const COLORS = { available: "bg-emerald-500", limited: "bg-amber-500", full: "bg-rose-600", closed: "bg-slate-400" };
  return (
    <div>
      <h2 className="font-serif-display text-3xl text-rose-950 mb-4">Kelola Tanggal</h2>
      <div className="glass-heavy rounded-2xl p-6">
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
            const status = availability[iso];
            return (
              <div key={i} className="rounded-xl border border-rose-200 p-2 text-center text-xs bg-white/60">
                <div className="font-bold text-rose-950">{d.getDate()}</div>
                <div className={`h-1 rounded-full my-1 ${status ? COLORS[status] : "bg-slate-200"}`} />
                <div className="grid grid-cols-2 gap-1 mt-1">
                  <button onClick={() => setStatus(iso, "available")} className="bg-emerald-100 hover:bg-emerald-200 rounded text-[10px] py-0.5" data-testid={`av-${iso}`}>Kosong</button>
                  <button onClick={() => setStatus(iso, "limited")} className="bg-amber-100 hover:bg-amber-200 rounded text-[10px] py-0.5">1 slot</button>
                  <button onClick={() => setStatus(iso, "full")} className="bg-rose-200 hover:bg-rose-300 rounded text-[10px] py-0.5">Full</button>
                  <button onClick={() => clear(iso)} className="bg-slate-100 hover:bg-slate-200 rounded text-[10px] py-0.5">Reset</button>
                </div>
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
        <button onClick={() => setEdit({ name: "", price: 0, unit: "jam" })} className="rounded-full bg-rose-600 text-white px-4 py-2"><Plus size={16} className="inline"/> Tambah</button>
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
            <input placeholder="Unit (jam/km)" value={edit.unit} onChange={(e)=>setEdit({...edit, unit: e.target.value})} className="w-full rounded-xl px-3 py-2 border border-rose-200 mb-3"/>
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
  const [file, setFile] = useState(null);
  const save = async () => {
    let payload = { ...edit };
    if (payload.media_type === "upload" && file) {
      const fd = new FormData(); fd.append("file", file);
      const up = await api.post("/upload?folder=portfolio", fd, { headers: {"Content-Type": "multipart/form-data"}});
      payload.file_path = up.data.path;
    }
    if (payload.id) await api.put(`/portfolio/${payload.id}`, payload);
    else await api.post("/portfolio", payload);
    toast.success("Tersimpan"); setEdit(null); setFile(null); reload();
  };
  const del = async (id) => { if (window.confirm("Hapus?")) { await api.delete(`/portfolio/${id}`); reload(); }};
  return (
    <div className="space-y-4">
      <div className="flex justify-between"><h2 className="font-serif-display text-3xl">Kelola Portfolio</h2>
        <button onClick={() => setEdit({ title:"", couple_name:"", event_date:"", description:"", media_type:"youtube", youtube_url:"", file_path:"" })}
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
            </div>
            {edit.media_type === "youtube" ? (
              <input placeholder="YouTube URL" value={edit.youtube_url} onChange={(e)=>setEdit({...edit, youtube_url: e.target.value})} className="w-full rounded-xl px-3 py-2 border border-rose-200 mb-3"/>
            ) : (
              <input type="file" accept="video/*" onChange={(e)=>setFile(e.target.files?.[0])} className="w-full mb-3"/>
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
