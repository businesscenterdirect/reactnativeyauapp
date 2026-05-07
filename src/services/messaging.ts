import { collection, doc, getDoc, getDocs, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "./firebase";

const DEV = __DEV__;

// Normalize string for consistent comparison
const normalize = (str: string | any): string => {
  if (!str) return '';
  // Handle arrays by joining them
  if (Array.isArray(str)) {
    str = str.join('_');
  }
  // Convert to string if not already
  const strValue = String(str);
  return strValue
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_");
};

export interface AdminPost {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  timestamp: any;
  createdAt?: any;
  targetSport?: string;
  targetLocation?: string;
  targetAgeGroup?: string;
  targetGroups?: { school: string; gradeBand: string; sport: string }[];
  readBy?: string[]; // Array of user UIDs who have read this
  type?: 'admin' | 'team';
  role?: 'admin' | 'coach';
  replyCount?: number;
  unreadCount?: number;
  adminUnreadCount?: number;
  lastActivity?: any;
  targetUserId?: string;
  initiatorId?: string;
}

export interface MessageReply {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userRole: 'parent' | 'coach' | 'admin';
  content: string;
  timestamp: any;
}

// State management for read/unread is handled in Firestore.

export const sendReply = async (postId: string, userId: string, userName: string, userRole: 'parent' | 'coach' | 'admin', content: string) => {
  try {
    const { collection, addDoc, serverTimestamp, increment, updateDoc, doc } = await import('firebase/firestore');
    
    // Add reply to sub-collection
    const repliesRef = collection(db, "admin_posts", postId, "replies");
    const newReplyRef = await addDoc(repliesRef, {
      userId,
      userName,
      userRole,
      content,
      timestamp: serverTimestamp()
    });

    // 2. Manage unread counters
    const postRef = doc(db, "admin_posts", postId);
    if (userRole !== 'admin') {
      // User replied: increase admin's unread counter
      await updateDoc(postRef, {
        adminUnreadCount: increment(1),
        lastActivity: serverTimestamp(),
        lastMessageId: newReplyRef.id,
        lastMessage: content,
        lastSenderId: userId
      });
    } else {
      // Admin replied: increase user's unread counter and clear admin's counter
      await updateDoc(postRef, {
        unreadCount: increment(1),
        adminUnreadCount: 0,
        lastActivity: serverTimestamp(),
        lastMessageId: newReplyRef.id,
        lastMessage: content
      });
    }
  } catch (error) {
    console.error("Error sending reply:", error);
    throw error;
  }
};

export const subscribeToReplies = (postId: string, callback: (replies: MessageReply[]) => void) => {

  const { collection, query, orderBy, onSnapshot } = require('firebase/firestore');
  const repliesRef = collection(db, "admin_posts", postId, "replies");
  const q = query(repliesRef, orderBy("timestamp", "asc"));

  return onSnapshot(q, (snapshot: any) => {
    const replies: MessageReply[] = [];
    snapshot.forEach((doc: any) => {
      replies.push({ id: doc.id, postId, ...doc.data() } as MessageReply);
    });
    callback(replies);
  });
};

export const markMessageAsRead = async (messageId: string, userId: string) => {
  if (!messageId || !userId) return;

  try {
    const { arrayUnion, updateDoc, doc } = await import('firebase/firestore');
    const docRef = doc(db, "admin_posts", messageId);
    await updateDoc(docRef, {
      readBy: arrayUnion(userId)
    });
  } catch (error) {
    console.error("Error marking message as read:", error);
  }
};

export const isMessageRead = (message: AdminPost, userId: string) => {
  if (!userId) return false;

  return message.readBy?.includes(userId);
};

export const getTotalUnreadCount = (realMessages: AdminPost[], userId: string) => {
  if (!userId) return 0;
  
  const pool = realMessages;
  
  return pool.reduce((acc, msg) => {
    if (!isMessageRead(msg, userId)) {
      return acc + (msg.unreadCount || 1);
    }
    return acc;
  }, 0);
};

export const clearAdminUnreadCount = async (messageId: string) => {
  if (!messageId) return;
  try {
    const { updateDoc, doc } = await import('firebase/firestore');
    const docRef = doc(db, "admin_posts", messageId);
    await updateDoc(docRef, {
      adminUnreadCount: 0
    });
  } catch (error) {
    console.error("Error clearing admin unread count:", error);
  }
};

export const subscribeToMessages = (userStudents: any[] = [], callback?: (messages: AdminPost[]) => void) => {
  const messagesRef = collection(db, "admin_posts");
  // Fetch all relevant messages and sort locally to avoid missing documents
  // that don't have the lastActivity field yet.
  const q = query(messagesRef);

    return onSnapshot(q, (snapshot) => {
      const msgs: AdminPost[] = [];
      
      const normalizedStudents = userStudents.map(s => ({
        sport: normalize(s.sport),
        location: normalize(s.school_name),
        grade: normalize(s.grade_band)
      }));
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const id = doc.id;
        
        let isMatch = false;

        // 1. Check Multi-Group Targeting
        if (data.targetGroups && Array.isArray(data.targetGroups)) {
          isMatch = data.targetGroups.some((g: any) => {
            const targetSchool = normalize(g.school);
            const targetGrade = normalize(g.gradeBand);
            const targetSport = normalize(g.sport);

            return normalizedStudents.some(s => {
              const mSchool = targetSchool === 'all' || s.location.includes(targetSchool);
              const mGrade = targetGrade === 'all' || s.grade === targetGrade;
              const mSport = targetSport === 'all' || s.sport === targetSport;
              return mSchool && mGrade && mSport;
            }) || (targetSchool === 'all' && targetGrade === 'all' && targetSport === 'all');
          });
        } 
        // 2. Check Legacy Target Fields
        else {
          const targetSport = data.targetSport ?? 'all';
          const targetLocation = data.targetLocation ?? 'all';
          const targetAgeGroup = data.targetAgeGroup ?? 'all';

          if (targetSport === 'all' && targetLocation === 'all' && targetAgeGroup === 'all') {
            isMatch = true;
          } else {
            const tSport = normalize(targetSport);
            const tLocation = normalize(targetLocation);
            const tGrade = normalize(targetAgeGroup);

            isMatch = normalizedStudents.some(s => {
              let m = true;
              if (tSport !== "all") m = m && (s.sport === tSport);
              if (tLocation !== "all") m = m && (s.location.includes(tLocation));
              if (tGrade !== "all") m = m && (s.grade === tGrade);
              return m;
            });
          }
        }
        
        if (isMatch) {
          msgs.push({ id, ...data } as AdminPost);
        }
      });
      
      // Secondary local sort to ensure newest is ALWAYS first, 
      // even if documents are missing certain timestamp fields.
      const getMillis = (obj: any) => {
        if (!obj) return 0;
        if (obj.toMillis) return obj.toMillis();
        if (obj.toDate) return obj.toDate().getTime();
        if (obj.seconds) return obj.seconds * 1000;
        return new Date(obj).getTime() || 0;
      };

      const sorted = msgs.sort((a, b) => {
        const timeA = Math.max(getMillis(a.lastActivity), getMillis(a.createdAt), getMillis(a.timestamp));
        const timeB = Math.max(getMillis(b.lastActivity), getMillis(b.createdAt), getMillis(b.timestamp));
        return timeB - timeA;
      });

      if (callback) callback(sorted);
    });
};

export const getMessageById = async (messageId: string): Promise<AdminPost | null> => {
  try {
    const docRef = doc(db, "admin_posts", messageId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as AdminPost;
    }
    
    return null;
  } catch (error) {
    if (DEV) console.error("Error fetching message by ID:", error);
    return null;
  }
};

export const createAccountDeletionRequest = async (user: any, reason: string, details?: string) => {
  try {
    const { collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc, increment } = await import('firebase/firestore');
    
    const messageContent = `ACCOUNT DELETION REQUEST
--------------------------
User: ${user.firstName} ${user.lastName}
Email: ${user.email}
Phone: ${user.phone || 'N/A'}
User ID: ${user.id}

Reason: ${reason}
${details ? `Details: ${details}` : ''}

Please process this account deletion request as per the user's request.`;

    // 1. Check if a deletion request thread already exists for this user
    const q = query(
      collection(db, "admin_posts"), 
      where("initiatorId", "==", user.id),
      where("title", "==", "Account Deletion Request")
    );
    const querySnapshot = await getDocs(q);

    let postId: string;

    if (!querySnapshot.empty) {
      // 2. Reuse existing thread
      postId = querySnapshot.docs[0].id;
      const postRef = doc(db, "admin_posts", postId);
      
      // Update the main post with latest info
      await updateDoc(postRef, {
        lastActivity: serverTimestamp(),
        adminUnreadCount: increment(1),
        lastSenderId: user.id,
        lastMessage: messageContent
      });

      // Add the new request as a reply
      const repliesRef = collection(db, "admin_posts", postId, "replies");
      await addDoc(repliesRef, {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userRole: 'parent',
        content: messageContent,
        timestamp: serverTimestamp()
      });

    } else {
      // 3. Create new thread
      const docRef = await addDoc(collection(db, "admin_posts"), {
        title: "Account Deletion Request",
        description: `Deletion request from ${user.firstName} ${user.lastName} - Reason: ${reason}`,
        targetUserId: user.id,
        initiatorId: user.id,
        type: 'admin',
        role: 'admin',
        replyCount: 0,
        unreadCount: 0, 
        adminUnreadCount: 1,
        createdAt: serverTimestamp(),
        lastActivity: serverTimestamp(),
        lastSenderId: user.id,
        lastMessage: messageContent
      });
      postId = docRef.id;

      // Add the first reply
      const repliesRef = collection(db, "admin_posts", postId, "replies");
      await addDoc(repliesRef, {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userRole: 'parent',
        content: messageContent,
        timestamp: serverTimestamp()
      });
    }

    return postId;
  } catch (error) {
    console.error("Error creating account deletion request:", error);
    throw error;
  }
};
