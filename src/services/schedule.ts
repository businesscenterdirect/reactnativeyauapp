import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const DEV = __DEV__;

export interface Schedule {
  id: string;
  team1Name: string;
  team2Name: string;
  sport: string;
  date: string;
  time: string;
  location: string;
  ageGroups?: string[]; // Array of grades (e.g., ["K", "1", "2"])
  ageGroup?: string; // Fallback string field
  grade_band?: string;
  coachName?: string;
}

// Fetch schedules from Firestore schedules collection (one-time fetch)
export async function fetchSchedules(): Promise<Schedule[]> {
  try {
    const schedulesRef = collection(db, 'schedules');
    const snapshot = await getDocs(schedulesRef);
    
    const schedules: Schedule[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      schedules.push({
        id: doc.id,
        team1Name: data.team1Name || '',
        team2Name: data.team2Name || '',
        sport: data.sport || '',
        date: data.date || '',
        time: data.time || '',
        location: data.location || '',
        ageGroups: data.ageGroups || [],
        ageGroup: data.ageGroup || '',
        grade_band: data.grade_band || '',
        coachName: data.coachName
      });
    });
    
    return schedules;
  } catch (error) {
    if (DEV) console.error('[Schedule Firestore] Error fetching schedules:', error);
    return [];
  }
}

// Subscribe to schedules from Firestore schedules collection with real-time listener
export function subscribeToSchedules(callback: (schedules: Schedule[]) => void): () => void {
  try {
    const schedulesRef = collection(db, 'schedules');
    
    const unsubscribe = onSnapshot(schedulesRef, (snapshot) => {
      const schedules: Schedule[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        schedules.push({
          id: doc.id,
          team1Name: data.team1Name || '',
          team2Name: data.team2Name || '',
          sport: data.sport || '',
          date: data.date || '',
          time: data.time || '',
          location: data.location || '',
          ageGroups: data.ageGroups || [],
          ageGroup: data.ageGroup || '',
          grade_band: data.grade_band || '',
          coachName: data.coachName
        });
      });
      
      callback(schedules);
    }, (error) => {
      if (DEV) console.error('[Schedule Firestore] Real-time listener error:', error);
      callback([]);
    });
    
    return unsubscribe;
  } catch (error) {
    if (DEV) console.error('[Schedule Firestore] Error setting up real-time listener:', error);
    callback([]);
    return () => {};
  }
}

