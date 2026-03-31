import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MA Finance Hub',
  description: 'Multi-tenant finance platform — Powered by MAiSHQ',
  icons: { icon: '/favicon.svg' },
  metadataBase: new URL('https://maishq.com'),
  openGraph: {
    title: 'MA Finance Hub',
    description: 'Multi-tenant finance platform — Powered by MAiSHQ',
    siteName: 'MA Finance Hub',
    url: 'https://maishq.com',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
