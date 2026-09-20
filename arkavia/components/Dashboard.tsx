"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { DJ } from "@/lib/db";
import Card from "./Card";
async function api(url: string, method = "GET", data?: unknown) {
  const res = await fetch(url, {
    method,
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  const result = await res.json();
  if (res.status === 401) {
    location.assign("/admin/login");
    throw Error("Silakan login kembali.");
  }
  if (!res.ok) throw Error(result.error || "Permintaan gagal.");
  return result;
}
export default function Dashboard() {
  const [djs, setDjs] = useState<DJ[]>([]),
    [template, setTemplate] = useState(""),
    [saved, setSaved] = useState(""),
    [ready, setReady] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [origin, setOrigin] = useState(""),
    [name, setName] = useState(""),
    [edit, setEdit] = useState<DJ | null>(null),
    [preview, setPreview] = useState("Contoh");
  const link = (d: DJ) => origin + "/?name=" + encodeURIComponent(d.slug);
  useEffect(() => {
    setOrigin(location.origin);
    Promise.all([api("/api/djs"), api("/api/template")])
      .then(([list, t]) => {
        setDjs(list);
        setTemplate(t.value);
        setSaved(t.value);
        setReady(true);
      })
      .catch((e) => setMessage(e.message));
  }, []);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (template !== saved) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [template, saved]);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
      setBusy(false);
    }
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Link disalin.");
    } catch {
      setMessage(
        "Tidak dapat menyalin otomatis. Pilih dan salin link secara manual.",
      );
    }
  }
  return (
    <main className="admin">
      <header className="admin-header">
        <a href="/" className="wordmark">
          ARKAVIA
        </a>
        <span className="edition">TEAM DASHBOARD</span>
        <button
          disabled={busy}
          onClick={() => {
            if (
              template !== saved &&
              !confirm("Perubahan pesan belum disimpan. Tetap keluar?")
            )
              return;
            void run(async () => {
              await api("/api/admin/logout", "POST");
              location.assign("/admin/login");
            });
          }}
        >
          Logout ↗
        </button>
      </header>
      <div className="admin-title">
        <div>
          <span className="eyebrow">DJ FEST / BACKSTAGE</span>
          <h1>Make it personal.</h1>
          <p>Kelola DJ dan pesan apresiasi dalam satu tempat.</p>
        </div>
        <div className="count">
          <strong>{djs.length.toString().padStart(2, "0")}</strong>
          <span>GUEST DJs</span>
        </div>
      </div>
      <p className="notice" role="status">
        {message || (!ready ? "Memuat dashboard…" : "")}
      </p>
      {ready && (
        <>
          <section className="panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">01 / THE MESSAGE</span>
                <h2>Message template</h2>
              </div>
              <button
                className="primary"
                disabled={busy || template === saved}
                onClick={() =>
                  run(async () => {
                    await api("/api/template", "PUT", { value: template });
                    setSaved(template);
                    setMessage("Pesan disimpan untuk seluruh DJ.");
                  })
                }
              >
                {busy ? "Memproses…" : "Save template"}
              </button>
            </div>
            <div className="editor-grid">
              <div>
                <label htmlFor="template">Pesan untuk DJ</label>
                <p className="hint">
                  Gunakan {"{name}"} di mana pun untuk menyisipkan nama DJ.
                </p>
                <textarea
                  id="template"
                  maxLength={10000}
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  rows={23}
                />
                <span className="hint">
                  {template.length.toLocaleString()} / 10.000 karakter
                  {template !== saved ? " · Belum disimpan" : ""}
                </span>
              </div>
              <div className="preview">
                <label htmlFor="preview">Live preview</label>
                <input
                  id="preview"
                  value={preview}
                  maxLength={80}
                  onChange={(e) => setPreview(e.target.value)}
                  aria-label="Nama untuk preview"
                />
                <Card preview name={preview || "Contoh"} value={template} />
              </div>
            </div>
          </section>
          <section className="panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">02 / THE PEOPLE</span>
                <h2>DJ list</h2>
              </div>
              <button
                disabled={!djs.length}
                onClick={() =>
                  copy(djs.map((d) => d.name + " — " + link(d)).join("\n"))
                }
              >
                Copy all links
              </button>
            </div>
            <form
              className="dj-form"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  const updated = await api(
                    edit ? "/api/djs/" + edit.id : "/api/djs",
                    edit ? "PUT" : "POST",
                    { name },
                  );
                  setDjs((old) =>
                    edit
                      ? old.map((d) => (d.id === edit.id ? updated : d))
                      : [updated, ...old],
                  );
                  setEdit(null);
                  setName("");
                  setMessage(
                    edit
                      ? "Nama diperbarui. Link tetap sama."
                      : "DJ ditambahkan.",
                  );
                });
              }}
            >
              <label htmlFor="dj-name">
                {edit ? "Edit nama DJ" : "Tambah DJ"}
              </label>
              <input
                id="dj-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama DJ"
                maxLength={80}
                required
              />
              <button className="primary" disabled={busy}>
                {edit ? "Simpan" : "Add DJ +"}
              </button>
              {edit && (
                <button
                  type="button"
                  onClick={() => {
                    setEdit(null);
                    setName("");
                  }}
                >
                  Batal
                </button>
              )}
            </form>
            {!djs.length ? (
              <p className="empty">
                Belum ada DJ. Tambahkan nama pertama untuk membuat link
                apresiasi.
              </p>
            ) : (
              <div className="dj-list">
                {djs.map((d) => (
                  <motion.div
                    key={d.id}
                    className="dj-row"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <strong>{d.name}</strong>
                    <input
                      readOnly
                      value={link(d)}
                      aria-label={"Link untuk " + d.name}
                    />
                    <div className="row-actions">
                      <button onClick={() => copy(link(d))}>Copy</button>
                      <a
                        className="button"
                        href={link(d)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Preview ↗
                      </a>
                      <button
                        disabled={busy}
                        onClick={() => {
                          setEdit(d);
                          setName(d.name);
                          document.getElementById("dj-name")?.focus();
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="danger"
                        disabled={busy}
                        onClick={() => {
                          if (
                            confirm(
                              "Hapus DJ " +
                                d.name +
                                "? Link mereka tidak akan dapat dibuka lagi.",
                            )
                          )
                            void run(async () => {
                              await api("/api/djs/" + d.id, "DELETE");
                              setDjs((old) => old.filter((x) => x.id !== d.id));
                              if (edit?.id === d.id) {
                                setEdit(null);
                                setName("");
                              }
                              setMessage("DJ dihapus.");
                            });
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
