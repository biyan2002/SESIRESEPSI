import React from "react";
import { motion } from "framer-motion";
import { Camera, Sparkles } from "lucide-react";

const About = () => {
  return (
    <section
      id="team"
      className="scroll-section relative py-24 px-6 overflow-hidden"
      data-testid="about-section"
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-xs tracking-[0.3em] uppercase text-rose-600 font-semibold mb-3">
            ✧ Meet The Team ✧
          </p>
          <h2 className="font-serif-display text-4xl md:text-6xl text-rose-950 tracking-tight">
            Di balik lensa <span className="italic text-rose-600">SESI RESEPSI</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {[
            {
              name: "FIKABI SA'DI MARTYANSYAH (Biyan)",
              role: "Owner & Orang di Balik Kamera",
              icon: Camera,
              img: "/assets/fikabi-portrait.png",
              desc: "Yang bakal ngabadiin setiap detik lucu, romantis, & baper kamu jadi frame cinematic.",
            },
            {
              name: "CASTI RAHAYU (Asty)",
              role: "Manager & Admin",
              icon: Sparkles,
              img: "/assets/couple.png",
              desc: "Bakal nemenin kamu dari chat pertama sampe hari H, biar semua smooth & seru.",
            },
          ].map((m, i) => (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.7 }}
              whileHover={{ y: -6 }}
              className="glass rounded-3xl overflow-hidden group"
              data-testid={`team-${i === 0 ? "biyan" : "asty"}`}
            >
              <div className="aspect-[4/5] overflow-hidden">
                <img
                  src={m.img}
                  alt={m.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 text-rose-600 text-xs uppercase tracking-widest font-semibold mb-2">
                  <m.icon size={14} /> {m.role}
                </div>
                <h3 className="font-serif-display text-2xl text-rose-950">{m.name}</h3>
                <p className="mt-3 text-rose-800/80 text-sm">{m.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default About;
