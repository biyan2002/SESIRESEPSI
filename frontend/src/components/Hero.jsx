import React from "react";
import { motion } from "framer-motion";
import { ChevronDown, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import AnimatedFlowers from "@/components/AnimatedFlowers";

const Hero = () => {
  return (
    <section
      id="beranda"
      className="scroll-section relative min-h-[100svh] w-full overflow-hidden"
      data-testid="hero-section"
    >
      {/* Background couple photo */}
      <div className="absolute inset-0">
        <img
          src="/assets/hero-biyan-asty.webp"
          alt="Biyan & Asti"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-pink-50/80 via-pink-50/60 to-rose-100/85" />
        <div className="absolute inset-0 bg-white/25 backdrop-blur-[3px]" />
      </div>

      <AnimatedFlowers dense />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-[100svh] px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="text-xs md:text-sm tracking-[0.4em] uppercase text-rose-600 font-semibold mb-6"
        >
          ✦ Wedding Content Creator ✦
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 1, ease: "easeOut" }}
          className="relative"
        >
          <img
            src="/assets/logo.webp"
            alt="SESI RESEPSI"
            className="logo-pink w-[280px] md:w-[520px] lg:w-[640px] drop-shadow-[0_4px_30px_rgba(225,29,72,0.35)]"
            data-testid="hero-logo"
          />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.8 }}
          className="font-italiana text-2xl md:text-4xl text-rose-900 mt-6 tracking-wide"
          data-testid="hero-tagline"
        >
          Wedding Content Creator Jakarta-Bekasi
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.8 }}
          className="mt-4 text-base md:text-lg text-rose-800/80 max-w-xl font-body"
        >
          Momen romantis kamu, kita abadikan estetik banget. Cinematic, aesthetic,
          & auto bikin baper timeline sosmed 🌸
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.8 }}
          className="mt-10 flex flex-col sm:flex-row gap-4"
        >
          <a
            href="#packages"
            data-testid="hero-cta-book"
            className="rounded-full bg-rose-600 hover:bg-rose-700 text-white px-8 py-4 font-medium shadow-xl shadow-rose-600/25 transition-colors flex items-center gap-2"
          >
            <Heart size={18} /> Booking Sekarang
          </a>
          <Link
            to="/portfolio"
            data-testid="hero-cta-portfolio"
            className="rounded-full glass-heavy hover:bg-white px-8 py-4 font-medium text-rose-800 border border-rose-200 transition-colors"
          >
            Lihat Portfolio →
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-rose-700"
        >
          <ChevronDown className="animate-bounce" size={30} />
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
