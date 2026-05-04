import { Award, Clock, DollarSign, Edit2, Loader2, Mail, Phone, Plus, Search, Trash2, UserCircle, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { Coach } from '../lib/api';
import { coachService } from '../lib/api';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Select } from './ui/Select';

const CoachManager: React.FC = () => {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    primarySport: '',
    experience: '',
    hourlyRate: 0,
    status: 'approved' as 'pending' | 'approved' | 'rejected',
    isActive: true,
  });

  const fetchCoaches = async () => {
    try {
      const data = await coachService.getCoaches();
      setCoaches(data);
    } catch (error) {
      console.error('Error fetching coaches:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoaches();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('First and last name are required.');
      return;
    }
    const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
    if (!formData.email.trim() || !validateEmail(formData.email.trim())) {
      toast.error('A valid email address is required.');
      return;
    }
    if (!formData.primarySport.trim()) {
      toast.error('Primary sport is required.');
      return;
    }

    setSaving(true);
    try {
      if (editingCoach) {
        await coachService.updateCoach(editingCoach.id, formData);
        toast.success(`${formData.firstName} ${formData.lastName}'s record updated.`);
      } else {
        await coachService.createCoach(formData);
        toast.success(`${formData.firstName} ${formData.lastName} enlisted successfully.`);
      }
      await fetchCoaches();
      setIsModalOpen(false);
      setEditingCoach(null);
      resetForm();
    } catch (error) {
      console.error('Error saving coach:', error);
      toast.error('Failed to save coach details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      primarySport: '',
      experience: '',
      hourlyRate: 0,
      status: 'approved',
      isActive: true,
    });
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove ${name} from the coaching registry?`)) {
      try {
        await coachService.deleteCoach(id);
        toast.success(`${name} removed from coaching registry.`);
        await fetchCoaches();
      } catch (error) {
        console.error('Error deleting coach:', error);
        toast.error('Failed to delete coach record.');
      }
    }
  };

  const openEditModal = (coach: Coach) => {
    setEditingCoach(coach);
    setFormData({
      firstName: coach.firstName || '',
      lastName: coach.lastName || '',
      email: coach.email || '',
      phone: coach.phone || '',
      primarySport: coach.primarySport || '',
      experience: coach.experience || '',
      hourlyRate: coach.hourlyRate || 0,
      status: coach.status || 'approved',
      isActive: coach.isActive !== undefined ? coach.isActive : true,
    });
    setIsModalOpen(true);
  };

  const filteredCoaches = Array.isArray(coaches) ? coaches.filter(c =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.primarySport.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading Coaching Staff...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Coaching Registry</h1>
          <p className="text-gray-500 dark:text-white/60 font-medium tracking-tight">Manage your roster of professional coaches and trainers.</p>
        </div>
        <Button
          variant="primary"
          onClick={() => { setEditingCoach(null); resetForm(); setIsModalOpen(true); }}
          leftIcon={<Plus size={18} />}
          className="h-12 shadow-lg"
        >
          Add Coach
        </Button>
      </div>

      <div className="bg-white dark:bg-black rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="w-full sm:w-96">
            <Input
              placeholder="Search coaches by name, email or sport..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search size={16} className="text-gray-400 dark:text-white/60" />}
            />
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="info" className="px-4 py-2 text-xs">{filteredCoaches.length} Enlisted Coaches</Badge>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest">Coach Identity</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest">Sport & Rate</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/10">
              {filteredCoaches.map((coach) => (
                <tr key={coach.id} className="group hover:bg-indigo-50/30 dark:hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black">
                        {(coach.firstName?.[0] || coach.lastName?.[0] || '?').toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white group-hover:text-indigo-900 dark:group-hover:text-indigo-300">
                          {coach.firstName} {coach.lastName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-gray-400 dark:text-white/40 flex items-center"><Mail size={10} className="mr-1" /> {coach.email}</span>
                          <span className="text-[10px] text-gray-400 dark:text-white/40 flex items-center"><Phone size={10} className="mr-1" /> {coach.phone}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <Badge variant="secondary" className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-none font-bold w-fit">
                        {(coach.primarySport || 'NO SPORT').toUpperCase()}
                      </Badge>
                      <span className="text-[10px] font-bold text-gray-400 flex items-center">
                        <Clock size={10} className="mr-1" /> ${coach.hourlyRate}/hr
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={coach.status === 'approved' ? 'success' : coach.status === 'pending' ? 'warning' : 'error'}>
                      {(coach.status || 'PENDING').toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" className="w-9 h-9 p-0" onClick={() => openEditModal(coach)}>
                        <Edit2 size={14} className="text-gray-400 dark:text-white/40 hover:text-indigo-600 dark:hover:text-white transition-colors" />
                      </Button>
                      <Button variant="ghost" size="sm" className="w-9 h-9 p-0" onClick={() => handleDelete(coach.id, `${coach.firstName} ${coach.lastName}`)}>
                        <Trash2 size={14} className="text-gray-400 dark:text-white/40 hover:text-red-500 dark:hover:text-red-400 transition-colors" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCoaches.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <UserCircle size={48} className="text-gray-100 dark:text-indigo-900 mb-4" />
                      <h3 className="font-bold text-gray-900 dark:text-white mb-1">No coaches found</h3>
                      <p className="text-sm text-gray-400 dark:text-indigo-400 font-medium">Add some coaching staff to get started.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-indigo-950/40 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
          <Card
            className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300 overflow-visible"
            title={editingCoach ? 'Refine Staff Records' : 'Enlist New Coach'}
            headerAction={
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors p-2">
                <X size={20} />
              </button>
            }
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  placeholder="e.g. John"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
                <Input
                  label="Last Name"
                  placeholder="e.g. Madden"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="coach@yau.com"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  leftIcon={<Mail size={16} />}
                />
                <Input
                  label="Phone Number"
                  placeholder="9087654321"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  leftIcon={<Phone size={16} />}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Primary Sport"
                  placeholder="e.g. Soccer"
                  required
                  value={formData.primarySport}
                  onChange={(e) => setFormData({ ...formData, primarySport: e.target.value })}
                  leftIcon={<Award size={16} />}
                />
                <Input
                  label="Hourly Rate ($)"
                  type="number"
                  placeholder="0"
                  required
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: Number(e.target.value) })}
                  leftIcon={<DollarSign size={16} />}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-400 dark:text-white/60 uppercase tracking-wider ml-1">Experience / Tech Note</label>
                <textarea
                  rows={3}
                  placeholder="Describe coaching background..."
                  className="w-full px-4 py-3 bg-white dark:bg-black border border-gray-200 dark:border-white/10 rounded-2xl text-sm text-gray-900 dark:text-white transition-all outline-none resize-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 placeholder:text-gray-400 dark:placeholder:text-white/20"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Approval Status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  options={[
                    { label: 'Pending', value: 'pending' },
                    { label: 'Approved', value: 'approved' },
                    { label: 'Rejected', value: 'rejected' }
                  ]}
                />
                <div className="flex flex-col gap-1.5">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Active Status</label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className={`h-11 px-4 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all ${formData.isActive ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-gray-50 border-gray-100 text-gray-400'}`}
                  >
                    {formData.isActive ? 'Active Member' : 'Deactivated'}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-gray-50 dark:border-white/5">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1 font-bold"
                  onClick={() => { setIsModalOpen(false); resetForm(); }}
                >
                  Discard
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1 h-12 shadow-lg uppercase tracking-widest font-black"
                  loading={saving}
                >
                  {editingCoach ? 'Update Record' : 'Enlist Staff'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CoachManager;
