"use client";

import { motion, type Variants } from "framer-motion";
import Image from "next/image";
import type { ChapterRole } from "@/lib/parseSections";

const MAP_IMAGE_URL = "https://hd339l09uzcdhf0y.public.blob.vercel-storage.com/map.jpg";
const UNDER_STAGE_IMAGE_URL = "https://hd339l09uzcdhf0y.public.blob.vercel-storage.com/under_stage.jpg";

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

const mediaVariants: Variants = {
  hidden: { opacity: 0, y: 46, scale: 0.96, clipPath: "inset(14% 9% 14% 9%)" },
  visible: { opacity: 1, y: 0, scale: 1, clipPath: "inset(0% 0% 0% 0%)", transition: { duration: 0.82, ease: [0.22, 1, 0.36, 1] } },
};

const reducedMediaVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
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

function BodyCopy({ paragraphs, pullQuote = null, className = "" }: { paragraphs: string[]; pullQuote?: string | null; className?: string }) {
  return <div className={`chapter-body-copy ${className}`}>
    {paragraphs.map((paragraph, paragraphIndex) => <div key={paragraphIndex}>
      <motion.p variants={lineVariants}><RichText text={paragraph} /></motion.p>
      {pullQuote && paragraphIndex === 0 && <motion.blockquote variants={lineVariants}>{pullQuote}</motion.blockquote>}
    </div>)}
  </div>;
}

function ChapterMedia({ reduced }: { reduced: boolean }) {
  const variants = reduced ? reducedMediaVariants : mediaVariants;
  return <div className="chapter-media-sequence">
    <motion.figure className="chapter-visual chapter-visual-map" variants={variants}>
      <div className="chapter-visual-frame">
        <Image src={MAP_IMAGE_URL} alt="Pemandangan area ARKAVIA dari atas" fill sizes="(max-width: 760px) calc(100vw - 92px), 420px" unoptimized />
        <span className="chapter-visual-grid" aria-hidden="true" />
      </div>
      <figcaption><span>ARKAVIA WORLD MAP</span><span>COORDINATES / MEMORY 01</span></figcaption>
    </motion.figure>
    <motion.figure className="chapter-visual chapter-visual-stage" variants={variants}>
      <div className="chapter-visual-frame">
        <Image src={UNDER_STAGE_IMAGE_URL} alt="Suasana di bawah panggung ARKAVIA" fill sizes="(max-width: 760px) calc(100vw - 92px), 850px" unoptimized />
        <span className="chapter-visual-grid" aria-hidden="true" />
      </div>
      <figcaption><span>BELOW THE STAGE</span><span>WHERE THE FREQUENCY LIVES</span></figcaption>
    </motion.figure>
  </div>;
}

export default function ChapterCard({ index, total, text, role, pullQuote = null, active = false, preview = false, reduced = false }: ChapterCardProps) {
  const allParagraphs = splitParagraphs(text);
  const signatureIndex = role === "closing" ? allParagraphs.findIndex((paragraph) => /^salam hangat[,.]?$/i.test(paragraph)) : -1;
  const contentParagraphs = signatureIndex >= 0 ? allParagraphs.slice(0, signatureIndex) : allParagraphs;
  const signatureParagraphs = signatureIndex >= 0 ? allParagraphs.slice(signatureIndex) : [];
  const variants = reduced ? reducedVariants : containerVariants;
  const motionProps = preview ? { initial: false as const } : { initial: "hidden", whileInView: "visible", viewport: { once: true, amount: 0.4 } };
  const targetParagraphIndex = contentParagraphs.findIndex((paragraph) => paragraph.includes("Bagi kami, ARKAVIA"));
  const isSectionThree = role === "body" && index === 2;
  const hasChapterMedia = isSectionThree || targetParagraphIndex >= 0;
  const usesLegacyPlacement = !isSectionThree && targetParagraphIndex >= 0;
  const paragraphsBeforeMedia = usesLegacyPlacement ? contentParagraphs.slice(0, targetParagraphIndex) : [];
  const featureParagraphs = usesLegacyPlacement ? contentParagraphs.slice(targetParagraphIndex, targetParagraphIndex + 1) : contentParagraphs;
  const paragraphsAfterMedia = usesLegacyPlacement ? contentParagraphs.slice(targetParagraphIndex + 1) : [];

  return <motion.article
    className={`chapter-card chapter-${role} ${active || preview || reduced ? "is-active" : ""}`}
    data-chapter-index={index}
    aria-label={`Bagian ${index + 1} dari ${total}`}
    variants={variants}
    {...motionProps}
  >
    {role === "title" && <span className="chapter-title-glow" aria-hidden="true" />}
    <div className={`chapter-card-inner ${hasChapterMedia ? "has-chapter-media" : ""}`}>
      {role !== "title" && <div className="chapter-hud"><span>MESSAGE CHAPTER</span><span>{String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span></div>}

      {role === "title" ? <div className="chapter-title-copy">
        {allParagraphs.map((paragraph, paragraphIndex) => <motion.p className={paragraphIndex === 0 ? "chapter-title-lead" : "chapter-title-support"} variants={lineVariants} key={paragraphIndex}><RichText text={paragraph} /></motion.p>)}
      </div> : hasChapterMedia ? <>
        {paragraphsBeforeMedia.length > 0 && <BodyCopy paragraphs={paragraphsBeforeMedia} className="chapter-body-before" />}
        <BodyCopy paragraphs={featureParagraphs} pullQuote={pullQuote} className="chapter-body-feature" />
      </> : <BodyCopy paragraphs={contentParagraphs} pullQuote={pullQuote} />}

      {hasChapterMedia && <ChapterMedia reduced={reduced} />}

      {paragraphsAfterMedia.length > 0 && <BodyCopy paragraphs={paragraphsAfterMedia} className="chapter-body-after" />}

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
