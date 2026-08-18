import type { Metadata } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AuthSessionProvider } from "@/components/providers/session-provider";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"]
});

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "TaxReady — AI-Powered Tax & Compliance Preparation for SMEs",
  description:
    "TaxReady helps African businesses organize transactions, understand financial records, and prepare tax-ready reports using AI.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "TaxReady — Turn business transactions into tax-ready records.",
    description:
      "TaxReady helps African businesses organize transactions, understand financial records, and prepare tax-ready reports using AI.",
    type: "website"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
