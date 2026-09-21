import React, { useEffect, useState } from "react";
import { Save, UsersRound, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

const BookingAssignmentsModal = ({ booking, members, onClose, onSaved }) => {
  const [assignments, setAssignments] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/bookings/${booking.id}/assignments`)
      .then((response) => {
        const initial = {};
        response.data.forEach((item) => {
          initial[item.crew_member_id] = {
            selected: true,
            job_title: item.job_title,
            notes: item.notes,
          };
        });
        setAssignments(initial);
      })
      .catch(() => toast.error("Penugasan belum bisa dimuat."));
  }, [booking.id]);

  const toggleMember = (memberId, checked) => {
    setAssignments({
      ...assignments,
      [memberId]: {
        selected: checked,
        job_title: assignments[memberId]?.job_title || "Crew Acara",
        notes: assignments[memberId]?.notes || "",
      },
    });
  };

  const updateAssignment = (memberId, key, value) => {
    setAssignments({
      ...assignments,
      [memberId]: { ...assignments[memberId], [key]: value },
    });
  };

  const saveAssignments = async () => {
    const payload = Object.entries(assignments)
      .filter(([, assignment]) => assignment.selected)
      .map(([crew_member_id, assignment]) => ({
        crew_member_id,
        job_title: assignment.job_title || "Crew Acara",
        notes: assignment.notes || "",
      }));

    setSaving(true);
    try {
      await api.put(`/bookings/${booking.id}/assignments`, { assignments: payload });
      toast.success("Penugasan Crew tersimpan.");
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Penugasan belum bisa disimpan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end bg-rose-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      data-testid="assignment-modal-backdrop"
    >
      <section
        className="max-h-[92svh] w-full max-w-2xl overflow-y-auto rounded-t-3xl p-5 glass-heavy sm:rounded-3xl sm:p-7"
        onClick={(event) => event.stopPropagation()}
        data-testid="assignment-modal"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-600">
              Tim untuk {booking.name}
            </p>
            <h3 className="mt-1 font-serif-display text-2xl text-rose-950">
              Atur penugasan Crew
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-rose-700 hover:bg-rose-100"
            data-testid="assignment-close-button"
            aria-label="Tutup penugasan Crew"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {members.map((member) => {
            const assignment = assignments[member.id] || {};
            return (
              <article
                key={member.id}
                className="rounded-2xl border border-rose-200 bg-white/60 p-4"
                data-testid={`assignment-member-${member.id}`}
              >
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={Boolean(assignment.selected)}
                    onChange={(event) => toggleMember(member.id, event.target.checked)}
                    className="accent-rose-600"
                    data-testid={`assignment-toggle-${member.id}`}
                  />
                  <span>
                    <b className="text-rose-950">{member.name}</b>
                    <span className="ml-2 text-sm text-rose-600">{member.role}</span>
                  </span>
                </label>
                {assignment.selected && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <input
                      value={assignment.job_title || ""}
                      onChange={(event) => {
                        updateAssignment(member.id, "job_title", event.target.value);
                      }}
                      placeholder="Peran di job ini"
                      className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm"
                      data-testid={`assignment-role-${member.id}`}
                    />
                    <input
                      value={assignment.notes || ""}
                      onChange={(event) => updateAssignment(member.id, "notes", event.target.value)}
                      placeholder="Catatan job"
                      className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm"
                      data-testid={`assignment-notes-${member.id}`}
                    />
                  </div>
                )}
              </article>
            );
          })}
        </div>
        <button
          type="button"
          onClick={saveAssignments}
          disabled={saving}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-rose-600 py-3 font-semibold text-white disabled:opacity-60"
          data-testid="assignment-save-button"
        >
          <UsersRound size={17} />
          {saving ? "Menyimpan..." : "Simpan penugasan"}
        </button>
      </section>
    </div>
  );
};

export default BookingAssignmentsModal;