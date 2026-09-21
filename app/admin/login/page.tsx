"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { Wordmark } from "@/components/Brand";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Login gagal.");
      router.replace("/admin"); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Login gagal."); }
    finally { setBusy(false); }
  }

  return <main className="login-shell"><div className="login-card"><Wordmark priority /><span className="eyebrow">SECURE ACCESS / ARKAVIA STAFF</span><h1>Control room.</h1><p>Masuk untuk mengelola DJ, pesan, musik, dan guestbook ARKAVIA DJ FEST.</p><form onSubmit={submit}><div className="admin-field"><label htmlFor="admin-password">ADMIN PASSWORD</label><input className="admin-input" id="admin-password" type="password" autoComplete="current-password" placeholder="Masukkan password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div><button className="neon-button" disabled={busy}><LockKeyhole size={16} /> {busy ? "MEMERIKSA..." : "LOGIN"} <ArrowRight size={16} /></button>{error && <p className="form-feedback error" role="alert">{error}</p>}</form><div className="login-footer"><span>ARKAVIA DJ FEST</span><span>ADMIN / 01</span></div></div></main>;
}
