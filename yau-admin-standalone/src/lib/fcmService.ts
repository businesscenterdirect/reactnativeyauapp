/**
 * FCM Web Push + App Badging Service
 * Ported from YAU-Admin-Panel/src/services/fcmService.js
 * Adapted for Vite (import.meta.env.VITE_*) + TypeScript
 */

import { getToken, onMessage, type MessagePayload } from 'firebase/messaging';
import { messaging } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// ─── 1. App Badge Management ──────────────────────────────────────────────────

export const updateAppBadge = (count: number): void => {
  if (count > 0) {
    if ('setAppBadge' in navigator) {
      (navigator as any).setAppBadge(count).catch((err: unknown) =>
        console.warn('[Badge] setAppBadge error:', err)
      );
    }
    // document.title fallback — strip any existing badge prefix first
    const safeTitle = document.title.replace(/^\(\d+\)\s🔴\s*/, '');
    document.title = `(${count}) 🔴 ${safeTitle}`;
  } else {
    clearAppBadge();
  }
};

export const clearAppBadge = (): void => {
  if ('clearAppBadge' in navigator) {
    (navigator as any).clearAppBadge().catch((err: unknown) =>
      console.warn('[Badge] clearAppBadge error:', err)
    );
  }
  document.title = document.title.replace(/^\(\d+\)\s🔴\s*/, '');
};

// Alias for compatibility
export const updateDocumentTitle = updateAppBadge;

// ─── 2. Service Worker Registration ──────────────────────────────────────────

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('[FCM] Service Worker registered. Scope:', registration.scope);
    return registration;
  } catch (err) {
    console.error('[FCM] Service Worker registration failed:', err);
    return null;
  }
};

// ─── 3. Get FCM Token ─────────────────────────────────────────────────────────

export const getFCMToken = async (): Promise<string | null> => {
  if (!messaging) return null;

  try {
    const swRegistration = await registerServiceWorker();

    // Vite env var — set VITE_FIREBASE_VAPID_KEY in .env.local
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
    if (!vapidKey) {
      console.warn('[FCM] VITE_FIREBASE_VAPID_KEY is not set. Push notifications will not work.');
      return null;
    }

    const currentToken = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swRegistration ?? undefined,
    });

    if (currentToken) {
      return currentToken;
    } else {
      console.warn('[FCM] No registration token. Request permission to generate one.');
      return null;
    }
  } catch (err) {
    console.warn('[FCM] Error retrieving token:', err);
    return null;
  }
};

// ─── 4. Request Permission & Save Token ──────────────────────────────────────

export const requestNotificationPermission = async (userId: string): Promise<boolean> => {
  if (!('Notification' in window) || !messaging) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('[FCM] Notification permission granted.');
      const token = await getFCMToken();
      if (token && userId) {
        // Write token to users/{adminUID} — only if changed to avoid redundant writes
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.fcmToken !== token) {
            await setDoc(userRef, { fcmToken: token }, { merge: true });
            console.log('[FCM] Token saved to Firestore.');
          }
        } else {
          // Admin doc might not exist yet — create it with the token
          await setDoc(userRef, { fcmToken: token }, { merge: true });
        }
      }
      return true;
    } else {
      console.warn('[FCM] Notification permission denied.');
      return false;
    }
  } catch (err) {
    console.error('[FCM] Error requesting permission:', err);
    return false;
  }
};

// ─── 5. Remove Token on Logout ────────────────────────────────────────────────

export const removeFCMToken = async (userId: string | undefined): Promise<void> => {
  if (!userId) return;
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists() && userDoc.data().fcmToken) {
      await setDoc(userRef, { fcmToken: null }, { merge: true });
      console.log('[FCM] Token removed from Firestore.');
    }
  } catch (err) {
    console.error('[FCM] Error removing token:', err);
  } finally {
    clearAppBadge();
  }
};

// ─── 6. Foreground Message Listener ──────────────────────────────────────────

export const listenForForegroundMessages = (
  callback: (payload: MessagePayload) => void
): (() => void) => {
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    console.log('[FCM] Foreground message:', payload);
    callback(payload);
  });
};
