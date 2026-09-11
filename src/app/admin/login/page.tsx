'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { springSnappy } from '@/lib/motion';
import PressableButton from '@/components/motion/PressableButton';
import AuthLayout from '@/components/AuthLayout';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const shakeControls = useAnimationControls();
  useEffect(() => { shakeControls.start('visible'); }, [shakeControls]);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError('');
    const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, loginAs: 'ADMIN' }) });
    const data = await response.json(); setLoading(false);
    if (!response.ok) {
      setError(data.error || 'Unable to sign in');
      shakeControls.start({ x: [0, -8, 8, -6, 6, 0], transition: { duration: 0.4 } });
      return;
    }
    router.push('/admin/dashboard'); router.refresh();
  }
  return (
    <AuthLayout
      eyebrow="Admin workspace"
      title="Admin Sign In"
      subtitle="Access only the business workspaces and actions assigned to you."
      accent="teal"
      onSubmit={submit}
      shakeControls={shakeControls}
      footerSlot={
        <a href="/super-admin/login" className="block text-center text-[11px] font-semibold" style={{ color: 'var(--copper)' }}>
          Super Admin instead →
        </a>
      }
    >
      <AnimatePresence>
        {error && (
          <motion.p
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={springSnappy}
            className="overflow-hidden rounded-xl border border-rose-400/50 bg-rose-50/95 p-3 text-xs font-bold text-rose-800"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
      <input required type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Admin username or email" className="w-full rounded-xl px-3 py-3 text-sm outline-none focus:border-[#1A535C] focus:ring-4 focus:ring-[#1A535C]/20" />
      <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full rounded-xl px-3 py-3 text-sm outline-none focus:border-[#1A535C] focus:ring-4 focus:ring-[#1A535C]/20" />
      <PressableButton disabled={loading} className="glass-button flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold disabled:opacity-60">
        <AnimatePresence mode="wait" initial={false}>
          {loading ? (
            <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Signing in...
            </motion.span>
          ) : (
            <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              Sign In to Admin Workspace
            </motion.span>
          )}
        </AnimatePresence>
      </PressableButton>
    </AuthLayout>
  );
}
