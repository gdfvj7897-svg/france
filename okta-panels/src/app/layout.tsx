import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getBrandByDomain } from '@/config/brands.config';
import '@/styles/globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const hostname = headersList.get('host') || 'localhost';
  const brand = getBrandByDomain(hostname);

  return {
    title: `${brand.orgName} - Sign In`,
    description: `Sign in to ${brand.orgName}`,
    icons: {
      icon: '/favicon.ico',
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
