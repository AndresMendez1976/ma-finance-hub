import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MA Finance Hub',
  description: 'Multi-tenant finance platform — Powered by MAiSHQ',
  icons: { icon: '/favicon.svg', apple: '/icons/icon-192.svg' },
  manifest: '/manifest.json',
  metadataBase: new URL('https://maishq.com'),
  openGraph: {
    title: 'MA Finance Hub',
    description: 'Multi-tenant finance platform — Powered by MAiSHQ',
    siteName: 'MA Finance Hub',
    url: 'https://maishq.com',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'MAFinance',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#1B4332" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body>
        {children}
        {/* Service Worker registration for PWA offline support */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
