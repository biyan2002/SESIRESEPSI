import React, { useEffect, useState } from "react";
import { KeyRound, Plus, Trash2, UserRoundCog } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

const emptyAccount = {
  member_id: "",
  username: "",
  password: "",
  active: true,
};

const CrewManager = ({ members }) => {
  const [accounts, setAccounts] = useState([]);
  const [editor, setEditor] = useState(null);

  const loadAccounts = async () => {
    const response = await api.get("/crew-accounts");
    setAccounts(response.data);
  };

  useEffect(() => {
    loadAccounts().catch(() => toast.error("Akun Crew belum bisa dimuat."));
  }, []);

  const saveAccount = async () => {
    if (!editor.member_id || !editor.username || (!editor.id && !editor.password)) {
      toast.error("Pilih personel, username, dan password dulu ya.");
      return;
    }

    try {
      if (editor.id) {
        const payload = {
          member_id: editor.member_id,
          username: editor.username,
          active: editor.active,
        };
        if (editor.password) {
          payload.password = editor.password;
        }
        await api.put(`/crew-accounts/${editor.id}`, payload);
      } else {
        await api.post("/crew-accounts", editor);
      }
      toast.success("Akun Crew tersimpan.");
      setEditor(null);
      loadAccounts();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Akun Crew belum bisa disimpan.");
    }
  };

  const deleteAccount = async (account) => {
    if (!window.confirm(`Hapus akses ${account.username}?`)) {
      return;
    }
    await api.delete(`/crew-accounts/${account.id}`);
    toast.success("Akses Crew dihapus.");
    loadAccounts();
  };

  const memberName = (memberId) => {
    return members.find((member) => member.id === memberId)?.name || "Personel tidak ditemukan";
  };

  return (
    <section className="space-y-5" data-testid="crew-manager">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-600">
            Akses anggota
          </p>
          <h2 className="mt-1 font-serif-display text-3xl text-rose-950">
            Ruang Crew
          </h2>
          <p className="mt-1 text-sm text-rose-800/75">
            Buat akun untuk anggota agar mereka hanya melihat job yang ditugaskan.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditor({ ...emptyAccount })}
          className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white"
          data-testid="crew-add-account-button"
        >
          <Plus size={16} /> Buat akun Crew
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {accounts.map((account) => (
          <article
            key={account.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 glass"
            data-testid={`crew-account-${account.id}`}
          >
            <div>
              <p className="font-serif-display text-xl text-rose-950">
                {memberName(account.member_id)}
              </p>
              <p className="text-sm text-rose-700">@{account.username}</p>
              <p className="mt-1 text-xs font-semibold text-rose-600">
                {account.active ? "AKTIF" : "DINONAKTIFKAN"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditor({ ...account, password: "" })}
                className="rounded-full bg-white/75 p-2 text-rose-700"
                data-testid={`crew-edit-account-${account.id}`}
                aria-label={`Ubah akun ${account.username}`}
              >
                <UserRoundCog size={17} />
              </button>
              <button
                type="button"
                onClick={() => deleteAccount(account)}
                className="rounded-full bg-white/75 p-2 text-red-600"
                data-testid={`crew-delete-account-${account.id}`}
                aria-label={`Hapus akun ${account.username}`}
              >
                <Trash2 size={17} />
              </button>
            </div>
          </article>
        ))}
      </div>

      {editor && (
        <div
          className="fixed inset-0 z-[70] flex items-end bg-rose-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setEditor(null)}
          data-testid="crew-editor-backdrop"
        >
          <div
            className="w-full max-w-md rounded-t-3xl p-6 glass-heavy sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
            data-testid="crew-editor-modal"
          >
            <h3 className="font-serif-display text-2xl text-rose-950">
              {editor.id ? "Ubah akun Crew" : "Akun Crew baru"}
            </h3>
            <div className="mt-5 space-y-3">
              <select
                value={editor.member_id}
                onChange={(event) => setEditor({ ...editor, member_id: event.target.value })}
                className="w-full rounded-xl border border-rose-200 bg-white/75 px-4 py-3"
                data-testid="crew-member-select"
              >
                <option value="">Pilih personel</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
              <input
                value={editor.username}
                onChange={(event) => setEditor({ ...editor, username: event.target.value })}
                placeholder="Username Crew"
                className="w-full rounded-xl border border-rose-200 bg-white/75 px-4 py-3"
                data-testid="crew-username-input"
              />
              <input
                type="password"
                value={editor.password}
                onChange={(event) => setEditor({ ...editor, password: event.target.value })}
                placeholder={editor.id ? "Password baru (opsional)" : "Password minimal 6 karakter"}
                className="w-full rounded-xl border border-rose-200 bg-white/75 px-4 py-3"
                data-testid="crew-password-input"
              />
              {editor.id && (
                <label className="flex items-center gap-2 text-sm text-rose-800">
                  <input
                    type="checkbox"
                    checked={editor.active}
                    onChange={(event) => setEditor({ ...editor, active: event.target.checked })}
                    data-testid="crew-active-toggle"
                  />
                  Akun Crew aktif
                </label>
              )}
              <button
                type="button"
                onClick={saveAccount}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-rose-600 py-3 font-semibold text-white"
                data-testid="crew-save-account-button"
              >
                <KeyRound size={16} /> Simpan akses Crew
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default CrewManager;