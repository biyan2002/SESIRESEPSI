import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import { api } from "@/lib/api";
import { rupiah } from "@/lib/utils";

const Packages = ({ onBook }) => {
  const [pkgs, setPkgs] = useState([]);
  const [adds, setAdds] = useState([]);

  useEffect(() => {
    api.get("/packages").then((r) => setPkgs(r.data));
    api.get("/additionals").then((r) => setAdds(r.data));
  }, []);

  return (
    <section id="packages" className="relative py-24 px-6" data-testid="packages-section">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <p className="text-xs tracking-[0.3em] uppercase text-rose-600 font-semibold mb-3">
            ✧ Pilih Paketnya ✧
          </p>
          <h2 className="font-serif-display text-4xl md:text-6xl text-rose-950 tracking-tight">
            Paket buat momen<br />
            <span className="italic text-rose-600">terspesialmu</span>
          </h2>
          <p className="mt-4 text-rose-800/70 max-w-xl mx-auto">
            Semua paket udah termasuk raw footage, editing kekinian, & vibe cinematic. Tinggal pilih durasi & tim kita yang ngeracik~
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pkgs.map((p, idx) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.12, duration: 0.6 }}
              whileHover={{ y: -8 }}
              className={`relative rounded-3xl p-8 flex flex-col ${
                p.highlight
                  ? "glass-heavy border-2 border-rose-400 shadow-2xl shadow-rose-400/30"
                  : "glass"
              }`}
              data-testid={`package-card-${p.name.toLowerCase()}`}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-rose-600 text-white text-xs font-semibold px-4 py-1.5 flex items-center gap-1 shadow-lg">
                  <Star size={12} fill="currentColor" /> PALING LARIS
                </div>
              )}
              <h3 className="font-serif-display text-3xl text-rose-950">{p.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-rose-700">{rupiah(p.price)}</span>
              </div>
              <div className="my-6 h-px bg-gradient-to-r from-transparent via-rose-300 to-transparent" />
              <ul className="space-y-3 flex-1">
                {p.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-rose-900">
                    <Check size={16} className="mt-0.5 text-rose-500 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => onBook && onBook(p)}
                data-testid={`book-btn-${p.name.toLowerCase()}`}
                className={`mt-8 rounded-full py-3 font-medium transition-colors ${
                  p.highlight
                    ? "bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30"
                    : "bg-white/70 hover:bg-white border border-rose-200 text-rose-800"
                }`}
              >
                Booking Paket Ini
              </button>
            </motion.div>
          ))}
        </div>

        {/* Additionals */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 glass rounded-3xl p-8"
        >
          <h3 className="font-serif-display text-2xl text-rose-950 mb-6">
            Additional biar makin lengkap 💫
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {adds.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl bg-white/60 p-5 border border-rose-100"
                data-testid={`additional-${a.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="text-sm text-rose-600 font-semibold uppercase tracking-wider">
                  {a.name}
                </div>
                <div className="text-2xl font-bold text-rose-900 mt-1">
                  {rupiah(a.price)}
                  <span className="text-sm font-normal text-rose-500">/{a.unit}</span>
                </div>
              </div>
            ))}
            <div className="rounded-2xl bg-white/60 p-5 border border-rose-100">
              <div className="text-sm text-rose-600 font-semibold uppercase tracking-wider">Transport</div>
              <div className="text-2xl font-bold text-rose-900 mt-1">
                {rupiah(5000)}<span className="text-sm font-normal text-rose-500">/km</span>
              </div>
              <div className="text-xs text-rose-700 mt-1">Free dalam radius 10 km dari base Bekasi</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Packages;
