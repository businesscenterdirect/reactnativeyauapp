import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { registerForPushNotificationsAsync } from '../services/notifications';
import Constants from 'expo-constants';
import { Member } from '../types';

interface UserContextType {
  user: Member | null;
  setUser: (user: Member | null) => Promise<void>;
  loading: boolean;
  clearUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);
const USER_STORAGE_KEY = '@yau_user_data';

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  // Holds the active Firestore member listener so we can unsub on uid change / logout
  const memberUnsubRef = useRef<(() => void) | null>(null);

  // ── Attach a real-time Firestore listener for the given member document ID ────
  const attachMemberListener = (memberId: string) => {
    // Clean up any previous listener first
    if (memberUnsubRef.current) {
      memberUnsubRef.current();
      memberUnsubRef.current = null;
    }

    const memberRef = doc(db, 'members', memberId);
    const unsub = onSnapshot(
      memberRef,
      (snap) => {
        if (snap.exists()) {
          const freshUser: Member = { id: snap.id, ...(snap.data() as Omit<Member, 'id'>) };
          setUserState(freshUser);
          // Mirror to AsyncStorage so cold-start hydration has latest data
          AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(freshUser)).catch(() => {});
        } else {
          // Document deleted — clear session
          clearUser();
        }
      },
      (err) => {
        if (__DEV__) console.error('[UserContext] Member listener error:', err);
      }
    );

    memberUnsubRef.current = unsub;
  };

  // ── Bootstrap: hydrate from cache, then let Firebase Auth drive state ─────────
  useEffect(() => {
    let authUnsub: (() => void) | undefined;

    const init = async () => {
      // 1. Show cached user immediately to avoid blank screen on cold start
      try {
        const cached = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (cached) {
          const parsed: Member = JSON.parse(cached);
          setUserState(parsed);
          // If we have a cached id, attach the live Firestore listener right away
          if (parsed.id) attachMemberListener(parsed.id);
        }
      } catch (e) {
        if (__DEV__) console.error('[UserContext] Hydration error:', e);
      }

      // 2. Subscribe to Firebase Auth — source of truth for session validity
      authUnsub = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser) {
          // Signed out — drop listener + clear state
          if (memberUnsubRef.current) {
            memberUnsubRef.current();
            memberUnsubRef.current = null;
          }
          setUserState(null);
          AsyncStorage.removeItem(USER_STORAGE_KEY).catch(() => {});
        }
        // When signed in: the member listener (attached above or via updateUser)
        // already keeps state fresh — no manual fetch needed.
        setLoading(false);
      });
    };

    init();

    return () => {
      authUnsub?.();
      if (memberUnsubRef.current) memberUnsubRef.current();
    };
  }, []);

  // ── Register push token whenever user logs in ─────────────────────────────────
  useEffect(() => {
    if (user?.id && !loading) {
      registerPushToken();
    }
  }, [user?.id, loading]);

  const registerPushToken = async () => {
    try {
      if (Platform.OS === 'web' || !user?.id) return;
      
      // Improved Project ID retrieval for EAS builds across different Expo versions
      const projectId = 
        Constants.expoConfig?.extra?.eas?.projectId ?? 
        Constants.easConfig?.projectId ?? 
        'dd35e184-c545-49be-853d-cf7223e7be47'; // Fallback to hardcoded ID from app.json
        
      const token = await registerForPushNotificationsAsync(projectId);
      if (!token) return;

      // Use arrayUnion to safely add the new token without overwriting existing ones.
      // This is much safer than manual array management as it avoids race conditions.
      const { arrayUnion } = await import('firebase/firestore');
      const memberRef = doc(db, 'members', user.id);
      await updateDoc(memberRef, { 
        expoPushTokens: arrayUnion(token),
        lastTokenUpdate: new Date().toISOString() // Track when the token was last refreshed
      });

      if (__DEV__) console.log('[UserContext] Push token synced to Firestore');
    } catch (error) {
      if (__DEV__) console.warn('[UserContext] Push token sync failed:', error);
    }
  };

  // ── updateUser: called after login / registration to anchor the listener ──────
  const updateUser = async (newUser: Member | null) => {
    if (!newUser) {
      await clearUser();
      return;
    }
    // Cache immediately so UI is instant
    setUserState(newUser);
    try {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
    } catch (e) {
      if (__DEV__) console.error('[UserContext] Cache write error:', e);
    }
    // Attach live listener so any admin changes propagate in real time
    if (newUser.id) attachMemberListener(newUser.id);
  };

  const clearUser = async () => {
    if (memberUnsubRef.current) {
      memberUnsubRef.current();
      memberUnsubRef.current = null;
    }
    setUserState(null);
    try {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
    } catch (e) {
      if (__DEV__) console.error('[UserContext] Cache clear error:', e);
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser: updateUser, loading, clearUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
