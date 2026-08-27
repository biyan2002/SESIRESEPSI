import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X } from "lucide-react";

const WhatsAppPopup = ({ waBiyan = "085185130765", waAsty = "085862937103" }) => {
  const [open, setOpen] = useState(false);
  const wa = (num) => {
    const clean = num.replace(/^0/, "62").replace(/\D/g, "");
    return `https://wa.me/${clean}?text=Halo%20kak%2C%20mau%20tanya%20soal%20SESI%20RESEPSI`;
  };
  return (
    <>
      <motion.button
        data-testid="chat-admin-btn"
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.06, y: -3 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-rose-600 text-white px-6 py-4 shadow-2xl shadow-rose-600/30 font-medium"
      >
        <MessageCircle size={22} />
        Chat Admin
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-rose-950/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.85, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.85, y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 22 }}
              className="glass-heavy rounded-3xl p-8 max-w-md w-full relative"
              data-testid="wa-popup"
            >
              <button
                onClick={() => setOpen(false)}
                className="absolute top-4 right-4 text-rose-800 hover:text-rose-600"
                data-testid="wa-popup-close"
              >
                <X size={22} />
              </button>
              <h3 className="font-serif-display text-3xl text-rose-950 mb-2">
                Hai kak! 💌
              </h3>
              <p className="text-rose-900/80 mb-6">
                Mau chat siapa nih? Pilih adminnya dulu ya~
              </p>
              <div className="space-y-3">
                <a
                  href={wa(waBiyan)}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="wa-biyan-btn"
                  className="block rounded-2xl bg-white/70 hover:bg-white p-4 border border-rose-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-rose-950">Min Biyan</div>
                      <div className="text-sm text-rose-700">{waBiyan}</div>
                    </div>
                    <MessageCircle className="text-rose-600" />
                  </div>
                </a>
                <a
                  href={wa(waAsty)}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="wa-asty-btn"
                  className="block rounded-2xl bg-white/70 hover:bg-white p-4 border border-rose-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-rose-950">Min Asty</div>
                      <div className="text-sm text-rose-700">{waAsty}</div>
                    </div>
                    <MessageCircle className="text-rose-600" />
                  </div>
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default WhatsAppPopup;
