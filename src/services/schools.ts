import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from './firebase';

export interface School {
  id?: string;
  name: string;
  schoolKey?: string;
  type?: 'school' | 'program';
  active?: boolean;
  isActive?: boolean;
}

/**
 * Subscribe to active schools from the app_schools Firestore collection.
 * Handles both legacy `active` field and newer `isActive` field.
 * Returns an unsubscribe function for cleanup.
 */
export function subscribeToSchools(callback: (schools: School[]) => void): () => void {
  try {
    // Query with ordering — no compound index needed since we filter client-side
    const q = query(
      collection(db, 'app_schools'),
      orderBy('name', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const schools: School[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Support both `active` and `isActive` field names
          const isActive = data.isActive === true || data.active === true;
          if (isActive && !data.deletedAt) {
            schools.push({
              id: doc.id,
              name: data.name || '',
              schoolKey: data.schoolKey || data.name || doc.id,
              type: data.type || 'school',
              active: true,
              isActive: true,
            });
          }
        });
        callback(schools);
      },
      (error) => {
        if (__DEV__) console.error('[Schools] Real-time listener error:', error);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    if (__DEV__) console.error('[Schools] Error setting up listener:', error);
    callback([]);
    return () => {};
  }
}
