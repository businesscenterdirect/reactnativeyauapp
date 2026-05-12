import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  type User as FirebaseUser,
  signOut
} from 'firebase/auth';
import { 
  doc, 
  onSnapshot, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { removeFCMToken } from '../lib/fcmService';

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Viewer';
  status: 'active' | 'disabled';
}

interface AuthContextType {
  user: FirebaseUser | null;
  adminData: AdminProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [adminData, setAdminData] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // ── Lazy Migration Gate ──────────────────────────────────────────
        // Standardizes the architecture by remapping legacy random-ID 
        // documents to the core admins/{uid} format.
        try {
          const docRef = doc(db, 'admins', firebaseUser.uid);
          const docSnap = await getDoc(docRef);

          if (!docSnap.exists() && firebaseUser.email) {
            const q = query(collection(db, 'admins'), where('email', '==', firebaseUser.email));
            const querySnap = await getDocs(q);

            if (!querySnap.empty) {
              const legacyDoc = querySnap.docs[0];
              const legacyData = legacyDoc.data();

              // Atomic Clone to UID-protected document
              await setDoc(docRef, {
                ...legacyData,
                migratedFrom: legacyDoc.id,
                migratedAt: new Date(),
                authLinked: true
              }, { merge: true });

              // Safely remove legacy doc ONLY after UID write confirms success
              await deleteDoc(legacyDoc.ref);
              console.log('[AuthContext] Successfully standardized admin profile:', firebaseUser.uid);
            }
          }
        } catch (migError) {
          console.error('[AuthContext] Structural migration error:', migError);
        }

        // Fetch Admin Role and Profile (now strictly standardized on UID)
        unsubProfile = onSnapshot(doc(db, 'admins', firebaseUser.uid), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const rawRole = (data.role || '').toLowerCase();
            
            // ── Strict Role Validation ───────────────────────────────────
            if (rawRole !== 'admin' && rawRole !== 'manager' && rawRole !== 'viewer') {
              console.error('[AuthContext] Unauthorized role detected:', rawRole);
              setAdminData(null);
              signOut(auth); // Hard-lock: kill the session
              return;
            }

            const role = rawRole === 'admin' ? 'Admin' : rawRole === 'manager' ? 'Manager' : 'Viewer';
            setAdminData({ id: snap.id, ...data, role } as AdminProfile);
            setLoading(false);
          } else {
            // ── Access Denied: No UID-based profile after migration check ──
            console.warn('[AuthContext] Admin authorization missing for UID:', firebaseUser.uid);
            setAdminData(null);
            signOut(auth); // Hard-lock: kill the session
          }
        }, (err) => {
          console.error('[AuthContext] Profile live-stream error:', err);
          setAdminData(null);
          setLoading(false);
        });
      } else {
        setAdminData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      unsubProfile?.();
    };
  }, []);

  const logout = async () => {
    if (user) {
      await removeFCMToken(user.uid);
    }
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, adminData, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
