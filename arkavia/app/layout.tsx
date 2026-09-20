import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "ARKAVIA • DJ Appreciation",
  description:
    "Untuk setiap energi, musik, dan momen yang kita bagi. ARKAVIA DJ FEST.",
  icons: { icon: "/favicon.svg" },
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
