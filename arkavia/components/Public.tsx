"use client";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Card from "./Card";
type Data = { name: string; value: string };
export default function Public() {
  const [data, setData] = useState<Data | null>(null),
    [status, setStatus] = useState("loading"),
    [copied, setCopied] = useState("");
  const reduced = useReducedMotion();
  useEffect(() => {
    const controller = new AbortController();
    const name = new URLSearchParams(location.search).get("name")?.trim();
    if (!name) {
      setStatus("missing");
      return;
    }
    Promise.all([
      fetch("/api/djs?name=" + encodeURIComponent(name), {
        cache: "no-store",
        signal: controller.signal,
      }),
      fetch("/api/template", { cache: "no-store", signal: controller.signal }),
    ])
      .then(async ([dj, t]) => {
        if (dj.status === 404) {
          setStatus("missing");
          return;
        }
        if (!dj.ok || !t.ok) throw Error();
        const [d, template] = await Promise.all([dj.json(), t.json()]);
        setData({ name: d.name, value: template.value });
        setStatus("ready");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setStatus("error");
      });
    return () => controller.abort();
  }, []);
  return (
    <main className="public">
      <div className="grid-bg" aria-hidden="true" />
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={"orb orb-" + i}
          aria-hidden="true"
          animate={
            reduced
              ? {}
              : { x: [0, 35, 0], y: [0, -45, 0], scale: [1, 1.15, 1] }
          }
          transition={{
            duration: 10 + i * 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
      <motion.header
        className="public-header"
        initial={{ opacity: 0, y: reduced ? 0 : -12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span className="wordmark">ARKAVIA</span>
        <span className="edition">DJ FEST / APPRECIATION</span>
      </motion.header>
      <section className="public-content">
        {status === "loading" ? (
          <div className="holding" role="status">
            <motion.div
              className="wordmark"
              animate={reduced ? {} : { opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            >
              ARKAVIA
            </motion.div>
            <p>Menyiapkan pesan untuk Anda…</p>
          </div>
        ) : data ? (
          <>
            <motion.div
              className="intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="eyebrow">THE MUSIC ENDS. THE MEMORIES STAY.</div>
              <h1>
                Energi Anda.
                <br />
                <span>Kenangan kita.</span>
              </h1>
              <p>Sebuah apresiasi untuk DJ {data.name}.</p>
            </motion.div>
            <Card name={data.name} value={data.value} />
            <div className="share">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(location.href);
                    setCopied("Link disalin.");
                  } catch {
                    setCopied("Salin link dari bilah alamat browser.");
                  }
                }}
              >
                Salin link ↗
              </motion.button>
              <span role="status">{copied}</span>
            </div>
          </>
        ) : (
          <motion.div
            className="holding"
            initial={{ opacity: 0, y: reduced ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="eyebrow">ARKAVIA DJ FEST</span>
            <h1>
              {status === "error"
                ? "Sebentar lagi."
                : "Setiap beat,\nsebuah cerita."}
            </h1>
            <p>
              {status === "error"
                ? "Pesan belum dapat dimuat. Silakan coba kembali."
                : "Silakan buka melalui link undangan khusus Anda."}
            </p>
            {status === "error" && (
              <button onClick={() => location.reload()}>Coba lagi</button>
            )}
          </motion.div>
        )}
      </section>
      <footer>
        WITH GRATITUDE, ARKAVIA & TEAM <span>✦</span> MUSIC CONNECTS US
      </footer>
    </main>
  );
}
