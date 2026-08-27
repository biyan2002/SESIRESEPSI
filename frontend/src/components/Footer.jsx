import React from "react";
import { Link } from "react-router-dom";
import { Instagram, MessageCircle, Lock } from "lucide-react";

const Footer = () => {
  return (
    <footer className="relative py-16 px-6 bg-gradient-to-b from-transparent to-rose-100" data-testid="footer">
      <div className="max-w-6xl mx-auto text-center">
        <img src="/assets/logo.webp" alt="SESI RESEPSI"
          className="logo-pink-light w-40 mx-auto opacity-90 mb-4" />
        <p className="font-italiana text-xl text-rose-800">
          Every love story deserves a beautiful frame.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <a href="https://instagram.com" target="_blank" rel="noreferrer"
            className="rounded-full glass p-3 text-rose-700 hover:text-rose-900 transition-colors">
            <Instagram size={18} />
          </a>
          <a href="#" className="rounded-full glass p-3 text-rose-700 hover:text-rose-900 transition-colors">
            <MessageCircle size={18} />
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
