'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import AdminManagement from '@/components/AdminManagement';

export default function AdminsPage() {
  const [user, setUser] = useState<any>(null);
  const [businesses, setBusinesses] = useState<any[]>([]);

  useEffect(() => {
    async function init() {
      const [uRes, bRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/businesses'),
      ]);
      if (uRes.ok) setUser((await uRes.json()).user);
      if (bRes.ok) setBusinesses((await bRes.json()).businesses);
    }
    init();
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0f19] flex flex-col text-slate-100">
      <Navbar user={user} businesses={businesses} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8">
        <AdminManagement />
      </main>
    </div>
  );
}
