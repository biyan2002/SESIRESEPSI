import React, { useState } from "react";
import { Edit3, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api, fileUrl } from "@/lib/api";
import { rupiah } from "@/lib/utils";

const emptyMember = {
  name: "",
  role: "",
  description: "",
  photo_path: "",
  order: 99,
};

const resolveImage = (path) => {
  if (!path) {
    return "";
  }

  return path.startsWith("/assets/") ? path : fileUrl(path);
};

const TeamManager = ({ members, bookings = [], reload }) => {
  const [editingMember, setEditingMember] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setPhotoFile(null);
    setEditingMember({ ...emptyMember });
  };

  const openEdit = (member) => {
    setPhotoFile(null);
    setEditingMember({ ...member });
  };

  const closeEditor = () => {
    setPhotoFile(null);
    setEditingMember(null);
  };

  const saveMember = async () => {
    if (!editingMember.name || !editingMember.role || !editingMember.description) {
      toast.error("Lengkapi nama, jabatan, dan jobdesk dulu ya.");
      return;
    }

    if (!editingMember.id && !photoFile) {
      toast.error("Tambahkan foto untuk personel baru ya.");
      return;
    }

    setSaving(true);

    try {
      let photoPath = editingMember.photo_path;

      if (photoFile) {
        const uploadData = new FormData();
        uploadData.append("file", photoFile);

        const uploadResponse = await api.post("/upload?folder=team", uploadData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        photoPath = uploadResponse.data.path;
      }

      const payload = {
        ...editingMember,
        order: Number(editingMember.order) || 99,
        photo_path: photoPath,
      };

      if (editingMember.id) {
        await api.put(`/team/${editingMember.id}`, payload);
      } else {
        await api.post("/team", payload);
      }

      toast.success("Data tim berhasil disimpan.");
      closeEditor();
      reload();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Data tim belum bisa disimpan.");
    } finally {
      setSaving(false);
    }
  };

  const deleteMember = async (member) => {
    if (!window.confirm(`Hapus ${member.name} dari tim?`)) {
      return;
    }

    try {
      await api.delete(`/team/${member.id}`);
      toast.success("Personel dihapus dari tim.");
      reload();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Personel belum bisa dihapus.");
    }
  };

  const memberFee = (memberId) => {
    return bookings.reduce((total, booking) => {
      const assignment = booking.assigned_crew?.find((item) => item.member_id === memberId);
      return total + (assignment?.team_fee || 0);
    }, 0);
  };

  return (
    <section className="space-y-5" data-testid="team-manager">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-600">
            Personel & tim
          </p>
          <h2 className="mt-1 font-serif-display text-3xl text-rose-950">
            Kelola Tim Kami
          </h2>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-600/20 transition-colors hover:bg-rose-700"
          data-testid="team-add-button"
        >
          <Plus size={16} /> Tambah personel
        </button>
      </div>

      <p className="text-sm text-rose-800/75" data-testid="team-capacity-info">
        Total personel aktif: <b>{members.length}</b>. Jumlah ini menjadi batas slot kalender.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {members.map((member) => (
          <article
            key={member.id}
            className="overflow-hidden rounded-2xl glass"
            data-testid={`team-manager-card-${member.id}`}
          >
            <div className="aspect-[16/10] bg-rose-100">
              {member.photo_path ? (
                <img
                  src={resolveImage(member.photo_path)}
                  alt={member.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-rose-400">
                  <ImagePlus size={26} />
                </div>
              )}
            </div>
            <div className="p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">
                {member.role}
              </p>
              <h3 className="mt-1 font-serif-display text-xl text-rose-950">
                {member.name}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-rose-800/80">
                {member.description}
              </p>
              <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800" data-testid={`team-fee-${member.id}`}>
                Fee job terjadwal: <b>{rupiah(memberFee(member.id))}</b>
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(member)}
                  className="rounded-full bg-white/75 p-2 text-rose-700 transition-colors hover:bg-white"
                  data-testid={`team-edit-button-${member.id}`}
                  aria-label={`Edit ${member.name}`}
                >
                  <Edit3 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => deleteMember(member)}
                  className="rounded-full bg-white/75 p-2 text-red-600 transition-colors hover:bg-red-50"
                  data-testid={`team-delete-button-${member.id}`}
                  aria-label={`Hapus ${member.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {editingMember && (
        <div
          className="fixed inset-0 z-[70] flex items-end bg-rose-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={closeEditor}
          data-testid="team-editor-backdrop"
        >
          <section
            className="w-full max-w-lg rounded-t-3xl p-5 glass-heavy sm:rounded-3xl sm:p-7"
            onClick={(event) => event.stopPropagation()}
            data-testid="team-editor-modal"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-600">
                  Personel
                </p>
                <h3 className="mt-1 font-serif-display text-2xl text-rose-950">
                  {editingMember.id ? "Ubah data tim" : "Tambah personel baru"}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-full p-2 text-rose-700 transition-colors hover:bg-rose-100"
                data-testid="team-editor-close-button"
                aria-label="Tutup editor personel"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <input
                value={editingMember.name}
                onChange={(event) => {
                  setEditingMember({ ...editingMember, name: event.target.value });
                }}
                placeholder="Nama personel"
                className="w-full rounded-xl border border-rose-200 bg-white/75 px-4 py-3 outline-none focus:border-rose-500"
                data-testid="team-name-input"
              />
              <input
                value={editingMember.role}
                onChange={(event) => {
                  setEditingMember({ ...editingMember, role: event.target.value });
                }}
                placeholder="Jabatan"
                className="w-full rounded-xl border border-rose-200 bg-white/75 px-4 py-3 outline-none focus:border-rose-500"
                data-testid="team-role-input"
              />
              <textarea
                value={editingMember.description}
                onChange={(event) => {
                  setEditingMember({ ...editingMember, description: event.target.value });
                }}
                placeholder="Deskripsi jobdesk"
                rows={4}
                className="w-full rounded-xl border border-rose-200 bg-white/75 px-4 py-3 outline-none focus:border-rose-500"
                data-testid="team-description-input"
              />
              <input
                type="number"
                min="0"
                value={editingMember.order}
                onChange={(event) => {
                  setEditingMember({ ...editingMember, order: event.target.value });
                }}
                placeholder="Urutan tampil"
                className="w-full rounded-xl border border-rose-200 bg-white/75 px-4 py-3 outline-none focus:border-rose-500"
                data-testid="team-order-input"
              />
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-rose-200 bg-white/60 p-3 text-sm text-rose-800">
                <ImagePlus size={18} />
                <span>{photoFile ? photoFile.name : "Pilih foto personel"}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(event) => setPhotoFile(event.target.files?.[0] || null)}
                  data-testid="team-photo-input"
                />
              </label>
              {editingMember.photo_path && !photoFile && (
                <img
                  src={resolveImage(editingMember.photo_path)}
                  alt="Foto personel saat ini"
                  className="h-32 w-full rounded-xl object-cover"
                  data-testid="team-current-photo"
                />
              )}
              <button
                type="button"
                onClick={saveMember}
                disabled={saving}
                className="w-full rounded-full bg-rose-600 py-3.5 font-semibold text-white shadow-lg shadow-rose-600/25 transition-colors hover:bg-rose-700 disabled:opacity-60"
                data-testid="team-save-button"
              >
                {saving ? "Menyimpan..." : "Simpan personel"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
};

export default TeamManager;