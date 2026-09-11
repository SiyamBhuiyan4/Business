'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { fadeScaleIn, springSnappy } from '@/lib/motion';
import PressableButton from '@/components/motion/PressableButton';
import AmbientBrandGraphic from '@/components/AmbientBrandGraphic';

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const shakeControls = useAnimationControls();
  useEffect(() => { shakeControls.start('visible'); }, [shakeControls]);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError('');
    const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, loginAs: 'SUPER_ADMIN' }) });
    const data = await response.json(); setLoading(false);
    if (!response.ok) {
      setError(data.error || 'Unable to sign in');
      shakeControls.start({ x: [0, -8, 8, -6, 6, 0], transition: { duration: 0.4 } });
      return;
    }
    router.push('/dashboard'); router.refresh();
  }
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0b0f19] flex items-center justify-center p-4">
      <AmbientBrandGraphic className="-right-24 -top-24" />
      <AmbientBrandGraphic className="-bottom-32 -left-20 rotate-180" />
      <motion.form
        onSubmit={submit}
        animate={shakeControls}
        initial="hidden"
        variants={fadeScaleIn}
        className="w-full max-w-md space-y-5 rounded-3xl border border-purple-500/30 bg-slate-900 p-8 shadow-2xl"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-purple-400">Owner control panel</p>
          <h1 className="mt-2 text-2xl font-black text-white">Super Admin Sign In</h1>
          <p className="mt-1 text-xs text-slate-400">Full access to businesses, staff accounts, permissions, and analytics.</p>
        </div>
        <AnimatePresence>
          {error && (
            <motion.p
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={springSnappy}
              className="overflow-hidden rounded-xl bg-rose-500/10 p-3 text-xs text-rose-300"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
        <input required type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Username or email" className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm text-white" />
        <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm text-white" />
        <PressableButton disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-500 py-3 text-xs font-black text-slate-950">
          <AnimatePresence mode="wait" initial={false}>
            {loading ? (
              <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Signing in...
              </motion.span>
            ) : (
              <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Sign In to Control Panel
              </motion.span>
            )}
          </AnimatePresence>
        </PressableButton>
      </motion.form>
    </main>
  );
}
