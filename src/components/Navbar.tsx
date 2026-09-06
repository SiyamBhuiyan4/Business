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
      <div className="navbar-shell mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-2xl px-3 py-2.5 sm:px-4 min-w-0">
        {/* Left: Brand Logo & Business Switcher */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href={workspaceBase} className="flex items-center gap-2.5 group">
            <div className="navbar-brand-icon flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <span className="navbar-brand-name text-lg font-extrabold tracking-tight">
                Rise
              </span>
            </div>
          </Link>

          {/* Business Switcher Dropdown */}
          {businesses.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="navbar-workspace flex max-w-[210px] items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold sm:max-w-none"
              >
                <div className="h-2.5 w-2.5 rounded-full bg-[#5ED3A5] shadow-[0_0_0_3px_rgba(94,211,165,.15)]" />
                <span className="max-w-[150px] sm:max-w-[220px] truncate">
                  {currentBusiness ? currentBusiness.name : 'Select Business'}
                </span>
                <ChevronDown className="ml-1 h-4 w-4 text-[#7C8798]" />
              </button>

              {dropdownOpen && (
                <div className="navbar-dropdown absolute left-0 mt-2 w-64 rounded-2xl py-2 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider">
                    Workspaces
                  </div>
                  <Link
                    href={workspaceBase}
                    onClick={() => setDropdownOpen(false)}
                    className="navbar-dropdown-item flex items-center gap-2.5 px-3 py-2 text-sm"
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
                        ? 'navbar-dropdown-active font-semibold'
                          : 'navbar-dropdown-item'
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
              className={`navbar-permissions flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
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
            <span className="navbar-avatar flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-black text-white">{user?.role === 'SUPER_ADMIN' ? 'SA' : 'A'}</span>
            <div className="text-left hidden sm:block">
              <div className="navbar-user-name text-xs font-semibold">{user?.name} {user?.role === 'SUPER_ADMIN' && <span className="navbar-owner">(Owner)</span>}</div>
              <div className="navbar-user-role text-[10px] font-mono uppercase tracking-wider">
                {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Log out"
            className="navbar-logout rounded-xl p-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
