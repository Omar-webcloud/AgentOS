import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentOS — Production AI Agent Platform",
  description:
    "Build, deploy, observe, evaluate, and govern autonomous AI agents that do real work.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
