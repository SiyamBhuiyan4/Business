import type { Metadata } from 'next';
import { MotionConfig } from 'framer-motion';
import './globals.css';
import BlueprintAmbient from '@/components/BlueprintAmbient';
import CursorTrail from '@/components/CursorTrail';
import LoadingScreen from '@/components/LoadingScreen';
import FruitNinjaGame from '@/components/game/FruitNinjaGame';
import { ToastProvider } from '@/components/motion/Toast';

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
        <MotionConfig reducedMotion="user">
          <ToastProvider>
            <LoadingScreen />
            <BlueprintAmbient />
            <CursorTrail />
            <div className="relative z-10 min-h-screen">{children}</div>
            <FruitNinjaGame />
          </ToastProvider>
        </MotionConfig>
      </body>
    </html>
  );
}
