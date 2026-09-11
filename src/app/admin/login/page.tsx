'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { fadeScaleIn, springSnappy } from '@/lib/motion';
import PressableButton from '@/components/motion/PressableButton';

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
  return <main className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
    <motion.form
      onSubmit={submit}
      animate={shakeControls}
      initial="hidden"
      variants={fadeScaleIn}
      className="w-full max-w-md space-y-5 rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl"
    >
      <div><p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Admin workspace</p><h1 className="mt-2 text-2xl font-black text-white">Admin Sign In</h1><p className="mt-1 text-xs text-slate-400">Access only the business workspaces and actions assigned to you.</p></div>
      <AnimatePresence>
        {error && (
          <motion.p
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={springSnappy}
            className="overflow-hidden rounded-xl border border-red-500/50 bg-red-100/90 p-3 text-xs font-bold text-red-800"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
      <input required type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Admin username or email" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-950 placeholder:text-slate-500 outline-none focus:border-[#1A535C] focus:ring-4 focus:ring-[#1A535C]/20" />
      <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-950 placeholder:text-slate-500 outline-none focus:border-[#1A535C] focus:ring-4 focus:ring-[#1A535C]/20" />
      <PressableButton disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A535C] py-3 text-xs font-bold text-white disabled:opacity-60">
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
    </motion.form>
  </main>;
}
