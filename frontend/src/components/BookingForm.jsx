import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Copy, Upload, MapPin, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { rupiah, isWeekendOrHoliday } from "@/lib/utils";

const BANKS = [
  { name: "BSI", holder: "FIKABI SA'DI MARTYANSYAH", num: "7310404173" },
  { name: "Seabank", holder: "CASTI RAHAYU", num: "901820850811" },
];

const BookingForm = ({ selectedPackage }) => {
  const [pkgs, setPkgs] = useState([]);
  const [adds, setAdds] = useState([]);
  const [selectedAdds, setSelectedAdds] = useState({}); // id -> qty
  const [pkgId, setPkgId] = useState("");
  const [form, setForm] = useState({
    name: "", whatsapp: "", event_type: "", event_date: "", event_time: "",
    address: "", maps_link: "", notes: "",
  });
  const [distance, setDistance] = useState(0);
  const [distanceErr, setDistanceErr] = useState("");
  const [manualDistance, setManualDistance] = useState("");
  const [resolving, setResolving] = useState(false);
  const [paymentType, setPaymentType] = useState("dp");
  const [dpChoice, setDpChoice] = useState("50000");
  const [customDp, setCustomDp] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.get("/packages").then((r) => setPkgs(r.data));
    api.get("/additionals").then((r) => setAdds(r.data));
  }, []);

  useEffect(() => {
    if (selectedPackage) setPkgId(selectedPackage.id);
  }, [selectedPackage]);

  const pkg = pkgs.find((p) => p.id === pkgId);

  const transportCost = useMemo(() => {
    const km = distance || parseFloat(manualDistance) || 0;
    if (km <= 10) return 0;
    return Math.ceil(km - 10) * 5000;
  }, [distance, manualDistance]);

  const additionalCost = useMemo(() => {
    let sum = 0;
    Object.entries(selectedAdds).forEach(([id, qty]) => {
      const a = adds.find((x) => x.id === id);
      if (a && qty > 0) sum += a.price * qty;
    });
    return sum;
  }, [selectedAdds, adds]);

  const total = (pkg?.price || 0) + additionalCost + transportCost;

  const dpAmount = paymentType === "lunas" ? total :
    (dpChoice === "custom" ? parseInt(customDp || 0) : parseInt(dpChoice));

  const resolveMaps = async () => {
    if (!form.maps_link) return;
    setResolving(true);
    setDistanceErr("");
    try {
      const r = await api.post("/distance", { maps_link: form.maps_link });
      setDistance(r.data.distance_km);
      toast.success(`Jarak: ${r.data.distance_km} km — Transport ${rupiah(r.data.transport_cost)}`);
    } catch (e) {
      setDistanceErr(e.response?.data?.detail || "Yah sistem error, isi manual ya kak");
      toast.error("Yahh sistem lagi error nih, kamu bisa input manual dulu ya, atau hubungi admin dulu");
    }
    setResolving(false);
  };

  const copyText = (t) => {
    navigator.clipboard.writeText(t);
    toast.success("Nomor rekening kesalin~ ✨");
  };

  const submit = async () => {
    if (!form.name || !form.whatsapp || !form.event_date || !pkgId)
      return toast.error("Lengkapi datanya dulu ya kak~");
    if (!isWeekendOrHoliday(form.event_date))
      return toast.error("Kita cuma buka weekend & libur nasional ya kak");
    if (paymentType === "dp" && dpAmount < 50000)
      return toast.error("Minimal DP Rp 50.000 ya");
    if (!proofFile)
      return toast.error("Upload bukti transfer dulu ya~");

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("file", proofFile);
      const up = await api.post("/upload?folder=payment", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const addsPayload = Object.entries(selectedAdds)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => {
          const a = adds.find((x) => x.id === id);
          return { id, name: a.name, price: a.price, unit: a.unit, qty, subtotal: a.price * qty };
        });

      await api.post("/bookings", {
        ...form,
        distance_km: distance || parseFloat(manualDistance) || 0,
        package_id: pkgId,
        package_name: pkg.name,
        package_price: pkg.price,
        additionals: addsPayload,
        transport_cost: transportCost,
        total_price: total,
        payment_type: paymentType,
        payment_amount: dpAmount,
        payment_proof_path: up.data.path,
      });
      setDone(true);
      toast.success("Booking berhasil masuk! 💕");
    } catch (e) {
      toast.error("Gagal submit, coba lagi ya");
    }
    setSubmitting(false);
  };

  if (done) {
    return (
      <div className="glass-heavy rounded-3xl p-10 text-center">
        <div className="text-5xl mb-3">💌</div>
        <h3 className="font-serif-display text-3xl text-rose-950 mb-2">Yeay booking masuk!</h3>
        <p className="text-rose-800/80 mb-6">
          Kami udah nerima booking kamu ya kak. Buat konfirmasi jadwal & detail acara,
          langsung <b>chat admin</b> di pojok kanan bawah biar cepet diproses ✨
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-full bg-rose-600 hover:bg-rose-700 text-white px-6 py-3"
          data-testid="booking-reset-btn"
        >
          Kembali ke Home
        </button>
      </div>
    );
  }

  return (
    <div className="glass-heavy rounded-3xl p-6 md:p-10 space-y-6" data-testid="booking-form">
      <h3 className="font-serif-display text-3xl text-rose-950">Form Booking 💐</h3>

      <div className="grid md:grid-cols-2 gap-4">
        <input placeholder="Nama lengkap" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="rounded-xl bg-white/70 px-4 py-3 border border-rose-200 outline-none focus:border-rose-500" data-testid="bf-name" />
        <input placeholder="WhatsApp aktif" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
          className="rounded-xl bg-white/70 px-4 py-3 border border-rose-200 outline-none focus:border-rose-500" data-testid="bf-wa" />
        <input placeholder="Jenis acara (Resepsi/Akad/dll)" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}
          className="rounded-xl bg-white/70 px-4 py-3 border border-rose-200 outline-none focus:border-rose-500" data-testid="bf-type" />
        <input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })}
          className="rounded-xl bg-white/70 px-4 py-3 border border-rose-200 outline-none focus:border-rose-500" data-testid="bf-date" />
        <input type="time" value={form.event_time} onChange={(e) => setForm({ ...form, event_time: e.target.value })}
          className="rounded-xl bg-white/70 px-4 py-3 border border-rose-200 outline-none focus:border-rose-500" data-testid="bf-time" />
        <input placeholder="Alamat acara" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
          className="rounded-xl bg-white/70 px-4 py-3 border border-rose-200 outline-none focus:border-rose-500" data-testid="bf-address" />
      </div>

      {/* Maps + distance */}
      <div className="space-y-3 rounded-2xl bg-white/50 p-4 border border-rose-100">
        <div className="flex items-center gap-2 text-rose-700 text-sm font-semibold">
          <MapPin size={16} /> Lokasi acara (Google Maps)
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <input
            placeholder="Paste link Google Maps venue kamu"
            value={form.maps_link}
            onChange={(e) => setForm({ ...form, maps_link: e.target.value })}
            className="flex-1 rounded-xl bg-white/70 px-4 py-3 border border-rose-200 outline-none focus:border-rose-500"
            data-testid="bf-maps"
          />
          <button onClick={resolveMaps} disabled={resolving || !form.maps_link}
            className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-5 py-3 flex items-center justify-center gap-2 disabled:opacity-60"
            data-testid="bf-maps-calc">
            {resolving ? <Loader2 className="animate-spin" size={16} /> : <MapPin size={16} />} Hitung
          </button>
        </div>
        {distance > 0 && (
          <div className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">
            ✅ Jarak: <b>{distance} km</b> • Transport: <b>{rupiah(transportCost)}</b>
          </div>
        )}
        {distanceErr && (
          <>
            <div className="text-sm text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
              {distanceErr}
            </div>
            <input
              type="number"
              placeholder="Isi jarak manual (km) dari Bekasi"
              value={manualDistance}
              onChange={(e) => setManualDistance(e.target.value)}
              className="w-full rounded-xl bg-white/70 px-4 py-3 border border-rose-200 outline-none focus:border-rose-500"
              data-testid="bf-manual-km"
            />
          </>
        )}
      </div>

      <textarea placeholder="Catatan tambahan (mood, request, dll)" rows={3}
        value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
        className="w-full rounded-xl bg-white/70 px-4 py-3 border border-rose-200 outline-none focus:border-rose-500" data-testid="bf-notes" />

      {/* Package */}
      <div>
        <label className="text-sm text-rose-700 font-semibold uppercase tracking-widest">Pilih Paket</label>
        <div className="grid md:grid-cols-2 gap-2 mt-2">
          {pkgs.map((p) => (
            <button key={p.id} type="button" onClick={() => setPkgId(p.id)}
              className={`text-left rounded-xl p-3 border transition-colors ${pkgId === p.id ? "bg-rose-600 text-white border-rose-700" : "bg-white/60 text-rose-900 border-rose-200 hover:bg-white"}`}
              data-testid={`bf-pkg-${p.name.toLowerCase()}`}>
              <div className="font-semibold">{p.name}</div>
              <div className={pkgId === p.id ? "text-white/80 text-sm" : "text-rose-600 text-sm"}>{rupiah(p.price)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Additionals */}
      <div>
        <label className="text-sm text-rose-700 font-semibold uppercase tracking-widest">Additional</label>
        <div className="grid md:grid-cols-2 gap-2 mt-2">
          {adds.map((a) => {
            const qty = selectedAdds[a.id] || 0;
            const checked = qty > 0;
            return (
              <div key={a.id} className={`rounded-xl p-3 border ${checked ? "border-rose-500 bg-rose-50" : "border-rose-200 bg-white/60"} flex items-center justify-between gap-3`}>
                <label className="flex items-center gap-2 flex-1 cursor-pointer">
                  <input type="checkbox" checked={checked}
                    onChange={(e) => setSelectedAdds({ ...selectedAdds, [a.id]: e.target.checked ? 1 : 0 })}
                    className="accent-rose-600" data-testid={`bf-add-${a.name.toLowerCase().replace(/\s+/g, "-")}`} />
                  <span className="text-sm text-rose-900">{a.name} <span className="text-rose-500">({rupiah(a.price)}/{a.unit})</span></span>
                </label>
                {checked && (
                  <input type="number" min="1" value={qty}
                    onChange={(e) => setSelectedAdds({ ...selectedAdds, [a.id]: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-16 rounded-lg px-2 py-1 border border-rose-200 bg-white text-center" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment */}
      <div className="rounded-2xl bg-gradient-to-br from-rose-100 to-pink-50 border border-rose-200 p-5 space-y-3">
        <div className="flex justify-between text-sm text-rose-900">
          <span>Paket {pkg?.name}</span><span>{rupiah(pkg?.price || 0)}</span>
        </div>
        <div className="flex justify-between text-sm text-rose-900">
          <span>Additional</span><span>{rupiah(additionalCost)}</span>
        </div>
        <div className="flex justify-between text-sm text-rose-900">
          <span>Transport</span><span>{rupiah(transportCost)}</span>
        </div>
        <div className="h-px bg-rose-300" />
        <div className="flex justify-between font-serif-display text-2xl text-rose-950">
          <span>Total</span><span data-testid="bf-total">{rupiah(total)}</span>
        </div>
      </div>

      {/* Payment method */}
      <div>
        <label className="text-sm text-rose-700 font-semibold uppercase tracking-widest">Metode Pembayaran</label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button type="button" onClick={() => setPaymentType("lunas")}
            className={`rounded-xl py-3 border ${paymentType === "lunas" ? "bg-rose-600 text-white border-rose-700" : "bg-white/60 text-rose-900 border-rose-200"}`}
            data-testid="bf-pay-lunas">Lunas</button>
          <button type="button" onClick={() => setPaymentType("dp")}
            className={`rounded-xl py-3 border ${paymentType === "dp" ? "bg-rose-600 text-white border-rose-700" : "bg-white/60 text-rose-900 border-rose-200"}`}
            data-testid="bf-pay-dp">DP</button>
        </div>
        {paymentType === "dp" && (
          <div className="mt-3 space-y-2" data-testid="bf-dp-options">
            <div className="grid grid-cols-3 gap-2">
              {["50000", "100000", "custom"].map((v) => (
                <button key={v} type="button" onClick={() => setDpChoice(v)}
                  className={`rounded-xl py-2 border ${dpChoice === v ? "bg-rose-500 text-white border-rose-600" : "bg-white/60 text-rose-900 border-rose-200"}`}>
                  {v === "custom" ? "Custom" : rupiah(parseInt(v))}
                </button>
              ))}
            </div>
            {dpChoice === "custom" && (
              <input type="number" min="50000" placeholder="Min 50.000" value={customDp}
                onChange={(e) => setCustomDp(e.target.value)}
                className="w-full rounded-xl bg-white/70 px-4 py-3 border border-rose-200" />
            )}
          </div>
        )}
        <div className="mt-2 text-sm text-rose-800">Bayar: <b>{rupiah(dpAmount)}</b></div>
      </div>

      {/* Bank */}
      <div className="grid md:grid-cols-2 gap-3">
        {BANKS.map((b) => (
          <div key={b.name} className="rounded-2xl bg-white/70 border border-rose-200 p-4">
            <div className="text-xs text-rose-600 uppercase tracking-widest font-semibold">{b.name}</div>
            <div className="mt-1 font-semibold text-rose-950 text-sm">{b.holder}</div>
            <div className="flex items-center justify-between mt-2">
              <div className="font-mono text-lg text-rose-800">{b.num}</div>
              <button onClick={() => copyText(b.num)} className="rounded-full p-2 hover:bg-rose-100 text-rose-700"
                data-testid={`bf-copy-${b.name.toLowerCase()}`}>
                <Copy size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <label className="flex items-center gap-2 cursor-pointer text-rose-800 rounded-xl bg-white/60 border border-rose-200 p-3">
        <Upload size={18} />
        <span className="text-sm">{proofFile ? proofFile.name : "Upload screenshot bukti transfer"}</span>
        <input type="file" accept="image/*" className="hidden"
          onChange={(e) => setProofFile(e.target.files?.[0])} data-testid="bf-proof" />
      </label>

      <button onClick={submit} disabled={submitting}
        className="w-full rounded-full bg-rose-600 hover:bg-rose-700 text-white py-4 font-medium text-lg shadow-xl shadow-rose-600/30 disabled:opacity-60"
        data-testid="bf-submit">
        {submitting ? "Mengirim..." : "💌 Confirm Booking"}
      </button>
    </div>
  );
};

export default BookingForm;
