import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Starkids",
  description:
    "Play, speak and explore English with illustrated six-step adventures for children.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
