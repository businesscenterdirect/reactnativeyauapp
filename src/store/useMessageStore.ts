import { create } from 'zustand';
import { AdminPost } from '../services/messaging';
import { collection, onSnapshot, query, orderBy, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

interface UserReadState {
  lastSeenMessageId: string;
  lastSeenAt: any;
}

interface MessageGroup {
  id: string;
  title: string;
  lastMessage: string;
  lastMessageId: string;
  updatedAt: any;
  senderName: string;
  targetType: string;
  role?: string;
  senderId?: string;
  type?: string;
  unreadCount?: number; // Calculated per-user
}

interface MessageState {
  groups: MessageGroup[];
  userReadStates: Record<string, UserReadState>;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  totalUnread: number;
  
  // Actions
  initSync: (userStudents: any[], userId: string) => () => void;
  markAsRead: (userId: string, groupId: string, lastMessageId: string) => Promise<void>;
  calculateUnread: () => void;
}

// Normalize string for consistent comparison
const normalize = (str: string | any): string => {
  if (!str) return '';
  if (Array.isArray(str)) str = str.join('_');
  const strValue = String(str);
  return strValue.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "_");
};

export const useMessageStore = create<MessageState>((set, get) => ({
  groups: [],
  userReadStates: {},
  loading: true,
  error: null,
  initialized: false,
  totalUnread: 0,

  initSync: (userStudents, userId) => {
    if (!userId) {
      console.log('[Message Store] No userId, skipping sync');
      return () => {};
    }

    console.log('[Message Store] Initializing sync for user:', userId);

    // 1. Listen to User Read States
    const readStatesRef = collection(db, 'users', userId, 'messageReads');
    const unsubReadStates = onSnapshot(readStatesRef, (snapshot) => {
      console.log('[Message Store] Read states received:', snapshot.docs.length);
      const readStates: Record<string, UserReadState> = {};
      snapshot.forEach((doc) => {
        readStates[doc.id] = doc.data() as UserReadState;
      });
      set({ userReadStates: readStates });
      get().calculateUnread();
    });

    // 2. Listen to Message Groups (Using admin_posts for stability first)
    const groupsRef = collection(db, "admin_posts");
    
    // Safety: Remove orderBy for now to ensure all docs are fetched even if updatedAt is missing
    const q = query(groupsRef);

    const unsubGroups = onSnapshot(q, (snapshot) => {
      console.log('[Message Store] admin_posts snapshot received. Count:', snapshot.docs.length);
      const msgs: any[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log('[Message Store] Doc:', doc.id, 'Data:', JSON.stringify(data).substring(0, 100));
        msgs.push({ id: doc.id, ...data });
      });

      // Simple Sort by timestamp/createdAt/updatedAt
      const getMillis = (obj: any) => {
        if (!obj) return 0;
        if (obj.toMillis) return obj.toMillis();
        if (obj.toDate) return obj.toDate().getTime();
        if (obj.seconds) return obj.seconds * 1000;
        return new Date(obj).getTime() || 0;
      };

      const sorted = msgs.sort((a, b) => {
        const timeA = Math.max(getMillis(a.updatedAt), getMillis(a.createdAt), getMillis(a.timestamp));
        const timeB = Math.max(getMillis(b.updatedAt), getMillis(b.createdAt), getMillis(b.timestamp));
        return timeB - timeA;
      });
      
      set({ groups: sorted, loading: false, initialized: true });
      get().calculateUnread();
    }, (err) => {
      console.error('[Message Store] Sync Error:', err);
      set({ error: err.message, loading: false });
    });

    return () => {
      unsubReadStates();
      unsubGroups();
    };
  },

  calculateUnread: () => {
    const { groups, userReadStates } = get();
    const updatedGroups = groups.map(group => {
      const readState = userReadStates[group.id];
      const lastSeenId = readState?.lastSeenMessageId;
      // Use lastMessageId if present, otherwise fall back to the group's own id (the broadcast itself)
      const currentLastId = group.lastMessageId || group.id;

      let count = 0;
      if (!readState) {
        // Never opened: always unread (1)
        count = 1;
      } else if (lastSeenId !== currentLastId) {
        // Has been opened before, but there's a new message since last seen
        count = 1;
      }

      return { ...group, unreadCount: count };
    });

    set({ groups: updatedGroups, totalUnread: updatedGroups.reduce((acc, g) => acc + (g.unreadCount || 0), 0) });
  },

  markAsRead: async (userId, groupId, lastMessageId) => {
    if (!userId || !groupId) return;

    const previousReadStates = get().userReadStates;
    const newReadState = { lastSeenMessageId: lastMessageId, lastSeenAt: new Date() };

    // Optimistic Update
    set({
      userReadStates: { ...previousReadStates, [groupId]: newReadState }
    });
    get().calculateUnread();

    try {
      const docRef = doc(db, 'users', userId, 'messageReads', groupId);
      await setDoc(docRef, {
        lastSeenMessageId: lastMessageId, // Fixed ReferenceError: was lastSeenMessageId
        lastSeenAt: serverTimestamp()
      });
    } catch (err) {
      console.error('[Message Store] Mark Read Error:', err);
      // Rollback
      set({ userReadStates: previousReadStates });
      get().calculateUnread();
    }
  }
}));

// Helper to check if unread count should be displayed
export const shouldShowBadge = (count: number) => count > 0;
