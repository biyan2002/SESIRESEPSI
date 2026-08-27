import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star, Send, Upload } from "lucide-react";
import { toast } from "sonner";
import { api, fileUrl } from "@/lib/api";

const Testimonials = () => {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: "", message: "", rating: 5 });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get("/testimonials").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.name || !form.message) return toast.error("Isi nama & pesannya dulu ya kak~");
    setBusy(true);
    try {
      let media_paths = [];
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        const up = await api.post("/upload?folder=testimonials", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        media_paths = [up.data.path];
      }
      await api.post("/testimonials", { ...form, media_paths });
      toast.success("Makasih banyak testimoninya kak! 💕");
      setForm({ name: "", message: "", rating: 5 });
      setFile(null);
      load();
    } catch (e) {
      toast.error("Yah gagal, coba lagi ya");
    }
    setBusy(false);
  };

  return (
    <section
      id="testimonials"
      className="scroll-section relative py-24 px-6"
      data-testid="testimonial-section"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <p className="text-xs tracking-[0.3em] uppercase text-rose-600 font-semibold mb-3">
            ✧ Cerita Mereka ✧
          </p>
          <h2 className="font-serif-display text-4xl md:text-6xl text-rose-950 tracking-tight">
            Kata pasangan yang<br /> <span className="italic text-rose-600">udah handle bareng</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {items.length === 0 && (
            <div className="col-span-full text-center text-rose-800/60 italic py-10">
              Belum ada testimoni. Kamu bisa jadi yang pertama nih kak ✨
            </div>
          )}
          {items.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-3xl p-6"
            >
              <div className="flex gap-1 text-amber-500 mb-3">
                {Array.from({ length: t.rating || 5 }).map((_, i) => (
                  <Star key={i} size={16} fill="currentColor" />
                ))}
              </div>
              <p className="text-rose-900/90 italic leading-relaxed">"{t.message}"</p>
              {t.media_paths?.[0] && (
                <div className="mt-4 rounded-2xl overflow-hidden aspect-video bg-rose-100">
                  {t.media_paths[0].match(/\.(mp4|mov|webm)$/i) ? (
                    <video src={fileUrl(t.media_paths[0])} controls className="w-full h-full object-cover" />
                  ) : (
                    <img src={fileUrl(t.media_paths[0])} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
              )}
              <div className="mt-4 text-sm font-semibold text-rose-800">— {t.name}</div>
            </motion.div>
          ))}
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-heavy rounded-3xl p-8 max-w-2xl mx-auto"
          data-testid="testimonial-form"
        >
          <h3 className="font-serif-display text-2xl text-rose-950 mb-4">Kirim testimoni yuk~</h3>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Nama kamu"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl bg-white/70 px-4 py-3 border border-rose-200 focus:border-rose-500 outline-none"
              data-testid="testi-name"
            />
            <textarea
              placeholder="Cerita pengalaman bareng SESI RESEPSI dong~"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={4}
              className="w-full rounded-xl bg-white/70 px-4 py-3 border border-rose-200 focus:border-rose-500 outline-none"
              data-testid="testi-message"
            />
            <div className="flex items-center gap-3">
              <span className="text-sm text-rose-800">Rating:</span>
              {[1, 2, 3, 4, 5].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm({ ...form, rating: r })}
                  className={r <= form.rating ? "text-amber-500" : "text-rose-200"}
                >
                  <Star fill="currentColor" size={22} />
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-rose-800">
              <Upload size={18} />
              <span className="text-sm">{file ? file.name : "Upload foto/video (opsional)"}</span>
              <input
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0])}
                data-testid="testi-file"
              />
            </label>
            <button
              onClick={submit}
              disabled={busy}
              className="w-full rounded-full bg-rose-600 hover:bg-rose-700 text-white py-3 font-medium flex items-center justify-center gap-2 disabled:opacity-60"
              data-testid="testi-submit"
            >
              <Send size={16} /> Kirim Testimoni
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
