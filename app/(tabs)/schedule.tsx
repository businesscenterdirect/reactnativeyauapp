import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  SectionList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '../../src/context/UserContext';
import { Schedule } from '../../src/services/schedule';
import { useRouter } from 'expo-router';
import { useScheduleStore } from '../../src/store/useScheduleStore';
import { useFilterStore } from '../../src/store/useFilterStore';
import { GRADE_BANDS, SPORTS, isGradeMatch, extractUniqueTeams, matchesSelection, matchesGrade, matchesTeamHomeAway } from '../../src/services/registration';
import { GradeBandPicker } from '../../src/components/GradeBandPicker';
import { TeamPicker } from '../../src/components/TeamPicker';
import { useSchoolStore } from '../../src/store/useSchoolStore';

function getInitials(name: string) {
  return (name || '??').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const { 
    selectedSport, setSport, 
    selectedGrade, setGrade, 
    selectedTeam, setTeam 
  } = useFilterStore();

  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [isTeamPickerVisible, setIsTeamPickerVisible] = useState(false);

  const schedules = useScheduleStore((state: any) => state.schedules);
  const loading = useScheduleStore((state: any) => state.loading);

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Centralized Filtering Logic with useMemo
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s: Schedule) => {
      const sportMatch = matchesSelection(s.sport, selectedSport);
      const gradeMatch = matchesGrade(s.grade_band || s.ageGroup, selectedGrade);
      const teamMatch = matchesTeamHomeAway(s.team1Name, s.team2Name, selectedTeam);
      
      return sportMatch && gradeMatch && teamMatch;
    });
  }, [schedules, selectedSport, selectedGrade, selectedTeam]);

  const schools = useSchoolStore((state: any) => state.schools);
  const schoolNames = useMemo(() => schools.map((s: any) => s.name), [schools]);

  // Games on "Today" should remain in Upcoming until the day is over
  const realUpcoming = useMemo(() => {
    return filteredSchedules
      .filter((s: Schedule) => s.date >= todayStr)
      .sort((a: Schedule, b: Schedule) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return (a.time || '').localeCompare(b.time || '');
      });
  }, [filteredSchedules, todayStr]);

  const realPast = useMemo(() => {
    return filteredSchedules
      .filter((s: Schedule) => s.date < todayStr)
      .sort((a: Schedule, b: Schedule) => {
        const dateCompare = b.date.localeCompare(a.date); // Reverse for past
        if (dateCompare !== 0) return dateCompare;
        return (b.time || '').localeCompare(a.time || '');
      });
  }, [filteredSchedules, todayStr]);

  // Use real data
  const displayedItems = activeTab === 'upcoming' ? realUpcoming : realPast;

  const grouped: Record<string, Schedule[]> = {};
  for (const s of displayedItems) {
    const key = s.date || 'Unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  }

  const sections = Object.entries(grouped)
    .sort(([a], [b]) => activeTab === 'upcoming' ? a.localeCompare(b) : b.localeCompare(a))
    .map(([date, data]) => ({ title: date, data }));

  const formatHeaderDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr.toUpperCase();
      const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
      return d.toLocaleDateString('en-US', options).toUpperCase();
    } catch (e) { return dateStr.toUpperCase(); }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#001A3D', '#002C61']} style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <View style={styles.logoContainer}>
            <Image source={require('../../assets/favicon.png')} style={styles.logo} resizeMode="contain" />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>GAME SCHEDULE</Text>
          </View>
          <View style={styles.rightPlaceholder} />
        </View>

        {/* Custom Tabs */}
        <View style={styles.tabsRow}>
          {['upcoming', 'past'].map((t) => (
            <TouchableOpacity
              key={t}
              style={styles.tab}
              onPress={() => setActiveTab(t as any)}
            >
              <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
                {t.toUpperCase()}
              </Text>
              {activeTab === t && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Filters */}
        <View style={styles.filterSection}>
          <View style={styles.filterRow}>
            <TouchableOpacity 
              style={styles.filterButton} 
              onPress={() => setIsPickerVisible(true)}
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
        visible={isPickerVisible}
        onClose={() => setIsPickerVisible(false)}
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
        <View style={styles.loading}><ActivityIndicator size="large" color="#002C61" /></View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.dateHeader}>{formatHeaderDate(title)}</Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialIcons name="leaderboard" size={80} color="#E2E8F0" />
              <Text style={styles.emptyTitle}>NO GAMES FOUND</Text>
              <Text style={styles.emptyText}>No games match your selected filters. Try adjusting your sport, grade, or team selection.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isPast = activeTab === 'past';
            const headerColor = isPast ? '#E31B23' : '#002C61';
            const statusText = isPast ? 'FULL-TIME' : 'KICK-OFF';
            const statusColor = isPast ? '#E31B23' : '#002C61';

            return (
              <TouchableOpacity
                style={[styles.gameCard, { borderColor: headerColor }]}
                onPress={() => router.push({ pathname: '/game/[id]' as any, params: { id: item.id } })}
              >
                <View style={[styles.cardHeader, { backgroundColor: headerColor }]}>
                  <Text style={styles.cardHeaderDate}>{formatHeaderDate(item.date)}</Text>
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.leagueName}>{item.sport}</Text>
                  <Text style={styles.locationSubtext}>{item.location}</Text>

                  <View style={styles.teamsRow}>
                    <View style={styles.team}>
                      <View style={styles.teamCircle}>
                        <Text style={styles.teamInit}>{getInitials(item.team1Name)}</Text>
                      </View>
                      <Text style={styles.teamLabel} numberOfLines={1}>{item.team1Name}</Text>
                    </View>

                    <View style={styles.scoreContainer}>
                      <Text style={[styles.statusLabel, { color: statusColor }]}>{statusText}</Text>
                      {isPast ? (
                        <Text style={styles.scoreText}>2 - 1</Text>
                      ) : (
                        <Text style={styles.timeText}>{item.time}</Text>
                      )}
                    </View>

                    <View style={styles.team}>
                      <View style={styles.teamCircle}>
                        <Text style={styles.teamInit}>{getInitials(item.team2Name)}</Text>
                      </View>
                      <Text style={styles.teamLabel} numberOfLines={1}>{item.team2Name}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingBottom: 25, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 5 },
  logoContainer: { flex: 1, alignItems: 'flex-start' },
  logo: { width: 35, height: 35 },
  titleContainer: { flex: 2, alignItems: 'center' },
  rightPlaceholder: { flex: 1 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 1.5 },
  filterBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 10 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', position: 'relative' },
  tabUnderline: { position: 'absolute', bottom: 0, width: '95%', height: 3, backgroundColor: '#E31B23', borderRadius: 2 },
  tabText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '800' },
  tabTextActive: { color: '#FFF' },
  loading: { flex: 1, justifyContent: 'center' },
  sectionHeader: { marginTop: 10, marginBottom: 10, alignItems: 'center' },
  dateHeader: { fontSize: 18, fontWeight: '900', color: '#1E293B', letterSpacing: 0.5 },
  gameCard: { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 20, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  cardHeader: { paddingVertical: 10, alignItems: 'center' },
  cardHeaderDate: { color: '#FFF', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  cardBody: { padding: 20, alignItems: 'center' },
  leagueName: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginBottom: 2 },
  locationSubtext: { fontSize: 12, color: '#94A3B8', marginBottom: 20 },
  teamsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  team: { alignItems: 'center', width: 90 },
  teamCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E0E7FF', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  teamInit: { color: '#0047AB', fontSize: 18, fontWeight: '900' },
  teamLabel: { fontSize: 12, fontWeight: '700', color: '#1E293B', textAlign: 'center' },
  scoreContainer: { alignItems: 'center', flex: 1 },
  statusLabel: { fontSize: 11, fontWeight: '800', marginBottom: 8, letterSpacing: 0.5 },
  scoreText: { fontSize: 32, fontWeight: '900', color: '#0F172A', letterSpacing: 5 },
  timeText: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 120, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', marginTop: 20, marginBottom: 8 },
  emptyText: { color: '#94A3B8', fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 20 },
  filterSection: {
    paddingHorizontal: 20,
    marginTop: 5,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 5,
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
    marginHorizontal: -5,
  },
  sportChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.1)', marginRight: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  sportChipActive: { backgroundColor: '#E31B23', borderColor: '#E31B23' },
  sportChipText: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '800' },
  sportChipTextActive: { color: '#FFF', fontWeight: '900' },
});
