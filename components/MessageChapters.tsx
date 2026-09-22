"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import ChapterCard from "./ChapterCard";
import ChapterRail from "./ChapterRail";
import { parseSections } from "@/lib/parseSections";

export default function MessageChapters({ template, name, preview = false }: { template: string; name: string; preview?: boolean }) {
  const sections = useMemo(() => parseSections(template, name), [template, name]);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;

  useEffect(() => {
    setActiveIndex(0);
    if (preview || !rootRef.current) return;
    const cards = rootRef.current.querySelectorAll<HTMLElement>("[data-chapter-index]");
    const observer = new IntersectionObserver((entries) => {
      const centered = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (centered) setActiveIndex(Number((centered.target as HTMLElement).dataset.chapterIndex || 0));
    }, { rootMargin: "-42% 0px -42% 0px", threshold: [0, 0.25, 0.6] });
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [preview, sections.length]);

  if (!sections.length) return <div className="chapter-empty">Tambahkan isi pesan untuk melihat preview chapter.</div>;

  return <div className={`message-chapters ${preview ? "is-preview" : ""}`} ref={rootRef}>
    {!preview && <ChapterRail total={sections.length} activeIndex={activeIndex} reduced={reduced} />}
    <div className="chapter-list">
      {sections.map((section, index) => <ChapterCard
        key={`${index}-${section.text.slice(0, 24)}`}
        index={index}
        total={sections.length}
        text={section.text}
        role={section.role}
        pullQuote={section.pullQuote}
        active={index === activeIndex}
        preview={preview}
        reduced={reduced}
      />)}
    </div>
  </div>;
}
