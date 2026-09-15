import type { Metadata, Viewport } from "next";

import "./globals.css";
import { Spotlight } from "@/components/spotlight";

export const metadata: Metadata = {
  title: "Mohammad Omar — Frontend Developer",
  description:
    "Portfolio of Md Omar Faruk Chowdhury, a frontend developer from Chattogram, Bangladesh building responsive, data-driven web applications with React, Next.js and TypeScript.",
  keywords: [
    "Mohammad Omar",
    "Md Omar Faruk Chowdhury",
    "frontend developer",
    "web developer",
    "Chattogram",
    "React",
    "Next.js",
    "TypeScript",
    "Webermelon",
  ],
  authors: [{ name: "Md Omar Faruk Chowdhury", url: "https://omar-webcloud.vercel.app/" }],
  icons: { icon: "/favicon.jpg" },
  openGraph: {
    title: "Mohammad Omar — Frontend Developer",
    description:
      "Building high-performance, intuitive digital experiences. React, Next.js and TypeScript.",
    url: "https://omar-webcloud.vercel.app/",
    siteName: "Mohammad Omar",
    type: "profile",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

/** Runs before paint so the theme never flashes. */
const themeInit = `(function(){try{var t=localStorage.getItem("portfolio-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.classList.toggle("dark",t==="dark");document.documentElement.style.colorScheme=t;}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@300..700&family=Geist+Mono:wght@400..600&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="relative min-h-screen font-sans antialiased">
        <Spotlight />
        <div className="relative z-10 mx-auto w-full max-w-3xl">{children}</div>
      </body>
    </html>
  );
}
