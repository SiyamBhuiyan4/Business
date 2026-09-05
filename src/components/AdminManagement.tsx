'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Plus, Check, X, UserPlus, ToggleLeft, ToggleRight, Building, Key, Mail, CalendarDays, Trash2, Pencil, UserCheck, UserX } from 'lucide-react';
import { PERMISSION_LIST } from '@/lib/permissions';

export default function AdminManagement() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Admin Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedBizIds, setSelectedBizIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [admRes, bizRes] = await Promise.all([
        fetch('/api/admins'),
        fetch('/api/businesses'),
      ]);
      const admJson = await admRes.json();
      const bizJson = await bizRes.json();

      if (admRes.ok) setAdmins(admJson.admins);
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

  const openAdmin = (admin: any) => { setSelectedAdmin(admin); setEditMode(false); setEditName(admin.name); setEditEmail(admin.email); };
  const updateAdmin = async (active: boolean = selectedAdmin.active, remove = false) => {
    if (remove) { if (!window.confirm(`Delete ${selectedAdmin.name}? This cannot be easily undone.`)) return; const res = await fetch(`/api/admins?id=${selectedAdmin.id}`, { method: 'DELETE' }); if (res.ok) { setSelectedAdmin(null); fetchData(); } return; }
    const res = await fetch('/api/admins', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedAdmin.id, name: editName, email: editEmail, active }) });
    if (res.ok) { setSelectedAdmin({ ...selectedAdmin, name: editName, email: editEmail, active }); setEditMode(false); fetchData(); }
  };

  const handleTogglePermission = async (
    adminId: string,
    businessId: string,
    permKey: string,
    currentVal: boolean,
    allAdminPerms: any[]
  ) => {
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

      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Failed to toggle permission:', err);
    }
  };

  const handleToggleBusinessAccess = async (
    adminId: string,
    businessId: string,
    isCurrentlyAssigned: boolean
  ) => {
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
        fetchData();
      }
    } catch (err) {
      console.error('Failed to toggle business access:', err);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          assignedBusinessIds: selectedBizIds,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setName('');
        setEmail('');
        setPassword('');
        setSelectedBizIds([]);
        fetchData();
      } else {
        const json = await res.json();
        alert(json.error || 'Failed to create admin');
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
      <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold text-slate-100">Granular Admin Permissions Profile Panel</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure exact toggle permissions per Admin user per Business workspace (Admin ↔ Business ↔ Permission)
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs shadow-lg shadow-purple-500/20"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          Create Admin Account
        </button>
      </div>

      {/* Admin Matrix */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 text-sm">Loading admin permission profiles...</div>
      ) : admins.length > 0 ? (
        <div className="space-y-6">
          {admins.map((adm) => (
            <div
              key={adm.id}
              onClick={() => openAdmin(adm)}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 cursor-pointer hover:border-purple-500/50 transition-all"
            >
              {/* Admin Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/30 to-emerald-500/20 text-purple-300 font-bold text-lg flex items-center justify-center">
                    {adm.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100">{adm.name}</h3>
                    <div className="text-xs font-mono text-slate-400">{adm.email}</div><div className="text-[10px] text-slate-500 mt-1">Joined {new Date(adm.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${adm.active === false ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'}`}>
                  {adm.active === false ? 'Inactive' : 'Active'} · 
                  Assigned Workspaces: {adm.businessAccess.length}
                </span>
              </div>

              {/* Per Business Permissions Breakdown */}
              <div className="space-y-4">
                {selectedAdmin?.id === adm.id && businesses.map((biz) => {
                  const isAssigned = adm.businessAccess.some((ba: any) => ba.businessId === biz.id);

                  // Extract permission values
                  const getPermStatus = (permKey: string) => {
                    const record = adm.permissions.find(
                      (p: any) => p.businessId === biz.id && p.permissionKey === permKey
                    );
                    if (record) return record.enabled;
                    const permDef = PERMISSION_LIST.find((p) => p.key === permKey);
                    return permDef ? permDef.defaultForAdmin : false;
                  };

                  return (
                    <div
                      key={biz.id}
                      className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-emerald-400" />
                          <span className="font-bold text-sm text-slate-200">{biz.name}</span>
                        </div>

                        <button
                          onClick={() => handleToggleBusinessAccess(adm.id, biz.id, isAssigned)}
                          className={`text-xs font-bold px-3 py-1 rounded-lg border transition-all ${
                            isAssigned
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-slate-800 text-slate-500 border-slate-700'
                          }`}
                        >
                          {isAssigned ? 'Assigned (Active)' : '+ Assign Access'}
                        </button>
                      </div>

                      {isAssigned ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                          {PERMISSION_LIST.map((perm) => {
                            const isEnabled = getPermStatus(perm.key);
                            return (
                              <div
                                key={perm.key}
                                onClick={() =>
                                  handleTogglePermission(
                                    adm.id,
                                    biz.id,
                                    perm.key,
                                    isEnabled,
                                    adm.permissions
                                  )
                                }
                                className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                                  isEnabled
                                    ? 'bg-slate-900 border-purple-500/40 text-purple-200'
                                    : 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-60'
                                }`}
                              >
                                <div>
                                  <div className="text-xs font-bold">{perm.label}</div>
                                  <div className="text-[10px] opacity-75">{perm.description}</div>
                                </div>

                                <div className="ml-2">
                                  {isEnabled ? (
                                    <div className="w-8 h-4 rounded-full bg-purple-500 flex items-center justify-end px-0.5">
                                      <div className="w-3 h-3 rounded-full bg-white" />
                                    </div>
                                  ) : (
                                    <div className="w-8 h-4 rounded-full bg-slate-700 flex items-center justify-start px-0.5">
                                      <div className="w-3 h-3 rounded-full bg-slate-400" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 italic py-1">
                          Admin is not assigned to this business workspace. Click '+ Assign Access' above to grant.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl py-16 text-center text-slate-500 text-sm">
          No custom Admin accounts found. Create one using the button above.
        </div>
      )}

      {selectedAdmin && <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end" onClick={() => setSelectedAdmin(null)}><aside className="h-full w-full max-w-xl bg-slate-900 border-l border-slate-700 p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}><div className="flex justify-between items-start"><div className="flex gap-4 items-center"><div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-purple-500 to-emerald-400 text-slate-950 text-2xl font-black flex items-center justify-center">{selectedAdmin.name.charAt(0)}</div><div><p className="text-xs uppercase tracking-widest text-purple-300">Admin profile</p><h2 className="text-2xl font-black text-white">{selectedAdmin.name}</h2><p className="text-sm text-slate-400">{selectedAdmin.email}</p></div></div><button onClick={() => setSelectedAdmin(null)} className="p-2 rounded-xl bg-slate-800"><X className="w-5 h-5" /></button></div><div className="grid grid-cols-2 gap-3 mt-6"><div className="bg-slate-950/70 p-4 rounded-2xl"><p className="text-[10px] text-slate-500 uppercase">Status</p><p className="font-bold mt-1">{selectedAdmin.active === false ? 'Inactive' : 'Active'}</p></div><div className="bg-slate-950/70 p-4 rounded-2xl"><p className="text-[10px] text-slate-500 uppercase">Workspaces</p><p className="font-bold mt-1">{selectedAdmin.businessAccess.length}</p></div></div><div className="mt-6 flex gap-2"><button onClick={() => setEditMode(!editMode)} className="flex-1 py-2.5 rounded-xl bg-purple-500 text-slate-950 font-bold text-xs"><Pencil className="w-4 h-4 inline mr-2" />{editMode ? 'Cancel Edit' : 'Edit Profile'}</button><button onClick={() => updateAdmin(selectedAdmin.active === false)} className="px-3 rounded-xl bg-slate-800 text-xs">{selectedAdmin.active === false ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}</button><button onClick={() => updateAdmin(selectedAdmin.active, true)} className="px-3 rounded-xl bg-rose-500/15 text-rose-300"><Trash2 className="w-4 h-4" /></button></div>{editMode && <div className="mt-4 space-y-3"><input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm" placeholder="Full name" /><input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm" placeholder="Email" /><button onClick={() => updateAdmin()} className="w-full py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm">Save Changes</button></div>}<h3 className="mt-8 mb-3 font-bold text-slate-200">Permission overview</h3><div className="space-y-3">{PERMISSION_LIST.map((p) => <div key={p.key} className="flex justify-between items-center p-3 rounded-xl bg-slate-950/60 border border-slate-800"><span className="text-sm">{p.label}</span><span className="text-xs text-purple-300">{selectedAdmin.permissions.filter((x: any) => x.permissionKey === p.key && x.enabled).length} workspace(s)</span></div>)}</div><h3 className="mt-8 mb-3 font-bold text-slate-200">Assigned segments</h3><div className="flex flex-wrap gap-2">{selectedAdmin.businessAccess.map((x: any) => <span key={x.businessId} className="px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-300 text-xs">{x.business.name}</span>)}</div></aside></div>}

      {/* Create Admin Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
              <h3 className="text-base font-bold text-slate-100">Create New Admin Account</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahim Ahmed"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Assign Initial Businesses</label>
                <div className="space-y-2">
                  {businesses.map((biz) => (
                    <label key={biz.id} className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedBizIds.includes(biz.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBizIds([...selectedBizIds, biz.id]);
                          } else {
                            setSelectedBizIds(selectedBizIds.filter((id) => id !== biz.id));
                          }
                        }}
                        className="rounded border-slate-800 text-purple-500 focus:ring-0"
                      />
                      <span>{biz.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs shadow-lg shadow-purple-500/20"
                >
                  {submitting ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
