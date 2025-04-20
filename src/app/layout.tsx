import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils"; // Assuming you have this utility

const manrope = Manrope({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-manrope',
  weight: ['200', '300', '400', '500', '600', '700', '800']
});

const sora = Sora({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-sora',
  weight: ['400', '600', '700']
});

export const metadata: Metadata = {
  title: "CloudMap - AI Cloud Architecture Generator",
  description: "Generate AWS microservices architecture diagrams with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full ${manrope.variable} ${sora.variable}`}>
      <body className={cn("h-full font-sans antialiased bg-white text-black", manrope.className)}>
        {children}
      </body>
    </html>
  );
}
