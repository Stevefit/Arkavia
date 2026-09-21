import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ARKAVIA DJ FEST — A Signal of Gratitude",
  description: "Terima kasih sudah menjadi bagian dari ARKAVIA DJ FEST.",
  icons: { icon: "/icon.jpg", apple: "/apple-icon.jpg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
