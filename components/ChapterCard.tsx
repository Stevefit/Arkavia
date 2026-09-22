"use client";

import { motion, type Variants } from "framer-motion";
import type { ChapterRole } from "@/lib/parseSections";

type ChapterCardProps = {
  index: number;
  total: number;
  text: string;
  role: ChapterRole;
  pullQuote?: string | null;
  active?: boolean;
  preview?: boolean;
  reduced?: boolean;
};

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 42, filter: "blur(10px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.65, staggerChildren: 0.1 } },
};

const reducedVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
};

const lineVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.42 } },
};

function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return <>{parts.map((part, index) => part.startsWith("**") && part.endsWith("**")
    ? <span className="chapter-inline-quote" key={index}>{part.slice(2, -2)}</span>
    : part)}</>;
}

function splitParagraphs(text: string) {
  return text.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
}

export default function ChapterCard({ index, total, text, role, pullQuote = null, active = false, preview = false, reduced = false }: ChapterCardProps) {
  const allParagraphs = splitParagraphs(text);
  const signatureIndex = role === "closing" ? allParagraphs.findIndex((paragraph) => /^salam hangat[,.]?$/i.test(paragraph)) : -1;
  const contentParagraphs = signatureIndex >= 0 ? allParagraphs.slice(0, signatureIndex) : allParagraphs;
  const signatureParagraphs = signatureIndex >= 0 ? allParagraphs.slice(signatureIndex) : [];
  const variants = reduced ? reducedVariants : containerVariants;
  const motionProps = preview ? { initial: false as const } : { initial: "hidden", whileInView: "visible", viewport: { once: true, amount: 0.4 } };

  return <motion.article
    className={`chapter-card chapter-${role} ${active || preview || reduced ? "is-active" : ""}`}
    data-chapter-index={index}
    aria-label={`Bagian ${index + 1} dari ${total}`}
    variants={variants}
    {...motionProps}
  >
    {role === "title" && <span className="chapter-title-glow" aria-hidden="true" />}
    <div className="chapter-card-inner">
      {role !== "title" && <div className="chapter-hud"><span>MESSAGE CHAPTER</span><span>{String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span></div>}

      {role === "title" ? <div className="chapter-title-copy">
        {allParagraphs.map((paragraph, paragraphIndex) => <motion.p className={paragraphIndex === 0 ? "chapter-title-lead" : "chapter-title-support"} variants={lineVariants} key={paragraphIndex}><RichText text={paragraph} /></motion.p>)}
      </div> : <div className="chapter-body-copy">
        {contentParagraphs.map((paragraph, paragraphIndex) => <div key={paragraphIndex}>
          <motion.p variants={lineVariants}><RichText text={paragraph} /></motion.p>
          {pullQuote && paragraphIndex === 0 && <motion.blockquote variants={lineVariants}>{pullQuote}</motion.blockquote>}
        </div>)}
      </div>}

      {signatureParagraphs.length > 0 && <motion.div
        className="chapter-signature"
        initial={preview ? false : { opacity: 0, scale: reduced ? 1 : 0.8 }}
        whileInView={preview ? undefined : { opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: reduced ? 0.2 : 0.45, delay: reduced ? 0 : 0.3 }}
      >
        <span className="chapter-seal" aria-hidden="true">✦</span>
        <div>{signatureParagraphs.map((paragraph, paragraphIndex) => <p key={paragraphIndex}><RichText text={paragraph} /></p>)}</div>
      </motion.div>}
    </div>
  </motion.article>;
}
