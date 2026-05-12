import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, type Messaging } from "firebase/messaging";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCADG-9nm-61nmsHbe-hNlg82g0ccKpjkw",
  authDomain: "yau-app.firebaseapp.com",
  projectId: "yau-app",
  storageBucket: "yau-app.firebasestorage.app",
  messagingSenderId: "696491882997",
  appId: "1:696491882997:web:c191283f1415b8e913c8bc",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Messaging is only available in browser contexts (not SSR / Service Worker scope)
let messaging: Messaging | null = null;
try {
  if (typeof window !== 'undefined') {
    messaging = getMessaging(app);
  }
} catch (err) {
  console.warn('[Firebase] getMessaging failed:', err);
}
export { messaging };

export default app;
