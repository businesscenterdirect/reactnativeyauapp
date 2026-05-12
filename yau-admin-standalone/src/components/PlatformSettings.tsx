import { sendPasswordResetEmail } from 'firebase/auth';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import {
  Edit2,
  Globe,
  Key,
  Loader2,
  Lock,
  Mail,
  Plus,
  Save,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
  Users,
  X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { memberService, adminService } from '../lib/api';
import { GRADE_BANDS, SPORTS } from '../lib/constants';
import { auth, db } from '../lib/firebase';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Select } from './ui/Select';

type TabType = 'general' | 'admins' | 'app_users';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Viewer';
  status: 'active' | 'disabled';
}

const DEFAULT_ADMIN: AdminUser = {
  id: '',
  name: '',
  email: '',
  role: 'Viewer',
  status: 'active'
};

const DEFAULT_MEMBER = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  school_name: '',
  grade_band: '',
  sport: '',
  app_access: true
};

const PlatformSettings: React.FC = () => {
  const { adminData } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // RBAC Helpers - Using normalized roles from AuthContext
  const role = adminData?.role || 'Viewer';
  const isAdmin = role === 'Admin';
  const isManager = role === 'Manager';
  const isViewer = role === 'Viewer';

  const canModifySettings = isAdmin;
  const canManageAdmins = isAdmin;
  const canManageAppUsers = isAdmin || isManager;
  const canDelete = isAdmin;

  // General Settings State
  const [generalSettings, setGeneralSettings] = useState({
    appName: 'Youth Athlete University',
    supportEmail: 'play@yausports.com',
    platformName: 'YAU Admin Portal',
    environment: 'Production'
  });

  // Admin Management State
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser>(DEFAULT_ADMIN);
  const [isEditingAdminMode, setIsEditingAdminMode] = useState(false);
  const [adminSearch, setAdminSearch] = useState('');
  const [showOnboardingSuccess, setShowOnboardingSuccess] = useState(false);

  // App User Management State
  const [members, setMembers] = useState<any[]>([]);
  const [isAppUserModalOpen, setIsAppUserModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(DEFAULT_MEMBER);
  const [isEditingMemberMode, setIsEditingMemberMode] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [schools, setSchools] = useState<string[]>([]);
  const [appSports, setAppSports] = useState<string[]>(SPORTS);

  // ── Data Fetching ──────────────────────────────────────────────────────────

  useEffect(() => {
    // 1. Fetch Platform Settings
    const unsubSettings = onSnapshot(doc(db, 'app_settings', 'config'), (snap) => {
      if (snap.exists()) {
        setGeneralSettings(snap.data() as any);
      }
    });

    // 2. Fetch Admin Users
    const qAdmins = query(collection(db, 'admins'), orderBy('name', 'asc'));
    const unsubAdmins = onSnapshot(qAdmins, (snap) => {
      setAdmins(snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminUser)));
    });

    // 3. Fetch App Users (Members)
    const qMembers = query(collection(db, 'members'), orderBy('lastName', 'asc'));
    const unsubMembers = onSnapshot(qMembers, (snap) => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    // 4. Fetch Schools
    const qSchools = query(collection(db, 'app_schools'), orderBy('name', 'asc'));
    const unsubSchools = onSnapshot(qSchools, (snap) => {
      setSchools(snap.docs.filter(d => d.data().active).map(d => d.data().name));
    });

    // 5. Fetch Sports (Live)
    const qSports = query(collection(db, 'app_sports'), orderBy('name', 'asc'));
    const unsubSports = onSnapshot(qSports, (snap) => {
      if (!snap.empty) {
        setAppSports(snap.docs.map(d => d.data().name));
      }
    });

    return () => {
      unsubSettings();
      unsubAdmins();
      unsubMembers();
      unsubSchools();
      unsubSports();
    };
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleSaveGeneral = async () => {
    if (!canModifySettings) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'app_settings', 'config'), generalSettings, { merge: true });
      toast.success('Platform settings updated.');
    } catch (error) {
      toast.error('Failed to update platform settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleAdminAction = async () => {
    if (!canManageAdmins) return;
    setSaving(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Authentication session expired. Please re-login.');

      const payload = {
        ...editingAdmin,
        email: editingAdmin.email?.toLowerCase().trim()
      };

      if (isEditingAdminMode) {
        await adminService.updateAdmin(editingAdmin.id, payload, idToken);
        toast.success('Permissions updated successfully.');
      } else {
        const result = await adminService.createAdmin(payload, idToken);
        // The backend returns a setupLink for onboarding
        if (result.setupLink) {
          console.log('[Onboarding] Setup link generated:', result.setupLink);
        }
        setShowOnboardingSuccess(true);
      }
      setIsAdminModalOpen(false);
    } catch (error: any) {
      console.error('[AdminAction Error]', error);
      toast.error(error.response?.data?.error || error.message || 'An unexpected error occurred during provisioning.');
    } finally {
      setSaving(false);
    }
  };

  const handleMemberAction = async () => {
    if (!canManageAppUsers) return;
    setSaving(true);
    try {
      // Ensure mandatory assignments are present for new users
      if (!isEditingMemberMode && (!editingMember.school_name || !editingMember.grade_band || !editingMember.sport)) {
        toast.error('School, Grade Band, and Sport are required.');
        setSaving(false);
        return;
      }

      if (isEditingMemberMode) {
        await memberService.updateMember(editingMember.id, editingMember);
        toast.success('App user updated.');
      } else {
        const payload = {
          ...editingMember,
          signup_source: 'admin',
          environment: 'production',
          user_type: 'parent',
          app_access: true,
          createdAt: new Date()
        };
        await memberService.createMember(payload);
        toast.success('App user created.');
      }
      setIsAppUserModalOpen(false);
    } catch (error) {
      toast.error('Operation failed. Check if user already exists.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async (email: string) => {
    if (isViewer) return;
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success(`Reset link sent to ${email}`);
    } catch (error) {
      toast.error('Failed to trigger reset.');
    }
  };

  const handleDeleteRequest = async (collectionName: 'admins' | 'members', id: string) => {
    if (!canDelete) {
      toast.error('Role Restricted: Only Admins can perform deletions.');
      return;
    }

    if (collectionName === 'admins') {
      if (id === auth.currentUser?.uid) {
        toast.error('Safety Lock: You cannot delete your own administrative account.');
        return;
      }
      
      const adminCount = admins.filter(a => a.role === 'Admin').length;
      const targetAdmin = admins.find(a => a.id === id);
      if (targetAdmin?.role === 'Admin' && adminCount <= 1) {
        toast.error('Safety Lock: Cannot delete the final system administrator.');
        return;
      }
    }

    if (!window.confirm(`WARNING: Are you sure you want to PERMANENTLY delete this ${collectionName === 'admins' ? 'personnel' : 'user'}? Deletion is destructive.`)) return;

    try {
      if (collectionName === 'admins') {
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) throw new Error('Session expired.');
        await adminService.deleteAdmin(id, idToken);
        toast.success('Personnel record removed successfully.');
      } else {
        await deleteDoc(doc(db, collectionName, id));
        toast.success('App user deleted.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Process failed.');
    }
  };

  const handleToggleAccess = async (member: any) => {
    if (!canManageAppUsers) return;
    const newStatus = member.app_access === false;
    try {
      await memberService.updateMember(member.id, { app_access: newStatus });
      toast.success(newStatus ? 'Access Granted' : 'Access Revoked');
    } catch (error) {
      toast.error('Update failed.');
    }
  };

  const openAdminModal = (admin: AdminUser | null = null) => {
    setShowOnboardingSuccess(false);
    if (admin) {
      setEditingAdmin(admin);
      setIsEditingAdminMode(true);
    } else {
      setEditingAdmin(DEFAULT_ADMIN);
      setIsEditingAdminMode(false);
    }
    setIsAdminModalOpen(true);
  };

  const openMemberModal = (member: any | null = null) => {
    if (member) {
      setEditingMember(member);
      setIsEditingMemberMode(true);
    } else {
      setEditingMember(DEFAULT_MEMBER);
      setIsEditingMemberMode(false);
    }
    setIsAppUserModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Verifying Authorization...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-1">Control Center</h1>
          <p className="text-gray-500 dark:text-white/60 font-medium tracking-tight">Manage platform settings and authorized access.</p>
        </div>
        <div className="flex items-center gap-3 bg-gray-100 dark:bg-white/5 px-4 py-2 rounded-2xl">
          <ShieldCheck size={16} className="text-indigo-500" />
          <div className="text-left">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Authorization</p>
            <p className="text-xs font-bold text-gray-900 dark:text-white underline decoration-indigo-500 underline-offset-4">{adminData?.name} ({adminData?.role})</p>
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-white/5 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'general' ? 'bg-white dark:bg-indigo-600 text-indigo-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
        >
          <div className="flex items-center gap-2">
            <Settings size={14} /> Basic Settings
          </div>
        </button>
        {canManageAdmins && (
          <button
            onClick={() => setActiveTab('admins')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'admins' ? 'bg-white dark:bg-indigo-600 text-indigo-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
          >
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} /> Staff Access
            </div>
          </button>
        )}
        <button
          onClick={() => setActiveTab('app_users')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'app_users' ? 'bg-white dark:bg-indigo-600 text-indigo-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
        >
          <div className="flex items-center gap-2">
            <Smartphone size={14} /> App Access
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 animate-in fade-in duration-500">
        {/* ── Section 1: General Settings ── */}
        {activeTab === 'general' && (
          <Card className="p-8 border border-gray-100 dark:border-white/10 bg-white dark:bg-black shadow-sm max-w-2xl overflow-hidden relative">
            {!canModifySettings && (
              <div className="absolute inset-0 bg-white/60 dark:bg-black/80 backdrop-blur-[2px] z-10 flex items-center justify-center p-8 text-center">
                <div className="space-y-3">
                  <Lock className="w-10 h-10 text-gray-400 mx-auto" />
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest">ReadOnly Access Only</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase max-w-[200px]">Only System Administrators can modify platform-level configuration.</p>
                </div>
              </div>
            )}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                  <Globe size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Platform Information</h3>
                  <p className="text-xs text-gray-500 font-medium">Global branding and service configuration.</p>
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  label="App Name"
                  value={generalSettings.appName}
                  onChange={e => setGeneralSettings(prev => ({ ...prev, appName: e.target.value }))}
                  disabled={!canModifySettings}
                />
                <Input
                  label="Support Email"
                  value={generalSettings.supportEmail}
                  onChange={e => setGeneralSettings(prev => ({ ...prev, supportEmail: e.target.value }))}
                  leftIcon={<Mail size={16} />}
                  disabled={!canModifySettings}
                />
                <Input
                  label="Control Identifier"
                  value={generalSettings.platformName}
                  onChange={e => setGeneralSettings(prev => ({ ...prev, platformName: e.target.value }))}
                  disabled={!canModifySettings}
                />
                <Select
                  label="Environment Status"
                  value={generalSettings.environment}
                  onChange={e => setGeneralSettings(prev => ({ ...prev, environment: e.target.value }))}
                  disabled={!canModifySettings}
                  options={[
                    { label: 'Production (Stable)', value: 'Production' },
                    { label: 'Staging (Beta)', value: 'Staging' }
                  ]}
                />
              </div>

              <div className="pt-6 border-t border-gray-100 dark:border-white/10 flex justify-end">
                <Button variant="primary" onClick={handleSaveGeneral} loading={saving} disabled={!canModifySettings} leftIcon={<Save size={18} />}>
                  Synchronize Settings
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* ── Section 2: Admin / Staff Access ── */}
        {activeTab === 'admins' && canManageAdmins && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="relative w-72">
                <Input
                  placeholder="Search personnel..."
                  value={adminSearch}
                  onChange={e => setAdminSearch(e.target.value)}
                  leftIcon={<Search size={16} />}
                />
              </div>
              {!isViewer && (
                <Button variant="primary" onClick={() => openAdminModal()} leftIcon={<Plus size={18} />}>
                  Authorize Staff
                </Button>
              )}
            </div>

            <Card className="p-0 border border-gray-100 dark:border-white/10 bg-white dark:bg-black shadow-sm overflow-hidden text-sm uppercase">
              <table className="w-full text-left font-bold tracking-tight">
                <thead className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-white/60 tracking-widest">Authorized Member</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-white/60 tracking-widest">Role Clearance</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-white/60 tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                  {admins.filter(a => a.name.toLowerCase().includes(adminSearch.toLowerCase()) || a.email.toLowerCase().includes(adminSearch.toLowerCase())).map(admin => (
                    <tr key={admin.id} className="hover:bg-indigo-50/20 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-gray-900 dark:text-white">{admin.name}</p>
                        <p className="text-[10px] text-gray-400 font-black lowercase">{admin.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={admin.role === 'Admin' ? 'primary' : admin.role === 'Manager' ? 'info' : 'neutral'} className="text-[10px]">
                          {admin.role}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handlePasswordReset(admin.email)} className="p-2 h-9 w-9 rounded-xl border-none bg-gray-50/50 dark:bg-white/5" disabled={isViewer}>
                            <Key size={14} className="text-gray-400" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openAdminModal(admin)} className="p-2 h-9 w-9 rounded-xl border-none bg-gray-50/50 dark:bg-white/5" disabled={isViewer}>
                            <Edit2 size={14} className="text-gray-400" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteRequest('admins', admin.id)} className="p-2 h-9 w-9 rounded-xl border-none bg-gray-50/50 dark:bg-white/5" disabled={!canDelete}>
                            <Trash2 size={14} className="text-red-400" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* ── Section 3: App User Management ── */}
        {activeTab === 'app_users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="relative w-72">
                <Input
                  placeholder="Search app participants..."
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  leftIcon={<Search size={16} />}
                />
              </div>
              {!isViewer && (
                <Button variant="primary" onClick={() => openMemberModal()} leftIcon={<Plus size={18} />}>
                  Add App Participant
                </Button>
              )}
            </div>

            <Card className="p-0 border border-gray-100 dark:border-white/10 bg-white dark:bg-black shadow-sm overflow-hidden text-sm">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest">Account Details</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest">Assignment</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest">Security</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                  {members.filter(m => (m.firstName + ' ' + m.lastName).toLowerCase().includes(memberSearch.toLowerCase()) || m.email.toLowerCase().includes(memberSearch.toLowerCase())).slice(0, 20).map(member => (
                    <tr key={member.id} className="hover:bg-indigo-50/20 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{member.firstName} {member.lastName}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase truncate">{member.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase truncate">{member.school_name || 'No School'}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase truncate">{member.grade_band || 'No Grade Band'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleAccess(member)}
                            disabled={isViewer}
                            className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${member.app_access !== false ? 'bg-green-100 text-green-700 dark:bg-green-600/30 dark:text-green-400 hover:scale-105' : 'bg-red-100 text-red-700 dark:bg-red-600/30 dark:text-red-400 hover:scale-105'}`}
                          >
                            {member.app_access !== false ? 'Access Active' : 'Access Revoked'}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handlePasswordReset(member.email)} className="p-2 h-9 w-9 rounded-xl border-none bg-gray-50/50 dark:bg-white/5" disabled={isViewer}>
                            <Key size={14} className="text-gray-400" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openMemberModal(member)} className="p-2 h-9 w-9 rounded-xl border-none bg-gray-50/50 dark:bg-white/5" disabled={isViewer}>
                            <Edit2 size={14} className="text-gray-400" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteRequest('members', member.id)} className="p-2 h-9 w-9 rounded-xl border-none bg-gray-50/50 dark:bg-white/5" disabled={!canDelete}>
                            <Trash2 size={14} className="text-red-400" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 bg-gray-50/30 dark:bg-white/5 text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Manage participant infrastructure and app authorization.</p>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-indigo-950/60 backdrop-blur-md" onClick={() => setIsAdminModalOpen(false)} />
          <Card className="relative w-full max-w-md bg-white dark:bg-black shadow-2xl rounded-[2.5rem] p-8 border-none animate-in fade-in zoom-in duration-300">
            {showOnboardingSuccess ? (
              <div className="py-8 text-center space-y-6">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-600/20 rounded-full flex items-center justify-center mx-auto text-green-600">
                  <ShieldCheck size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">Account Provisioned</h3>
                  <p className="text-sm text-gray-500 font-medium px-4">
                    The administrator account for <span className="text-indigo-600 dark:text-indigo-400 font-bold">{editingAdmin.email}</span> has been securely created.
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 text-left">
                  <div className="flex gap-3 items-start">
                    <Mail size={16} className="text-indigo-500 mt-1" />
                    <div>
                      <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">Email Dispatched</p>
                      <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                        A secure password setup link has been sent to their inbox. They can now complete their profile configuration.
                      </p>
                    </div>
                  </div>
                </div>
                <Button variant="primary" onClick={() => setIsAdminModalOpen(false)} className="w-full">
                  Return to Dashboard
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{isEditingAdminMode ? 'Adjust Staff Authorization' : 'Authorize New Personnel'}</h3>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Platform Access Management</p>
                </div>
                <div className="space-y-4">
                  <Input
                    label="Full Name"
                    value={editingAdmin.name}
                    onChange={e => setEditingAdmin(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Staff Member Name"
                  />
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Authorization Email</label>
                    {isEditingAdminMode ? (
                      <div className="px-4 py-3 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{editingAdmin.email}</p>
                      </div>
                    ) : (
                      <Input
                        value={editingAdmin.email}
                        onChange={e => setEditingAdmin(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="staff@yausports.com"
                      />
                    )}
                  </div>
                  <Select
                    label="Role Clearance"
                    value={editingAdmin.role}
                    onChange={e => setEditingAdmin(prev => ({ ...prev, role: e.target.value as any }))}
                    options={[
                      { label: 'Admin (Full Clearance)', value: 'Admin' },
                      { label: 'Manager (Operations)', value: 'Manager' },
                      { label: 'Viewer (Read-Only)', value: 'Viewer' }
                    ]}
                  />
                </div>
                <div className="mt-8 flex gap-3">
                  <Button variant="ghost" onClick={() => setIsAdminModalOpen(false)} className="flex-1">Discard</Button>
                  <Button variant="primary" onClick={handleAdminAction} loading={saving} className="flex-1">
                    {isEditingAdminMode ? 'Update Authorization' : 'Confirm Access'}
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {isAppUserModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-indigo-950/60 backdrop-blur-md" onClick={() => setIsAppUserModalOpen(false)} />
          <Card className="relative w-full max-w-4xl bg-white dark:bg-black shadow-2xl rounded-[2.5rem] border-none overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-gray-50 dark:border-white/5 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{isEditingMemberMode ? 'Review Participant' : 'Provision App Participant'}</h3>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Infrastructure Provisioning</p>
              </div>
              <button onClick={() => setIsAppUserModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-indigo-50 dark:border-indigo-900/40 pb-2">
                  <Users size={16} className="text-indigo-600" />
                  <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">Identity Profile</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="First Name" value={editingMember.firstName} onChange={e => setEditingMember(prev => ({ ...prev, firstName: e.target.value }))} />
                  <Input label="Last Name" value={editingMember.lastName} onChange={e => setEditingMember(prev => ({ ...prev, lastName: e.target.value }))} />
                </div>
                <Input label="Account Email" value={editingMember.email} onChange={e => setEditingMember(prev => ({ ...prev, email: e.target.value }))} placeholder="parent@mail.com" disabled={isEditingMemberMode} />
                <Input label="Phone Number" value={editingMember.phone} onChange={e => setEditingMember(prev => ({ ...prev, phone: e.target.value }))} />
                <Select
                  label="App Access Status"
                  value={editingMember.app_access ? 'true' : 'false'}
                  onChange={e => setEditingMember(prev => ({ ...prev, app_access: e.target.value === 'true' }))}
                  options={[
                    { label: 'Authorized (Active)', value: 'true' },
                    { label: 'Revoked (Blocked)', value: 'false' }
                  ]}
                />
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-indigo-50 dark:border-indigo-900/40 pb-2">
                  <ShieldAlert size={16} className="text-indigo-600" />
                  <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">Mandatory Assignments</h4>
                </div>

                <Select
                  label="Grade Band Eligibility"
                  value={editingMember.grade_band}
                  onChange={e => setEditingMember(prev => ({ ...prev, grade_band: e.target.value }))}
                  options={[
                    { label: 'Select Grade Band...', value: '' },
                    ...GRADE_BANDS.map(g => ({ label: g, value: g }))
                  ]}
                />

                <Select
                  label="Assigned School / Program"
                  value={editingMember.school_name}
                  onChange={e => setEditingMember(prev => ({ ...prev, school_name: e.target.value }))}
                  options={[
                    { label: 'Select School...', value: '' },
                    ...schools.map(s => ({ label: s, value: s }))
                  ]}
                />

                <Select
                  label="Primary Sport Assignment"
                  value={editingMember.sport}
                  onChange={e => setEditingMember(prev => ({ ...prev, sport: e.target.value }))}
                  options={[
                    { label: 'Select Sport...', value: '' },
                    ...appSports.map(s => ({ label: s, value: s }))
                  ]}
                />

                <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                  <div className="flex gap-3 mb-2">
                    <Lock size={14} className="text-gray-400" />
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-tight">Architecture Sync Notice</p>
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold leading-normal">
                    Setting these fields ensures the user sees the correct schedules and standings instantly upon login. Source will be marked as <span className="text-indigo-600 dark:text-indigo-400">ADMIN-PROVISIONED</span>.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-8 bg-gray-50/50 dark:bg-white/5 border-t border-gray-50 dark:border-white/5 flex gap-3">
              <Button variant="ghost" onClick={() => setIsAppUserModalOpen(false)} className="flex-1">Discard Request</Button>
              <Button variant="primary" onClick={handleMemberAction} loading={saving} className="flex-1 uppercase font-black tracking-widest text-xs">
                {isEditingMemberMode ? 'Apply System Updates' : 'Confirm & Send Invitation'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PlatformSettings;
