"use client";
import {
  motion,
  useReducedMotion,
  useMotionValue,
  useSpring,
} from "framer-motion";
import { personalize } from "@/lib/template";
export default function Card({
  name,
  value,
  preview = false,
}: {
  name: string;
  value: string;
  preview?: boolean;
}) {
  const reduced = useReducedMotion();
  const x = useMotionValue(0),
    y = useMotionValue(0);
  const rx = useSpring(x),
    ry = useSpring(y);
  const paragraphs = personalize(value, name).split(/\n\s*\n/);
  return (
    <motion.article
      className="letter"
      style={
        reduced || preview
          ? {}
          : { rotateX: rx, rotateY: ry, transformPerspective: 1400 }
      }
      initial={{
        opacity: 0,
        scale: reduced ? 1 : 0.95,
        filter: reduced ? "none" : "blur(8px)",
      }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.65 }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || preview || reduced) return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((-(e.clientY - r.top - r.height / 2) / r.height) * 3);
        y.set(((e.clientX - r.left - r.width / 2) / r.width) * 3);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      <div className="letter-meta">
        <span>ARKAVIA DJ FEST</span>
        <span>A NOTE OF APPRECIATION</span>
      </div>
      {paragraphs.map((text, i) => (
        <motion.p
          key={i}
          className={
            i === 0
              ? "greeting"
              : i === paragraphs.length - 1
                ? "signature"
                : ""
          }
          initial={{ opacity: 0, y: reduced ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: preview ? 0 : 0.1 + i * 0.09 }}
        >
          {i === 0
            ? text.split(" ").map((word, j) => (
                <motion.span
                  key={j}
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: 1,
                    rotate:
                      word.includes("👋") && !reduced ? [0, 14, -8, 0] : 0,
                  }}
                  transition={{
                    opacity: { delay: preview ? 0 : 0.2 + j * 0.08 },
                    rotate: { repeat: Infinity, duration: 2.5, repeatDelay: 3 },
                  }}
                  style={{ display: "inline-block", marginRight: ".28em" }}
                >
                  {word}
                </motion.span>
              ))
            : text}
        </motion.p>
      ))}
      <div className="letter-end" aria-hidden="true">
        ✦
      </div>
    </motion.article>
  );
}
