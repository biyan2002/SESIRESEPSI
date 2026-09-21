import React, { useEffect, useState } from "react";
import { CreditCard, ImagePlus, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, fileUrl } from "@/lib/api";

const emptyAccount = { label: "", holder: "", number: "" };

const PaymentManager = () => {
  const [settings, setSettings] = useState({
    bank_accounts: [],
    ewallet_accounts: [],
    qris_image_path: "",
  });
  const [qrisFile, setQrisFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/payment-settings")
      .then((response) => setSettings(response.data))
      .catch(() => toast.error("Metode pembayaran belum bisa dimuat."));
  }, []);

  const addAccount = (key) => {
    setSettings({ ...settings, [key]: [...settings[key], { ...emptyAccount }] });
  };

  const updateAccount = (key, index, field, value) => {
    const updatedAccounts = [...settings[key]];
    updatedAccounts[index] = { ...updatedAccounts[index], [field]: value };
    setSettings({ ...settings, [key]: updatedAccounts });
  };

  const removeAccount = (key, index) => {
    setSettings({ ...settings, [key]: settings[key].filter((_, itemIndex) => itemIndex !== index) });
  };

  const save = async () => {
    if (settings.bank_accounts.some((item) => !item.label || !item.holder || !item.number)) {
      toast.error("Lengkapi semua data rekening bank dulu ya.");
      return;
    }
    if (settings.ewallet_accounts.some((item) => !item.label || !item.holder || !item.number)) {
      toast.error("Lengkapi semua data e-wallet dulu ya.");
      return;
    }

    setSaving(true);
    try {
      let qrisImagePath = settings.qris_image_path;
      if (qrisFile) {
        const uploadData = new FormData();
        uploadData.append("file", qrisFile);
        const upload = await api.post("/upload?folder=qris", uploadData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        qrisImagePath = upload.data.path;
      }
      const normalized = {
        ...settings,
        qris_image_path: qrisImagePath,
        bank_accounts: settings.bank_accounts.map((item) => ({ ...item, id: item.id || undefined })),
        ewallet_accounts: settings.ewallet_accounts.map((item) => ({ ...item, id: item.id || undefined })),
      };
      const response = await api.put("/payment-settings", normalized);
      setSettings(response.data);
      setQrisFile(null);
      toast.success("Metode pembayaran tersimpan.");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Metode pembayaran belum bisa disimpan.");
    } finally {
      setSaving(false);
    }
  };

  const renderAccounts = (key, title, testPrefix) => (
    <div className="rounded-2xl border border-rose-100 bg-white/45 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-serif-display text-xl text-rose-950">{title}</h3>
        <button
          type="button"
          onClick={() => addAccount(key)}
          className="rounded-full bg-rose-100 p-2 text-rose-700"
          data-testid={`${testPrefix}-add-button`}
          aria-label={`Tambah ${title}`}
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="mt-3 space-y-3">
        {settings[key].map((account, index) => (
          <div key={account.id || index} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <input
              value={account.label}
              onChange={(event) => updateAccount(key, index, "label", event.target.value)}
              placeholder="Nama metode"
              className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm"
              data-testid={`${testPrefix}-label-${index}`}
            />
            <input
              value={account.holder}
              onChange={(event) => updateAccount(key, index, "holder", event.target.value)}
              placeholder="Nama pemilik"
              className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm"
              data-testid={`${testPrefix}-holder-${index}`}
            />
            <input
              value={account.number}
              onChange={(event) => updateAccount(key, index, "number", event.target.value)}
              placeholder="Nomor rekening / akun"
              className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm"
              data-testid={`${testPrefix}-number-${index}`}
            />
            <button
              type="button"
              onClick={() => removeAccount(key, index)}
              className="rounded-xl bg-rose-50 p-2 text-red-600"
              data-testid={`${testPrefix}-delete-${index}`}
              aria-label={`Hapus ${account.label || title}`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <section className="space-y-5" data-testid="payment-manager">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-600">
          Pengaturan pembayaran
        </p>
        <h2 className="mt-1 font-serif-display text-3xl text-rose-950">
          Transfer, E-Wallet & QRIS
        </h2>
      </div>
      {renderAccounts("bank_accounts", "Transfer Bank", "payment-bank")}
      {renderAccounts("ewallet_accounts", "Bayar Pakai E-Wallet", "payment-ewallet")}
      <div className="rounded-2xl border border-rose-100 bg-white/45 p-4">
        <h3 className="font-serif-display text-xl text-rose-950">Bayar Pake QRIS</h3>
        <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-xl border border-rose-200 bg-white p-3 text-sm text-rose-800">
          <ImagePlus size={18} />
          <span>{qrisFile ? qrisFile.name : "Unggah atau ganti gambar QRIS"}</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => setQrisFile(event.target.files?.[0] || null)}
            data-testid="payment-qris-upload-input"
          />
        </label>
        {settings.qris_image_path && !qrisFile && (
          <img
            src={fileUrl(settings.qris_image_path)}
            alt="QRIS SESI RESEPSI"
            className="mt-3 h-48 w-48 rounded-xl object-contain"
            data-testid="payment-qris-image"
          />
        )}
        {settings.qris_image_path && (
          <button
            type="button"
            onClick={() => setSettings({ ...settings, qris_image_path: "" })}
            className="mt-3 text-sm font-semibold text-red-600"
            data-testid="payment-qris-remove-button"
          >
            Hapus gambar QRIS
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-rose-600 py-3.5 font-semibold text-white disabled:opacity-60"
        data-testid="payment-settings-save-button"
      >
        <Save size={17} /> {saving ? "Menyimpan..." : "Simpan metode pembayaran"}
      </button>
    </section>
  );
};

export default PaymentManager;