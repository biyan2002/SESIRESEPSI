import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Sparkles } from "lucide-react";
import { api, fileUrl } from "@/lib/api";

const defaultMembers = [
  {
    id: "biyan",
    name: "FIKABI SA'DI MARTYANSYAH (Biyan)",
    role: "Owner & Orang di Balik Kamera",
    photo_path: "/assets/fikabi-portrait.png",
    description: "Yang bakal ngabadiin setiap detik lucu, romantis, & baper kamu jadi frame cinematic.",
  },
  {
    id: "asty",
    name: "CASTI RAHAYU (Asty)",
    role: "Manager & Admin",
    photo_path: "/assets/couple.png",
    description: "Bakal nemenin kamu dari chat pertama sampe hari H, biar semua smooth & seru.",
  },
];

const photoUrl = (path) => {
  if (!path) {
    return "/assets/couple.png";
  }

  return path.startsWith("/assets/") ? path : fileUrl(path);
};

const About = () => {
  const [members, setMembers] = useState(defaultMembers);

  useEffect(() => {
    api.get("/team")
      .then((response) => {
        if (response.data.length > 0) {
          setMembers(response.data);
        }
      })
      .catch(() => setMembers(defaultMembers));
  }, []);

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

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {members.map((m, i) => {
            const Icon = i % 2 === 0 ? Camera : Sparkles;

            return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.7 }}
              whileHover={{ y: -6 }}
              className="glass rounded-3xl overflow-hidden group"
              data-testid={`team-card-${m.id}`}
            >
              <div className="aspect-[4/5] overflow-hidden">
                <img
                  src={photoUrl(m.photo_path)}
                  alt={m.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 text-rose-600 text-xs uppercase tracking-widest font-semibold mb-2">
                  <Icon size={14} /> {m.role}
                </div>
                <h3 className="font-serif-display text-2xl text-rose-950">{m.name}</h3>
                <p className="mt-3 text-rose-800/80 text-sm">{m.description}</p>
              </div>
            </motion.div>
          );
          })}
        </div>
      </div>
    </section>
  );
};

export default About;
