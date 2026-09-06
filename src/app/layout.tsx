import type { Metadata } from 'next';
import './globals.css';
import BlueprintAmbient from '@/components/BlueprintAmbient';
import CursorTrail from '@/components/CursorTrail';

export const metadata: Metadata = {
  title: 'Multi-Business Management Dashboard',
  description: 'Role-based multi-business sales analytics, order management, and PDF delivery sheet generator',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <BlueprintAmbient />
        <CursorTrail />
        <div className="relative z-10 min-h-screen">{children}</div>
      </body>
    </html>
  );
}
