import { collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc, writeBatch } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { AlertTriangle, CheckSquare, Edit2, Eye, Loader2, Mail, Phone, Save, Search, Shirt, Trash2, X, Square, Key } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { GRADE_BANDS, SPORTS, isGradeMatch } from '../lib/constants';

import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { coachService } from '../lib/api';
import toast from 'react-hot-toast';

interface Student {
  firstName: string;
  lastName: string;
  grade: string;
  grade_band: string;
  school_name: string;
  sport: string;
  group_id?: string;
  ageGroup?: string;
  dob?: string;
  uid?: string;
  uniformBottom?: string;
  uniformTop?: string;
  coachId?: string;
  coachName?: string;
}

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location?: string;
  membershipType?: string;
  registrationPlan?: string;
  registrationSource?: string;
  isPaidMember?: boolean;
  paymentStatus?: string;
  sport?: string;
  students: Student[];
  createdAt?: any;
  updatedAt?: any;
}

const MembersList: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSchool, setFilterSchool] = useState('all');
  const [filterGradeBand, setFilterGradeBand] = useState('all');
  const [filterSport, setFilterSport] = useState('all');

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Management State
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Member>>({});
  const [saving, setSaving] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [coaches, setCoaches] = useState<{ id: string; name: string }[]>([]);

  // ── Fetch coaches ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        const data = await coachService.getCoaches();
        setCoaches(data.map(c => ({
          id: c.id,
          name: `${c.firstName} ${c.lastName}`.trim() || 'Unnamed Coach'
        })));
      } catch (error) {
        console.error('Error fetching coaches:', error);
      }
    };
    fetchCoaches();
  }, []);

  // ── Subscribe to app_schools (for School filter dropdown) ──────────────────
  useEffect(() => {
    const q = query(collection(db, 'app_schools'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setSchools(
        snap.docs
          .filter(d => d.data().active === true)
          .map(d => ({ id: d.id, name: d.data().name }))
      );
    });
    return () => unsub();
  }, []);

  // ── Subscribe to members ───────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'members'), orderBy('lastName', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: Member[] = [];
      snapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() } as Member);
      });
      setMembers(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filteredMembers = (members || []).filter(member => {
    const searchStr = `${member.firstName || ''} ${member.lastName || ''} ${member.email || ''} ${(member.students || []).map(s => `${s.firstName || ''} ${s.lastName || ''}`).join(' ')}`.toLowerCase();
    const matchesSearch = searchStr.includes(searchTerm.toLowerCase());

    // School — fallback to '—' if missing, exclude from filter match if school missing
    const matchesSchool = filterSchool === 'all' || (member.students || []).some(s => (s.school_name || '').trim() === filterSchool);

    // Grade Band — fallback gracefully; if student has no grade_band it won't match any specific filter
    const matchesGradeBand = filterGradeBand === 'all' || (member.students || []).some(s => isGradeMatch(s.grade_band, filterGradeBand));


    // Sport — fallback gracefully
    const matchesSport = filterSport === 'all' || member.sport === filterSport || (member.students || []).some(s => (s.sport || '').trim() === filterSport);

    return matchesSearch && matchesSchool && matchesGradeBand && matchesSport;
  });

  const handleEditClick = (member: Member) => {
    setSelectedMember(member);
    setEditForm({
      firstName: member.firstName || '',
      lastName: member.lastName || '',
      email: member.email || '',
      phone: member.phone || '',
      location: member.location || '',
      membershipType: member.membershipType || '',
      registrationPlan: member.registrationPlan || '',
      sport: member.sport || '',
      students: member.students ? JSON.parse(JSON.stringify(member.students)) : []
    });
    setIsEditing(true);
  };

  const handleStudentFieldChange = (index: number, field: keyof Student, value: string) => {
    if (!editForm.students) return;
    const updatedStudents = [...editForm.students];
    updatedStudents[index] = { ...updatedStudents[index], [field]: value };
    setEditForm({ ...editForm, students: updatedStudents });
  };

  const handleUpdate = async () => {
    if (!selectedMember || !editForm) return;
    if (!editForm.firstName?.trim() || !editForm.lastName?.trim() || !editForm.email?.trim()) {
      toast.error('First Name, Last Name, and Email are required.');
      return;
    }
    const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!validateEmail(editForm.email.trim())) {
      toast.error('Please enter a valid email address.');
      return;
    }
    setSaving(true);
    try {
      const memberRef = doc(db, 'members', selectedMember.id);
      await updateDoc(memberRef, { ...editForm, updatedAt: new Date() });
      toast.success('Member record updated.');
      setSelectedMember(null);
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update member record.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMember) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'members', selectedMember.id));
      toast.success('Member record removed.');
      setSelectedMember(null);
      setIsDeleteConfirmOpen(false);
    } catch (error) {
      toast.error('Failed to delete member.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async (email: string) => {
    if (!email) return;
    setSaving(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success(`Password reset email sent to ${email}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredMembers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMembers.map(m => m.id));
    }
  };

  const handleBulkDelete = async () => {
    setSaving(true);
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => { batch.delete(doc(db, 'members', id)); });
      await batch.commit();
      toast.success(`${selectedIds.length} members deleted successfully.`);
      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);
    } catch (error) {
      toast.error('Failed to delete members in bulk.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Updating Member Directory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-1">Registration Directory</h1>
          <p className="text-gray-500 dark:text-white/60 font-medium tracking-tight">Manage and monitor student athlete registrations.</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <Button variant="danger" size="sm" onClick={() => setIsBulkDeleteModalOpen(true)} className="px-4 h-10">
              <Trash2 size={16} className="mr-2" /> Bulk Delete ({selectedIds.length})
            </Button>
          )}
          <Badge variant="info" className="px-4 py-2 text-xs">{filteredMembers.length} Members Listed</Badge>
        </div>
      </div>

      <Card className="p-0 overflow-visible border border-gray-100 dark:border-white/10 bg-white dark:bg-black shadow-sm">
        {/* ── Search Bar ── */}
        <div className="p-6 border-b border-gray-100 dark:border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="w-full sm:w-96">
            <Input
              placeholder="Search by name, email or school..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search size={16} className="text-gray-400 dark:text-white/60" />}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              setSearchTerm('');
              setFilterSchool('all');
              setFilterGradeBand('all');
              setFilterSport('all');
            }}>Reset Filters</Button>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
          {/* School: from app_schools */}
          <Select
            label="Filter School"
            options={[{ label: 'All Schools', value: 'all' }, ...schools.map(s => ({ label: s.name, value: s.name }))]}
            value={filterSchool}
            onChange={(e) => setFilterSchool(e.target.value)}
          />
          {/* Grade Band: canonical constants */}
          <Select
            label="Filter Grade Band"
            options={[{ label: 'All Grade Bands', value: 'all' }, ...GRADE_BANDS.map(b => ({ label: b, value: b }))]}
            value={filterGradeBand}
            onChange={(e) => setFilterGradeBand(e.target.value)}
          />
          {/* Sport: canonical constants */}
          <Select
            label="Filter Sport"
            options={[{ label: 'All Sports', value: 'all' }, ...SPORTS.map(s => ({ label: s, value: s }))]}
            value={filterSport}
            onChange={(e) => setFilterSport(e.target.value)}
          />
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
              <tr>
                <th className="px-4 py-4 w-10">
                  <button onClick={handleSelectAll} className="text-gray-400 hover:text-indigo-600 transition-colors">
                    {selectedIds.length === filteredMembers.length && filteredMembers.length > 0 ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} />}
                  </button>
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest">Parent Name</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest">Child Name</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest">Grade / Band</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest">School</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest">Sport</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/10">
              {filteredMembers.map((member) => (
                <tr key={member.id} className={`group hover:bg-indigo-50/30 dark:hover:bg-white/5 transition-colors ${selectedIds.includes(member.id) ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                  <td className="px-4 py-4">
                    <button onClick={() => handleToggleSelect(member.id)} className="text-gray-400 hover:text-indigo-600 transition-colors">
                      {selectedIds.includes(member.id) ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} />}
                    </button>
                  </td>
                  {/* Parent Name */}
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{member.firstName} {member.lastName}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{member.email}</p>
                    <p className="text-[9px] text-indigo-400 font-black mt-0.5">{member.phone}</p>
                  </td>
                  {/* Child Names */}
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {(member.students || []).map((s, idx) => (
                        <p key={idx} className="text-sm font-bold text-gray-900 dark:text-white truncate">{s.firstName} {s.lastName}</p>
                      ))}
                      {(!member.students || member.students.length === 0) && <span className="text-[10px] font-black text-gray-300 uppercase">—</span>}
                    </div>
                  </td>
                  {/* Grade / Band */}
                  <td className="px-6 py-4">
                    {(member.students || []).map((s, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-bold text-gray-700 dark:text-white/80">{s.grade_band || <span className="text-gray-300">—</span>}</p>
                        </div>

                        {s.grade && <p className="text-[10px] text-gray-400">Gr. {s.grade}</p>}
                      </div>

                    ))}
                  </td>
                  {/* School */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {(member.students || []).map((s, idx) => (
                        <Badge key={idx} variant="secondary" className="w-fit text-[10px]">{s.school_name || <span className="text-gray-300">—</span>}</Badge>
                      ))}
                    </div>
                  </td>
                  {/* Sport */}
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(member.students || []).map((s, idx) => (
                        <span key={idx} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter">{s.sport || '—'}</span>
                      ))}
                    </div>
                  </td>
                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="secondary" size="sm" onClick={() => { setSelectedMember(member); setIsEditing(false); }} className="p-2 h-9 w-9 rounded-xl bg-gray-50 dark:bg-white/5 border-none hover:bg-indigo-50 dark:hover:bg-indigo-500/20">
                        <Eye size={16} className="text-gray-400 dark:text-white/60" />
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => handleEditClick(member)} className="p-2 h-9 w-9 rounded-xl bg-gray-50 dark:bg-white/5 border-none hover:bg-indigo-50 dark:hover:bg-indigo-500/20">
                        <Edit2 size={16} className="text-gray-400 dark:text-white/60" />
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => { setSelectedMember(member); setIsDeleteConfirmOpen(true); }} className="p-2 h-9 w-9 rounded-xl bg-gray-50 dark:bg-white/5 border-none hover:bg-red-50 dark:hover:bg-red-500/20">
                        <Trash2 size={16} className="text-red-400 dark:text-red-500/80" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredMembers.length === 0 && (
          <div className="px-6 py-20 flex flex-col items-center justify-center text-center">
            <Search size={48} className="text-gray-100 dark:text-indigo-900 mb-4" />
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">No registrations found</h3>
            <p className="text-sm text-gray-500 dark:text-white/40 font-medium max-w-xs mx-auto">Try adjusting your filters or search term.</p>
          </div>
        )}
      </Card>

      {/* ── Detail / Edit Modal ── */}
      {selectedMember && !isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-indigo-950/40 backdrop-blur-md" onClick={() => setSelectedMember(null)} />
          <Card className="relative w-full max-w-4xl bg-white dark:bg-black overflow-hidden shadow-2xl border-none animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{isEditing ? 'Edit Member Record' : 'Member Details'}</h2>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">UID: {selectedMember.id}</p>
              </div>
              <button onClick={() => setSelectedMember(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors"><X size={20} /></button>
            </div>
            <div className="p-0 max-h-[75vh] overflow-y-auto custom-scrollbar bg-gray-50/30 dark:bg-black">
              {isEditing ? (
                <div className="p-8 space-y-12">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Identity & Contact</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="First Name" value={editForm.firstName || ''} onChange={e => setEditForm({ ...editForm, firstName: e.target.value })} />
                      <Input label="Last Name" value={editForm.lastName || ''} onChange={e => setEditForm({ ...editForm, lastName: e.target.value })} />
                    </div>
                    <Input label="Email Address" value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} leftIcon={<Mail size={16} />} />
                    <Input label="Phone Number" value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} leftIcon={<Phone size={16} />} />
                  </div>
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Athlete Data</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(editForm.students || []).map((student, idx) => (
                        <Card key={idx} className="p-6 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-3xl">
                          <div className="space-y-4">
                            <p className="text-xs font-black text-indigo-600 mb-2 uppercase tracking-widest">Athlete {idx + 1}</p>
                            <Input label="Full Name" value={`${student.firstName || ''} ${student.lastName || ''}`} disabled />
                            <div className="grid grid-cols-2 gap-3">
                              <Input label="Uniform Top" value={student.uniformTop || ''} onChange={e => handleStudentFieldChange(idx, 'uniformTop', e.target.value)} leftIcon={<Shirt size={14} />} />
                              <Input label="Uniform Bottom" value={student.uniformBottom || ''} onChange={e => handleStudentFieldChange(idx, 'uniformBottom', e.target.value)} leftIcon={<Shirt size={14} />} />
                            </div>
                            <Select
                              label="Assign Coach"
                              value={student.coachId || ''}
                              onChange={e => {
                                const coach = coaches.find(c => c.id === e.target.value);
                                handleStudentFieldChange(idx, 'coachId', e.target.value);
                                handleStudentFieldChange(idx, 'coachName', coach?.name || '');
                              }}
                              options={[{ label: 'No Coach Assigned', value: '' }, ...coaches.map(c => ({ label: c.name, value: c.id }))]}
                            />
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 space-y-8">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-3xl font-black">{(selectedMember.firstName?.[0] || '?')}</div>
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">{selectedMember.firstName} {selectedMember.lastName}</h3>
                      <p className="text-sm font-bold text-gray-400">{selectedMember.email} · {selectedMember.phone}</p>
                      <Badge variant={selectedMember.isPaidMember ? 'primary' : 'neutral'} className="mt-2 text-[10px] uppercase font-black">{selectedMember.membershipType || (selectedMember.isPaidMember ? 'Paid' : 'Free')}</Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(selectedMember.students || []).map((student, idx) => (
                      <div key={idx} className="p-6 bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10">
                        <p className="text-sm font-black text-gray-900 dark:text-white mb-3">{student.firstName} {student.lastName}</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                          <div><p className="text-[9px] font-black text-gray-400 uppercase">School</p><p className="text-xs font-bold text-gray-700 dark:text-white/80">{student.school_name || '—'}</p></div>
                          <div><p className="text-[9px] font-black text-gray-400 uppercase">Grade</p><p className="text-xs font-bold text-gray-700 dark:text-white/80">{student.grade || '—'}</p></div>
                          <div><p className="text-[9px] font-black text-gray-400 uppercase">Grade Band</p><p className="text-xs font-bold text-gray-700 dark:text-white/80">{student.grade_band || '—'}</p></div>
                          <div><p className="text-[9px] font-black text-gray-400 uppercase">Sport</p><p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{student.sport || '—'}</p></div>
                          <div><p className="text-[9px] font-black text-gray-400 uppercase">Uniform</p><p className="text-xs font-bold text-gray-700 dark:text-white/80">{student.uniformTop || '—'} / {student.uniformBottom || '—'}</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 p-6 bg-indigo-50/50 dark:bg-white/5 rounded-3xl border border-indigo-100/50 dark:border-white/10">
                    <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] mb-4">Account Security</h4>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">Trigger Password Recovery</p>
                        <p className="text-xs text-gray-500 font-medium">Sends a secure reset link to the parent's registered email.</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handlePasswordReset(selectedMember.email)} className="bg-white dark:bg-black font-black uppercase text-[10px]" leftIcon={<Key size={14} />}>Reset Password</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 bg-white dark:bg-black border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
              {isEditing ? (
                <>
                  <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={saving}>Cancel</Button>
                  <Button variant="primary" onClick={handleUpdate} loading={saving} leftIcon={<Save size={18} />}>Save Changes</Button>
                </>
              ) : (
                <>
                  <Button variant="danger" onClick={() => setIsDeleteConfirmOpen(true)}>Delete Permanently</Button>
                  <Button variant="ghost" onClick={() => setSelectedMember(null)}>Close</Button>
                </>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {(isDeleteConfirmOpen || isBulkDeleteModalOpen) && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-red-950/40 backdrop-blur-md" onClick={() => { setIsDeleteConfirmOpen(false); setIsBulkDeleteModalOpen(false); }} />
          <Card className="relative w-full max-w-sm bg-white dark:bg-black shadow-2xl border-none p-8 text-center">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6"><AlertTriangle size={40} /></div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Delete Confirmation</h2>
            <p className="text-sm text-gray-500 font-medium mb-8">
              {isBulkDeleteModalOpen
                ? `Are you sure you want to delete ${selectedIds.length} members? This action is permanent.`
                : `Are you sure you want to delete ${selectedMember?.firstName} ${selectedMember?.lastName}?`}
            </p>
            <div className="flex flex-col gap-3">
              <Button variant="danger" onClick={isBulkDeleteModalOpen ? handleBulkDelete : handleDelete} loading={saving} className="h-12 uppercase font-black tracking-widest text-white bg-red-600">Delete Permanently</Button>
              <Button variant="ghost" onClick={() => { setIsDeleteConfirmOpen(false); setIsBulkDeleteModalOpen(false); }} disabled={saving}>Cancel</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MembersList;
