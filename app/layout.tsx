import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Little Talk · English practice",
  description:
    "A little conversation. A little more confidence. Friendly AI English practice for young learners.",
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
