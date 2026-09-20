"use client";
import { useState } from "react";
export default function Login() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main className="login">
      <form
        className="panel"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const password = new FormData(e.currentTarget).get("password");
          try {
            const res = await fetch("/api/admin/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ password }),
            });
            const data = await res.json();
            if (!res.ok) throw Error(data.error);
            location.assign("/admin");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Login gagal.");
            setBusy(false);
          }
        }}
      >
        <a href="/" className="wordmark">
          ARKAVIA
        </a>
        <div className="eyebrow">TEAM ACCESS</div>
        <h1>Selamat datang.</h1>
        <p>Masuk untuk mengelola apresiasi DJ.</p>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={256}
        />
        <button className="primary" disabled={busy}>
          {busy ? "Memeriksa…" : "Login →"}
        </button>
        <p role="alert">{error}</p>
      </form>
    </main>
  );
}
