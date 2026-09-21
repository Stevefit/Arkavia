import Image from "next/image";

export function Wordmark({ className = "", silver = false, priority = false }: { className?: string; silver?: boolean; priority?: boolean }) {
  return <Image
    className={`brand-wordmark ${silver ? "silver" : "white"} ${className}`}
    src={silver ? "/brand/wordmark-silver.jpg" : "/brand/wordmark-white.jpg"}
    alt="ARKAVIA"
    width={silver ? 3840 : 1600}
    height={silver ? 1281 : 1600}
    priority={priority}
  />;
}

export function Mark({ className = "", priority = true }: { className?: string; priority?: boolean }) {
  return <Image className={`brand-mark ${className}`} src="/brand/mark-blue.jpg" alt="ARKAVIA mark" width={1600} height={1600} priority={priority} />;
}
