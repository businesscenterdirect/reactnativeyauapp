import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../../src/services/firebase';

interface Standing {
  id: string;
  teamName: string;
  gradeBand: string;
  sport: string;
  wins: number;
  draws: number;
  losses: number;
  points: number;
}

type SportType = 'All' | 'Soccer' | 'Flag Football' | 'Basketball';

import { useRouter } from 'expo-router';
import { GradeBandPicker } from '../../src/components/GradeBandPicker';
import { TeamPicker } from '../../src/components/TeamPicker';
import { useUser } from '../../src/context/UserContext';
import { extractUniqueTeams, GRADE_BANDS, matchesGrade, matchesSelection, SPORTS } from '../../src/services/registration';
import { useFilterStore } from '../../src/store/useFilterStore';
import { useSchoolStore } from '../../src/store/useSchoolStore';

export default function StandingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    selectedSport, setSport,
    selectedGrade, setGrade,
    selectedTeam, setTeam
  } = useFilterStore();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isTeamPickerVisible, setIsTeamPickerVisible] = useState(false);

  useEffect(() => {
    if (user?.students?.[0]) {
      const student = user.students[0];
      if (student.sport) {
        // Try to match sport
        const matchedSport = ['Soccer', 'Flag Football', 'Basketball'].find(
          s => s.toLowerCase() === student.sport.toLowerCase()
        );
        if (matchedSport) {
          setSport(matchedSport);
        }
      }
      if (student.grade) {
        // Try to match grade band
        const matchedBand = GRADE_BANDS.find((b: any) =>
          b.value.toLowerCase().includes(student.grade.toLowerCase()) ||
          student.grade.toLowerCase().includes(b.value.split(' ')[0].toLowerCase())
        );
        if (matchedBand) setGrade(matchedBand.value);
      }
    }
  }, [user]);

  useEffect(() => {
    const q = query(collection(db, 'standings'), orderBy('points', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: Standing[] = [];
      snapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() } as Standing);
      });
      setStandings(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Centralized Filtering Logic with useMemo
  const filteredData = useMemo(() => {
    return standings.filter(s => {
      const sportMatch = matchesSelection(s.sport, selectedSport);
      const gradeMatch = matchesGrade(s.gradeBand, selectedGrade);
      const teamMatch = matchesSelection(s.teamName, selectedTeam);

      return sportMatch && gradeMatch && teamMatch;
    });
  }, [standings, selectedSport, selectedGrade, selectedTeam]);

  const schools = useSchoolStore((state: any) => state.schools);
  const schoolNames = useMemo(() => schools.map((s: any) => s.name), [schools]);


  const renderHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.headerCell, { width: 30 }]}>#</Text>
      <Text style={[styles.headerCell, { flex: 2.2 }]}>Club</Text>
      <Text style={[styles.headerCell, { flex: 1.2, textAlign: 'center' }]}>GB</Text>
      <Text style={[styles.headerCell, { flex: 0.7, textAlign: 'center', color: '#2563EB' }]}>W</Text>
      <Text style={[styles.headerCell, { flex: 0.7, textAlign: 'center' }]}>D</Text>
      <Text style={[styles.headerCell, { flex: 0.7, textAlign: 'center', color: '#DC2626' }]}>L</Text>
      <Text style={[styles.headerCell, { flex: 0.9, textAlign: 'center', color: '#16A34A' }]}>Pts</Text>
    </View>
  );

  const renderItem = ({ item, index }: { item: Standing; index: number }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push({
        pathname: '/team/[name]' as any,
        params: {
          name: item.teamName,
          gradeBand: item.gradeBand,
          sport: item.sport,
          wins: item.wins,
          draws: item.draws,
          losses: item.losses,
          points: item.points
        }
      })}
    >
      <Text style={styles.rankText}>{index + 1}</Text>

      <View style={styles.clubCol}>
        <View style={styles.clubBadge}>
          <Text style={styles.clubInitials}>{getInitials(item.teamName)}</Text>
        </View>
        <Text style={styles.clubName} numberOfLines={1} ellipsizeMode="tail">{item.teamName}</Text>
      </View>

      <Text style={styles.gbText} numberOfLines={2}>{item.gradeBand}</Text>
      <Text style={styles.winText}>{item.wins}</Text>
      <Text style={styles.drawText}>{item.draws}</Text>
      <Text style={styles.lossText}>{item.losses}</Text>
      <Text style={styles.pointsText}>{item.points}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#001A3D', '#002C61']} style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <View style={styles.logoContainer}>
            <Image source={require('../../assets/favicon.png')} style={styles.logo} resizeMode="contain" />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>STANDINGS</Text>
          </View>
          <View style={styles.rightPlaceholder} />
        </View>

        <View style={styles.headerSeasonRow}>
          <Text style={styles.seasonTitle}>Spring 2026 Season</Text>
        </View>

        {/* Unified Filter Section */}
        <View style={styles.filterSection}>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setIsDropdownOpen(true)}
            >
              <MaterialIcons name="tune" size={18} color="#FFF" />
              <Text style={styles.filterButtonText} numberOfLines={1}>
                {selectedGrade === 'All' ? 'ANY GRADE' : selectedGrade.split(' ')[0].toUpperCase()}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={16} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setIsTeamPickerVisible(true)}
            >
              <MaterialIcons name="group" size={18} color="#FFF" />
              <Text style={styles.filterButtonText} numberOfLines={1}>
                {selectedTeam === 'All' ? 'ALL SCHOOLS' : selectedTeam.toUpperCase()}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={16} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportsScroll}>
            {['All', ...SPORTS].map((sport) => (
              <TouchableOpacity
                key={sport}
                onPress={() => setSport(sport)}
                style={[styles.sportChip, selectedSport === sport && styles.sportChipActive]}
              >
                <Text style={[styles.sportChipText, selectedSport === sport && styles.sportChipTextActive]}>
                  {sport.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </LinearGradient>

      <GradeBandPicker
        visible={isDropdownOpen}
        onClose={() => setIsDropdownOpen(false)}
        selectedBand={selectedGrade}
        onSelect={setGrade}
      />

      <TeamPicker
        visible={isTeamPickerVisible}
        onClose={() => setIsTeamPickerVisible(false)}
        teams={schoolNames}
        selectedTeam={selectedTeam}
        onSelect={setTeam}
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#002C61" /></View>
      ) : (
        <FlatList
          data={filteredData}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={() => (
            <View style={styles.legendBox}>
              <View style={styles.legendRow}>
                <Text style={styles.legendItem}>GB = Grade Band</Text>
                <Text style={styles.legendItem}>W = Wins</Text>
                <Text style={styles.legendItem}>D = Draws</Text>
              </View>
              <View style={styles.legendRow}>
                <Text style={styles.legendItem}>L = Loses</Text>
                <Text style={styles.legendItem}>Pts = Points</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialIcons name="leaderboard" size={80} color="#E2E8F0" />
              <Text style={styles.emptyTitle}>NO RANKINGS FOUND</Text>
              <Text style={styles.emptyText}>No teams match your selected filters. Try adjusting your sport, grade, or team selection.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingBottom: 25, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 5 },
  logoContainer: { flex: 1, alignItems: 'flex-start' },
  logo: { width: 35, height: 35 },
  titleContainer: { flex: 2, alignItems: 'center' },
  rightPlaceholder: { flex: 1 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  seasonTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 15, justifyContent: 'space-between' },
  tab: { paddingVertical: 14, alignItems: 'center', flex: 1, position: 'relative', marginHorizontal: 2 },
  tabUnderline: { position: 'absolute', bottom: 0, width: '100%', height: 3, backgroundColor: '#E31B23', borderRadius: 2 },
  tabText: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.6)', letterSpacing: 0.3 },
  tabTextActive: { color: '#FFF' },
  filterSection: {
    paddingHorizontal: 20,
    marginTop: 5,
  },
  headerSeasonRow: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    alignItems: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  filterButtonText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '900',
    flex: 1,
    letterSpacing: 0.3,
  },
  sportsScroll: {
    marginTop: 15,
    marginHorizontal: -5,
  },
  sportChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  sportChipActive: {
    backgroundColor: '#E31B23',
    borderColor: '#E31B23',
  },
  sportChipText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontWeight: '800',
  },
  sportChipTextActive: {
    color: '#FFF',
    fontWeight: '900',
  },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerCell: { fontSize: 12, fontWeight: '900', color: '#1E293B' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  rankText: { width: 30, fontSize: 13, fontWeight: '900', color: '#6366F1' },
  clubCol: { flex: 2.2, flexDirection: 'row', alignItems: 'center', gap: 10, overflow: 'hidden' },
  clubBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderWidth: 1, borderColor: '#DBEAFE' },
  clubInitials: { fontSize: 11, fontWeight: '900', color: '#1E40AF' },
  clubName: { fontSize: 13, fontWeight: '800', color: '#0F172A', flex: 1 },
  gbText: { flex: 1.2, fontSize: 11, color: '#64748B', fontWeight: '700', textAlign: 'center' },
  winText: { flex: 0.7, fontSize: 14, fontWeight: '800', color: '#2563EB', textAlign: 'center' },
  drawText: { flex: 0.7, fontSize: 14, fontWeight: '800', color: '#0F172A', textAlign: 'center' },
  lossText: { flex: 0.7, fontSize: 14, fontWeight: '800', color: '#DC2626', textAlign: 'center' },
  pointsText: { flex: 0.9, fontSize: 15, fontWeight: '900', color: '#16A34A', textAlign: 'center' },
  legendBox: { marginTop: 35, paddingVertical: 15, paddingHorizontal: 20, backgroundColor: '#F0FDF4', borderRadius: 16, borderWidth: 1, borderColor: '#BBF7D0', marginHorizontal: 20 },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 6 },
  legendItem: { fontSize: 11, fontWeight: '800', color: '#166534', opacity: 0.8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { paddingVertical: 80, alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', marginTop: 20, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#9CA3AF', fontWeight: '600', textAlign: 'center', lineHeight: 20 },
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', width: '100%', borderRadius: 24, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', marginBottom: 20, textAlign: 'center' },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalItemActive: { backgroundColor: '#F8FAFC' },
  modalItemText: { fontSize: 15, fontWeight: '700', color: '#64748B' },
  modalItemTextActive: { color: '#002C61' },
});
