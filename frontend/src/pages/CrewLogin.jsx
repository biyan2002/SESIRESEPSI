import React, { useState } from "react";
import { LogIn, UsersRound } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AnimatedFlowers from "@/components/AnimatedFlowers";
import { api } from "@/lib/api";

export default function CrewLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await api.post("/auth/crew/login", { username, password });
      localStorage.setItem("sr_crew_token", response.data.token);
      localStorage.setItem("sr_crew_name", response.data.member.name);
      toast.success(`Hai ${response.data.member.name}!`);
      navigate("/crew");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Login Crew gagal.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-pink-100 via-rose-50 to-pink-100 px-6">
      <AnimatedFlowers />
      <motion.form
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={submit}
        className="relative z-10 w-full max-w-md rounded-3xl p-8 glass-heavy sm:p-10"
        data-testid="crew-login-form"
      >
        <div className="text-center">
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-rose-600 text-white">
            <UsersRound size={27} />
          </div>
          <h1 className="mt-4 font-serif-display text-3xl text-rose-950">Ruang Crew</h1>
          <p className="mt-1 text-sm text-rose-800/75">Lihat job yang sudah ditugaskan untukmu.</p>
        </div>
        <div className="mt-7 space-y-3">
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Username Crew"
            className="w-full rounded-xl border border-rose-200 bg-white/75 px-4 py-3"
            data-testid="crew-login-username"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-rose-200 bg-white/75 px-4 py-3"
            data-testid="crew-login-password"
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-rose-600 py-3 font-semibold text-white disabled:opacity-60"
            data-testid="crew-login-submit"
          >
            <LogIn size={17} /> {busy ? "Masuk..." : "Masuk ke job saya"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}