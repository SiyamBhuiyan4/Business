'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Store, Shield, LogOut, ChevronDown, UserCheck, Plus } from 'lucide-react';

interface NavbarProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  businesses?: Array<{
    id: string;
    name: string;
    slug: string;
    color: string;
  }>;
  currentBusinessSlug?: string;
}

export default function Navbar({ user, businesses = [], currentBusinessSlug }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const currentBusiness = businesses.find((b) => b.slug === currentBusinessSlug);
  const workspaceBase = user?.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard';

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push(user?.role === 'ADMIN' ? '/admin/login' : '/super-admin/login');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4 lg:px-8">
      <div className="glass-panel mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-2xl px-3 py-2.5 sm:px-4 min-w-0">
        {/* Left: Brand Logo & Business Switcher */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href={workspaceBase} className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1A535C] text-white shadow-lg shadow-teal-900/20 transition-transform group-hover:scale-105">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight text-[#2B2D42]">
                Rise
              </span>
            </div>
          </Link>

          {/* Business Switcher Dropdown */}
          {businesses.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex max-w-[210px] items-center gap-2 rounded-xl border border-white/70 bg-white/45 px-3 py-2 text-sm font-semibold text-[#2B2D42] shadow-sm sm:max-w-none"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="max-w-[150px] sm:max-w-[220px] truncate">
                  {currentBusiness ? currentBusiness.name : 'Select Business'}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Workspaces
                  </div>
                  <Link
                    href={workspaceBase}
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800/60"
                  >
                    <Store className="w-4 h-4 text-slate-400" />
                    All Businesses Overview
                  </Link>
                  <div className="my-1 border-t border-slate-800" />
                  {businesses.map((biz) => (
                    <Link
                      key={biz.id}
                      href={`${workspaceBase}/${biz.slug}`}
                      onClick={() => setDropdownOpen(false)}
                      className={`flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                        biz.slug === currentBusinessSlug
                          ? 'bg-emerald-500/10 text-emerald-400 font-medium'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <span className="truncate">{biz.name}</span>
                      {biz.slug === currentBusinessSlug && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right User Actions */}
        <div className="flex items-center gap-3">
          {user?.role === 'SUPER_ADMIN' && (
            <Link
              href="/dashboard/admins"
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                pathname === '/dashboard/admins'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden md:inline">Admin Permissions</span>
            </Link>
          )}

          <div className="flex items-center gap-2 rounded-xl border border-white/70 bg-white/45 px-2 py-1.5 sm:px-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#C88A58] text-[10px] font-black text-white">{user?.role === 'SUPER_ADMIN' ? 'SA' : 'A'}</span>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-slate-200">{user?.name}</div>
              <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">
                {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Log out"
            className="p-2 rounded-lg bg-slate-800/60 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/60 hover:border-rose-500/40 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
