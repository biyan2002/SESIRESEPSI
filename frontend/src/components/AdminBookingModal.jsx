import React, { useMemo, useState } from "react";
import { MapPin, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { rupiah } from "@/lib/utils";

const inputClass =
  "w-full rounded-xl border border-rose-200 bg-white/75 px-4 py-3 outline-none " +
  "focus:border-rose-500";

const AdminBookingModal = ({ packages, additionals, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: "",
    whatsapp: "",
    event_type: "",
    event_date: "",
    event_time: "",
    address: "",
    maps_link: "",
    notes: "",
    status: "pending",
  });
  const [packageId, setPackageId] = useState("");
  const [selectedAdds, setSelectedAdds] = useState({});
  const [distance, setDistance] = useState("");
  const [paymentType, setPaymentType] = useState("lunas");
  const [dpChoice, setDpChoice] = useState("50000");
  const [customDp, setCustomDp] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const selectedPackage = packages.find((item) => item.id === packageId);
  const distanceValue = Math.max(0, Number(distance) || 0);
  const transportRadius = selectedPackage?.name?.trim().toLowerCase() === "premium" ? 30 : 10;
  const transportCost = distanceValue <= transportRadius
    ? 0
    : Math.ceil(distanceValue - transportRadius) * 5000;

  const additionalsCost = useMemo(() => {
    return Object.entries(selectedAdds).reduce((total, [id, quantity]) => {
      const additional = additionals.find((item) => item.id === id);

      return additional && quantity > 0 ? total + additional.price * quantity : total;
    }, 0);
  }, [additionals, selectedAdds]);

  const total = (selectedPackage?.price || 0) + additionalsCost + transportCost;
  const paymentAmount = paymentType === "lunas"
    ? total
    : dpChoice === "custom"
      ? Number(customDp) || 0
      : Number(dpChoice);

  const updateDistance = (value) => {
    if (value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0)) {
      setDistance(value);
    }
  };

  const updateAdditional = (id, checked) => {
    setSelectedAdds({ ...selectedAdds, [id]: checked ? 1 : 0 });
  };

  const updateAdditionalQuantity = (id, quantity, maxQuantity) => {
    const safeQuantity = Math.min(Math.max(1, Number(quantity) || 1), maxQuantity || 10);
    setSelectedAdds({ ...selectedAdds, [id]: safeQuantity });
  };

  const saveBooking = async () => {
    if (
      !form.name ||
      !form.whatsapp ||
      !form.event_type ||
      !form.event_date ||
      !form.event_time ||
      !form.address ||
      !packageId ||
      distance === ""
    ) {
      toast.error("Lengkapi data bookingnya dulu ya kak.");
      return;
    }

    if (paymentType === "dp" && paymentAmount < 50000) {
      toast.error("Minimal DP Rp 50.000 ya.");
      return;
    }

    setSaving(true);

    try {
      let paymentProofPath = "";

      if (proofFile) {
        const uploadData = new FormData();
        uploadData.append("file", proofFile);

        const uploadResponse = await api.post("/upload?folder=payment", uploadData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        paymentProofPath = uploadResponse.data.path;
      }

      const selectedAdditionals = Object.entries(selectedAdds)
        .filter(([, quantity]) => quantity > 0)
        .map(([id, quantity]) => {
          const additional = additionals.find((item) => item.id === id);

          return {
            id,
            name: additional.name,
            price: additional.price,
            unit: additional.unit,
            qty: quantity,
            subtotal: additional.price * quantity,
          };
        });

      await api.post("/bookings", {
        ...form,
        distance_km: distanceValue,
        package_id: packageId,
        package_name: selectedPackage.name,
        package_price: selectedPackage.price,
        additionals: selectedAdditionals,
        transport_cost: transportCost,
        total_price: total,
        payment_type: paymentType,
        payment_amount: paymentAmount,
        payment_proof_path: paymentProofPath,
      });

      toast.success("Booking lama berhasil ditambahkan.");
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Booking belum bisa disimpan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end bg-rose-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      data-testid="admin-booking-modal-backdrop"
    >
      <section
        className="max-h-[92svh] w-full max-w-3xl overflow-y-auto rounded-t-3xl p-5 glass-heavy sm:rounded-3xl sm:p-7"
        onClick={(event) => event.stopPropagation()}
        data-testid="admin-booking-modal"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-600">
              Booking manual
            </p>
            <h2 className="mt-1 font-serif-display text-3xl text-rose-950">
              Tambahkan booking lama
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-rose-700 transition-colors hover:bg-rose-100"
            data-testid="admin-booking-close-button"
            aria-label="Tutup formulir booking manual"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Nama Pasangan Pria & Wanita"
            className={inputClass}
            data-testid="admin-booking-name-input"
          />
          <input
            value={form.whatsapp}
            onChange={(event) => setForm({ ...form, whatsapp: event.target.value })}
            placeholder="WhatsApp aktif"
            className={inputClass}
            data-testid="admin-booking-whatsapp-input"
          />
          <input
            value={form.event_type}
            onChange={(event) => setForm({ ...form, event_type: event.target.value })}
            placeholder="Jenis acara"
            className={inputClass}
            data-testid="admin-booking-event-type-input"
          />
          <label className="space-y-1 text-xs font-semibold text-rose-700">
            Tanggal berapa acaranya?
            <input
              type="date"
              value={form.event_date}
              onChange={(event) => setForm({ ...form, event_date: event.target.value })}
              className={inputClass}
              data-testid="admin-booking-date-input"
            />
          </label>
          <label className="space-y-1 text-xs font-semibold text-rose-700">
            Acaranya jam berapa kak?
            <input
              type="time"
              value={form.event_time}
              onChange={(event) => setForm({ ...form, event_time: event.target.value })}
              className={inputClass}
              data-testid="admin-booking-time-input"
            />
          </label>
          <select
            value={form.status}
            onChange={(event) => setForm({ ...form, status: event.target.value })}
            className={inputClass}
            data-testid="admin-booking-status-select"
          >
            <option value="pending">Belum Selesai</option>
            <option value="completed">Sudah Selesai</option>
          </select>
          <input
            value={form.address}
            onChange={(event) => setForm({ ...form, address: event.target.value })}
            placeholder="Alamat acara"
            className={`sm:col-span-2 ${inputClass}`}
            data-testid="admin-booking-address-input"
          />
          <input
            value={form.maps_link}
            onChange={(event) => setForm({ ...form, maps_link: event.target.value })}
            placeholder="Tulis link Google Mapsnya ya kak"
            className={`sm:col-span-2 ${inputClass}`}
            data-testid="admin-booking-maps-input"
          />
        </div>

        <div className="mt-5 rounded-2xl border border-rose-100 bg-white/50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-800">
            <MapPin size={16} /> Jarak dan transport
          </div>
          <input
            type="number"
            min="0"
            step="0.1"
            value={distance}
            onChange={(event) => updateDistance(event.target.value)}
            placeholder="Jarak rute (km)"
            className={`mt-3 ${inputClass}`}
            data-testid="admin-booking-distance-input"
          />
          <p className="mt-2 text-sm text-emerald-700" data-testid="admin-booking-transport-summary">
            Transport: <b>{rupiah(transportCost)}</b>
          </p>
          {selectedPackage?.name?.trim().toLowerCase() === "premium" && (
            <p className="mt-2 text-sm font-semibold text-rose-700" data-testid="admin-booking-premium-notice">
              Selamat, kakak dapat diskon biaya transport radius 30km
            </p>
          )}
        </div>

        <div className="mt-5">
          <p className="text-sm font-semibold uppercase tracking-widest text-rose-700">
            Pilih paket
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {packages.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPackageId(item.id)}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  packageId === item.id
                    ? "border-rose-700 bg-rose-600 text-white"
                    : "border-rose-200 bg-white/60 text-rose-950 hover:bg-white"
                }`}
                data-testid={`admin-booking-package-${item.name.toLowerCase()}`}
              >
                <b>{item.name}</b>
                <span className="ml-2 text-sm opacity-80">{rupiah(item.price)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <p className="text-sm font-semibold uppercase tracking-widest text-rose-700">
            Additional
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {additionals.map((item) => {
              const quantity = selectedAdds[item.id] || 0;

              return (
                <label
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-white/60 p-3"
                >
                  <span className="flex items-center gap-2 text-sm text-rose-900">
                    <input
                      type="checkbox"
                      checked={quantity > 0}
                      onChange={(event) => updateAdditional(item.id, event.target.checked)}
                      className="accent-rose-600"
                      data-testid={`admin-booking-additional-${item.id}`}
                    />
                    {item.name}
                  </span>
                  {quantity > 0 && (
                    <input
                      type="number"
                      min="1"
                      max={item.max_quantity || 10}
                      value={quantity}
                      onChange={(event) => {
                        updateAdditionalQuantity(
                          item.id,
                          event.target.value,
                          item.max_quantity,
                        );
                      }}
                      className="w-14 rounded-lg border border-rose-200 bg-white px-2 py-1 text-center"
                      data-testid={`admin-booking-additional-quantity-${item.id}`}
                    />
                  )}
                </label>
              );
            })}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-rose-700">
            Pembayaran
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { value: "lunas", label: "Lunas" },
              { value: "dp", label: "DP" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPaymentType(option.value)}
                className={`rounded-xl border py-3 text-sm font-semibold ${
                  paymentType === option.value
                    ? "border-rose-700 bg-rose-600 text-white"
                    : "border-rose-200 bg-white/70 text-rose-900"
                }`}
                data-testid={`admin-booking-payment-${option.value}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {paymentType === "dp" && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {["50000", "100000", "custom"].map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setDpChoice(choice)}
                  className={`rounded-xl border py-2 text-xs font-semibold ${
                    dpChoice === choice
                      ? "border-rose-700 bg-rose-500 text-white"
                      : "border-rose-200 bg-white/70 text-rose-900"
                  }`}
                  data-testid={`admin-booking-dp-${choice}`}
                >
                  {choice === "custom" ? "Custom" : rupiah(Number(choice))}
                </button>
              ))}
            </div>
          )}
          {paymentType === "dp" && dpChoice === "custom" && (
            <input
              type="number"
              min="50000"
              value={customDp}
              onChange={(event) => setCustomDp(event.target.value)}
              placeholder="DP custom, minimal Rp 50.000"
              className={`mt-3 ${inputClass}`}
              data-testid="admin-booking-custom-dp-input"
            />
          )}
          <div className="mt-4 flex justify-between text-sm text-rose-900">
            <span>Total booking</span>
            <b data-testid="admin-booking-total">{rupiah(total)}</b>
          </div>
          <div className="mt-1 flex justify-between text-sm text-rose-900">
            <span>Nominal dibayar</span>
            <b data-testid="admin-booking-payment-amount">{rupiah(paymentAmount)}</b>
          </div>
        </div>

        <textarea
          value={form.notes}
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
          placeholder="Catatan tambahan"
          rows={3}
          className={`mt-5 ${inputClass}`}
          data-testid="admin-booking-notes-input"
        />
        <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-xl border border-rose-200 bg-white/60 p-3 text-sm text-rose-800">
          <Upload size={18} />
          <span>{proofFile ? proofFile.name : "Bukti transfer (opsional untuk booking lama)"}</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => setProofFile(event.target.files?.[0] || null)}
            data-testid="admin-booking-proof-input"
          />
        </label>
        <button
          type="button"
          onClick={saveBooking}
          disabled={saving}
          className="mt-5 w-full rounded-full bg-rose-600 py-3.5 font-semibold text-white shadow-lg shadow-rose-600/25 transition-colors hover:bg-rose-700 disabled:opacity-60"
          data-testid="admin-booking-save-button"
        >
          {saving ? "Menyimpan..." : "Simpan booking"}
        </button>
      </section>
    </div>
  );
};

export default AdminBookingModal;