import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, orderBy, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Plus, Edit2, Trash2, X, Loader2, Building2, GraduationCap, ToggleLeft, ToggleRight, Search, CheckSquare, Square, AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AppSchool {
  id: string;
  name: string;
  type: 'school' | 'program';
  active: boolean;
  deletedAt?: any;
}

// ─── Component ────────────────────────────────────────────────────────────────
const SchoolsManager: React.FC = () => {
  const [schools, setSchools] = useState<AppSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<AppSchool | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkArchiveOpen, setIsBulkArchiveOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'school' as 'school' | 'program',
    active: true
  });

  useEffect(() => {
    const q = query(collection(db, 'app_schools'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: AppSchool[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (!data.deletedAt) {
          docs.push({ id: doc.id, ...data } as AppSchool);
        }
      });
      setSchools(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Program or team name is required.');
      return;
    }

    setSaving(true);
    try {
      const cleanData = {
        name: formData.name.trim(),
        type: formData.type,
        active: formData.active,
        updatedAt: serverTimestamp()
      };

      if (editingSchool) {
        await updateDoc(doc(db, 'app_schools', editingSchool.id), cleanData);
        toast.success(`"${cleanData.name}" updated.`);
      } else {
        await addDoc(collection(db, 'app_schools'), {
          ...cleanData,
          createdAt: serverTimestamp()
        });
        toast.success(`"${cleanData.name}" added to registry.`);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to save record.');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', type: 'school', active: true });
    setEditingSchool(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAll = () => {
    setSelectedIds(selectedIds.length === schools.length ? [] : schools.map(s => s.id));
  };

  const handleBulkArchive = async () => {
    setSaving(true);
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        batch.update(doc(db, 'app_schools', id), {
          deletedAt: serverTimestamp(),
          active: false
        });
      });
      await batch.commit();
      toast.success(`${selectedIds.length} records archived.`);
      setSelectedIds([]);
      setIsBulkArchiveOpen(false);
    } catch (error) {
      toast.error('Bulk archive failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (school: AppSchool) => {
    try {
      await updateDoc(doc(db, 'app_schools', school.id), {
        active: !school.active,
        updatedAt: serverTimestamp()
      });
      toast.success(school.active ? 'Enrollment Paused' : 'Enrollment Active');
    } catch (error) {
      toast.error('Status update failed.');
    }
  };

  const openEditModal = (school: AppSchool) => {
    setEditingSchool(school);
    setFormData({
      name: school.name,
      type: school.type,
      active: school.active
    });
    setIsModalOpen(true);
  };

  const filteredSchools = schools.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Syncing Registry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Program & Team Registry</h1>
          <p className="text-gray-500 dark:text-white/60 font-medium tracking-tight">Manage partner schools, community programs, and individual teams.</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <Button variant="danger" size="sm" onClick={() => setIsBulkArchiveOpen(true)} className="h-12 px-5 uppercase tracking-widest font-black transition-all">
              <Trash2 size={18} className="mr-2" /> Archive Selected ({selectedIds.length})
            </Button>
          )}
          <Button variant="primary" onClick={() => { resetForm(); setIsModalOpen(true); }} leftIcon={<Plus size={18} />} className="h-12 shadow-xl shadow-indigo-600/20 px-8">
            Add New Program/Team
          </Button>
        </div>
      </div>

      <Card className="p-0 overflow-visible border-none bg-white dark:bg-black shadow-sm">
        <div className="p-6 border-b border-gray-100 dark:border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="w-full sm:w-96">
            <Input
              placeholder="Search by program or team name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search size={16} className="text-gray-400" />}
            />
          </div>
          <button onClick={selectAll} className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 py-2 hover:bg-gray-50 rounded-xl transition-colors">
            {selectedIds.length === schools.length && schools.length > 0 ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} />}
            {selectedIds.length === schools.length && schools.length > 0 ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10 font-black uppercase text-[10px] tracking-widest text-gray-400">
              <tr>
                <th className="px-6 py-4 w-12">#</th>
                <th className="px-6 py-4">Program / Team Name</th>
                <th className="px-6 py-4">Classification</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/10">
              {filteredSchools.map((school) => (
                <tr key={school.id} className={`group hover:bg-indigo-50/30 dark:hover:bg-white/5 transition-colors ${selectedIds.includes(school.id) ? 'bg-indigo-50/50' : ''}`}>
                  <td className="px-6 py-4">
                    <button onClick={() => toggleSelect(school.id)} className="text-gray-300 hover:text-indigo-600 transition-colors">
                      {selectedIds.includes(school.id) ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} />}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-xl ${school.type === 'school' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                        {school.type === 'school' ? <Building2 size={20} /> : <GraduationCap size={20} />}
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white">{school.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={school.type === 'school' ? 'success' : 'secondary'} className="uppercase text-[9px] tracking-widest">{school.type}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleActive(school)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${school.active ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-gray-100 border-gray-200 text-gray-500'}`}
                    >
                      {school.active ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} />}
                      <span className="text-[10px] font-black uppercase tracking-tighter">{school.active ? 'Enrollment Active' : 'Registry Paused'}</span>
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" onClick={() => openEditModal(school)} className="p-2 h-auto"><Edit2 size={16} className="text-gray-400 hover:text-indigo-600" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-indigo-950/40 backdrop-blur-md flex items-center justify-center z-[200] p-4">
          <Card className="w-full max-w-md shadow-2xl border-none p-0 overflow-hidden"
            title={editingSchool ? 'Edit Program/Team' : 'Add New Program/Team'}
            headerAction={<button onClick={() => setIsModalOpen(false)}><X size={24} className="text-gray-400 hover:text-red-500" /></button>}
          >
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <Input label="Program / Team Name" placeholder="e.g. Westside High School" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Classification Target</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setFormData({ ...formData, type: 'school' })} className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${formData.type === 'school' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-100 text-gray-400'}`}>
                    <Building2 size={24} /><span className="text-[10px] font-black uppercase">Academic School</span>
                  </button>
                  <button type="button" onClick={() => setFormData({ ...formData, type: 'program' })} className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${formData.type === 'program' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-100 text-gray-400'}`}>
                    <GraduationCap size={24} /><span className="text-[10px] font-black uppercase">Partner Program</span>
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10">
                <div>
                  <p className="text-sm font-bold text-gray-700 dark:text-white">Accepting Registrations</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Live on Mobile App</p>
                </div>
                <button type="button" onClick={() => setFormData({ ...formData, active: !formData.active })} className="text-indigo-600 transition-transform hover:scale-110">
                  {formData.active ? <ToggleRight size={40} /> : <ToggleLeft size={40} className="text-gray-300" />}
                </button>
              </div>
              <div className="flex gap-3 pt-6 border-t border-gray-100 dark:border-white/5">
                <Button type="button" variant="ghost" className="flex-1 font-bold text-gray-400" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary" className="flex-1 h-12 uppercase font-black tracking-widest shadow-lg shadow-indigo-600/20" loading={saving}>{editingSchool ? 'Update Record' : 'Create Record'}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Bulk Archive Confirmation */}
      {isBulkArchiveOpen && (
        <div className="fixed inset-0 bg-red-950/40 backdrop-blur-md flex items-center justify-center z-[250] p-4">
          <Card className="w-full max-w-sm p-8 text-center border-none shadow-2xl">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6"><AlertTriangle size={32} /></div>
            <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">Archive Confirmation</h3>
            <p className="text-sm text-gray-500 font-medium mb-8">Confirm archiving <strong className="text-gray-900">{selectedIds.length}</strong> selections. They will be hidden from registration lists.</p>
            <div className="flex flex-col gap-3">
              <Button variant="danger" className="h-12 uppercase font-black tracking-widest text-white bg-red-600" onClick={handleBulkArchive} loading={saving}>Confirm Archive</Button>
              <Button variant="ghost" className="font-bold text-gray-400" onClick={() => setIsBulkArchiveOpen(false)}>Abort</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SchoolsManager;
