import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, LogIn } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import AnimatedFlowers from "@/components/AnimatedFlowers";

const AdminLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.post("/auth/login", { username, password });
      localStorage.setItem("sr_token", r.data.token);
      localStorage.setItem("sr_user", r.data.username);
      toast.success(`Hai ka ${r.data.username}! 💌`);
      nav("/admin");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login gagal");
    }
    setBusy(false);
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-pink-100 via-rose-50 to-pink-100 flex items-center justify-center px-6 overflow-hidden">
      <AnimatedFlowers />
      <motion.form
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={submit}
        className="relative z-10 glass-heavy rounded-3xl p-10 w-full max-w-md"
        data-testid="admin-login-form"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-600 text-white mb-4">
            <Lock size={26} />
          </div>
          <h1 className="font-serif-display text-3xl text-rose-950">Private Space</h1>
          <p className="text-rose-800/70 text-sm mt-1">Login dulu ya kak~</p>
        </div>
        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded-xl bg-white/70 px-4 py-3 border border-rose-200 outline-none focus:border-rose-500 mb-3"
          data-testid="admin-username"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl bg-white/70 px-4 py-3 border border-rose-200 outline-none focus:border-rose-500 mb-6"
          data-testid="admin-password"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-rose-600 hover:bg-rose-700 text-white py-3 font-medium shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 disabled:opacity-60"
          data-testid="admin-login-submit"
        >
          <LogIn size={16} /> {busy ? "Login..." : "Masuk"}
        </button>
      </motion.form>
    </div>
  );
};

export default AdminLogin;
