import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { doc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';
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
          const snapData = snap.data();
          
          // ── Security Check: App Access Revocation ──────────────────────
          if (snapData.app_access === false) {
            if (__DEV__) console.log('[UserContext] Access revoked for user:', snap.id);
            signOut(auth);
            return;
          }

          // ── Security Check: Role Authorization ──────────────────────────
          const role = (snapData.user_type || snapData.role || '').toLowerCase();
          const allowedRoles = ['parent', 'coach', 'student', 'member', 'user'];
          if (!allowedRoles.includes(role)) {
            if (__DEV__) console.log('[UserContext] Unauthorized role for mobile app:', role);
            signOut(auth);
            return;
          }

          const freshUser: Member = { id: snap.id, ...(snapData as Omit<Member, 'id'>) };
          setUserState(freshUser);

          // ── Metadata Backfill ──────────────────────────────────────────
          // Safely add missing architecture tags without over-writing existing data
          const updates: any = {};
          if (!snapData.signup_source) updates.signup_source = 'mobile_app';
          if (!snapData.environment) updates.environment = __DEV__ ? 'test' : 'production';
          if (!snapData.user_type) updates.user_type = 'parent';
          if (snapData.app_access === undefined) updates.app_access = true;

          if (Object.keys(updates).length > 0) {
            if (__DEV__) console.log('[UserContext] Backfilling missing metadata for user:', snap.id, updates);
            updateDoc(memberRef, updates).catch(err => {
               if (__DEV__) console.warn('[UserContext] Metadata backfill failed (permissions?):', err);
            });
          }

          // Mirror to AsyncStorage so cold-start hydration has latest data
          AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(freshUser)).catch(() => {});
        } else {
          // Document deleted or missing — full sign out
          if (__DEV__) console.log('[UserContext] Member profile missing for UID:', snap.id);
          signOut(auth);
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
      let hasHydrated = false;
      // 1. Show cached user immediately to avoid blank screen on cold start
      try {
        const cached = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (cached) {
          const parsed: Member = JSON.parse(cached);
          setUserState(parsed);
          // If we have a cached id, attach the live Firestore listener right away
          if (parsed.id) attachMemberListener(parsed.id);
          hasHydrated = true;
        }
      } catch (e) {
        if (__DEV__) console.error('[UserContext] Hydration error:', e);
      }

      // 2. Subscribe to Firebase Auth — source of truth for session validity
      authUnsub = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser) {
          if (hasHydrated) {
            // Guard: wait a more generous moment for Firebase to restore persistence
            await new Promise(resolve => setTimeout(resolve, 1500));
            if (auth.currentUser) {
              if (__DEV__) console.log('[UserContext] persistence recovered after 1.5s delay');
              setLoading(false);
              return; 
            }
          }

          if (memberUnsubRef.current) {
            memberUnsubRef.current();
            memberUnsubRef.current = null;
          }
          setUserState(null);
          AsyncStorage.removeItem(USER_STORAGE_KEY).catch(() => {});
        } else {
          // SIGNED IN
          // If we didn't hydrate or the ID changed, attach the listener
          if (!user?.id || user.id !== firebaseUser.uid) {
            attachMemberListener(firebaseUser.uid);
          }
        }
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
      
      if (__DEV__) console.log('[UserContext] Registering push token for user:', user.id);

      // Improved Project ID retrieval for EAS builds across different Expo versions
      const projectId = 
        Constants.expoConfig?.extra?.eas?.projectId ?? 
        Constants.easConfig?.projectId ?? 
        'dd35e184-c545-49be-853d-cf7223e7be47'; // Fallback to hardcoded ID from app.json
        
      // Safety Delay: wait for Firestore listener to settle and any 
      // previous session cleanup to finish.
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const token = await registerForPushNotificationsAsync(projectId);
      if (!token) {
        if (__DEV__) console.warn('[UserContext] Failed to get push token');
        return;
      }

      // Sync to Firestore
      const memberRef = doc(db, 'members', user.id);
      await updateDoc(memberRef, { 
        expoPushTokens: arrayUnion(token),
        lastTokenUpdate: new Date().toISOString()
      });

      if (__DEV__) console.log('[UserContext] Push token synced successfully:', token);
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
