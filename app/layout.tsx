import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ViLo (VibeLocator) — Your Smart Semantic Memory Assistant',
  description: 'AI-powered household object tracker using Gemini Multimodal AI. Remembers your item locations with natural voice interaction in Sundanese, Indonesian, and English.',
};

import { ViloProvider } from '@/context/ViloContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-100 antialiased`} suppressHydrationWarning>
        <ViloProvider>
          {children}
        </ViloProvider>
      </body>
    </html>
  );
}
