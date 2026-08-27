import React, { useEffect, useState } from "react";
import { Heart, Images } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const sections = [
  { id: "beranda", label: "Beranda" },
  { id: "packages", label: "Paket" },
  { id: "team", label: "Tim Kami" },
  { id: "availability", label: "Tanggal" },
  { id: "booking-section", label: "Booking" },
  { id: "testimonials", label: "Cerita" },
];

const GlassNavigation = () => {
  const [activeSection, setActiveSection] = useState("beranda");

  useEffect(() => {
    const visibleSections = sections
      .map(({ id }) => document.getElementById(id))
      .filter(Boolean);

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries.find((entry) => entry.isIntersecting);

        if (visibleEntry) {
          setActiveSection(visibleEntry.target.id);
        }
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: 0.01 }
    );

    visibleSections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  const moveToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    setActiveSection(id);
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.7, ease: "easeOut" }}
      className="fixed top-3 left-3 right-3 z-50 sm:top-5 sm:left-6 sm:right-6"
      data-testid="glass-navigation"
    >
      <div className="glass-navigation mx-auto flex max-w-7xl items-center gap-2 p-2 sm:gap-3">
        <button
          type="button"
          onClick={() => moveToSection("beranda")}
          className="nav-logo-button flex shrink-0 items-center gap-2 px-2.5 py-2"
          data-testid="nav-logo-home-button"
          aria-label="Kembali ke beranda"
        >
          <span className="nav-logo-mark" aria-hidden="true">
            SR
          </span>
          <span className="hidden font-serif-display text-sm text-rose-950 sm:inline">
            SESI RESEPSI
          </span>
        </button>

        <nav
          className="nav-scroll no-select flex min-w-0 flex-1 items-center gap-1"
          aria-label="Navigasi utama"
          data-testid="main-navigation"
        >
          {sections.map((section) => {
            const isActive = activeSection === section.id;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => moveToSection(section.id)}
                className="nav-section-button relative shrink-0 px-3 py-2 text-xs font-semibold"
                data-testid={`nav-${section.id}`}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-active-pill"
                    className="absolute inset-0 rounded-full bg-rose-600 shadow-sm shadow-rose-600/25"
                    transition={{ type: "spring", stiffness: 340, damping: 30 }}
                  />
                )}
                <span className={`relative z-10 ${isActive ? "text-white" : "text-rose-900"}`}>
                  {section.label}
                </span>
              </button>
            );
          })}
        </nav>

        <Link
          to="/portfolio"
          className="nav-portfolio-link flex shrink-0 items-center gap-1.5 px-3 py-2 text-xs font-semibold"
          data-testid="nav-portfolio-link"
        >
          <Images size={15} aria-hidden="true" />
          <span className="hidden md:inline">Portfolio</span>
        </Link>

        <button
          type="button"
          onClick={() => moveToSection("booking-section")}
          className="nav-booking-button flex shrink-0 items-center gap-1.5 px-3 py-2 text-xs font-semibold"
          data-testid="nav-booking-button"
        >
          <Heart size={14} fill="currentColor" aria-hidden="true" />
          <span className="hidden sm:inline">Pesan</span>
        </button>
      </div>
    </motion.header>
  );
};

export default GlassNavigation;