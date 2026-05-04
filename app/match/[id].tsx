import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScheduleStore } from '../../src/store/useScheduleStore';
import { Schedule } from '../../src/services/schedule';

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const schedules = useScheduleStore((state: any) => state.schedules);
  const [match, setMatch] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const found = schedules.find((s: Schedule) => s.id === id);
    if (found) {
      setMatch(found);
    }
    setLoading(false);
  }, [id, schedules]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#002C61" />
      </View>
    );
  }

  if (!match) {
    return (
      <View style={styles.empty}>
        <MaterialIcons name="error-outline" size={60} color="#E5E7EB" />
        <Text style={styles.emptyText}>Match not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const normalizeDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else if (parseInt(parts[0]) > 12) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      } else {
        return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      }
    }
    return dateStr;
  };

  const getInitials = (name: string) => {
    return (name || '??').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const matchDateNormalized = normalizeDate(match.date);
  const todayStr = new Date().toISOString().split('T')[0];

  let matchState: 'Completed' | 'On Going' | 'Upcoming' = 'Upcoming';
  if (matchDateNormalized < todayStr) matchState = 'Completed';
  else if (matchDateNormalized === todayStr) matchState = 'On Going';

  const formattedDate = new Date(matchDateNormalized + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Hero Header Area */}
      <ImageBackground 
        source={require('../../assets/images/background.png')}
        style={[styles.headerHero, { paddingTop: insets.top + 10 }]}
        imageStyle={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
      >
        <View style={styles.overlay} />
        {/* Top Navigation */}
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
            <MaterialIcons name="chevron-left" size={28} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>MATCH DETAILS</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* League and Location Info */}
        <View style={styles.leagueInfoContainer}>
          <Text style={styles.leagueText}>{match.sport || 'Sports League'}</Text>
          <Text style={styles.locationText}>{match.location || 'Location TBA'}</Text>
        </View>

        {/* Teams and Score/Time */}
        <View style={styles.teamsHeroRow}>
          {/* Team 1 */}
          <View style={styles.teamHeroColumn}>
            <View style={styles.teamHeroCircle}>
              <Text style={styles.teamHeroInit}>{getInitials(match.team1Name)}</Text>
            </View>
            <Text style={styles.teamHeroName} numberOfLines={2}>{match.team1Name}</Text>
          </View>

          {/* Center Info */}
          <View style={styles.heroCenterInfo}>
            {matchState === 'Upcoming' ? (
              <Text style={styles.upcomingTimeHero}>{match.time}</Text>
            ) : (
              <>
                <Text style={styles.scoreTextHero}>2 - 1</Text>
                {matchState === 'Completed' ? (
                  <Text style={styles.fullTimeText}>FULL-TIME</Text>
                ) : (
                  <View style={styles.ongoingTag}>
                    <Text style={styles.ongoingTagText}>90 + 7'</Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Team 2 */}
          <View style={styles.teamHeroColumn}>
            <View style={styles.teamHeroCircle}>
              <Text style={styles.teamHeroInit}>{getInitials(match.team2Name)}</Text>
            </View>
            <Text style={styles.teamHeroName} numberOfLines={2}>{match.team2Name}</Text>
          </View>
        </View>
        
        {/* Sport Tag */}
        <View style={styles.sportPillContainer}>
            <View style={styles.sportPill}>
                <Text style={styles.sportPillText}>{match.sport?.toUpperCase() || 'SPORTS'}</Text>
            </View>
        </View>
      </ImageBackground>

      <ScrollView contentContainerStyle={styles.contentScroll} showsVerticalScrollIndicator={false}>
        
        {/* Match Details Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Match Details</Text>
          
          <View style={styles.listContainer}>
            {match.grade_band && (
              <View style={styles.listRow}>
                <Text style={styles.listLabel}>Grade Bands</Text>
                <Text style={styles.listValue}>{match.grade_band}</Text>
              </View>
            )}
            {match.ageGroup && (
               <View style={styles.listRow}>
                 <Text style={styles.listLabel}>Age Group</Text>
                 <Text style={styles.listValue}>{match.ageGroup}</Text>
               </View>
            )}
            <View style={styles.listRow}>
              <Text style={styles.listLabel}>Date</Text>
              <Text style={styles.listValue}>{formattedDate}</Text>
            </View>
            <View style={styles.listRow}>
              <Text style={styles.listLabel}>Time</Text>
              <Text style={styles.listValue}>{match.time || 'TBA'}</Text>
            </View>
            <View style={[styles.listRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.listLabel}>Team Names</Text>
              <Text style={styles.listValue} numberOfLines={1}>{match.team1Name} vs {match.team2Name}</Text>
            </View>
          </View>
        </View>

        {/* Location Details Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Location Details</Text>
          
          {/* Map Placeholder */}
          <View style={styles.mapPlaceholder}>
            <MaterialIcons name="map" size={40} color="#94A3B8" />
            <Text style={styles.mapText}>Location Map</Text>
          </View>

          <View style={styles.listContainer}>
            <View style={styles.listRow}>
              <Text style={styles.listLabel}>Location</Text>
              <Text style={styles.listValue}>{match.location || 'TBA'}</Text>
            </View>
            {match.coachName && (
               <View style={[styles.listRow, { borderBottomWidth: 0 }]}>
                 <Text style={styles.listLabel}>Coach</Text>
                 <Text style={styles.listValue}>{match.coachName}</Text>
               </View>
            )}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#64748B', marginTop: 20 },
  backBtn: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#002C61', borderRadius: 8 },
  backBtnText: { color: '#FFF', fontWeight: '800' },
  
  // Hero Header
  headerHero: { 
    backgroundColor: '#001A3D', 
    paddingBottom: 25, 
    borderBottomLeftRadius: 0, 
    borderBottomRightRadius: 0 
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 26, 61, 0.85)',
  },
  headerTop: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  backIcon: { 
    width: 40, 
    height: 40, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: { 
    color: '#FFF', 
    fontSize: 16, 
    fontWeight: '800', 
    letterSpacing: 1 
  },
  
  leagueInfoContainer: {
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 25,
  },
  leagueText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  locationText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 4,
  },

  teamsHeroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
  },
  teamHeroColumn: {
    alignItems: 'center',
    width: 90,
  },
  teamHeroCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  teamHeroInit: {
    color: '#001A3D',
    fontSize: 22,
    fontWeight: '900',
  },
  teamHeroName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  heroCenterInfo: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  upcomingTimeHero: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1,
  },
  scoreTextHero: {
    color: '#FFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 3,
  },
  fullTimeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
    letterSpacing: 1,
  },
  ongoingTag: {
    backgroundColor: '#2ECC71',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  ongoingTagText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },

  sportPillContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  sportPill: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 20,
  },
  sportPillText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Content
  contentScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionContainer: {
    marginBottom: 35,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000',
    marginBottom: 15,
  },
  
  // List
  listContainer: {
    backgroundColor: 'transparent',
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  listLabel: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  listValue: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
    paddingLeft: 20,
  },

  // Map
  mapPlaceholder: {
    height: 180,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mapText: {
    marginTop: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
});
