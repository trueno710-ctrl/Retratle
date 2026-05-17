import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Retratle - AI株式分析プラットフォーム",
  description: "AIを活用した日本株式市場分析・省庁モニタリングプラットフォーム",
};

const navLinks = [
  { href: "/", label: "ダッシュボード", icon: "⬡" },
  { href: "/ministry-monitor", label: "省庁モニター", icon: "🏛" },
  { href: "/daily-reports", label: "日次レポート", icon: "📋" },
  { href: "/tenbagger", label: "テンバガー研究所", icon: "🚀" },
  { href: "/weekly-news", label: "週次レポート", icon: "📰" },
  { href: "/price-alerts", label: "値動きアラート", icon: "⚡" },
  { href: "/economic-calendar", label: "経済カレンダー", icon: "📅" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex" style={{ background: "#0a0f1e", color: "#e2e8f0" }}>
        {/* Sidebar */}
        <aside
          className="fixed left-0 top-0 h-full w-64 flex flex-col z-50"
          style={{
            background: "#080d1a",
            borderRight: "1px solid #1f2937",
          }}
        >
          {/* Logo */}
          <div className="p-6" style={{ borderBottom: "1px solid #1f2937" }}>
            <div className="flex items-center gap-3 mb-1">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
              >
                R
              </div>
              <span className="text-xl font-bold text-white">Retratle</span>
            </div>
            <p className="text-xs pl-11" style={{ color: "#6b7280" }}>
              AI株式分析プラットフォーム
            </p>
          </div>

          {/* Live indicator */}
          <div className="px-6 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid #1f2937" }}>
            <span
              className="live-dot w-2 h-2 rounded-full"
              style={{ background: "#10b981" }}
            />
            <span className="text-xs" style={{ color: "#10b981" }}>
              リアルタイム監視中
            </span>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group"
                style={{ color: "#9ca3af" }}
              >
                <span className="text-base w-5 text-center">{link.icon}</span>
                <span className="group-hover:text-white transition-colors">{link.label}</span>
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4" style={{ borderTop: "1px solid #1f2937" }}>
            <div className="text-xs space-y-1" style={{ color: "#6b7280" }}>
              <p>Powered by Claude AI</p>
              <p>J-Quants · X API v2</p>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 ml-64 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
