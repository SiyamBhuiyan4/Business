'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError('');
    const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, loginAs: 'SUPER_ADMIN' }) });
    const data = await response.json(); setLoading(false);
    if (!response.ok) return setError(data.error || 'Unable to sign in');
    router.push('/dashboard'); router.refresh();
  }
  return <main className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4"><form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-3xl border border-purple-500/30 bg-slate-900 p-8 shadow-2xl"><div><p className="text-xs font-bold uppercase tracking-widest text-purple-400">Owner control panel</p><h1 className="mt-2 text-2xl font-black text-white">Super Admin Sign In</h1><p className="mt-1 text-xs text-slate-400">Full access to businesses, staff accounts, permissions, and analytics.</p></div>{error && <p className="rounded-xl bg-rose-500/10 p-3 text-xs text-rose-300">{error}</p>}<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm text-white" /><input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-sm text-white" /><button disabled={loading} className="w-full rounded-xl bg-purple-500 py-3 text-xs font-black text-slate-950">{loading ? 'Signing in...' : 'Sign In to Control Panel'}</button></form></main>;
}
