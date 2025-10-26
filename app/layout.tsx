import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Creative & Technical Consultancy",
  description: "Bold, creative solutions for modern businesses. We deliver innovative technical consulting with a focus on performance and user experience.",
  themeColor: "#000000",
  openGraph: {
    title: "Creative & Technical Consultancy",
    description: "Bold, creative solutions for modern businesses. We deliver innovative technical consulting with a focus on performance and user experience.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
