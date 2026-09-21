"use client";

import { AnimatePresence, motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowDown, ArrowUpRight, AudioLines, ChevronDown, Disc3, Headphones, Music2, Pause, Play, Send, Volume2, VolumeX } from "lucide-react";
import { FormEvent, MouseEvent, useEffect, useRef, useState } from "react";
import { Mark, Wordmark } from "./Brand";
import Reveal from "./Reveal";
import type { Dj, GuestComment, Settings } from "@/lib/types";

type PageState = "loading" | "ready" | "missing" | "error";

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  const formatter = new Intl.RelativeTimeFormat("id", { numeric: "auto" });
  if (seconds < 60) return "baru saja";
  if (seconds < 3600) return formatter.format(-Math.floor(seconds / 60), "minute");
  if (seconds < 86400) return formatter.format(-Math.floor(seconds / 3600), "hour");
  if (seconds < 2592000) return formatter.format(-Math.floor(seconds / 86400), "day");
  return formatter.format(-Math.floor(seconds / 2592000), "month");
}

export default function PublicExperience({ slug }: { slug: string }) {
  const [state, setState] = useState<PageState>("loading");
  const [dj, setDj] = useState<Dj | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [comments, setComments] = useState<GuestComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [formName, setFormName] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [posting, setPosting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 130, damping: 30 });
  const orbY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -180]);
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const springTiltX = useSpring(tiltX, { stiffness: 180, damping: 24 });
  const springTiltY = useSpring(tiltY, { stiffness: 180, damping: 24 });

  function tiltCard(event: MouseEvent<HTMLDivElement>) {
    if (reduced || window.matchMedia("(pointer: coarse)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    tiltX.set(((event.clientY - rect.top) / rect.height - 0.5) * -4);
    tiltY.set(((event.clientX - rect.left) / rect.width - 0.5) * 4);
  }

  useEffect(() => {
    if (!slug) { setState("missing"); return; }
    const controller = new AbortController();
    async function load() {
      const [djResponse, settingsResponse] = await Promise.all([
        fetch(`/api/djs?name=${encodeURIComponent(slug)}`, { signal: controller.signal }),
        fetch("/api/settings", { signal: controller.signal }),
      ]);
      if (djResponse.status === 404) { setState("missing"); return; }
      if (!djResponse.ok || !settingsResponse.ok) throw new Error("load failed");
      const [foundDj, currentSettings] = await Promise.all([djResponse.json(), settingsResponse.json()]);
      setDj(foundDj); setFormName(foundDj.name); setSettings(currentSettings); setState("ready");
      try {
        const commentsResponse = await fetch("/api/comments?page=1", { signal: controller.signal });
        if (!commentsResponse.ok) throw new Error("comments failed");
        const commentPage = await commentsResponse.json();
        setComments(commentPage.comments); setHasMore(commentPage.hasMore);
      } finally { setCommentsLoading(false); }
    }
    void load().catch((error) => { if (error.name !== "AbortError") setState("error"); });
    return () => controller.abort();
  }, [slug]);

  useEffect(() => {
    if (state !== "ready" || open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [state, open]);

  async function enter() {
    setOpen(true);
    if (settings?.music_url && audioRef.current) {
      try { await audioRef.current.play(); setPlaying(true); } catch { setPlaying(false); }
    }
  }

  async function toggleMusic() {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      try { await audioRef.current.play(); setPlaying(true); } catch { setPlaying(false); }
    } else { audioRef.current.pause(); setPlaying(false); }
  }

  async function loadMore() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const response = await fetch(`/api/comments?page=${next}`);
      if (!response.ok) throw new Error("load failed");
      const result = await response.json();
      setComments((current) => [...current, ...result.comments.filter((item: GuestComment) => !current.some((old) => old.id === item.id))]);
      setPage(next); setHasMore(result.hasMore);
    } catch { setFormError("Komentar belum dapat dimuat. Coba lagi."); }
    finally { setLoadingMore(false); }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (posting) return;
    setFormError(""); setFormSuccess("");
    const name = formName.trim();
    const message = formMessage.trim();
    if (!name || name.length > 60 || !message || message.length > 500) {
      setFormError("Isi nama (maks. 60 karakter) dan pesan (maks. 500 karakter)."); return;
    }
    const tempId = -Date.now();
    const optimistic: GuestComment = { id: tempId, dj_id: dj?.id || null, name, message, created_at: new Date().toISOString() };
    setComments((current) => [optimistic, ...current]); setPosting(true);
    try {
      const response = await fetch("/api/comments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dj_id: dj?.id, name, message, honeypot }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Pesan belum dapat dikirim.");
      setComments((current) => result.ignored ? current.filter((item) => item.id !== tempId) : current.map((item) => item.id === tempId ? result : item));
      setFormMessage(""); setFormSuccess("Pesanmu sudah tampil di guestbook.");
    } catch (error) {
      setComments((current) => current.filter((item) => item.id !== tempId));
      setFormError(error instanceof Error ? error.message : "Pesan belum dapat dikirim.");
    } finally { setPosting(false); }
  }

  const message = settings?.message_template.replaceAll("{name}", dj?.name || "") || "";

  return <main className="public-shell">
    <motion.div className="scroll-progress" style={{ scaleX: smoothProgress }} />
    <div className="ambient-grid" aria-hidden="true" />
    <div className="scanlines" aria-hidden="true" />
    <motion.div className="ambient-orb" style={{ y: orbY }} aria-hidden="true" />
    <header className="site-header">
      <a className="header-brand" href="#top" aria-label="ARKAVIA, kembali ke atas"><Wordmark priority /></a>
      <div className="header-meta"><span className="live-dot" /> DJ FEST <span className="header-separator">/</span> APPRECIATION SIGNAL</div>
      <span className="header-index">AV—01 / 2026</span>
    </header>

    {state === "loading" && <div className="screen-state"><span className="loading-line" /><p>MENYIAPKAN SINYAL...</p></div>}
    {state === "error" && <div className="screen-state"><span className="eyebrow">SIGNAL INTERRUPTED</span><h1>Belum bisa terhubung.</h1><p>Silakan muat ulang halaman ini.</p><button className="neon-button" onClick={() => location.reload()}>Muat ulang <ArrowUpRight size={17} /></button></div>}
    {state === "missing" && <section className="missing-state"><Mark className="missing-mark" /><span className="eyebrow">PRIVATE TRANSMISSION / ARKAVIA</span><h1>Undangan khusus<br /><em>menantimu.</em></h1><p>Silakan buka halaman ini melalui link undangan khusus yang dibagikan oleh tim ARKAVIA.</p><span className="corner-note">ARKAVIA DJ FEST · 2026</span></section>}

    {state === "ready" && dj && settings && <>
      <AnimatePresence>{!open && <motion.div className="opening-gate" initial={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.08, filter: "blur(16px)" }} transition={{ duration: reduced ? 0.2 : 0.7 }}>
        <div className="gate-grid" aria-hidden="true" />
        <span className="gate-top">ARKAVIA DJ FEST <span>✦</span> PRIVATE TRANSMISSION</span>
        <div className="gate-center"><Wordmark className="gate-wordmark" priority /><div className="gate-line" /><p>A MESSAGE FOR <strong>DJ {dj.name.toUpperCase()}</strong></p><button className="gate-open" onClick={enter}><span className="gate-open-icon"><Headphones size={25} strokeWidth={1.5} /></span><span>BUKA PESAN <small>{settings.music_url ? "TAP FOR SOUND & EXPERIENCE" : "TAP TO OPEN THE EXPERIENCE"}</small></span><ArrowUpRight size={19} /></button></div>
        {/* <span className="gate-bottom">SCROLL INTO THE SIGNAL <ArrowDown size={15} /></span> */}
      </motion.div>}</AnimatePresence>

      <div aria-hidden={!open} inert={!open}>
      <section id="top" className="hero-section">
        <div className="hero-side-label">A PERSONAL MESSAGE FROM ARKAVIA <span>✦</span> 001—003</div>
        <Reveal className="hero-content"><div className="hero-kicker"><span className="line" /> FOR THE ARTIST WHO MADE THE NIGHT</div><Mark className="hero-mark" /><h1><span>THANK YOU,</span><strong>DJ {dj.name}</strong></h1><p className="hero-deck">Satu malam. Banyak momen. Energi yang kamu bawa akan selalu jadi bagian dari cerita ARKAVIA.</p><a className="hero-scroll" href="#message"><span className="scroll-circle"><ArrowDown size={17} /></span> SCROLL TO READ YOUR MESSAGE</a></Reveal>
        <div className="hero-bottom"><span>ARKAVIA DJ FEST / APPRECIATION 2026</span><span>MADE FOR DJ {dj.name.toUpperCase()}</span></div>
      </section>

      <section id="message" className="message-section"><Reveal><div className="section-topline"><span>01 / THE MESSAGE</span><span>TRANSMISSION RECEIVED <span className="live-dot" /></span></div><div className="message-heading"><span className="eyebrow">TO THE ONE BEHIND THE DECKS</span><h2>YOU MADE IT <em>UNFORGETTABLE.</em></h2></div></Reveal><Reveal delay={0.1}><motion.div className="message-card" style={{ rotateX: springTiltX, rotateY: springTiltY, transformPerspective: 1200 }} onMouseMove={tiltCard} onMouseLeave={() => { tiltX.set(0); tiltY.set(0); }}><div className="card-top"><span>PERSONAL NOTE</span><span>FOR DJ {dj.name.toUpperCase()}</span></div><div className="message-copy">{message.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div><div className="card-bottom"><span>WITH LOVE, ARKAVIA & TEAM</span><span className="card-star">✳</span></div></motion.div></Reveal><div className="message-aside"><span>GOOD MUSIC STAYS WITH US.</span><span>✦</span><span>SO DO THE PEOPLE BEHIND IT.</span></div></section>

      <section className="interlude-section"><Reveal><div className="interlude-line">THE NIGHT ENDS. <span>THE MOMENTS STAY.</span></div><div className="interlude-meta">YOUR SET BECAME PART OF OUR STORY <AudioLines size={30} strokeWidth={1} /></div></Reveal></section>

      <section id="guestbook" className="guestbook-section"><Reveal><div className="section-topline"><span>02 / THE GUESTBOOK</span><span>OPEN CHANNEL <span className="live-dot" /></span></div><div className="guestbook-heading"><div><span className="eyebrow">LEAVE YOUR MARK</span><h2>PESAN & <em>KESAN.</em></h2></div><p>Musik mempertemukan kita. Ceritakan momenmu dan biarkan pesannya tetap hidup di sini.</p></div></Reveal><div className="guestbook-grid"><Reveal><form className="glass-panel guest-form" onSubmit={submitComment}><div className="form-head"><span>YOUR MESSAGE</span><Send size={18} /></div><label htmlFor="guest-name">NAMA</label><input id="guest-name" value={formName} onChange={(event) => setFormName(event.target.value)} maxLength={60} placeholder="Nama kamu" required /><label htmlFor="guest-message">PESAN</label><textarea id="guest-message" value={formMessage} onChange={(event) => setFormMessage(event.target.value)} maxLength={500} rows={6} placeholder="Tulis ucapan atau kesanmu di sini..." required /><div className="honeypot-field" aria-hidden="true"><label htmlFor="guest-website">Leave this field empty</label><input id="guest-website" name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} /></div><div className="form-footer"><span>{formMessage.length} / 500</span><button className="neon-button" disabled={posting}>{posting ? "MENGIRIM..." : "KIRIM PESAN"}<ArrowUpRight size={17} /></button></div>{formError && <p className="form-feedback error" role="alert">{formError}</p>}{formSuccess && <p className="form-feedback success" role="status">{formSuccess}</p>}</form></Reveal><div className="comments-column"><div className="comments-header"><span>LIVE WALL</span><span>{comments.length.toString().padStart(2, "0")} MESSAGES</span></div>{commentsLoading ? <div className="comments-loading"><span className="loading-line" />Memuat Komentar...</div> : comments.length === 0 ? <div className="comments-empty"><Disc3 size={38} strokeWidth={1} /><p>Jadi yang pertama meninggalkan pesan!</p></div> : <div className="comment-list"><AnimatePresence initial={false}>{comments.map((comment, index) => <motion.article className="comment-card" key={comment.id} layout initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.35, delay: Math.min(index, 5) * 0.06 }}><div className="comment-top"><strong>{comment.name}</strong><time dateTime={comment.created_at}>{relativeTime(comment.created_at)}</time></div><p>{comment.message}</p><div className="comment-end"><span>✦ ARKAVIA GUESTBOOK</span><span>#{String(comment.id > 0 ? comment.id : "NEW").padStart(3, "0")}</span></div></motion.article>)}</AnimatePresence></div>}{hasMore && <button className="load-more" onClick={loadMore} disabled={loadingMore}>{loadingMore ? "MEMUAT KOMENTAR..." : "MUAT LEBIH BANYAK"}<ChevronDown size={17} /></button>}</div></div></section>

      <footer className="site-footer"><Wordmark silver /><div><span>THANK YOU FOR BEING PART OF THE FREQUENCY.</span><small>© ARKAVIA DJ FEST 2026 · MADE WITH MUSIC & GRATITUDE</small></div><a href="#top" aria-label="Kembali ke atas"><ArrowUpRight size={20} /></a></footer>
      </div>

      {settings.music_url && <><audio ref={audioRef} src={settings.music_url} loop preload="none" onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} /><motion.button className={`music-toggle ${playing ? "is-playing" : ""}`} onClick={toggleMusic} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }} aria-label={playing ? "Jeda musik" : "Putar musik"} title={playing ? "Jeda musik" : "Putar musik"}>{playing ? <Volume2 size={20} /> : <VolumeX size={20} />}<span className="music-ring" /></motion.button></>}
    </>}
  </main>;
}
