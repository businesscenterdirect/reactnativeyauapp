import { create } from 'zustand';

interface FilterState {
  selectedSport: string;
  selectedGrade: string;
  selectedTeam: string;
  
  // Actions
  setSport: (sport: string) => void;
  setGrade: (grade: string) => void;
  setTeam: (team: string) => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  selectedSport: 'All',
  selectedGrade: 'All',
  selectedTeam: 'All',

  setSport: (selectedSport) => set({ selectedSport }),
  setGrade: (selectedGrade) => set({ selectedGrade }),
  setTeam: (selectedTeam) => set({ selectedTeam }),
  resetFilters: () => set({ 
    selectedSport: 'All', 
    selectedGrade: 'All', 
    selectedTeam: 'All' 
  }),
}));
