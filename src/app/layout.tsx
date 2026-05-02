import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navigation from "@/components/Navigation";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "FPL History | Fantasy Premier League Analytics",
  description: "Explore 9 seasons of Fantasy Premier League data with rich analytics, player profiles, and historical records.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Navigation />
        <main className="pt-16 pb-24 md:pb-0 min-h-screen">
          {children}
        </main>
        <footer className="border-t border-border py-6 px-4 text-center text-muted text-xs mb-20 md:mb-0">
          <p>FPL History — Data sourced from <a href="https://github.com/vaastav/Fantasy-Premier-League" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">vaastav/Fantasy-Premier-League</a></p>
          <p className="mt-1">9 seasons · 6,500+ player records · 224,000+ gameweek entries</p>
        </footer>
      </body>
    </html>
  );
}
