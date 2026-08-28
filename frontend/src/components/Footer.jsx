import React from "react";
import { Link } from "react-router-dom";
import { Instagram, Music2, Lock } from "lucide-react";

const Footer = () => {
  return (
    <footer className="relative py-16 px-6 bg-gradient-to-b from-transparent to-rose-100" data-testid="footer">
      <div className="max-w-6xl mx-auto text-center">
        <img src="/assets/logo.webp" alt="SESI RESEPSI"
          className="logo-pink-light w-40 mx-auto opacity-90 mb-4" />
        <p className="font-italiana text-xl text-rose-800">
          Every love story deserves a beautiful frame.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            href="https://www.instagram.com/sesiresepsi?igsi=ZnZuMWVkNzNmdWt1&utm_source=qr"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full glass px-4 py-3 text-sm font-semibold text-rose-700 transition-colors hover:bg-white/75 hover:text-rose-900"
            data-testid="footer-instagram-link"
          >
            <Instagram size={18} aria-hidden="true" /> Instagram
          </a>
          <a
            href="https://www.tiktok.com/@sesiresepsi?_r=1&_t=ZS-99FLXexXe0C"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full glass px-4 py-3 text-sm font-semibold text-rose-700 transition-colors hover:bg-white/75 hover:text-rose-900"
            data-testid="footer-tiktok-link"
          >
            <Music2 size={18} aria-hidden="true" /> TikTok
          </a>
        </div>
        <div className="mt-10 text-xs text-rose-700/70">
          © {new Date().getFullYear()} SESI RESEPSI — Wedding Content Creator Jakarta-Bekasi
        </div>
        <div className="mt-6">
          <Link to="/admin/login"
            className="inline-flex items-center gap-2 text-xs text-rose-800/60 hover:text-rose-900 border border-rose-200 rounded-full px-4 py-2 hover:bg-white/60 transition-colors"
            data-testid="admin-login-link">
            <Lock size={12} /> Masuk sebagai Admin
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
