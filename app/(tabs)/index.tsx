import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '../../src/context/UserContext';
import { matchesGrade, matchesSelection, matchesTeamHomeAway, SPORTS } from '../../src/services/registration';
import { Schedule } from '../../src/services/schedule';

const { width } = Dimensions.get('window');

import { GradeBandPicker } from '../../src/components/GradeBandPicker';
import { SportPicker } from '../../src/components/SportPicker';
import { TeamPicker } from '../../src/components/TeamPicker';
import { useFilterStore } from '../../src/store/useFilterStore';
import { useMessageStore } from '../../src/store/useMessageStore';
import { useScheduleStore } from '../../src/store/useScheduleStore';
import { useSchoolStore } from '../../src/store/useSchoolStore';

export default function HomeScreen() {
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const {
    selectedSport, setSport,
    selectedGrade, setGrade,
    selectedTeam, setTeam
  } = useFilterStore();

  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [isTeamPickerVisible, setIsTeamPickerVisible] = useState(false);
  const [isSportPickerVisible, setIsSportPickerVisible] = useState(false);

  const schedules = useScheduleStore((state: any) => state.schedules);
  const loading = useScheduleStore((state: any) => state.loading);
  const totalUnread = useMessageStore((state: any) => state.totalUnread);

  const fullName = user ? `${user.firstName} ${user.lastName}` : 'Guest User';

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split(/[-/]/);
      let date: Date;
      if (parts.length === 3) {
        if (parts[0].length === 4) date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        else if (parseInt(parts[0]) > 12) date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        else date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
      } else date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr.toUpperCase();
      return date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
    } catch (e) { return dateStr.toUpperCase(); }
  };

  const todayStr = new Date().toLocaleDateString('en-CA');

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

  const upcomingSchedules = useMemo(() => {
    return filteredSchedules
      .filter((s: Schedule) => s.date >= todayStr)
      .sort((a: Schedule, b: Schedule) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
      .slice(0, 10);
  }, [filteredSchedules, todayStr]);

  const renderMatchCard = ({ item }: { item: Schedule }) => (
    <TouchableOpacity
      key={item.id}
      style={styles.matchCard}
      onPress={() => router.push({ pathname: '/game/[id]' as any, params: { id: item.id } })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardHeaderDate}>{formatDate(item.date)}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardLeagueTitle}>{item.grade_band || item.ageGroup} {item.sport}</Text>
        <Text style={styles.cardLeagueSub}>{item.sport}</Text>
        <View style={styles.teamsRow}>
          <View style={styles.team}>
            <View style={styles.teamCircle}><Text style={styles.teamInit}>{getInitials(item.team1Name)}</Text></View>
            <Text style={styles.teamLabel} numberOfLines={1}>{item.team1Name}</Text>
          </View>
          <View style={styles.scoreContainer}>
            <Text style={styles.timeText}>{item.time}</Text>
            <Text style={styles.statusLabel}>PM</Text>
          </View>
          <View style={styles.team}>
            <View style={styles.teamCircle}><Text style={styles.teamInit}>{getInitials(item.team2Name)}</Text></View>
            <Text style={styles.teamLabel} numberOfLines={1}>{item.team2Name}</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.locationMain}>{item.location}</Text>
          <Text style={styles.locationSub}>1907 Park Dr NE, Issaquah, WA 98029</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* FIXED STICKY DASHBOARD */}
      <View style={styles.stickyDashboard}>
        <View style={styles.blueDashboardTop}>
          <LinearGradient colors={['rgba(16, 42, 77, 0.95)', 'rgba(0, 26, 61, 0.95)']} style={[styles.header, { paddingTop: insets.top + 10 }]}>
            <View style={styles.headerTop}>
              <View style={styles.logoContainer}><Image source={require('../../assets/favicon.png')} style={styles.logo} resizeMode="contain" /></View>
              <View style={styles.titleContainer}><Text style={styles.headerBrand}>YOUTH ATHLETE UNIVERSITY</Text></View>
              <View style={styles.rightPlaceholder} />
            </View>
          </LinearGradient>
          <View style={styles.blueWelcomeArea}>
            <Text style={styles.greetingText}>Good Evening 👋</Text>
            <Text style={styles.userNameText}>{fullName}</Text>
          </View>
        </View>

        <View style={styles.fixedTilesGrid}>
          {[
            { title: 'Messages', sub: totalUnread > 0 ? `${totalUnread} New` : 'All Caught Up', icon: 'chat-bubble', path: '/(tabs)/messages', badge: totalUnread },
            { title: 'Schedule', sub: 'Upcoming Games', icon: 'event', path: '/(tabs)/schedule' },
            { title: 'Standings', sub: 'Team Ranking', icon: 'emoji-events', path: '/(tabs)/standings' }
          ].map((tile, idx) => (
            <TouchableOpacity key={idx} style={styles.tile} onPress={() => router.push(tile.path as any)}>
              <View style={styles.tileIconContainer}>
                <MaterialIcons name={tile.icon as any} size={22} color="#FFF" />
                {!!tile.badge && <View style={styles.badge}><Text style={styles.badgeText}>{tile.badge}</Text></View>}
              </View>
              <Text style={styles.tileTitle}>{tile.title}</Text>
              <Text style={styles.tileSubtext}>{tile.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={upcomingSchedules}
        renderItem={renderMatchCard}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollableContent}
        ListHeaderComponent={
          <>
            <View style={styles.feedHeader}>
              <Text style={styles.feedTitle}>Upcoming Match</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/schedule' as any)}><Text style={styles.viewAll}>View All</Text></TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mainSportsScroll} contentContainerStyle={styles.mainSportsScrollContent}>
              {['All', ...SPORTS].map((sport) => (
                <TouchableOpacity key={sport} onPress={() => setSport(selectedSport === sport ? 'All' : sport)} style={[styles.mainSportChip, selectedSport === sport && styles.mainSportChipActive]}>
                  <Text style={[styles.mainSportChipText, selectedSport === sport && styles.mainSportChipTextActive]}>{sport.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.mainFilterRow}>
              {[{ label: 'Select School', val: selectedTeam, open: () => setIsTeamPickerVisible(true) }, { label: 'Select Grade', val: selectedGrade, open: () => setIsPickerVisible(true) }].map((f, i) => (
                <View key={i} style={styles.filterCol}>
                  <Text style={styles.filterLabel}>{f.label}</Text>
                  <TouchableOpacity style={styles.mainFilterBtn} onPress={f.open}>
                    <Text style={styles.mainFilterBtnText} numberOfLines={1}>
                      {f.label === 'Select School'
                        ? (selectedTeam === 'All' ? 'ALL SCHOOLS' : selectedTeam.toUpperCase())
                        : (selectedGrade === 'All' ? 'ANY GRADE' : selectedGrade.toUpperCase())
                      }
                    </Text>
                    <MaterialIcons name="keyboard-arrow-down" size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          loading ? <ActivityIndicator color="#002C61" size="large" style={{ marginTop: 40 }} /> : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="event-busy" size={60} color="#E2E8F0" />
              <Text style={styles.emptyTitle}>NO GAMES FOUND</Text>
              <Text style={styles.emptyText}>Adjust your filters to see more games.</Text>
            </View>
          )
        }
      />

      <GradeBandPicker visible={isPickerVisible} onClose={() => setIsPickerVisible(false)} selectedBand={selectedGrade} onSelect={setGrade} />
      <TeamPicker visible={isTeamPickerVisible} onClose={() => setIsTeamPickerVisible(false)} teams={schoolNames} selectedTeam={selectedTeam} onSelect={setTeam} />
      <SportPicker visible={isSportPickerVisible} onClose={() => setIsSportPickerVisible(false)} selectedSport={selectedSport} onSelect={setSport} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  stickyDashboard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  // New wrapping view for the top part to have the blue background
  blueDashboardTop: {
    backgroundColor: 'rgba(2, 28, 59, 1)',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 40, // Space for the top half of tiles
  },
  header: { paddingHorizontal: 20, paddingBottom: 10 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 0 },
  logoContainer: { flex: 1, alignItems: 'flex-start' },
  logo: { width: 35, height: 35 },
  titleContainer: { flex: 4, alignItems: 'center' },
  rightPlaceholder: { flex: 1 },
  headerBrand: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  blueWelcomeArea: { paddingHorizontal: 20, paddingTop: 5, paddingBottom: 15 },
  greetingText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  userNameText: { color: '#FFF', fontSize: 26, fontWeight: '900', marginTop: 0 },
  scrollableContent: { paddingTop: 280, paddingBottom: 100 },
  fixedTilesGrid: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: -40, // Restore bridge effect
    paddingBottom: 0,
  },
  tile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tileIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#002C61',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  tileTitle: { color: '#1E293B', fontSize: 11, fontWeight: '800' },
  tileSubtext: { color: '#64748B', fontSize: 9, marginTop: 2, fontWeight: '600' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#E31B23',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF'
  },
  badgeText: { color: '#FFF', fontSize: 8, fontWeight: '900' },
  feedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, paddingHorizontal: 20 },
  feedTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  viewAll: { fontSize: 14, fontWeight: '700', color: '#2563EB' },
  matchCard: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 20, marginHorizontal: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  cardHeader: { backgroundColor: 'rgba(241, 245, 249, 0.5)', paddingVertical: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  cardHeaderDate: { color: '#0F172A', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  cardBody: { padding: 15, alignItems: 'center' },
  cardLeagueTitle: { fontSize: 14, fontWeight: '900', color: '#1E293B', marginBottom: 2 },
  cardLeagueSub: { fontSize: 11, color: '#94A3B8', fontWeight: '800', marginBottom: 15 },
  teamsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 20 },
  team: { alignItems: 'center', width: 85 },
  teamCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#DBEAFE' },
  teamInit: { color: '#2563EB', fontSize: 18, fontWeight: '900' },
  teamLabel: { fontSize: 11, fontWeight: '800', color: '#1E293B', textAlign: 'center' },
  scoreContainer: { alignItems: 'center', flex: 1 },
  timeText: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  statusLabel: { fontSize: 11, fontWeight: '900', color: '#0F172A' },
  cardFooter: { borderTopWidth: 1, borderTopColor: '#F1F5F9', width: '100%', paddingTop: 12, alignItems: 'center' },
  locationMain: { fontSize: 11, fontWeight: '800', color: '#64748B' },
  locationSub: { fontSize: 10, color: '#94A3B8', fontWeight: '500' },
  mainFilterRow: { flexDirection: 'row', gap: 10, marginBottom: 10, paddingHorizontal: 20 },
  filterCol: { flex: 1 },
  filterLabel: { fontSize: 10, fontWeight: '800', color: '#94A3B8', marginBottom: 6, letterSpacing: 0.5 },
  mainFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mainFilterBtnText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  emptyTitle: { fontSize: 15, fontWeight: '900', color: '#1E293B', marginTop: 10, marginBottom: 4 },
  emptyText: { color: '#94A3B8', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  mainSportsScroll: { marginBottom: 5 },
  mainSportsScrollContent: { paddingHorizontal: 20, gap: 8 },
  mainSportChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mainSportChipActive: {
    backgroundColor: '#E31B23',
    borderColor: '#E31B23',
  },
  mainSportChipText: { color: '#64748B', fontSize: 11, fontWeight: '800' },
  mainSportChipTextActive: { color: '#FFF', fontWeight: '900' },
});
