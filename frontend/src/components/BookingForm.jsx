import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Copy, Upload, MapPin, ExternalLink, Minus, Plus, X } from "lucide-react";
import { api, fileUrl } from "@/lib/api";
import { rupiah } from "@/lib/utils";

const BookingForm = ({ selectedPackage }) => {
  const [pkgs, setPkgs] = useState([]);
  const [adds, setAdds] = useState([]);
  const [availability, setAvailability] = useState({});
  const [paymentSettings, setPaymentSettings] = useState({
    bank_accounts: [],
    ewallet_accounts: [],
    qris_image_path: "",
  });
  const [selectedAdds, setSelectedAdds] = useState({});
  const [pkgId, setPkgId] = useState("");
  const [form, setForm] = useState({
    name: "", whatsapp: "", event_type: "", event_date: "", event_time: "",
    address: "", maps_link: "", notes: "",
  });
  const [manualDistance, setManualDistance] = useState("");
  const [paymentType, setPaymentType] = useState("dp");
  const [paymentMethod, setPaymentMethod] = useState("bank");
  const [dpChoice, setDpChoice] = useState("50000");
  const [customDp, setCustomDp] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState("");
  const [socialModalOpen, setSocialModalOpen] = useState(false);
  const [socialUsername, setSocialUsername] = useState("");
  const [socialPlatforms, setSocialPlatforms] = useState([]);

  useEffect(() => {
    api.get("/packages").then((r) => setPkgs(r.data));
    api.get("/additionals").then((r) => setAdds(r.data));
    api.get("/payment-settings").then((response) => setPaymentSettings(response.data));
    api.get("/availability").then((response) => {
      const availabilityByDate = {};

      response.data.forEach((item) => {
        availabilityByDate[item.date] = item;
      });

      setAvailability(availabilityByDate);
    });
  }, []);

  useEffect(() => {
    if (selectedPackage) setPkgId(selectedPackage.id);
  }, [selectedPackage]);

  const pkg = pkgs.find((p) => p.id === pkgId);
  const transportRadius = pkg?.name?.trim().toLowerCase() === "premium" ? 30 : 10;
  const selectedDateStatus = form.event_date
    ? availability[form.event_date]?.status === "full"
      ? "full"
      : "available"
    : "";

  const routeDistance = useMemo(() => {
    const enteredDistance = Number(manualDistance);

    if (!Number.isFinite(enteredDistance) || enteredDistance < 0) {
      return 0;
    }

    return enteredDistance;
  }, [manualDistance]);

  const transportCost = useMemo(() => {
    if (routeDistance <= transportRadius) {
      return 0;
    }

    return Math.ceil(routeDistance - transportRadius) * 5000;
  }, [routeDistance, transportRadius]);

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

  const updateManualDistance = (value) => {
    if (value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0)) {
      setManualDistance(value);
    }
  };

  const updateAdditionalQuantity = (id, quantity, maxQuantity) => {
    const safeQuantity = Math.min(Math.max(1, Number(quantity) || 1), maxQuantity || 10);
    setSelectedAdds({ ...selectedAdds, [id]: safeQuantity });
  };

  const copyText = (t) => {
    navigator.clipboard.writeText(t);
    toast.success("Nomor rekening kesalin~ ✨");
  };

  const submit = async () => {
    if (!form.name || !form.whatsapp || !form.event_date || !pkgId)
      return toast.error("Lengkapi datanya dulu ya kak~");
    if (selectedDateStatus === "full")
      return toast.error("Yahh maaf banget ka, tanggal yang kakak pilih sudah full");
    if (paymentType === "dp" && dpAmount < 50000)
      return toast.error("Minimal DP Rp 50.000 ya");
    if (manualDistance === "" || Number(manualDistance) < 0)
      return toast.error("Isi jarak rute dari Google Maps dulu ya kak");
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

      const bookingResponse = await api.post("/bookings", {
        ...form,
        distance_km: routeDistance,
        package_id: pkgId,
        package_name: pkg.name,
        package_price: pkg.price,
        additionals: addsPayload,
        transport_cost: transportCost,
        total_price: total,
        payment_type: paymentType,
        payment_amount: dpAmount,
        payment_proof_path: up.data.path,
        payment_method: paymentMethod,
        social_username: socialUsername,
        social_platforms: socialPlatforms,
      });
      setInvoiceUrl(bookingResponse.data.invoice_url || "");
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
        {invoiceUrl && (
          <a
            href={`${process.env.REACT_APP_BACKEND_URL}${invoiceUrl}`}
            className="mb-3 inline-flex rounded-full bg-rose-100 px-6 py-3 font-semibold text-rose-800"
            data-testid="booking-download-invoice"
          >
            Download Invoice
          </a>
        )}
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
    <div
      className="space-y-5 rounded-[22px] p-4 glass-heavy sm:space-y-6 sm:p-6 md:p-10"
      data-testid="booking-form"
    >
      <h3 className="font-serif-display text-3xl text-rose-950">
        Form Booking 💐
      </h3>

      <div className="grid md:grid-cols-2 gap-4">
        <input placeholder="Nama Pasangan Pria & Wanita" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="rounded-xl bg-white/70 px-4 py-3 border border-rose-200 outline-none focus:border-rose-500" data-testid="bf-name" />
        <input placeholder="WhatsApp aktif" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
          className="rounded-xl bg-white/70 px-4 py-3 border border-rose-200 outline-none focus:border-rose-500" data-testid="bf-wa" />
        <input placeholder="Jenis acara (Resepsi/Akad/dll)" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}
          className="rounded-xl bg-white/70 px-4 py-3 border border-rose-200 outline-none focus:border-rose-500" data-testid="bf-type" />
        <label className="space-y-1 text-xs font-semibold text-rose-700">
          Tanggal berapa acaranya?
          <input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })}
            className="w-full rounded-xl bg-white/70 px-4 py-3 border border-rose-200 outline-none focus:border-rose-500" data-testid="bf-date" />
        </label>
        <label className="space-y-1 text-xs font-semibold text-rose-700">
          Acaranya jam berapa kak?
          <input type="time" value={form.event_time} onChange={(e) => setForm({ ...form, event_time: e.target.value })}
            className="w-full rounded-xl bg-white/70 px-4 py-3 border border-rose-200 outline-none focus:border-rose-500" data-testid="bf-time" />
        </label>
        <input placeholder="Alamat acara" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
          className="rounded-xl bg-white/70 px-4 py-3 border border-rose-200 outline-none focus:border-rose-500" data-testid="bf-address" />
        <input placeholder="Tulis link Google Mapsnya ya kak" value={form.maps_link} onChange={(e) => setForm({ ...form, maps_link: e.target.value })}
          className="md:col-span-2 rounded-xl bg-white/70 px-4 py-3 border border-rose-200 outline-none focus:border-rose-500" data-testid="bf-venue-maps" />
        <input
          placeholder="Username social media kamu"
          value={socialUsername}
          onChange={(e) => setSocialUsername(e.target.value)}
          className="rounded-xl bg-white/70 px-4 py-3 border border-rose-200 outline-none focus:border-rose-500"
          data-testid="bf-social-username"
        />
        <button
          type="button"
          onClick={() => setSocialModalOpen(true)}
          className="rounded-xl border border-rose-200 bg-white/70 px-4 py-3 text-left text-sm font-semibold text-rose-800"
          data-testid="bf-social-platform-button"
        >
          {socialPlatforms.length > 0 ? socialPlatforms.join(" + ") : "Pilih Instagram / TikTok"}
        </button>
      </div>

      {selectedDateStatus === "full" && (
        <p className="rounded-xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-800" data-testid="bf-availability-message">
          Yahh maaf banget ka, tanggal yang kakak pilih sudah full
        </p>
      )}
      {selectedDateStatus === "available" && (
        <p className="rounded-xl bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-800" data-testid="bf-availability-message">
          Selamat, tanggal yang kakak pilih masih tersedia, silahkan di keep dulu ya!
        </p>
      )}

      <div className="space-y-3 rounded-2xl bg-white/50 p-4 border border-rose-100">
        <div className="flex items-center gap-2 text-rose-700 text-sm font-semibold">
          <MapPin size={16} /> Jarak venue dari base SESI RESEPSI
        </div>
        <p
          className="text-sm leading-relaxed text-rose-800/80"
          data-testid="bf-distance-instruction"
        >
          Buka Google Maps, masukkan venue sebagai tujuan dari alamat base kami, lalu tulis
          jarak rutenya di bawah ini ya kak.
        </p>
        <a
          href="https://maps.app.goo.gl/Dodc41PSqhoQdTVa6"
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-md shadow-rose-600/20 transition-colors hover:bg-rose-700 sm:w-auto"
          data-testid="bf-open-distance-map"
        >
          <MapPin size={16} />
          Buka lokasi base di Google Maps
          <ExternalLink size={14} />
        </a>
        <p
          className="text-xs leading-relaxed text-rose-700/80"
          data-testid="bf-base-address"
        >
          Base: Jl. Tanjakan Sa'ar No.66, Jatiluhur, Jatiasih, Kota Bekasi, Jawa Barat 17425.
        </p>
        <input
          type="number"
          min="0"
          step="0.1"
          placeholder="Tulis jarak rute dari Google Maps (km)"
          value={manualDistance}
          onChange={(e) => updateManualDistance(e.target.value)}
          className="w-full rounded-xl bg-white/70 px-4 py-3 border border-rose-200 outline-none focus:border-rose-500"
          data-testid="bf-manual-km"
        />
        {manualDistance !== "" && Number(manualDistance) >= 0 && (
          <div
            className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
            data-testid="bf-distance-summary"
          >
            ✅ Jarak rute: <b>{routeDistance} km</b> • Transport: <b>{rupiah(transportCost)}</b>
          </div>
        )}
        {pkg?.name?.trim().toLowerCase() === "premium" && (
          <p className="rounded-xl bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-800" data-testid="bf-premium-transport-notice">
            Selamat, kakak dapat diskon biaya transport radius 30km
          </p>
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
                  <div className="flex items-center gap-1" data-testid={`bf-add-quantity-${a.id}`}>
                    <button
                      type="button"
                      onClick={() => updateAdditionalQuantity(a.id, qty - 1, a.max_quantity)}
                      disabled={qty <= 1}
                      className="rounded-lg border border-rose-200 bg-white p-1 text-rose-700 disabled:opacity-40"
                      data-testid={`bf-add-minus-${a.id}`}
                      aria-label={`Kurangi jumlah ${a.name}`}
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={a.max_quantity || 10}
                      value={qty}
                      onChange={(e) => updateAdditionalQuantity(a.id, e.target.value, a.max_quantity)}
                      className="w-12 rounded-lg border border-rose-200 bg-white px-1 py-1 text-center"
                      data-testid={`bf-add-quantity-input-${a.id}`}
                    />
                    <button
                      type="button"
                      onClick={() => updateAdditionalQuantity(a.id, qty + 1, a.max_quantity)}
                      disabled={qty >= (a.max_quantity || 10)}
                      className="rounded-lg border border-rose-200 bg-white p-1 text-rose-700 disabled:opacity-40"
                      data-testid={`bf-add-plus-${a.id}`}
                      aria-label={`Tambah jumlah ${a.name}`}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
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

      <div>
        <label className="text-sm text-rose-700 font-semibold uppercase tracking-widest">Cara Bayar</label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[
            { value: "bank", label: "TRANSFER BANK" },
            { value: "ewallet", label: "E-WALLET" },
            { value: "qris", label: "QRIS" },
          ].map((method) => (
            <button
              key={method.value}
              type="button"
              onClick={() => setPaymentMethod(method.value)}
              className={`rounded-xl px-2 py-3 text-xs font-semibold ${
                paymentMethod === method.value
                  ? "bg-rose-600 text-white"
                  : "border border-rose-200 bg-white/60 text-rose-900"
              }`}
              data-testid={`bf-payment-method-${method.value}`}
            >
              {method.label}
            </button>
          ))}
        </div>
      </div>

      {paymentMethod !== "qris" && (
        <div className="grid gap-3 md:grid-cols-2" data-testid="bf-payment-accounts">
          {(paymentMethod === "bank" ? paymentSettings.bank_accounts : paymentSettings.ewallet_accounts).map((account) => (
            <div key={account.id} className="rounded-2xl border border-rose-200 bg-white/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-rose-600">{account.label}</div>
              <div className="mt-1 text-sm font-semibold text-rose-950">{account.holder}</div>
              <div className="mt-2 flex items-center justify-between">
                <div className="font-mono text-lg text-rose-800">{account.number}</div>
                <button onClick={() => copyText(account.number)} className="rounded-full p-2 text-rose-700 hover:bg-rose-100" data-testid={`bf-copy-${account.id}`} aria-label={`Salin ${account.label}`}><Copy size={16} /></button>
              </div>
            </div>
          ))}
          {paymentMethod === "ewallet" && paymentSettings.ewallet_accounts.length === 0 && (
            <p className="text-sm text-rose-700">E-Wallet belum tersedia. Pilih metode lain ya kak.</p>
          )}
        </div>
      )}
      {paymentMethod === "qris" && (
        <div className="rounded-2xl border border-rose-200 bg-white/70 p-4 text-center" data-testid="bf-qris-payment">
          {paymentSettings.qris_image_path ? <img src={fileUrl(paymentSettings.qris_image_path)} alt="QRIS SESI RESEPSI" className="mx-auto max-h-64 rounded-xl object-contain" /> : <p className="text-sm text-rose-700">QRIS belum diatur oleh admin.</p>}
        </div>
      )}

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
      {socialModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-end bg-rose-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setSocialModalOpen(false)} data-testid="bf-social-modal-backdrop">
          <div className="w-full max-w-sm rounded-t-3xl p-6 glass-heavy sm:rounded-3xl" onClick={(event) => event.stopPropagation()} data-testid="bf-social-modal">
            <div className="flex items-center justify-between"><h4 className="font-serif-display text-2xl text-rose-950">Pilih sosial media</h4><button type="button" onClick={() => setSocialModalOpen(false)} className="rounded-full p-2 text-rose-700" data-testid="bf-social-modal-close" aria-label="Tutup pilihan sosial media"><X size={18} /></button></div>
            <div className="mt-4 grid gap-2">
              {["Instagram", "TikTok", "Instagram + TikTok"].map((option) => <button key={option} type="button" onClick={() => { setSocialPlatforms(option.split(" + ")); setSocialModalOpen(false); }} className="rounded-xl border border-rose-200 bg-white/70 px-4 py-3 text-left font-semibold text-rose-900" data-testid={`bf-social-option-${option.toLowerCase().replace(/[^a-z]+/g, "-")}`}>{option}</button>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingForm;
