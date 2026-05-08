import React, { useState, useEffect } from 'react';
import {
  collection, query, onSnapshot, addDoc, updateDoc, doc,
  serverTimestamp, orderBy, deleteDoc, increment, setDoc, getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Edit2, Trash2, X, Loader2, Trophy, Search,
  ChevronRight, Swords, ListOrdered
} from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { Select } from './ui/Select';
import { GRADE_BANDS, SPORTS, toStandingsKey, isGradeMatch } from '../lib/constants';

import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Standing {
  id: string;       // Firestore doc ID = normalized key
  teamName: string;
  schoolName: string;
  gradeBand: string;
  sport: string;
  wins: number;
  draws: number;
  losses: number;
  points: number;
}

interface AppSchool {
  id: string;
  name: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
const StandingsManager: React.FC = () => {
  const [tab, setTab] = useState<'enter' | 'table'>('enter');
  const [standings, setStandings] = useState<Standing[]>([]);
  const [schools, setSchools] = useState<AppSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGradeBand, setFilterGradeBand] = useState('all');
  const [filterSport, setFilterSport] = useState('all');

  // ── Match Result Form ───────────────────────────────────────────────────────
  const defaultMatchForm = {
    teamAName: '',
    teamBName: '',
    scoreA: '',
    scoreB: '',
    pointsA: '',
    pointsB: '',
    gradeBand: GRADE_BANDS[0],
    sport: SPORTS[0],
    date: new Date().toISOString().slice(0, 10),
  };
  const [matchForm, setMatchForm] = useState(defaultMatchForm);
  const [submittingMatch, setSubmittingMatch] = useState(false);

  // ── Edit Standing Modal ─────────────────────────────────────────────────────
  const [editingStanding, setEditingStanding] = useState<Standing | null>(null);
  const [editForm, setEditForm] = useState({ wins: 0, draws: 0, losses: 0, points: 0 });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    const standingsQ = query(collection(db, 'standings'), orderBy('points', 'desc'));
    const unsubStandings = onSnapshot(standingsQ, (snapshot) => {
      const docs: Standing[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        if (!data.deletedAt) {
          docs.push({ id: d.id, ...data } as Standing);
        }
      });
      setStandings(docs);
      setLoading(false);
    });

    const schoolsQ = query(collection(db, 'app_schools'), orderBy('name', 'asc'));
    const unsubSchools = onSnapshot(schoolsQ, (snapshot) => {
      setSchools(
        snapshot.docs
          .filter(d => d.data().active === true)
          .map(d => ({ id: d.id, name: d.data().name }))
      );
    });

    return () => { unsubStandings(); unsubSchools(); };
  }, []);

  // ── Derive result from scores ────────────────────────────────────────────────
  const deriveOutcome = (sA: number, sB: number): { resultA: 'win' | 'draw' | 'loss'; resultB: 'win' | 'draw' | 'loss' } => {
    if (sA > sB) return { resultA: 'win', resultB: 'loss' };
    if (sB > sA) return { resultA: 'loss', resultB: 'win' };
    return { resultA: 'draw', resultB: 'draw' };
  };

  // ── Upsert a standings record ────────────────────────────────────────────────
  const upsertStanding = async (
    teamName: string,
    schoolName: string,
    gradeBand: string,
    sport: string,
    result: 'win' | 'draw' | 'loss',
    pointsToAdd: number
  ) => {
    const key = toStandingsKey(teamName, gradeBand, sport);
    const ref = doc(db, 'standings', key);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      await updateDoc(ref, {
        wins: result === 'win' ? increment(1) : increment(0),
        draws: result === 'draw' ? increment(1) : increment(0),
        losses: result === 'loss' ? increment(1) : increment(0),
        points: increment(pointsToAdd),
        updatedAt: serverTimestamp(),
        // Always keep these up to date
        teamName,
        schoolName,
        gradeBand,
        sport,
      });
    } else {
      await setDoc(ref, {
        teamName,
        schoolName,
        gradeBand,
        sport,
        wins: result === 'win' ? 1 : 0,
        draws: result === 'draw' ? 1 : 0,
        losses: result === 'loss' ? 1 : 0,
        points: pointsToAdd,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  };

  const handleSubmitMatch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!matchForm.teamAName || !matchForm.teamBName) {
      toast.error('Both teams are required.'); return;
    }
    if (matchForm.teamAName === matchForm.teamBName) {
      toast.error('Teams must be different.'); return;
    }
    if (matchForm.scoreA === '' || matchForm.scoreB === '') {
      toast.error('Both scores are required.'); return;
    }

    const sA = parseInt(matchForm.scoreA, 10);
    const sB = parseInt(matchForm.scoreB, 10);
    if (isNaN(sA) || isNaN(sB) || sA < 0 || sB < 0) {
      toast.error('Scores must be non-negative numbers.'); return;
    }

    const pA = parseInt(matchForm.pointsA || '0', 10);
    const pB = parseInt(matchForm.pointsB || '0', 10);

    const { resultA, resultB } = deriveOutcome(sA, sB);

    setSubmittingMatch(true);
    try {
      // 1. Save match result to audit trail
      await addDoc(collection(db, 'match_results'), {
        teamAName: matchForm.teamAName,
        teamBName: matchForm.teamBName,
        scoreA: sA,
        scoreB: sB,
        pointsA: pA,
        pointsB: pB,
        resultA,
        resultB,
        gradeBand: matchForm.gradeBand,
        sport: matchForm.sport,
        date: matchForm.date,
        createdAt: serverTimestamp(),
      });

      // 2. Upsert standings for both teams
      await Promise.all([
        upsertStanding(matchForm.teamAName, matchForm.teamAName, matchForm.gradeBand, matchForm.sport, resultA, pA),
        upsertStanding(matchForm.teamBName, matchForm.teamBName, matchForm.gradeBand, matchForm.sport, resultB, pB),
      ]);

      const outcomeText = resultA === 'win'
        ? `${matchForm.teamAName} wins!`
        : resultA === 'draw'
          ? 'It\'s a draw!'
          : `${matchForm.teamBName} wins!`;

      toast.success(`Match saved. ${outcomeText}`);
      setMatchForm(defaultMatchForm);
      setTab('table');
    } catch (error) {
      console.error('Error saving match:', error);
      toast.error('Failed to save match result.');
    } finally {
      setSubmittingMatch(false);
    }
  };

  const handleDelete = async (standing: Standing) => {
    if (!window.confirm(`Delete standing for "${standing.teamName}"?`)) return;
    try {
      await deleteDoc(doc(db, 'standings', standing.id));
      toast.success('Standing deleted.');
    } catch (error) {
      toast.error('Failed to delete standing.');
    }
  };

  const openEdit = (standing: Standing) => {
    setEditingStanding(standing);
    setEditForm({ wins: standing.wins, draws: standing.draws, losses: standing.losses, points: standing.points });
  };

  const handleSaveEdit = async () => {
    if (!editingStanding) return;
    setSavingEdit(true);
    try {
      await updateDoc(doc(db, 'standings', editingStanding.id), {
        ...editForm,
        updatedAt: serverTimestamp()
      });
      toast.success('Standing updated.');
      setEditingStanding(null);
    } catch (error) {
      toast.error('Failed to update standing.');
    } finally {
      setSavingEdit(false);
    }
  };

  const filteredStandings = standings.filter(s => {
    const matchesSearch = (s.teamName || '').toLowerCase().includes(searchTerm.toLowerCase()) || (s.schoolName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = filterGradeBand === 'all' || isGradeMatch(s.gradeBand, filterGradeBand);

    const matchesSport = filterSport === 'all' || s.sport === filterSport;
    return matchesSearch && matchesGrade && matchesSport;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading Standings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Standings Manager</h1>
          <p className="text-gray-500 dark:text-white/60 font-medium tracking-tight">Enter match results — standings update automatically.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-gray-200 dark:border-white/10">
        <button
          onClick={() => setTab('enter')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-black uppercase tracking-widest transition-all border-b-2 -mb-px ${tab === 'enter' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-white/60'}`}
        >
          <Swords size={16} /> Enter Match Result
        </button>
        <button
          onClick={() => setTab('table')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-black uppercase tracking-widest transition-all border-b-2 -mb-px ${tab === 'table' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-white/60'}`}
        >
          <ListOrdered size={16} /> Standings Table ({standings.length})
        </button>
      </div>

      {/* ── TAB 1: Enter Match Result ── */}
      {tab === 'enter' && (
        <Card title="Enter Match Result" className="max-w-2xl">
          <form onSubmit={handleSubmitMatch} className="space-y-6">
            {/* Teams */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Team A (Home)"
                value={matchForm.teamAName}
                onChange={e => setMatchForm({ ...matchForm, teamAName: e.target.value })}
                options={[{ label: 'Select Team A', value: '' }, ...schools.map(s => ({ label: s.name, value: s.name }))]}
                required
              />
              <Select
                label="Team B (Away)"
                value={matchForm.teamBName}
                onChange={e => setMatchForm({ ...matchForm, teamBName: e.target.value })}
                options={[{ label: 'Select Team B', value: '' }, ...schools.map(s => ({ label: s.name, value: s.name }))]}
                required
              />
            </div>

            {/* Score */}
            <div className="p-5 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 space-y-3">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Final Score</p>
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-1">
                  <label className="block text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest text-center">
                    {matchForm.teamAName || 'Team A'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="0"
                    className="w-full h-16 text-center text-2xl font-black rounded-xl bg-white dark:bg-black border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={matchForm.scoreA}
                    onChange={e => setMatchForm({ ...matchForm, scoreA: e.target.value })}
                  />
                </div>
                <div className="text-xl font-black text-gray-300 dark:text-white/20 pt-5">—</div>
                <div className="flex-1 space-y-1">
                  <label className="block text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest text-center">
                    {matchForm.teamBName || 'Team B'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="0"
                    className="w-full h-16 text-center text-2xl font-black rounded-xl bg-white dark:bg-black border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={matchForm.scoreB}
                    onChange={e => setMatchForm({ ...matchForm, scoreB: e.target.value })}
                  />
                </div>
              </div>

              {/* Outcome preview */}
              {matchForm.scoreA !== '' && matchForm.scoreB !== '' && (
                <div className="text-center pt-1">
                  {(() => {
                    const sA = parseInt(matchForm.scoreA, 10);
                    const sB = parseInt(matchForm.scoreB, 10);
                    if (isNaN(sA) || isNaN(sB)) return null;
                    if (sA > sB) return <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">✓ {matchForm.teamAName || 'Team A'} wins</span>;
                    if (sB > sA) return <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">✓ {matchForm.teamBName || 'Team B'} wins</span>;
                    return <span className="text-xs font-black text-amber-600 uppercase tracking-widest">~ Draw</span>;
                  })()}
                </div>
              )}
            </div>

            {/* Points (configurable) */}
            <div className="p-5 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Points to Award</p>
                <span className="text-[10px] text-gray-400 italic">Optional — enter 0 if not applicable</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">{matchForm.teamAName || 'Team A'}</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    className="w-full h-12 text-center font-black rounded-xl bg-white dark:bg-black border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={matchForm.pointsA}
                    onChange={e => setMatchForm({ ...matchForm, pointsA: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">{matchForm.teamBName || 'Team B'}</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    className="w-full h-12 text-center font-black rounded-xl bg-white dark:bg-black border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={matchForm.pointsB}
                    onChange={e => setMatchForm({ ...matchForm, pointsB: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Classification */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Grade Band"
                value={matchForm.gradeBand}
                onChange={e => setMatchForm({ ...matchForm, gradeBand: e.target.value })}
                options={GRADE_BANDS.map(b => ({ label: b, value: b }))}
              />
              <Select
                label="Sport"
                value={matchForm.sport}
                onChange={e => setMatchForm({ ...matchForm, sport: e.target.value })}
                options={SPORTS.map(s => ({ label: s, value: s }))}
              />
            </div>

            <Input label="Match Date" type="date" value={matchForm.date} onChange={e => setMatchForm({ ...matchForm, date: e.target.value })} required />

            <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
              <Button type="button" variant="ghost" className="flex-1" onClick={() => setMatchForm(defaultMatchForm)}>Reset</Button>
              <Button type="submit" variant="primary" className="flex-1 h-12 font-black uppercase tracking-widest shadow-lg" loading={submittingMatch} leftIcon={<ChevronRight size={18} />}>
                Save & Update Standings
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* ── TAB 2: Standings Table ── */}
      {tab === 'table' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white dark:bg-black rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-100 dark:border-white/10 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="w-full sm:w-72">
                <Input
                  placeholder="Search teams or schools..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  leftIcon={<Search size={16} className="text-gray-400" />}
                />
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <select
                  className="flex-1 sm:flex-none h-11 px-3 rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  value={filterGradeBand}
                  onChange={e => setFilterGradeBand(e.target.value)}
                >
                  <option value="all">All Bands</option>
                  {GRADE_BANDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <select
                  className="flex-1 sm:flex-none h-11 px-3 rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  value={filterSport}
                  onChange={e => setFilterSport(e.target.value)}
                >
                  <option value="all">All Sports</option>
                  {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
                  <tr>
                    <th className="px-4 py-4 text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest w-10">#</th>
                    <th className="px-4 py-4 text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest">Team</th>
                    <th className="px-4 py-4 text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest">Grade / Sport</th>
                    <th className="px-4 py-4 text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest text-center">W</th>
                    <th className="px-4 py-4 text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest text-center">D</th>
                    <th className="px-4 py-4 text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest text-center">L</th>
                    <th className="px-4 py-4 text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest text-center">Pts</th>
                    <th className="px-4 py-4 text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                  {filteredStandings.map((standing, index) => (
                    <tr key={standing.id} className="group hover:bg-indigo-50/30 dark:hover:bg-white/5 transition-colors">
                      <td className="px-4 py-4 text-sm font-black text-indigo-600 dark:text-indigo-400">{index + 1}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600">
                            <Trophy size={16} />
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 dark:text-white block">{standing.teamName}</span>
                            {standing.schoolName && standing.schoolName !== standing.teamName && (
                              <span className="text-[10px] text-gray-400">{standing.schoolName}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <Badge 
                            variant="secondary" 
                            className="text-[9px] mb-1"
                          >
                            {standing.gradeBand}
                          </Badge>
                          <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">{standing.sport}</div>
                        </div>

                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">{standing.wins ?? 0}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="font-mono font-black text-gray-600 dark:text-white/70 text-sm">{standing.draws ?? 0}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="font-mono font-black text-red-600 dark:text-red-400 text-sm">{standing.losses ?? 0}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="font-mono font-black text-lg text-indigo-600 dark:text-indigo-400">{standing.points ?? 0}</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="w-9 h-9 p-0" onClick={() => openEdit(standing)}>
                            <Edit2 size={14} className="text-gray-400 hover:text-indigo-600" />
                          </Button>
                          <Button variant="ghost" size="sm" className="w-9 h-9 p-0" onClick={() => handleDelete(standing)}>
                            <Trash2 size={14} className="text-gray-400 hover:text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredStandings.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-20 text-center">
                        <Trophy size={48} className="text-gray-100 dark:text-indigo-900 mb-4 mx-auto" />
                        <h3 className="font-bold text-gray-900 dark:text-white mb-1">No standings data</h3>
                        <p className="text-sm text-gray-400 font-medium">Enter match results to auto-populate standings.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Standing Modal ── */}
      {editingStanding && (
        <div className="fixed inset-0 bg-indigo-950/40 backdrop-blur-md flex items-center justify-center z-[200] p-4">
          <Card
            className="w-full max-w-md shadow-2xl"
            title={`Override: ${editingStanding.teamName}`}
            headerAction={<button onClick={() => setEditingStanding(null)}><X size={20} className="text-gray-400 hover:text-red-500" /></button>}
          >
            <div className="space-y-4">
              <p className="text-xs text-gray-500 dark:text-white/50">Manually override the stats for this team. Use with care.</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest text-center">Wins</label>
                  <input type="number" min="0" value={editForm.wins} onChange={e => setEditForm({ ...editForm, wins: parseInt(e.target.value) || 0 })}
                    className="w-full h-12 text-center rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 font-black text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest text-center">Draws</label>
                  <input type="number" min="0" value={editForm.draws} onChange={e => setEditForm({ ...editForm, draws: parseInt(e.target.value) || 0 })}
                    className="w-full h-12 text-center rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 font-black text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-red-600 uppercase tracking-widest text-center">Losses</label>
                  <input type="number" min="0" value={editForm.losses} onChange={e => setEditForm({ ...editForm, losses: parseInt(e.target.value) || 0 })}
                    className="w-full h-12 text-center rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 font-black text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest text-center">Points</label>
                  <input type="number" min="0" value={editForm.points} onChange={e => setEditForm({ ...editForm, points: parseInt(e.target.value) || 0 })}
                    className="w-full h-12 text-center rounded-xl bg-gray-50 dark:bg-white/5 border border-indigo-600/30 dark:border-indigo-400/30 font-black text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
                <Button variant="ghost" className="flex-1" onClick={() => setEditingStanding(null)}>Cancel</Button>
                <Button variant="primary" className="flex-1 h-12 font-black uppercase tracking-widest" onClick={handleSaveEdit} loading={savingEdit}>Save Override</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default StandingsManager;
