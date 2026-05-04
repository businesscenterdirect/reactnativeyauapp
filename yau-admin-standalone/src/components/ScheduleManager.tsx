import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, orderBy, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Calendar, Plus, Edit2, Trash2, X, Loader2, MapPin, Clock, Trophy, CheckSquare, Square, AlertTriangle } from 'lucide-react';
import { parseScheduleDate, todayMidnight, GRADE_BANDS, SPORTS } from '../lib/constants';
import { format } from 'date-fns';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Badge } from './ui/Badge';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Schedule {
  id: string;
  team1Name: string;
  team2Name: string;
  sport: string;
  date: string;
  time: string;
  location: string;
  grade_band: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
const ScheduleManager: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [schools, setSchools] = useState<{ id: string, name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const location = useLocation();

  // Bulk Delete State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  const [formData, setFormData] = useState({
    team1Name: '',
    team2Name: '',
    sport: SPORTS[0],
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '10:00 AM',
    location: '',
    grade_band: GRADE_BANDS[0]
  });

  useEffect(() => {
    // Load ALL schedules sorted by date asc
    const qSchedules = query(collection(db, 'schedules'), orderBy('date', 'asc'));
    const unsubSchedules = onSnapshot(qSchedules, (snapshot) => {
      const docs: Schedule[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        docs.push({
          id: doc.id,
          ...data,
          grade_band: data.grade_band || data.ageGroup || GRADE_BANDS[0]
        } as Schedule);
      });
      setSchedules(docs);
      setLoading(false);
    });

    // Schools for form dropdowns
    const qSchools = query(collection(db, 'app_schools'), orderBy('name', 'asc'));
    const unsubSchools = onSnapshot(qSchools, (snap) => {
      setSchools(
        snap.docs
          .filter(doc => doc.data().active === true)
          .map(doc => ({ id: doc.id, name: doc.data().name }))
      );
    });

    return () => { unsubSchedules(); unsubSchools(); };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'add') {
      setIsModalOpen(true);
    }
  }, [location]);

  // ── Date-based splitting using JS Date objects ─────────────────────────────
  const today = todayMidnight();
  const upcomingSchedules = schedules.filter(s => {
    const d = parseScheduleDate(s.date);
    return d >= today; // includes today
  });
  const pastSchedules = schedules.filter(s => {
    const d = parseScheduleDate(s.date);
    return d < today;
  });
  // Past shows newest first
  const displayedSchedules = activeTab === 'upcoming'
    ? upcomingSchedules
    : [...pastSchedules].reverse();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.team1Name || !formData.team2Name || !formData.location) {
      toast.error('All fields are required.');
      return;
    }
    setSaving(true);
    try {
      if (editingSchedule) {
        await updateDoc(doc(db, 'schedules', editingSchedule.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
        toast.success('Schedule updated.');
      } else {
        await addDoc(collection(db, 'schedules'), {
          ...formData,
          createdAt: serverTimestamp()
        });
        toast.success('Game scheduled.');
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to save schedule.');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      team1Name: '',
      team2Name: '',
      sport: SPORTS[0],
      date: format(new Date(), 'yyyy-MM-dd'),
      time: '10:00 AM',
      location: '',
      grade_band: GRADE_BANDS[0]
    });
    setEditingSchedule(null);
  };

  const handleSingleDelete = async (schedule: Schedule) => {
    if (!window.confirm(`Delete game: ${schedule.team1Name} vs ${schedule.team2Name}?`)) return;
    try {
      await deleteDoc(doc(db, 'schedules', schedule.id));
      toast.success('Game deleted.');
    } catch (error) {
      toast.error('Failed to delete game.');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAll = () => {
    setSelectedIds(selectedIds.length === displayedSchedules.length ? [] : displayedSchedules.map(s => s.id));
  };

  const handleBulkDelete = async () => {
    setSaving(true);
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => { batch.delete(doc(db, 'schedules', id)); });
      await batch.commit();
      toast.success(`${selectedIds.length} games deleted.`);
      setSelectedIds([]);
      setIsBulkDeleteOpen(false);
    } catch (error) {
      toast.error('Bulk delete failed.');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      team1Name: schedule.team1Name,
      team2Name: schedule.team2Name,
      sport: schedule.sport,
      date: schedule.date,
      time: schedule.time,
      location: schedule.location,
      grade_band: schedule.grade_band
    });
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Syncing Schedule Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">League Scheduler</h1>
          <p className="text-gray-500 dark:text-white/60 font-medium tracking-tight">Sync game schedules with mobile app in real-time.</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button variant="danger" size="sm" onClick={() => setIsBulkDeleteOpen(true)} className="px-5 h-12 uppercase tracking-widest font-black">
              <Trash2 size={18} className="mr-2" /> Delete Selected ({selectedIds.length})
            </Button>
          )}
          <Button variant="primary" onClick={() => { resetForm(); setIsModalOpen(true); }} leftIcon={<Plus size={18} />} className="h-12 shadow-xl shadow-indigo-600/20 px-8">
            Schedule New Game
          </Button>
        </div>
      </div>

      {/* Tabs: Upcoming / Past */}
      <div className="flex items-center gap-0 border-b border-gray-200 dark:border-white/10">
        {(['upcoming', 'past'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setSelectedIds([]); }}
            className={`px-6 py-3 text-sm font-black uppercase tracking-widest transition-all border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-white/60'
            }`}
          >
            {tab === 'upcoming' ? `Upcoming (${upcomingSchedules.length})` : `Past (${pastSchedules.length})`}
          </button>
        ))}
      </div>

      {/* Select all bar */}
      {displayedSchedules.length > 0 && (
        <div className="flex items-center gap-4">
          <button onClick={selectAll} className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest group px-2 py-1">
            {selectedIds.length === displayedSchedules.length && displayedSchedules.length > 0 ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} className="group-hover:text-indigo-600 transition-colors" />}
            {selectedIds.length === displayedSchedules.length && displayedSchedules.length > 0 ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      )}

      {/* Card Grid */}
      {displayedSchedules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Calendar size={48} className="text-gray-200 dark:text-indigo-900 mb-4" />
          <h3 className="font-bold text-gray-900 dark:text-white mb-1">No {activeTab} games</h3>
          <p className="text-sm text-gray-500 dark:text-white/40 font-medium">{activeTab === 'upcoming' ? 'Schedule a new game to get started.' : 'No past games on record.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {displayedSchedules.map((schedule) => (
            <Card 
              key={schedule.id} 
              className={`group hover:shadow-2xl transition-all hover:-translate-y-1 relative border-none shadow-sm overflow-visible cursor-pointer ${selectedIds.includes(schedule.id) ? 'ring-2 ring-indigo-600' : ''}`}
              onClick={() => openEditModal(schedule)}
            >
              <div className="flex justify-between items-start mb-6" onClick={e => e.stopPropagation()}>
                <button onClick={() => toggleSelect(schedule.id)} className="p-1 -ml-1 text-gray-300 hover:text-indigo-600 transition-colors">
                  {selectedIds.includes(schedule.id) ? <CheckSquare size={22} className="text-indigo-600" /> : <Square size={22} />}
                </button>
                <Badge variant="secondary" className="px-3 py-1 font-black uppercase text-[10px] tracking-widest">{schedule.sport}</Badge>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="p-2 h-auto" onClick={() => openEditModal(schedule)}>
                    <Edit2 size={16} className="text-gray-400 dark:text-white/60 hover:text-indigo-600 transition-colors" />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-2 h-auto" onClick={() => handleSingleDelete(schedule)}>
                    <Trash2 size={16} className="text-gray-300 hover:text-red-500 transition-colors" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between mb-8 px-2">
                <div className="flex flex-col items-center flex-1 min-w-0">
                  <div className="w-12 h-12 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-center mb-3">
                    <Trophy size={20} className="text-gray-400 dark:text-amber-500" />
                  </div>
                  <span className="font-bold text-gray-900 dark:text-white text-center truncate w-full text-sm">{schedule.team1Name}</span>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Home</span>
                </div>
                <div className="px-4 text-[10px] font-black text-gray-300 italic">VS</div>
                <div className="flex flex-col items-center flex-1 min-w-0">
                  <div className="w-12 h-12 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-center mb-3">
                    <Trophy size={20} className="text-gray-400 dark:text-indigo-400" />
                  </div>
                  <span className="font-bold text-gray-900 dark:text-white text-center truncate w-full text-sm">{schedule.team2Name}</span>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Away</span>
                </div>
              </div>

              <div className="space-y-3 pt-6 border-t border-gray-100 dark:border-white/10">
                <div className="flex items-center text-xs font-bold text-gray-600 dark:text-white/70 tracking-tight"><Calendar size={14} className="mr-3 text-indigo-500" /> {schedule.date}</div>
                <div className="flex items-center text-xs font-bold text-gray-600 dark:text-white/70 tracking-tight"><Clock size={14} className="mr-3 text-indigo-500" /> {schedule.time}</div>
                <div className="flex items-center text-xs font-bold text-gray-600 dark:text-white/70 tracking-tight"><MapPin size={14} className="mr-3 text-indigo-500" /> {schedule.location}</div>
              </div>

              <div className="absolute -bottom-3 right-6">
                <Badge variant="info" className="bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white border-none shadow-xl h-8 px-5 font-black uppercase text-[10px] tracking-widest ring-4 ring-white dark:ring-black">
                  {schedule.grade_band}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-indigo-950/40 backdrop-blur-md flex items-center justify-center z-[200] p-4">
          <Card className="w-full max-w-xl shadow-2xl border-none p-0 overflow-hidden"
            title={editingSchedule ? 'Modify Matchup' : 'Schedule New Game'}
            headerAction={<button onClick={() => setIsModalOpen(false)}><X size={24} className="text-gray-400 hover:text-red-500" /></button>}
          >
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Select label="Home Team" value={formData.team1Name} onChange={e => setFormData({ ...formData, team1Name: e.target.value })} options={[{ label: 'Select School', value: '' }, ...schools.map(s => ({ label: s.name, value: s.name }))]} required />
                <Select label="Away Team" value={formData.team2Name} onChange={e => setFormData({ ...formData, team2Name: e.target.value })} options={[{ label: 'Select School', value: '' }, ...schools.map(s => ({ label: s.name, value: s.name }))]} required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Select label="Grade Band" value={formData.grade_band} onChange={e => setFormData({ ...formData, grade_band: e.target.value })} options={GRADE_BANDS.map(b => ({ label: b, value: b }))} />
                <Select label="Sport" value={formData.sport} onChange={e => setFormData({ ...formData, sport: e.target.value })} options={SPORTS.map(s => ({ label: s, value: s }))} />
              </div>
              <Input label="Venue / Location" placeholder="e.g. Main Gym Court A" required value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
              <div className="grid grid-cols-2 gap-5">
                <Input label="Date" type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                <Input label="Start Time" placeholder="10:30 AM" required value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-6 border-t border-gray-100 dark:border-white/5">
                <Button type="button" variant="ghost" className="flex-1 font-bold text-gray-400" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary" className="flex-1 h-12 uppercase font-black tracking-widest shadow-lg" loading={saving}>{editingSchedule ? 'Update Game' : 'Add to Schedule'}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Bulk Delete Confirmation */}
      {isBulkDeleteOpen && (
        <div className="fixed inset-0 bg-red-950/40 backdrop-blur-md flex items-center justify-center z-[250] p-4">
          <Card className="w-full max-w-sm p-8 text-center border-none shadow-2xl">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6"><AlertTriangle size={32} /></div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight">Confirm Delete</h3>
            <p className="text-sm text-gray-500 font-medium mb-8">This will permanently delete <strong className="text-gray-900">{selectedIds.length}</strong> scheduled games.</p>
            <div className="flex flex-col gap-3">
              <Button variant="danger" className="h-12 uppercase font-black tracking-widest text-white bg-red-600" onClick={handleBulkDelete} loading={saving}>Delete Forever</Button>
              <Button variant="ghost" className="font-bold text-gray-400" onClick={() => setIsBulkDeleteOpen(false)}>Cancel</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ScheduleManager;
