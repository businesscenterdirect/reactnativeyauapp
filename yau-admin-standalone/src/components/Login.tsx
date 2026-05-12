import React, { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { requestNotificationPermission } from '../lib/fcmService';
import toast from 'react-hot-toast';

import { 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      toast.error('Email and password are required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const uid = userCredential.user.uid;

      // ── Lazy Migration Layer ──────────────────────────────────────────
      // Standardizes the architecture by remapping legacy random-ID or 
      // newly provisioned documents to the core admins/{uid} format.
      let adminDoc = await getDoc(doc(db, 'admins', uid));

      if (!adminDoc.exists()) {
        const q = query(collection(db, 'admins'), where('email', '==', email.trim()));
        const querySnap = await getDocs(q);

        if (!querySnap.empty) {
          const legacyDoc = querySnap.docs[0];
          const legacyData = legacyDoc.data();

          // Safe clone to UID-protected document
          await setDoc(doc(db, 'admins', uid), {
            ...legacyData,
            migratedFrom: legacyDoc.id,
            migratedAt: new Date(),
            authLinked: true
          }, { merge: true });

          // Safely remove legacy document ONLY after UID write success
          await deleteDoc(legacyDoc.ref);
          console.log('[Login] Standardized admin profile during login:', uid);
          
          // Re-fetch newly standardized document
          adminDoc = await getDoc(doc(db, 'admins', uid));
        }
      }

      if (!adminDoc.exists()) {
        const msg = 'Security Alert: No administrator profile associated with this account.';
        setError(msg);
        toast.error(msg);
        await signOut(auth);
        return;
      }

      const role = (adminDoc.data()?.role || '').toLowerCase();
      if (role !== 'admin' && role !== 'manager' && role !== 'viewer') {
        const msg = 'Security Alert: Invalid role clearance. Access denied.';
        setError(msg);
        toast.error(msg);
        await signOut(auth);
        return;
      }

      toast.success('Successfully logged in!');
      navigate('/');
      
      // Fire permission request non-blocking — must happen after navigation
      setTimeout(() => {
        if (auth.currentUser) {
          requestNotificationPermission(auth.currentUser.uid);
        }
      }, 1500);
    } catch (err: any) {
      console.error('Login error:', err);
      let message = 'Invalid email or password. Please try again.';

      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          message = 'Access denied. Please check your admin credentials.';
          break;
        case 'auth/invalid-email':
          message = 'Please enter a valid administrative email.';
          break;
        case 'auth/too-many-requests':
          message = 'Security lockout: Too many failed attempts. Try again later.';
          break;
      }

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-19 h-16 flex items-center justify-center mb-4 scale-110 overflow-hidden">
            <img src="/favicon.png" alt="YAU Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">YAU Admin</h1>
          <p className="text-gray-500 dark:text-white/40 font-bold uppercase tracking-widest text-[10px] mt-1">Control Center Access</p>
        </div>

        <Card className="border-none shadow-2xl overflow-visible">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-xs font-bold text-red-800 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <Input
              label="Admin Email"
              type="email"
              placeholder="admin@yau.app"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail size={18} className="text-gray-400" />}
              disabled={loading}
            />

            <Input
              label="Security Password"
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock size={18} className="text-gray-400" />}
              disabled={loading}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full h-14 uppercase tracking-widest font-black text-sm mt-4 shadow-xl"
              loading={loading}
            >
              Authorize Login
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-50 dark:border-white/5 text-center">
            <p className="text-[10px] font-black text-gray-400 dark:text-white/20 uppercase tracking-[0.2em]">Authorized Personnel Only</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;
