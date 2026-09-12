'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Shield, Plus, Check, X, UserPlus, ToggleLeft, ToggleRight, Building, Key, Mail, CalendarDays, Trash2, Pencil, UserCheck, UserX, Eye, EyeOff, Copy, Wand2, PartyPopper } from 'lucide-react';
import { PERMISSION_LIST } from '@/lib/permissions';
import Modal from '@/components/motion/Modal';
import PressableButton from '@/components/motion/PressableButton';
import { useToast } from '@/components/motion/Toast';
import { slideFromRight, springSnappy, staggerContainer, staggerItem } from '@/lib/motion';
import { copyToClipboard, generateStrongPassword } from '@/lib/password';

export default function AdminManagement() {
  const toast = useToast();
  const [admins, setAdmins] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Admin Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedBizIds, setSelectedBizIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editCurrentPassword, setEditCurrentPassword] = useState('');
  const [editAdminPin, setEditAdminPin] = useState('');
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Record<string, boolean>>({});
  const [accessUpdating, setAccessUpdating] = useState<string | null>(null);
  const [adminQuery, setAdminQuery] = useState('');
  const [createError, setCreateError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [justCreated, setJustCreated] = useState<{ username: string; password: string } | null>(null);

  const copyText = async (label: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) toast.success(`${label} copied to clipboard`);
    else toast.error(`Could not copy ${label.toLowerCase()}`);
  };
  const loginAs = async (admin: any) => { const res = await fetch('/api/admin/impersonate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: admin.id }) }); if (res.ok) window.location.href = '/admin/dashboard'; else toast.error((await res.json()).error || 'Unable to log in as admin'); };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [admRes, bizRes] = await Promise.all([
        fetch('/api/admins'),
        fetch('/api/businesses'),
      ]);
      const admJson = await admRes.json();
      const bizJson = await bizRes.json();

      if (admRes.ok) {
        setAdmins(admJson.admins);
        setSelectedAdmin((current: any) => current ? (admJson.admins.find((a: any) => a.id === current.id) || null) : current);
      }
      if (bizRes.ok) setBusinesses(bizJson.businesses);
    } catch (err) {
      console.error('Failed to load admin management data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAdmin = (admin: any) => { setSelectedAdmin(admin); setEditMode(false); setEditName(admin.name); setEditEmail(admin.email); setEditUsername(admin.username || admin.email.split('@')[0]); setEditPassword(''); setEditCurrentPassword(''); setEditAdminPin(admin.adminPin || ''); };
  const updateAdmin = async (active: boolean = selectedAdmin.active, remove = false) => {
    if (remove) { const res = await fetch(`/api/admins?id=${selectedAdmin.id}`, { method: 'DELETE' }); if (res.ok) { setSelectedAdmin(null); setShowDeleteConfirm(false); fetchData(); toast.success('Admin deleted'); } return; }
    const nextPassword = editPassword.trim();
    const res = await fetch('/api/admins', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedAdmin.id, name: editName, username: editUsername, email: editEmail, password: nextPassword || undefined, currentPassword: editCurrentPassword || undefined, active, adminPin: editAdminPin }) });
    if (res.ok) { setSelectedAdmin({ ...selectedAdmin, name: editName, email: editEmail, active, adminPin: editAdminPin || null }); setEditMode(false); fetchData(); toast.success(active === selectedAdmin.active ? 'Admin updated' : active ? 'Admin activated' : 'Admin deactivated'); }
    else toast.error('Failed to update admin');
  };

  const handleTogglePermission = async (
    adminId: string,
    businessId: string,
    permKey: string,
    currentVal: boolean,
    allAdminPerms: any[]
  ) => {
    setAccessUpdating(`${adminId}:${businessId}`);
    // Build updated permissions map for this admin & business
    const currentPermsForBiz: Record<string, boolean> = {};
    PERMISSION_LIST.forEach((p) => {
      currentPermsForBiz[p.key] = p.defaultForAdmin;
    });

    allAdminPerms
      .filter((p) => p.businessId === businessId)
      .forEach((p) => {
        currentPermsForBiz[p.permissionKey] = p.enabled;
      });

    currentPermsForBiz[permKey] = !currentVal;

    try {
      const res = await fetch(`/api/admins/${adminId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          isAssigned: true,
          permissions: currentPermsForBiz,
        }),
      });

      if (res.ok) await fetchData();
      else { const json = await res.json().catch(() => ({})); toast.error(json.error || 'Failed to update permission'); }
    } catch (err) {
      console.error('Failed to toggle permission:', err);
      toast.error('Could not update permission. Please try again.');
    } finally {
      setAccessUpdating(null);
    }
  };

  const handleToggleBusinessAccess = async (
    adminId: string,
    businessId: string,
    isCurrentlyAssigned: boolean
  ) => {
    setAccessUpdating(`${adminId}:${businessId}`);
    try {
      const res = await fetch(`/api/admins/${adminId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          isAssigned: !isCurrentlyAssigned,
        }),
      });

      if (res.ok) {
        const assigned = !isCurrentlyAssigned;
        setSelectedAdmin((current: any) => current && current.id === adminId ? {
          ...current,
          businessAccess: assigned
            ? [...current.businessAccess, { businessId, business: businesses.find((b) => b.id === businessId) }]
            : current.businessAccess.filter((x: any) => x.businessId !== businessId),
          permissions: assigned
            ? [...current.permissions, ...PERMISSION_LIST.map((p) => ({ businessId, permissionKey: p.key, enabled: p.defaultForAdmin }))]
            : current.permissions.filter((x: any) => x.businessId !== businessId),
        } : current);
        await fetchData();
        if (!isCurrentlyAssigned) toast.success('Workspace access assigned successfully.');
        else toast.success('Workspace access removed');
      }
      else { const json = await res.json().catch(() => ({})); toast.error(json.error || 'Failed to update workspace access'); }
    } catch (err) {
      console.error('Failed to toggle business access:', err);
      toast.error('Could not update workspace access. Please try again.');
    } finally {
      setAccessUpdating(null);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedUsername = username.trim().toLowerCase();
    if (!normalizedUsername || !password.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: normalizedUsername,
          username: normalizedUsername,
          email: '',
          password: password.trim(),
          assignedBusinessIds: [],
        }),
      });

      if (res.ok) {
        setCreateError('');
        setJustCreated({ username: normalizedUsername, password: password.trim() });
        setName('');
        setEmail('');
        setUsername('');
        setPassword('');
        setSelectedBizIds([]);
        fetchData();
        toast.success('Admin account created');
      } else {
        const json = await res.json();
        setCreateError(res.status === 409 ? `Username '${normalizedUsername}' is already taken. Please choose another username.` : (json.error || 'Failed to create admin'));
      }
    } catch (err) {
      console.error('Error creating admin:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="analytics-glass border p-5 sm:p-6 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            <h2 className="text-[1.2rem] font-bold text-[#0F172A]">Admin Access Center</h2>
          </div>
          <p className="text-[13px] text-[#475569] mt-1">
            Assign workspaces and control permissions for every admin from one place.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]"><span className="admin-tab-active rounded-full px-2.5 py-1">Profile-based access</span><span className="admin-tab rounded-full px-2.5 py-1">Workspace-scoped permissions</span></div>
        </div>

        <PressableButton
          onClick={() => setShowCreateModal(true)}
          className="order-primary flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          Create Admin Account
        </PressableButton>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="admin-stat"><div className="admin-stat-label">Admin accounts</div><div className="admin-stat-value">{admins.length}</div></div>
        <div className="admin-stat"><div className="admin-stat-label">Active admins</div><div className="admin-stat-value">{admins.filter((a) => a.active !== false).length}</div></div>
        <div className="admin-stat"><div className="admin-stat-label">Workspaces</div><div className="admin-stat-value">{businesses.length}</div></div>
        <div className="admin-stat"><div className="admin-stat-label">Assignments</div><div className="admin-stat-value">{admins.reduce((sum, a) => sum + a.businessAccess.length, 0)}</div></div>
      </div>

      <div className="relative"><input value={adminQuery} onChange={(e) => setAdminQuery(e.target.value)} placeholder="Search admins by name, username, or email..." className="admin-search w-full rounded-xl px-4 py-3 text-sm outline-none transition" /></div>

      {/* Admin Matrix */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 text-sm">Loading admin permission profiles...</div>
      ) : admins.length > 0 ? (
        <motion.div className="grid gap-4 md:grid-cols-2" variants={staggerContainer} initial="hidden" animate="visible">
          {admins.filter((adm) => `${adm.name} ${adm.username || ''} ${adm.email}`.toLowerCase().includes(adminQuery.toLowerCase())).map((adm) => (
            <motion.div
              key={adm.id}
              variants={staggerItem}
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              onClick={() => openAdmin(adm)}
              className="admin-profile-card group rounded-2xl p-5 cursor-pointer"
            >
              {/* Admin Header */}
              <div className="flex items-start justify-between gap-3 pb-5 border-b border-slate-800">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="w-14 h-14 shrink-0 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <UserCheck className="w-7 h-7" />
                  </div>
                  <div className="min-w-0">
                    <div className="admin-card-label mb-1">Administrator</div>
                    <h3 className="truncate text-base font-bold text-[#0F172A]">{adm.name}</h3>
                    <div className="truncate text-xs text-[#64748B]">{adm.email}</div>
                  </div>
                </div>
                <div className="shrink-0">
                  <span className={`admin-status inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${adm.active === false ? 'admin-status-off' : 'admin-status-on'}`}>
                    {adm.active === false ? 'Inactive' : 'Active'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 py-4"><div className="admin-mini-stat"><div className="admin-card-label">Workspaces</div><div className="admin-mini-value">{adm.businessAccess.length}</div></div><div className="admin-mini-stat"><div className="admin-card-label">Enabled</div><div className="admin-mini-value">{adm.permissions.filter((p: any) => p.enabled).length}</div></div><div className="admin-mini-stat"><div className="admin-card-label">Joined</div><div className="admin-mini-value truncate">{new Date(adm.createdAt).toLocaleDateString()}</div></div></div>
              {adm.adminPin && (
                <div className="admin-mini-stat mb-4 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                  <div className="min-w-0">
                    <div className="admin-card-label">Reference PIN <span className="normal-case font-normal opacity-60">(note only)</span></div>
                    <div className="admin-mini-value truncate font-mono">{revealedPins[adm.id] ? adm.adminPin : '••••••••'}</div>
                  </div>
                  <PressableButton onClick={() => setRevealedPins((s) => ({ ...s, [adm.id]: !s[adm.id] }))} title={revealedPins[adm.id] ? 'Hide PIN' : 'Show PIN'} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:text-white">
                    {revealedPins[adm.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </PressableButton>
                </div>
              )}
              <div className="flex items-center justify-between gap-3"><div className="flex min-w-0 flex-wrap gap-1.5">{adm.businessAccess.slice(0, 2).map((x: any) => <span key={x.businessId} className="max-w-[150px] truncate rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold text-cyan-300">{x.business.name}</span>)}</div><div className="flex gap-2"><PressableButton onClick={(e: React.MouseEvent) => { e.stopPropagation(); loginAs(adm); }} className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950">Login As</PressableButton><PressableButton onClick={(e: React.MouseEvent) => { e.stopPropagation(); openAdmin(adm); }} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-purple-500 px-3 py-2 text-xs font-bold text-slate-950"><Key className="w-3.5 h-3.5" /> Manage</PressableButton></div></div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl py-16 text-center text-slate-500 text-sm">
          No custom Admin accounts found. Create one using the button above.
        </div>
      )}

      <AnimatePresence>
        {selectedAdmin && (
          <motion.div
            className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedAdmin(null)}
          >
          <motion.aside
            className="h-full w-full max-w-xl overflow-y-auto border-l border-slate-700 bg-slate-900 p-4 sm:p-6"
            variants={slideFromRight}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-purple-300">Admin profile</p>
                <h2 className="break-words text-2xl font-black text-white">{selectedAdmin.name}</h2>
                <p className="break-all text-sm text-slate-400">{selectedAdmin.email || selectedAdmin.username}</p>
              </div>
              <PressableButton onClick={() => setSelectedAdmin(null)} title="Close" className="shrink-0 rounded-xl bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white">
                <X className="h-5 w-5" />
              </PressableButton>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <PressableButton type="button" onClick={() => setEditMode((value) => !value)} className="flex items-center justify-center gap-2 rounded-xl bg-purple-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-purple-400">
                <Pencil className="h-4 w-4" /> {editMode ? 'Close Editor' : 'Edit Admin'}
              </PressableButton>
              <PressableButton type="button" onClick={() => updateAdmin(!selectedAdmin.active)} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ${selectedAdmin.active ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25' : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'}`}>
                {selectedAdmin.active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                {selectedAdmin.active ? 'Deactivate' : 'Activate'}
              </PressableButton>
              <PressableButton type="button" onClick={() => setShowDeleteConfirm(true)} className="flex items-center justify-center gap-2 rounded-xl bg-red-500/15 px-4 py-2.5 text-sm font-bold text-red-300 hover:bg-red-500/25">
                <Trash2 className="h-4 w-4" /> Delete
              </PressableButton>
            </div>

            <AnimatePresence initial={false}>
            {editMode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
              <div className="mt-4 space-y-4 rounded-2xl border border-purple-500/25 bg-purple-500/5 p-4">
                <label className="block space-y-1.5 text-sm font-semibold text-slate-300">
                  Username
                  <span className="flex items-center gap-2">
                    <input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} autoComplete="username" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-purple-400" />
                    <PressableButton type="button" onClick={() => editUsername && copyText('Username', editUsername)} title="Copy username" className="shrink-0 rounded-xl bg-slate-800 p-2.5 text-slate-400 hover:bg-slate-700 hover:text-white">
                      <Copy className="h-4 w-4" />
                    </PressableButton>
                  </span>
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5 text-sm font-semibold text-slate-300">
                    Current password <span className="font-normal text-slate-500">(optional)</span>
                    <span className="relative block">
                      <input type={showCurrentPassword ? 'text' : 'password'} autoComplete="current-password" value={editCurrentPassword} onChange={(e) => setEditCurrentPassword(e.target.value)} placeholder="Enter to verify" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 pr-11 text-white outline-none placeholder:text-slate-600 focus:border-purple-400" />
                      <button type="button" onClick={() => setShowCurrentPassword((value) => !value)} title={showCurrentPassword ? 'Hide password' : 'Show password'} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:text-white">{showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                    </span>
                  </label>
                  <label className="space-y-1.5 text-sm font-semibold text-slate-300">
                    New password <span className="font-normal text-slate-500">(optional)</span>
                    <span className="flex items-center gap-2">
                      <span className="relative flex-1">
                        <input type={showEditPassword ? 'text' : 'password'} autoComplete="new-password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Leave unchanged" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 pr-11 text-white outline-none placeholder:text-slate-600 focus:border-purple-400" />
                        <button type="button" onClick={() => setShowEditPassword((value) => !value)} title={showEditPassword ? 'Hide password' : 'Show password'} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:text-white">{showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                      </span>
                      <PressableButton type="button" onClick={() => { const p = generateStrongPassword(); setEditPassword(p); setShowEditPassword(true); }} title="Generate strong password" className="shrink-0 rounded-xl bg-purple-500/15 p-2.5 text-purple-300 hover:bg-purple-500/25">
                        <Wand2 className="h-4 w-4" />
                      </PressableButton>
                      <PressableButton type="button" onClick={() => editPassword && copyText('Password', editPassword)} title="Copy password" className="shrink-0 rounded-xl bg-slate-800 p-2.5 text-slate-400 hover:bg-slate-700 hover:text-white">
                        <Copy className="h-4 w-4" />
                      </PressableButton>
                    </span>
                  </label>
                </div>
                <label className="block space-y-1.5 text-sm font-semibold text-slate-300">
                  Reference PIN <span className="font-normal text-slate-500">(your private note — not a login credential, never checked at sign-in)</span>
                  <input value={editAdminPin} onChange={(e) => setEditAdminPin(e.target.value)} placeholder="e.g. a code only you use to remember this account" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-purple-400" />
                </label>
                <PressableButton type="button" onClick={() => updateAdmin()} disabled={!editUsername.trim()} className="w-full rounded-xl bg-purple-500 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-50">Save Changes</PressableButton>
              </div>
              </motion.div>
            )}
            </AnimatePresence>

            <div className="mt-8">
              <div className="mb-4">
                <h3 className="font-black text-white">Workspace access</h3>
                <p className="text-sm text-slate-400">Toggle a workspace on, then open Details to manage its permissions.</p>
                {selectedAdmin.businessAccess.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {selectedAdmin.businessAccess.map((x: any) => (
                      <span key={x.businessId} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                        {x.business?.name || businesses.find((b) => b.id === x.businessId)?.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {businesses.map((biz) => {
                  const assigned = selectedAdmin.businessAccess.some((x: any) => x.businessId === biz.id);
                  const expanded = expandedWorkspaces[biz.id] === true;
                  return (
                    <div key={biz.id} className={`rounded-2xl border p-4 transition-colors ${assigned ? 'border-emerald-500/25 bg-emerald-500/[0.03]' : 'border-slate-800 bg-slate-950/50'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <PressableButton type="button" onClick={() => assigned && setExpandedWorkspaces((state) => ({ ...state, [biz.id]: !expanded }))} className="flex min-w-0 items-center gap-2 text-left">
                          <span className="break-words text-sm font-bold text-slate-200">{biz.name}</span>
                          {assigned && <span className="shrink-0 text-[10px] text-slate-500">{expanded ? 'Hide' : 'Details'}</span>}
                        </PressableButton>
                        <button
                          type="button"
                          onClick={() => handleToggleBusinessAccess(selectedAdmin.id, biz.id, assigned)}
                          disabled={accessUpdating === `${selectedAdmin.id}:${biz.id}`}
                          title={assigned ? 'Revoke workspace access' : 'Grant workspace access'}
                          className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors disabled:opacity-60 ${assigned ? 'justify-end bg-emerald-500' : 'justify-start bg-slate-700'}`}
                        >
                          <motion.span layout transition={springSnappy} className="inline-block h-5 w-5 rounded-full bg-white shadow" />
                        </button>
                      </div>
                      <AnimatePresence initial={false}>
                        {assigned && expanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {PERMISSION_LIST.map((perm) => {
                            const row = selectedAdmin.permissions.find((x: any) => x.businessId === biz.id && x.permissionKey === perm.key);
                            const enabled = row ? row.enabled : perm.defaultForAdmin;
                            return (
                              <PressableButton type="button" key={perm.key} disabled={accessUpdating === `${selectedAdmin.id}:${biz.id}`} onClick={() => handleTogglePermission(selectedAdmin.id, biz.id, perm.key, enabled, selectedAdmin.permissions)} className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left disabled:opacity-60 ${enabled ? 'border-purple-500/40 bg-purple-500/10 text-purple-200' : 'border-slate-800 bg-slate-900 text-slate-500'}`}>
                                <span className="min-w-0 break-words text-xs font-bold">{perm.label}</span>
                                <span className={`flex h-4 w-8 shrink-0 rounded-full p-0.5 ${enabled ? 'bg-purple-500 justify-end' : 'bg-slate-700 justify-start'}`}>
                                  <motion.span layout transition={springSnappy} className="inline-block h-3 w-3 rounded-full bg-white" />
                                </span>
                              </PressableButton>
                            );
                          })}
                          </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Admin Confirm */}
      <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} maxWidth="max-w-sm">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full overflow-hidden shadow-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-100">Delete admin?</h3>
          <p className="text-xs text-slate-400">Delete {selectedAdmin?.name}? This cannot be easily undone.</p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <PressableButton onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">Cancel</PressableButton>
            <PressableButton onClick={() => updateAdmin(selectedAdmin.active, true)} className="px-4 py-2 rounded-xl bg-red-500/15 text-red-300 text-xs font-bold">Delete</PressableButton>
          </div>
        </div>
      </Modal>

      {/* Create Admin Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => { setShowCreateModal(false); setJustCreated(null); setCreateError(''); }}
        maxWidth="max-w-md"
      >
        <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full overflow-hidden shadow-2xl">
          {justCreated ? (
            <div className="p-6 space-y-5">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                  <PartyPopper className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-100">Admin account created</h3>
                <p className="text-xs text-slate-400">Copy these credentials now and send them to the admin — the password won&apos;t be shown again.</p>
              </div>

              <div className="space-y-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Username</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-mono text-slate-100">{justCreated.username}</code>
                    <PressableButton type="button" onClick={() => copyText('Username', justCreated.username)} title="Copy username" className="shrink-0 rounded-xl bg-slate-800 p-2.5 text-slate-300 hover:bg-slate-700 hover:text-white">
                      <Copy className="h-4 w-4" />
                    </PressableButton>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Password</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-mono text-slate-100">{justCreated.password}</code>
                    <PressableButton type="button" onClick={() => copyText('Password', justCreated.password)} title="Copy password" className="shrink-0 rounded-xl bg-slate-800 p-2.5 text-slate-300 hover:bg-slate-700 hover:text-white">
                      <Copy className="h-4 w-4" />
                    </PressableButton>
                  </div>
                </div>
                <PressableButton
                  type="button"
                  onClick={() => copyText('Credentials', `Username: ${justCreated.username}\nPassword: ${justCreated.password}`)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-xs font-black text-slate-950"
                >
                  <Copy className="h-4 w-4" /> Copy Both as Text
                </PressableButton>
              </div>

              <PressableButton
                type="button"
                onClick={() => { setJustCreated(null); setShowCreateModal(false); }}
                className="w-full rounded-xl bg-slate-800 py-2.5 text-sm font-bold text-slate-200"
              >
                Done
              </PressableButton>
            </div>
          ) : (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
              <h3 className="text-base font-bold text-slate-100">Create New Admin Account</h3>
              <PressableButton
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </PressableButton>
            </div>

            <form onSubmit={handleCreateAdmin} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Username *</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. rahim.admin"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                  <PressableButton type="button" onClick={() => username && copyText('Username', username)} title="Copy username" className="shrink-0 rounded-xl bg-slate-800 p-2.5 text-slate-400 hover:bg-slate-700 hover:text-white">
                    <Copy className="h-4 w-4" />
                  </PressableButton>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Password *</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 pr-10 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                    <button type="button" onClick={() => setShowPassword((value) => !value)} title={showPassword ? 'Hide password' : 'Show password'} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:text-white">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                  </div>
                  <PressableButton type="button" onClick={() => { const p = generateStrongPassword(); setPassword(p); setShowPassword(true); }} title="Generate strong password" className="shrink-0 rounded-xl bg-purple-500/15 p-2.5 text-purple-300 hover:bg-purple-500/25">
                    <Wand2 className="h-4 w-4" />
                  </PressableButton>
                  <PressableButton type="button" onClick={() => password && copyText('Password', password)} title="Copy password" className="shrink-0 rounded-xl bg-slate-800 p-2.5 text-slate-400 hover:bg-slate-700 hover:text-white">
                    <Copy className="h-4 w-4" />
                  </PressableButton>
                </div>
                <p className="mt-1.5 text-[10px] text-slate-500">Click the wand to auto-generate a strong password.</p>
              </div>

              {createError && <div role="alert" className="rounded-xl border border-red-500 bg-red-100/95 px-3 py-2 text-xs font-bold text-red-800">{createError}</div>}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <PressableButton
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </PressableButton>
                <PressableButton
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs shadow-lg shadow-purple-500/20"
                >
                  {submitting ? 'Creating...' : 'Create Admin'}
                </PressableButton>
              </div>
            </form>
          </>
          )}
        </div>
      </Modal>
    </div>
  );
}
