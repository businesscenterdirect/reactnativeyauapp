import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScheduleStore } from '../../src/store/useScheduleStore';
import { Schedule } from '../../src/services/schedule';

const { width } = Dimensions.get('window');

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
      if (parts[0].length === 4) { // YYYY-MM-DD
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else if (parseInt(parts[0]) > 12) { // DD-MM-YYYY
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      } else { // MM-DD-YYYY
        return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
      }
    }
    return dateStr;
  };

  const getInitials = (name: string) => {
    return (name || '??').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#001A3D', '#002C61']} style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
            <MaterialIcons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>MATCH DETAILS</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.matchSummary}>
          <View style={styles.teamContainer}>
            <View style={styles.teamCircle}>
              <Text style={styles.teamInit}>{getInitials(match.team1Name)}</Text>
            </View>
            <Text style={styles.teamName}>{match.team1Name}</Text>
          </View>

          <View style={styles.vsContainer}>
            <Text style={styles.vsText}>VS</Text>
            <View style={styles.sportBadge}>
              <Text style={styles.sportText}>{match.sport.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.teamContainer}>
            <View style={styles.teamCircle}>
              <Text style={styles.teamInit}>{getInitials(match.team2Name)}</Text>
            </View>
            <Text style={styles.teamName}>{match.team2Name}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="event" size={22} color="#002C61" />
            </View>
            <View>
              <Text style={styles.infoLabel}>DATE</Text>
              <Text style={styles.infoValue}>
                {new Date(normalizeDate(match.date) + 'T12:00:00').toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                }).toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="access-time" size={22} color="#002C61" />
            </View>
            <View>
              <Text style={styles.infoLabel}>TIME</Text>
              <Text style={styles.infoValue}>{match.time}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="location-on" size={22} color="#002C61" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>LOCATION</Text>
              <Text style={styles.infoValue}>{match.location}</Text>
            </View>
          </View>

          {match.coachName && (
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <MaterialIcons name="person" size={22} color="#002C61" />
              </View>
              <View>
                <Text style={styles.infoLabel}>COACH</Text>
                <Text style={styles.infoValue}>{match.coachName}</Text>
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity 
          style={styles.actionBtn}
          onPress={() => router.push('/(tabs)/messages' as any)}
        >
          <MaterialIcons name="message" size={20} color="#FFF" />
          <Text style={styles.actionBtnText}>Message Coach</Text>
        </TouchableOpacity>
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
  header: { paddingBottom: 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  backIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 1.5 },
  matchSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 30, marginTop: 30 },
  teamContainer: { alignItems: 'center', width: 100 },
  teamCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  teamInit: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  teamName: { color: '#FFF', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  vsContainer: { alignItems: 'center' },
  vsText: { color: '#FFF', fontSize: 32, fontWeight: '900', fontStyle: 'italic', opacity: 0.5 },
  sportBadge: { backgroundColor: '#E31B23', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 10 },
  sportText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  content: { padding: 20 },
  infoCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, marginBottom: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 25, gap: 15 },
  iconCircle: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  infoLabel: { fontSize: 11, fontWeight: '900', color: '#94A3B8', letterSpacing: 1, marginBottom: 4 },
  infoValue: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  actionBtn: { backgroundColor: '#002C61', borderRadius: 16, height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#002C61', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  actionBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
