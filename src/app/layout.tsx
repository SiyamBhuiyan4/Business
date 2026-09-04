import type { Metadata } from 'next';
import './globals.css';

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
      <body className="bg-[#0b0f19] text-slate-100 min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
