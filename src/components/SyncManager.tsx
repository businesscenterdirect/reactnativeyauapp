import { useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { useScheduleStore } from '../store/useScheduleStore';
import { useMessageStore } from '../store/useMessageStore';

export const SyncManager = ({ children }: { children: React.ReactNode }) => {
  const { user } = useUser();
  const initScheduleSync = useScheduleStore(state => state.initSync);
  const initMessageSync = useMessageStore(state => state.initSync);

  // Global Schedule Sync (shared across all users — no user dependency)
  useEffect(() => {
    const unsub = initScheduleSync();
    return () => unsub();
  }, [initScheduleSync]);

  // User-Specific Message Sync.
  // IMPORTANT: depend on user?.id (not the whole `user` object).
  // The full `user` object gets a new reference on every Firestore snapshot
  // (e.g. push token updates), which would cause this effect to re-run,
  // tear down the Firestore listener, and reset loading → true, causing
  // the UI to flicker or appear frozen between re-subscribes.
  useEffect(() => {
    if (user?.id) {
      const unsub = initMessageSync(user.students || [], user.id);
      return () => unsub();
    }
  }, [user?.id, initMessageSync]);

  return <>{children}</>;
};
