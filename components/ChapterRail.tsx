"use client";

export default function ChapterRail({ total, activeIndex, reduced = false }: { total: number; activeIndex: number; reduced?: boolean }) {
  return <nav className={`chapter-rail ${reduced ? "is-reduced" : ""}`} aria-label="Progress pesan">
    <div className="chapter-rail-nodes">
      {Array.from({ length: total }, (_, index) => <div className={`chapter-rail-node ${index <= activeIndex ? "is-passed" : ""} ${index === activeIndex ? "is-current" : ""}`} key={index} aria-current={index === activeIndex ? "step" : undefined}>
        <span className="chapter-node-dot" />
        <span>{String(index + 1).padStart(2, "0")}</span>
      </div>)}
    </div>
  </nav>;
}
