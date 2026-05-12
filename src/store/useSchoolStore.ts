import { create } from 'zustand';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '../services/firebase';

interface School {
  id: string;
  name: string;
}

interface SchoolState {
  schools: School[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchSchools: () => () => void; // Returns unsubscribe
}

export const useSchoolStore = create<SchoolState>((set) => ({
  schools: [],
  loading: true,
  error: null,

  fetchSchools: () => {
    const q = query(
      collection(db, 'app_schools'), 
      orderBy('name', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const schoolList: School[] = snapshot.docs
        .filter(doc => doc.data().active === true)
        .map(doc => ({
          id: doc.id,
          name: doc.data().name,
        }));
      
      set({ schools: schoolList, loading: false });
    }, (error) => {
      console.error('Error fetching schools:', error);
      set({ error: error.message, loading: false });
    });

    return unsubscribe;
  }
}));
