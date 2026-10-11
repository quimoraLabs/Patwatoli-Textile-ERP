import type { Metadata } from 'next';
import './globals.css';
import AppLayout from '@/components/layout/AppLayout';

export const metadata: Metadata = {
  title: 'Patwatoli Textile ERP | Gaya, Bihar',
  description: 'Enterprise ERP System for Patwatoli Weaving & Merchant Cluster',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
