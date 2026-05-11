import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '../../src/context/UserContext';
import { Schedule } from '../../src/services/schedule';
import { GRADE_BANDS, SPORTS, isGradeMatch } from '../../src/services/registration';

const { width } = Dimensions.get('window');

import { useMessageStore } from '../../src/store/useMessageStore';
import { useScheduleStore } from '../../src/store/useScheduleStore';
import { GradeBandPicker } from '../../src/components/GradeBandPicker';

export default function HomeScreen() {
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [selectedSport, setSelectedSport] = useState('All');
  const [selectedGrade, setSelectedGrade] = useState('All');
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  // Use centralized state
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
      // Handle "MM-DD-YYYY" or "YYYY-MM-DD" or "DD-MM-YYYY"
      // Assuming common separator is '-' or '/'
      const parts = dateStr.split(/[-/]/);
      let date: Date;

      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else if (parseInt(parts[0]) > 12) {
          // DD-MM-YYYY
          date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        } else {
          // MM-DD-YYYY
          date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
        }
      } else {
        date = new Date(dateStr);
      }

      if (isNaN(date.getTime())) return dateStr.toUpperCase();

      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      };
      return date.toLocaleDateString('en-US', options).toUpperCase();
    } catch (e) {
      return dateStr.toUpperCase();
    }
  };

  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local

  // Filtering logic
  const filteredSchedules = schedules.filter((s: Schedule) => {
    const sportMatch = selectedSport === 'All' || s.sport.toLowerCase().includes(selectedSport.toLowerCase());
    const gradeMatch = selectedGrade === 'All' || isGradeMatch(s.grade_band || s.ageGroup, selectedGrade);
    return sportMatch && gradeMatch;
  });

  const upcomingSchedules = filteredSchedules
    .filter((s: Schedule) => s.date > todayStr)
    .sort((a: Schedule, b: Schedule) => a.date.localeCompare(b.date))
    .slice(0, 3);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#001A3D', '#002C61']} style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <View style={styles.logoContainer}>
            <Image source={require('../../assets/favicon.png')} style={styles.logo} resizeMode="contain" />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.headerBrand}>YAU SPORTS</Text>
          </View>
          <View style={styles.rightPlaceholder} />
        </View>
        <View style={styles.welcomeSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <Text style={styles.greetingText}>Good Evening 👋</Text>
              <Text style={styles.userNameText}>{fullName}</Text>
            </View>
            <TouchableOpacity 
              style={styles.gradeFilterBtn} 
              onPress={() => setIsPickerVisible(true)}
            >
              <MaterialIcons name="tune" size={20} color="#FFF" />
              <Text style={styles.gradeFilterText} numberOfLines={1}>
                {selectedGrade === 'All' ? 'ANY GRADE' : selectedGrade.split(' ')[0].toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sports Quick Filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.sportsScroll}
          contentContainerStyle={styles.sportsScrollContent}
        >
          {['All', ...SPORTS].map((sport) => (
            <TouchableOpacity
              key={sport}
              onPress={() => setSelectedSport(sport)}
              style={[styles.sportChip, selectedSport === sport && styles.sportChipActive]}
            >
              <Text style={[styles.sportChipText, selectedSport === sport && styles.sportChipTextActive]}>
                {sport.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      <GradeBandPicker 
        visible={isPickerVisible}
        onClose={() => setIsPickerVisible(false)}
        selectedBand={selectedGrade}
        onSelect={setSelectedGrade}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.tilesGrid}>
          <TouchableOpacity style={styles.tile} onPress={() => router.push('/(tabs)/messages' as any)}>
            <View style={styles.tileIconBg}>
              <MaterialIcons name="chat-bubble" size={24} color="#FFFFFF" />
              {totalUnread > 0 && (
                <View style={styles.badge}><Text style={styles.badgeText}>{totalUnread}</Text></View>
              )}
            </View>
            <Text style={styles.tileTitle}>Messages</Text>
            <Text style={styles.tileSubtext}>{totalUnread > 0 ? `${totalUnread} New Messages` : 'All Caught Up'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tile} onPress={() => router.push('/(tabs)/schedule' as any)}>
            <View style={styles.tileIconBg}>
              <MaterialIcons name="event" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.tileTitle}>Schedule</Text>
            <Text style={styles.tileSubtext}>Upcoming Games</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.tile} onPress={() => router.push('/(tabs)/standings' as any)}>
            <View style={styles.tileIconBg}>
              <MaterialIcons name="emoji-events" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.tileTitle}>Standings</Text>
            <Text style={styles.tileSubtext}>Team Ranking</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.feedHeader}>
          <Text style={styles.feedTitle}>Upcoming Game</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/schedule' as any)}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#0047AB" size="large" style={{ marginTop: 20 }} />
        ) : upcomingSchedules.length > 0 ? (
          upcomingSchedules.map((item: Schedule) => (
            <TouchableOpacity
              key={item.id}
              style={styles.matchCard}
              onPress={() => router.push({ pathname: '/game/[id]' as any, params: { id: item.id } })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardHeaderDate}>{formatDate(item.date)}</Text>
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
                    <Text style={styles.statusLabel}>KICK-OFF</Text>
                    <Text style={styles.timeText}>{item.time}</Text>
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
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="event-busy" size={80} color="#E2E8F0" />
            <Text style={styles.emptyTitle}>NO UPCOMING GAMES</Text>
            <Text style={styles.emptyText}>You're all caught up! New games will appear here once they are scheduled.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 20, paddingBottom: 35 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  logoContainer: { flex: 1, alignItems: 'flex-start' },
  logo: { width: 40, height: 40 },
  titleContainer: { flex: 2, alignItems: 'center' },
  rightPlaceholder: { flex: 1 },
  headerBrand: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 1.5 },
  welcomeSection: { marginTop: 10 },
  greetingText: { color: '#FFF', fontSize: 16, opacity: 0.9 },
  userNameText: { color: '#FFF', fontSize: 28, fontWeight: '900', marginTop: 4 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  tilesGrid: { flexDirection: 'row', gap: 12, marginBottom: 30 },
  tile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  tileIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#002C61',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    position: 'relative'
  },
  tileTitle: { color: '#1E293B', fontSize: 13, fontWeight: '800' },
  tileSubtext: { color: '#64748B', fontSize: 10, marginTop: 2, fontWeight: '500' },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#E31B23',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF'
  },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  feedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  feedTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  viewAll: { fontSize: 13, fontWeight: '700', color: '#0047AB' },
  matchCard: { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 20, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  cardHeader: { backgroundColor: '#F1F5F9', paddingVertical: 10, alignItems: 'center' },
  cardHeaderDate: { color: '#1E293B', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  cardBody: { padding: 15, alignItems: 'center' },
  leagueName: { fontSize: 14, fontWeight: '800', color: '#1E293B', marginBottom: 2 },
  locationSubtext: { fontSize: 11, color: '#94A3B8', marginBottom: 15 },
  teamsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  team: { alignItems: 'center', width: 80 },
  teamCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E0E7FF', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  teamInit: { color: '#0047AB', fontSize: 16, fontWeight: '900' },
  teamLabel: { fontSize: 11, fontWeight: '700', color: '#1E293B', textAlign: 'center' },
  scoreContainer: { alignItems: 'center', flex: 1 },
  statusLabel: { fontSize: 10, fontWeight: '800', color: '#64748B', marginBottom: 5, letterSpacing: 0.5 },
  timeText: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    marginTop: 10,
    marginHorizontal: 10
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
    marginTop: 15,
    marginBottom: 5
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18
  },
  gradeFilterBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 120
  },
  gradeFilterText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
  },
  sportsScroll: {
    marginTop: 20,
    marginHorizontal: -20,
  },
  sportsScrollContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  sportChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  sportChipActive: {
    backgroundColor: '#E31B23',
    borderColor: '#E31B23',
  },
  sportChipText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '800',
  },
  sportChipTextActive: {
    color: '#FFF',
    fontWeight: '900',
  },
});
