"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, Check, Clipboard, ExternalLink, Headphones, LogOut, MessageSquare, Music2, Pencil, Plus, RotateCcw, Save, Search, Trash2, UploadCloud, Users, X } from "lucide-react";
import { Wordmark } from "./Brand";
import MessageChapters from "./MessageChapters";
import { DEFAULT_MESSAGE } from "@/lib/defaults";
import { MAX_MUSIC_FILE_SIZE, musicBlobPath } from "@/lib/music-upload";
import type { Dj, GuestComment, Settings } from "@/lib/types";

type Tab = "djs" | "template" | "music" | "comments";
type EditModal = { mode: "add" } | { mode: "edit"; dj: Dj };
type Confirm = { title: string; body: string; action: string; run: () => Promise<void>; danger?: boolean };

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data as T;
}

function json(method: string, body: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function AdminDjCard({ dj, link, onCopy, onEdit, onDelete }: { dj: Dj; link: string; onCopy: () => void; onEdit: () => void; onDelete: () => void }) {
  return <div className="mobile-admin-card"><div><strong>{dj.name}</strong><span className="eyebrow">#{String(dj.id).padStart(2, "0")}</span></div><div className="link-control"><input className="admin-input" value={link} readOnly aria-label={`Link untuk ${dj.name}`} /><button className="icon-button" onClick={onCopy} aria-label={`Salin link ${dj.name}`}><Clipboard size={15} /></button></div><div className="row-actions"><button className="icon-button" onClick={onEdit} aria-label={`Edit ${dj.name}`}><Pencil size={15} /></button><button className="icon-button danger" onClick={onDelete} aria-label={`Hapus ${dj.name}`}><Trash2 size={15} /></button><a className="icon-button" href={`/?name=${encodeURIComponent(dj.slug)}`} target="_blank" rel="noopener noreferrer" aria-label={`Preview ${dj.name}`}><ExternalLink size={15} /></a></div></div>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("djs");
  const [djs, setDjs] = useState<Dj[]>([]);
  const [settings, setSettings] = useState<Settings>({ message_template: DEFAULT_MESSAGE, music_url: "" });
  const [template, setTemplate] = useState(DEFAULT_MESSAGE);
  const [musicUrl, setMusicUrl] = useState("");
  const [comments, setComments] = useState<GuestComment[]>([]);
  const [search, setSearch] = useState("");
  const [commentSearch, setCommentSearch] = useState("");
  const [modal, setModal] = useState<EditModal | null>(null);
  const [modalName, setModalName] = useState("");
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    Promise.all([
      requestJson<Dj[]>("/api/djs"),
      requestJson<Settings>("/api/settings"),
      requestJson<GuestComment[]>("/api/comments/all"),
    ]).then(([djs, settings, comments]) => {
      setDjs(djs); setSettings(settings); setTemplate(settings.message_template); setMusicUrl(settings.music_url); setComments(comments);
    }).catch((error) => setError(error.message)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  const filteredDjs = useMemo(() => djs.filter((dj) => `${dj.name} ${dj.slug}`.toLowerCase().includes(search.toLowerCase())), [djs, search]);
  const filteredComments = useMemo(() => comments.filter((comment) => `${comment.name} ${comment.message} ${comment.dj_name || ""}`.toLowerCase().includes(commentSearch.toLowerCase())), [comments, commentSearch]);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const linkFor = (dj: Dj) => `${origin}/?name=${encodeURIComponent(dj.slug)}`;

  function notify(message: string) { setToast(message); setError(""); }
  function fail(error: unknown) { setError(error instanceof Error ? error.message : "Aksi belum berhasil."); }
  async function copyLink(dj: Dj) {
    try { await navigator.clipboard.writeText(linkFor(dj)); notify("Link copied!"); }
    catch { setError("Link tidak dapat disalin otomatis. Salin dari kolom link."); }
  }
  function openAdd() { setModal({ mode: "add" }); setModalName(""); setError(""); }
  function openEdit(dj: Dj) { setModal({ mode: "edit", dj }); setModalName(dj.name); setError(""); }

  async function saveDj(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!modal) return;
    setBusy(true); setError("");
    try {
      if (modal.mode === "add") {
        const dj = await requestJson<Dj>("/api/djs", json("POST", { name: modalName }));
        setDjs((current) => [dj, ...current]); notify(`DJ ${dj.name} ditambahkan.`);
      } else {
        const dj = await requestJson<Dj>(`/api/djs/${modal.dj.id}`, json("PUT", { name: modalName }));
        setDjs((current) => current.map((item) => item.id === dj.id ? dj : item)); notify("Nama DJ diperbarui. Link tetap sama.");
      }
      setModal(null);
    } catch (error) { fail(error); }
    finally { setBusy(false); }
  }

  function confirmDeleteDj(dj: Dj) {
    setConfirm({ title: `Hapus DJ ${dj.name}?`, body: "Link personal DJ ini akan berhenti berfungsi. Komentar lama tetap tersimpan.", action: "Hapus DJ", danger: true,
      run: async () => { await requestJson<void>(`/api/djs/${dj.id}`, { method: "DELETE" }); setDjs((current) => current.filter((item) => item.id !== dj.id)); notify("DJ dihapus."); },
    });
  }

  async function runConfirm() {
    if (!confirm) return;
    setBusy(true); setError("");
    try { await confirm.run(); setConfirm(null); }
    catch (error) { fail(error); }
    finally { setBusy(false); }
  }

  async function saveTemplate() {
    setBusy(true); setError("");
    try {
      const updated = await requestJson<Settings>("/api/settings", json("PUT", { message_template: template }));
      setSettings(updated); setTemplate(updated.message_template); notify("Template tersimpan untuk semua DJ.");
    } catch (error) { fail(error); }
    finally { setBusy(false); }
  }

  function confirmResetTemplate() {
    setConfirm({ title: "Kembalikan pesan awal?", body: "Template saat ini akan diganti dengan pesan default ARKAVIA untuk semua link DJ.", action: "Reset Template",
      run: async () => { const updated = await requestJson<Settings>("/api/settings", json("PUT", { message_template: DEFAULT_MESSAGE })); setSettings(updated); setTemplate(updated.message_template); notify("Template default dipulihkan."); },
    });
  }

  async function saveMusic(value = musicUrl) {
    setBusy(true); setError("");
    try {
      const updated = await requestJson<Settings>("/api/settings", json("PUT", { music_url: value }));
      setSettings(updated); setMusicUrl(updated.music_url); notify(value ? "Musik aktif diperbarui." : "Musik dihapus.");
    } catch (error) { fail(error); }
    finally { setBusy(false); }
  }

  async function uploadMusic(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      setError("Pilih file audio yang valid.");
      return;
    }
    if (file.size === 0 || file.size > MAX_MUSIC_FILE_SIZE) {
      setError("Pilih file audio maksimal 50 MB.");
      return;
    }
    setError(""); setUploading(true);
    try {
      const blob = await upload(musicBlobPath(file.name), file, {
        access: "public",
        handleUploadUrl: "/api/music/upload",
      });
      setMusicUrl(blob.url); notify("File diunggah. Dengarkan preview, lalu simpan.");
    } catch (error) { fail(error); }
    finally { setUploading(false); }
  }

  function confirmDeleteComment(comment: GuestComment) {
    setConfirm({ title: `Hapus pesan dari ${comment.name}?`, body: "Pesan ini akan hilang dari guestbook publik.", action: "Hapus Pesan", danger: true,
      run: async () => { await requestJson<void>(`/api/comments/${comment.id}`, { method: "DELETE" }); setComments((current) => current.filter((item) => item.id !== comment.id)); notify("Komentar dihapus."); },
    });
  }

  async function logout() {
    try { await requestJson("/api/admin/logout", { method: "POST" }); router.replace("/admin/login"); router.refresh(); }
    catch (error) { fail(error); }
  }

  return <div className="admin-shell"><header className="admin-header"><div className="admin-header-brand"><Wordmark priority /><span>CONTROL ROOM</span></div><div className="admin-header-actions"><a href={djs[0] ? `/?name=${encodeURIComponent(djs[0].slug)}` : "/"} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> VIEW SITE</a><button onClick={logout}><LogOut size={14} /> LOGOUT</button></div></header><main className="admin-main"><div className="admin-intro"><div><span className="eyebrow">ARKAVIA DJ FEST / STAFF ACCESS</span><h1>Dashboard<span style={{ color: "var(--cyan)" }}>.</span></h1><p>Semua yang dibutuhkan untuk membuat setiap DJ merasa dihargai.</p></div><div className="admin-intro-stat"><strong>{djs.length.toString().padStart(2, "0")}</strong><span>DJ LINKS ACTIVE</span></div></div><div className="admin-tabs" role="tablist" aria-label="Dashboard sections">{([ ["djs", "DJ MANAGEMENT", Users], ["template", "MESSAGE TEMPLATE", MessageSquare], ["music", "BACKGROUND MUSIC", Music2], ["comments", "GUESTBOOK", Headphones] ] as const).map(([value, label, Icon]) => <button key={value} role="tab" aria-selected={tab === value} className={tab === value ? "active" : ""} onClick={() => { setTab(value); setError(""); }}><Icon size={15} style={{ display: "inline", verticalAlign: "middle", marginRight: 8 }} />{label}</button>)}</div>
  {error && !modal && !confirm && <p className="admin-status error" role="alert" style={{ marginBottom: 18 }}>{error}</p>}
  {loading ? <div className="admin-panel"><div className="screen-state" style={{ minHeight: 260 }}><span className="loading-line" /><p>MEMUAT CONTROL ROOM...</p></div></div> : <>
    {tab === "djs" && <section className="admin-panel"><div className="admin-panel-head"><div><h2>DJ Management</h2><p>Kelola nama dan salin link personal untuk setiap DJ.</p></div><button className="neon-button" onClick={openAdd}><Plus size={16} /> ADD DJ</button></div><div className="admin-toolbar"><div className="admin-search"><Search size={16} /><input className="admin-input" placeholder="Cari nama DJ..." value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Cari nama DJ" /></div><span className="eyebrow">{filteredDjs.length} OF {djs.length} DJS</span></div>{djs.length === 0 ? <div className="admin-empty"><Users size={30} /><strong>Belum ada DJ.</strong><span>Tambahkan DJ pertama untuk membuat link personal.</span><button className="secondary-button" onClick={openAdd}><Plus size={15} /> Add your first DJ</button></div> : filteredDjs.length === 0 ? <div className="admin-empty">Tidak ada DJ yang cocok dengan pencarian.</div> : <><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>#</th><th>NAME</th><th>PERSONALIZED LINK</th><th>ACTIONS</th></tr></thead><tbody>{filteredDjs.map((dj, index) => <tr key={dj.id}><td className="row-number">{String(index + 1).padStart(2, "0")}</td><td className="dj-name">{dj.name}</td><td><div className="link-control"><input className="admin-input" value={linkFor(dj)} readOnly aria-label={`Link untuk ${dj.name}`} /><button className="icon-button" onClick={() => copyLink(dj)} aria-label={`Salin link ${dj.name}`} title="Copy link"><Clipboard size={15} /></button></div></td><td><div className="row-actions"><button className="icon-button" onClick={() => openEdit(dj)} aria-label={`Edit ${dj.name}`} title="Edit"><Pencil size={15} /></button><button className="icon-button danger" onClick={() => confirmDeleteDj(dj)} aria-label={`Hapus ${dj.name}`} title="Delete"><Trash2 size={15} /></button><a className="icon-button" href={`/?name=${encodeURIComponent(dj.slug)}`} target="_blank" rel="noopener noreferrer" aria-label={`Preview ${dj.name}`} title="Preview"><ExternalLink size={15} /></a></div></td></tr>)}</tbody></table></div><div className="admin-comment-cards">{filteredDjs.map((dj) => <AdminDjCard key={dj.id} dj={dj} link={linkFor(dj)} onCopy={() => copyLink(dj)} onEdit={() => openEdit(dj)} onDelete={() => confirmDeleteDj(dj)} />)}</div></>}</section>}

    {tab === "template" && <section className="admin-panel"><div className="admin-panel-head"><div><h2>Message Template</h2><p>Perubahan akan langsung berlaku untuk semua link DJ.</p></div><span className="eyebrow">GLOBAL / LIVE</span></div><div className="template-grid"><div><div className="admin-field"><label htmlFor="message-template">PESAN UTAMA</label><textarea id="message-template" className="admin-textarea" rows={20} value={template} onChange={(event) => setTemplate(event.target.value)} /></div>{!template.includes("{name}") && <p className="admin-warning">Token {"{name}"} tidak ada. Semua DJ akan melihat nama yang sama atau pesan tanpa nama.</p>}<p className="admin-help chapter-authoring-help">Pisahkan setiap bagian dengan baris berisi <strong>---</strong>. Bungkus kalimat dengan <strong>**dua bintang**</strong> untuk menjadikannya kutipan besar di bagian tengah.</p><div className="admin-actions"><button className="neon-button" onClick={saveTemplate} disabled={busy || !template.trim()}><Save size={16} /> SAVE TEMPLATE</button><button className="secondary-button" onClick={confirmResetTemplate}><RotateCcw size={15} /> RESET TO DEFAULT</button></div><p className="admin-help">Gunakan {"{name}"} setiap kali nama DJ harus muncul. Link personal tetap sama saat nama DJ diedit.</p></div><div className="template-preview"><span>LIVE PREVIEW / DJ CONTOH</span><h3>Untuk DJ Contoh</h3><MessageChapters template={template} name="Contoh" preview /></div></div></section>}

    {tab === "music" && <section className="admin-panel"><div className="admin-panel-head"><div><h2>Background Music</h2><p>Musik dimulai setelah tamu membuka pesan dan dapat mereka jeda kapan saja.</p></div><span className="eyebrow">AUDIO CHANNEL</span></div><div className="music-grid"><div className="music-card"><span>CURRENTLY LIVE</span>{settings.music_url ? <><p>{settings.music_url}</p><audio controls src={settings.music_url} preload="none" /></> : <p>Belum ada musik aktif. Tombol musik tidak akan muncul di halaman DJ.</p>}</div><div className="music-card"><span>NEW TRACK PREVIEW</span>{musicUrl && musicUrl !== settings.music_url ? <><p>{musicUrl}</p><audio controls src={musicUrl} preload="none" /></> : <p>Masukkan URL atau unggah file untuk mendengar preview sebelum menyimpan.</p>}</div></div><div className="admin-field" style={{ marginTop: 25 }}><label htmlFor="music-url">DIRECT AUDIO URL</label><input id="music-url" className="admin-input" type="url" placeholder="https://example.com/track.mp3" value={musicUrl} onChange={(event) => setMusicUrl(event.target.value)} /><small>Gunakan URL HTTP/HTTPS yang langsung dapat diputar browser.</small></div><div style={{ marginTop: 20 }}><label className={`upload-zone ${dragging ? "dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void uploadMusic(event.dataTransfer.files[0]); }}><UploadCloud size={28} /><span>{uploading ? "Mengunggah audio..." : "Drop audio di sini atau klik untuk memilih file"}</span><small>MP3, WAV, atau audio lain · maksimum 50 MB · diunggah langsung ke Vercel Blob</small><input type="file" accept="audio/*" disabled={uploading} onChange={(event) => void uploadMusic(event.target.files?.[0])} /></label></div><div className="admin-actions"><button className="neon-button" disabled={busy || !musicUrl || musicUrl === settings.music_url} onClick={() => void saveMusic()}><Save size={16} /> SAVE MUSIC</button><button className="danger-button" disabled={busy || !settings.music_url} onClick={() => setConfirm({ title: "Hapus musik aktif?", body: "Tombol musik akan hilang dari semua halaman DJ sampai lagu baru disimpan.", action: "Remove Music", danger: true, run: async () => { const updated = await requestJson<Settings>("/api/settings", json("PUT", { music_url: "" })); setSettings(updated); setMusicUrl(""); notify("Musik dihapus."); } })}><X size={15} /> REMOVE MUSIC</button></div></section>}

    {tab === "comments" && <section className="admin-panel"><div className="admin-panel-head"><div><h2>Guestbook Moderation</h2><p>Komentar tampil langsung di halaman publik. Hapus pesan yang tidak sesuai.</p></div><span className="eyebrow">{comments.length} TOTAL MESSAGES</span></div><div className="admin-toolbar"><div className="admin-search"><Search size={16} /><input className="admin-input" placeholder="Cari nama atau isi pesan..." value={commentSearch} onChange={(event) => setCommentSearch(event.target.value)} aria-label="Cari komentar" /></div><span className="eyebrow">NEWEST FIRST</span></div>{comments.length === 0 ? <div className="admin-empty"><MessageSquare size={30} /><strong>Belum ada komentar.</strong><span>Pesan tamu akan muncul di sini.</span></div> : filteredComments.length === 0 ? <div className="admin-empty">Tidak ada komentar yang cocok.</div> : <><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>NAME</th><th>MESSAGE</th><th>DJ PAGE</th><th>DATE</th><th>ACTION</th></tr></thead><tbody>{filteredComments.map((comment) => <tr key={comment.id}><td className="dj-name">{comment.name}</td><td className="admin-comment-message">{comment.message}</td><td>{comment.dj_name || "—"}</td><td>{new Date(comment.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</td><td><button className="icon-button danger" onClick={() => confirmDeleteComment(comment)} aria-label={`Hapus komentar ${comment.name}`}><Trash2 size={15} /></button></td></tr>)}</tbody></table></div><div className="admin-comment-cards">{filteredComments.map((comment) => <div className="mobile-admin-card" key={comment.id}><div><strong>{comment.name}</strong><small>{new Date(comment.created_at).toLocaleDateString("id-ID")}</small></div><p>{comment.message}</p><small>Halaman DJ: {comment.dj_name || "—"}</small><div className="row-actions"><button className="icon-button danger" onClick={() => confirmDeleteComment(comment)} aria-label={`Hapus komentar ${comment.name}`}><Trash2 size={15} /></button></div></div>)}</div></>}</section>}
  </>}
  </main>

  {modal && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}><form className="modal-card" onSubmit={saveDj} role="dialog" aria-modal="true" aria-labelledby="edit-dj-title"><h2 id="edit-dj-title">{modal.mode === "add" ? "Add a DJ" : "Edit DJ Name"}</h2><p>{modal.mode === "add" ? "Nama akan dipakai di pesan personal. Link unik dibuat otomatis." : "Ubah nama yang tampil di halaman. Link lama tetap berfungsi."}</p><div className="admin-field"><label htmlFor="dj-name">DJ NAME</label><input id="dj-name" className="admin-input" autoFocus value={modalName} onChange={(event) => setModalName(event.target.value)} maxLength={60} required placeholder="Nama DJ" /></div>{error && <p className="form-feedback error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal(null)}>CANCEL</button><button className="neon-button" disabled={busy}><Check size={15} /> {busy ? "SAVING..." : "SAVE DJ"}</button></div></form></div>}
  {confirm && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirm(null); }}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><h2 id="confirm-title">{confirm.title}</h2><p>{confirm.body}</p>{error && <p className="form-feedback error" role="alert">{error}</p>}<div className="modal-actions"><button className="secondary-button" onClick={() => setConfirm(null)}>CANCEL</button><button className={confirm.danger ? "danger-button" : "neon-button"} disabled={busy} onClick={() => void runConfirm()}>{busy ? "WORKING..." : confirm.action}</button></div></div></div>}
  {toast && <div className="toast" role="status">{toast}</div>}
  </div>;
}
