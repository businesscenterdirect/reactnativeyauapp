import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, limit, doc, updateDoc, increment, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { broadcastPushNotification } from '../lib/push';
import { Send, Target, Plus, Trash2, History, ChevronDown, ChevronUp, MessageSquare, X } from 'lucide-react';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { GRADE_BANDS, SPORTS } from '../lib/constants';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface TargetGroup {
  school: string;
  gradeBand: string;
  sport: string;
}

interface SentMessage {
  id: string;
  title: string;
  description: string;
  targetGroups?: TargetGroup[];
  createdAt: any;
  replyCount?: number;
  adminUnreadCount?: number;
}

interface MessageReply {
  id: string;
  userId: string;
  userName: string;
  userRole: 'parent' | 'coach' | 'admin';
  content: string;
  timestamp: any;
}

// ─── Component ────────────────────────────────────────────────────────────────
const Messaging: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Builder state
  const [currentSchool, setCurrentSchool] = useState('all');
  const [currentGradeBand, setCurrentGradeBand] = useState('all');
  const [currentSport, setCurrentSport] = useState('all');
  const [targetGroups, setTargetGroups] = useState<TargetGroup[]>([]);

  // Metadata state
  const [schools, setSchools] = useState<{ id: string, name: string }[]>([]);
  const [history, setHistory] = useState<SentMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);

  // Reply state
  const [selectedPost, setSelectedPost] = useState<SentMessage | null>(null);
  const [replies, setReplies] = useState<MessageReply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [deletingConversation, setDeletingConversation] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const qSchools = query(collection(db, 'app_schools'), orderBy('name', 'asc'));
    const unsubSchools = onSnapshot(qSchools, (snap) => {
      setSchools(
        snap.docs
          .filter(doc => doc.data().active === true)
          .map(doc => ({ id: doc.id, name: doc.data().name }))
      );
    });

    const qHistory = query(collection(db, 'admin_posts'), orderBy('createdAt', 'desc'), limit(50));
    const unsubHistory = onSnapshot(qHistory, (snap) => {
      setHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SentMessage)));
    });

    return () => { unsubSchools(); unsubHistory(); };
  }, []);

  useEffect(() => {
    if (!selectedPost) return;
    const unsubReplies = onSnapshot(
      query(collection(db, 'admin_posts', selectedPost.id, 'replies'), orderBy('timestamp', 'asc')),
      (snap) => {
        setReplies(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MessageReply)));
      }
    );
    // Reset unread count for admin when opening
    updateDoc(doc(db, 'admin_posts', selectedPost.id), { adminUnreadCount: 0 }).catch(() => {});
    return () => unsubReplies();
  }, [selectedPost]);

  // Auto-scroll to bottom when replies load or chat is opened
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [replies, selectedPost]);

  const addGroup = () => {
    if (targetGroups.some(g => g.school === currentSchool && g.gradeBand === currentGradeBand && g.sport === currentSport)) {
      toast.error('Group already added.'); return;
    }
    setTargetGroups([...targetGroups, { school: currentSchool, gradeBand: currentGradeBand, sport: currentSport }]);
  };

  const fetchTokensForTargetGroups = async (groups: TargetGroup[]): Promise<string[]> => {
    try {
      const membersSnap = await getDocs(collection(db, 'members'));
      const tokens: string[] = [];
      membersSnap.forEach(doc => {
        const data = doc.data();
        if (!data.expoPushTokens || !Array.isArray(data.expoPushTokens) || data.expoPushTokens.length === 0) return;
        const normalize = (str: any) => String(str || '').toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "_");
        let isTargeted = false;
        for (const g of groups) {
          const matchesSchool = g.school === 'all' || (data.students || []).some((s: any) => normalize(s.school_name) === normalize(g.school));
          const matchesGrade = g.gradeBand === 'all' || (data.students || []).some((s: any) => normalize(s.grade_band) === normalize(g.gradeBand) || normalize(s.ageGroup) === normalize(g.gradeBand));
          const matchesSport = g.sport === 'all' || normalize(data.sport) === normalize(g.sport) || (data.students || []).some((s: any) => normalize(s.sport) === normalize(g.sport));
          if (matchesSchool && matchesGrade && matchesSport) { isTargeted = true; break; }
        }
        if (isTargeted) tokens.push(...data.expoPushTokens);
      });
      return [...new Set(tokens)];
    } catch (error) {
      console.error('Error fetching tokens:', error);
      return [];
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || targetGroups.length === 0) {
      toast.error('Subject, message, and at least one audience group are required.'); return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'admin_posts'), {
        title: title.trim(),
        description: description.trim(),
        targetGroups,
        createdAt: serverTimestamp(),
        type: 'admin',
        role: 'admin',
        replyCount: 0,
        unreadCount: 1,
        adminUnreadCount: 0,
        lastActivity: serverTimestamp(),
        lastSenderId: 'admin'
      });
      const tokens = await fetchTokensForTargetGroups(targetGroups);
      if (tokens.length > 0) {
        await broadcastPushNotification(tokens, title.trim(), description.trim(), { screen: 'messages' });
      }
      toast.success('Broadcast sent!');
      setTitle(''); setDescription(''); setTargetGroups([]);
    } catch (error) {
      toast.error('Failed to send broadcast.');
    } finally { setLoading(false); }
  };

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedPost || sendingReply) return;
    setSendingReply(true);
    try {
      const newReplyRef = await addDoc(collection(db, 'admin_posts', selectedPost.id, 'replies'), {
        userId: 'admin',
        userName: 'YAU Admin',
        userRole: 'admin',
        content: replyText.trim(),
        timestamp: serverTimestamp()
      });
      const postRef = doc(db, 'admin_posts', selectedPost.id);
      await updateDoc(postRef, {
        unreadCount: increment(1),
        adminUnreadCount: 0,
        lastActivity: serverTimestamp(),
        lastMessageId: newReplyRef.id,
        lastMessage: replyText.trim(),
        lastSenderId: 'admin'
      });
      if (selectedPost.targetGroups) {
        const tokens = await fetchTokensForTargetGroups(selectedPost.targetGroups);
        if (tokens.length > 0) {
          await broadcastPushNotification(tokens, `New Reply: ${selectedPost.title}`, replyText.trim(), { screen: 'messages', messageId: selectedPost.id });
        }
      }
      setReplyText('');
      toast.success('Reply sent.');
    } catch (error) {
      toast.error('Failed to send reply.');
    } finally { setSendingReply(false); }
  };

  // ── Delete a single reply ─────────────────────────────────────────────────
  const handleDeleteReply = async (replyId: string) => {
    if (!selectedPost) return;
    if (!window.confirm('Delete this reply?')) return;
    try {
      await deleteDoc(doc(db, 'admin_posts', selectedPost.id, 'replies', replyId));
      toast.success('Reply deleted.');
    } catch (error) {
      toast.error('Failed to delete reply.');
    }
  };

  // ── Delete entire conversation ────────────────────────────────────────────
  const handleDeleteConversation = async () => {
    if (!selectedPost) return;
    if (!window.confirm(`Delete the entire conversation "${selectedPost.title}"? This cannot be undone.`)) return;
    setDeletingConversation(true);
    try {
      await deleteDoc(doc(db, 'admin_posts', selectedPost.id));
      toast.success('Conversation deleted.');
      setSelectedPost(null);
    } catch (error) {
      toast.error('Failed to delete conversation.');
    } finally {
      setDeletingConversation(false);
    }
  };

  // ── Role display label ────────────────────────────────────────────────────
  const getRoleLabel = (reply: MessageReply) => {
    if (reply.userRole === 'admin') return 'YAU Admin';
    if (reply.userRole === 'coach') return 'From Coach';
    return reply.userName;
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Messaging Center</h1>
          <p className="text-gray-500 dark:text-white/60 font-medium tracking-tight">Broadcast alerts and manage two-way conversations with members.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Compose */}
          <Card title="Compose Broadcast">
            <form onSubmit={handleSend} className="space-y-6">
              <Input label="Subject" placeholder="e.g. Game Rescheduled" value={title} onChange={(e) => setTitle(e.target.value)} disabled={loading} required />
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Message Body</label>
                <textarea rows={4} className="w-full px-4 py-3 bg-white dark:bg-black border border-gray-200 dark:border-white/10 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all resize-none dark:text-white" value={description} onChange={(e) => setDescription(e.target.value)} required />
              </div>
              <Button type="submit" variant="primary" className="w-full h-14 uppercase font-black tracking-widest" loading={loading} disabled={targetGroups.length === 0} leftIcon={<Send size={18} />}>Dispatch Broadcast</Button>
            </form>
          </Card>

          {/* History */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2"><History size={20} className="text-indigo-600" /><h2 className="text-lg font-black text-gray-900 dark:text-white uppercase">History & Replies</h2></div>
              <Button variant="ghost" size="sm" onClick={() => setIsHistoryOpen(!isHistoryOpen)}>{isHistoryOpen ? <ChevronUp /> : <ChevronDown />}</Button>
            </div>

            {isHistoryOpen && (
              <div className="space-y-3">
                {history.length === 0 && (
                  <div className="py-12 text-center text-gray-400 text-sm font-bold">No broadcasts sent yet.</div>
                )}
                {history.map(msg => (
                  <div key={msg.id} className="p-5 bg-white dark:bg-black rounded-2xl border border-gray-100 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-gray-900 dark:text-white">{msg.title}</h4>
                        <Badge variant="neutral" className="text-[10px]">{msg.createdAt?.toDate().toLocaleDateString()}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1">{msg.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedPost(msg)} className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white relative h-10 px-4 text-indigo-700 rounded-xl border-none">
                        <MessageSquare size={16} className="mr-2" />
                        {msg.adminUnreadCount || 0} New Replies
                        {(msg.adminUnreadCount || 0) > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-sm" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Audience Targeting */}
        <div className="space-y-6">
          <Card title="Audience Targeting" headerAction={<Target className="w-5 h-5 text-red-500" />}>
            <div className="space-y-4">
              <Select label="School" value={currentSchool} onChange={(e) => setCurrentSchool(e.target.value)} options={[{ label: 'All Schools', value: 'all' }, ...schools.map(s => ({ label: s.name, value: s.name }))]} />
              <Select label="Grade Band" value={currentGradeBand} onChange={(e) => setCurrentGradeBand(e.target.value)} options={[{ label: 'All Grades', value: 'all' }, ...GRADE_BANDS.map(b => ({ label: b, value: b }))]} />
              <Select label="Sport" value={currentSport} onChange={(e) => setCurrentSport(e.target.value)} options={[{ label: 'All Sports', value: 'all' }, ...SPORTS.map(s => ({ label: s, value: s }))]} />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 font-black text-[10px]" onClick={() => setTargetGroups([{ school: 'all', gradeBand: 'all', sport: 'all' }])}>Select All</Button>
                <Button variant="primary" className="flex-1 font-black text-[10px]" onClick={addGroup} leftIcon={<Plus size={14} />}>Add Group</Button>
              </div>
              <div className="space-y-2 mt-4">
                {targetGroups.map((g, i) => (
                  <div key={i} className="flex justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl text-[11px] font-bold border border-gray-100 dark:border-white/10 uppercase">
                    <span>{g.school === 'all' ? '🌎 Global' : `${g.school} · ${g.gradeBand}`}</span>
                    <button onClick={() => setTargetGroups(targetGroups.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                ))}
                {targetGroups.length === 0 && <p className="text-[10px] text-gray-400 font-bold text-center py-2">No audience groups added yet.</p>}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Reply Modal ── */}
      {selectedPost && (
        <div className="fixed inset-0 bg-indigo-950/40 backdrop-blur-md flex items-center justify-center z-[200] p-4">
          <Card
            className="w-full max-w-2xl h-[85vh] flex flex-col shadow-2xl overflow-hidden border-none p-0"
            contentClassName="flex-1 flex flex-col min-h-0"
            title={`Conversation: ${selectedPost.title}`}
            headerAction={
              <div className="flex items-center gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDeleteConversation}
                  loading={deletingConversation}
                  className="text-[10px] font-black uppercase tracking-widest px-3 h-8"
                >
                  <Trash2 size={14} className="mr-1" /> Delete
                </Button>
                <button onClick={() => setSelectedPost(null)}>
                  <X size={24} className="text-gray-400 hover:text-red-500" />
                </button>
              </div>
            }
          >
            {/* Messages area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-gray-50/30 dark:bg-black/20">
              {/* Original broadcast */}
              <div className="p-4 bg-white dark:bg-white/5 border border-indigo-100 dark:border-white/10 rounded-2xl shadow-sm mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="primary" className="uppercase text-[9px]">Original Broadcast</Badge>
                  <span className="text-[10px] text-gray-400 dark:text-white/40 font-bold">{selectedPost.createdAt?.toDate().toLocaleString()}</span>
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedPost.title}</p>
                <p className="text-xs text-gray-600 dark:text-white/60 mt-2 leading-relaxed">{selectedPost.description}</p>
              </div>

              {/* Replies */}
              {replies.map(reply => (
                <div key={reply.id} className={`flex ${reply.userRole === 'admin' ? 'justify-end' : 'justify-start'} group`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm relative ${reply.userRole === 'admin' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${reply.userRole === 'admin' ? 'text-indigo-100' : 'text-indigo-600 dark:text-indigo-400'}`}>
                        {getRoleLabel(reply)}
                      </span>
                      <span className="text-[8px] opacity-60 font-bold dark:text-white/40">{reply.timestamp?.toDate().toLocaleTimeString()}</span>
                    </div>
                    <p className={`text-sm leading-relaxed ${reply.userRole === 'admin' ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{reply.content}</p>
                    {/* Delete reply button — visible on hover */}
                    <button
                      onClick={() => handleDeleteReply(reply.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                      title="Delete reply"
                    >
                      <X size={10} />
                    </button>
                  </div>
                </div>
              ))}
              {replies.length === 0 && <div className="text-center py-20 text-gray-400 italic text-sm">No member replies yet.</div>}
            </div>

            {/* Reply input */}
            <form onSubmit={handleSendAdminReply} className="p-4 bg-white dark:bg-black border-t border-gray-100 dark:border-white/10 flex gap-4">
              <input
                type="text"
                placeholder="Type an official response..."
                className="flex-1 px-5 py-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 dark:text-white"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
              <Button type="submit" variant="primary" loading={sendingReply} disabled={!replyText.trim()} className="px-8 font-black uppercase tracking-widest">Reply</Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Messaging;
