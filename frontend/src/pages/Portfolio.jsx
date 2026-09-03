import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Calendar as CalIcon, Heart } from "lucide-react";
import { api, fileUrl } from "@/lib/api";
import WhatsAppPopup from "@/components/WhatsAppPopup";
import AnimatedFlowers from "@/components/AnimatedFlowers";

const getYouTubeEmbed = (url) => {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : url;
};

const Portfolio = () => {
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(null);

  useEffect(() => { api.get("/portfolio").then((r) => setItems(r.data)); }, []);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-pink-50 via-rose-50 to-pink-100 overflow-hidden">
      <AnimatedFlowers />
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-rose-700 hover:text-rose-900 mb-8"
          data-testid="portfolio-back">
          <ArrowLeft size={18} /> Balik ke Home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <p className="text-xs tracking-[0.3em] uppercase text-rose-600 font-semibold mb-3">
            ✧ Portfolio ✧
          </p>
          <h1 className="font-serif-display text-5xl md:text-7xl text-rose-950 tracking-tight">
            Karya <span className="italic text-rose-600">terbaik kami</span>
          </h1>
          <p className="mt-4 text-rose-800/70">
            Kumpulan cinematic moment yang udah kami handle 💐
          </p>
        </motion.div>

        {items.length === 0 && (
          <div className="text-center text-rose-800/60 italic py-20 glass rounded-3xl">
            Portfolio lagi diracik ya kak, tunggu update-nya~
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((v, i) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -6 }}
              className="glass rounded-3xl overflow-hidden cursor-pointer group"
              onClick={() => setActive(v)}
              data-testid={`portfolio-item-${v.id}`}
            >
              <div className="aspect-video relative bg-rose-100 overflow-hidden">
                {v.media_type === "photo" && v.image_paths?.[0] ? (
                  <img
                    src={fileUrl(v.image_paths[0])}
                    alt={v.title}
                    className="w-full h-full object-cover"
                    data-testid={`portfolio-photo-${v.id}`}
                  />
                ) : v.media_type === "youtube" ? (
                  <img src={`https://img.youtube.com/vi/${(v.youtube_url.match(/(?:youtu\.be\/|v=|shorts\/)([\w-]{11})/) || [])[1]}/hqdefault.jpg`}
                    alt={v.title} className="w-full h-full object-cover" />
                ) : v.file_path ? (
                  <video src={fileUrl(v.file_path)} className="w-full h-full object-cover" muted />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-rose-400"><Heart /></div>
                )}
                <div className="absolute inset-0 bg-rose-950/0 group-hover:bg-rose-950/30 transition-colors flex items-center justify-center">
                  {v.media_type !== "photo" && (
                    <Play className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={48} fill="white" />
                  )}
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-serif-display text-xl text-rose-950">{v.title}</h3>
                {v.couple_name && <div className="text-sm text-rose-600 font-semibold">{v.couple_name}</div>}
                {v.event_date && <div className="text-xs text-rose-500 flex items-center gap-1 mt-1"><CalIcon size={12}/> {v.event_date}</div>}
                {v.description && <p className="text-sm text-rose-800/70 mt-2 line-clamp-2">{v.description}</p>}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Modal player */}
      {active && (
        <div className="fixed inset-0 z-50 bg-rose-950/80 backdrop-blur flex items-center justify-center p-4"
          onClick={() => setActive(null)}>
          <div className="max-w-5xl w-full glass-heavy rounded-3xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="aspect-video rounded-2xl overflow-hidden bg-black">
              {active.media_type === "photo" && active.image_paths?.length > 0 ? (
                <img
                  src={fileUrl(active.image_paths[0])}
                  alt={active.title}
                  className="w-full h-full object-contain"
                  data-testid="portfolio-active-photo"
                />
              ) : active.media_type === "youtube" ? (
                <iframe src={getYouTubeEmbed(active.youtube_url)} className="w-full h-full" allowFullScreen />
              ) : (
                <video src={fileUrl(active.file_path)} controls autoPlay className="w-full h-full" />
              )}
            </div>
            {active.media_type === "photo" && active.image_paths?.length > 1 && (
              <div className="mt-3 grid grid-cols-3 gap-2" data-testid="portfolio-photo-gallery">
                {active.image_paths.slice(1).map((path, index) => (
                  <img
                    key={path}
                    src={fileUrl(path)}
                    alt={`${active.title} ${index + 2}`}
                    className="aspect-square rounded-xl object-cover"
                    data-testid={`portfolio-gallery-photo-${index + 2}`}
                  />
                ))}
              </div>
            )}
            <div className="p-4">
              <h3 className="font-serif-display text-2xl text-rose-950">{active.title}</h3>
              <div className="text-rose-600">{active.couple_name} • {active.event_date}</div>
              <p className="text-rose-800/80 mt-2">{active.description}</p>
            </div>
          </div>
        </div>
      )}

      <WhatsAppPopup />
    </div>
  );
};

export default Portfolio;
