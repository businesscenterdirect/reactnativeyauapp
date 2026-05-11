import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScheduleStore } from '../../src/store/useScheduleStore';
import { Schedule } from '../../src/services/schedule';

export default function TeamDetailScreen() {
  const { name, gradeBand, sport, wins, draws, losses, points } = useLocalSearchParams<{
    name: string;
    gradeBand?: string;
    sport?: string;
    wins?: string;
    draws?: string;
    losses?: string;
    points?: string;
  }>();
  
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const schedules = useScheduleStore((state: any) => state.schedules);

  const getInitials = (teamName: string) => {
    return (teamName || '??').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Filter schedules for this team
  const teamMatches = schedules.filter((s: Schedule) => 
    s.team1Name === name || s.team2Name === name
  ).sort((a: Schedule, b: Schedule) => b.date.localeCompare(a.date));

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const renderMatchItem = ({ item }: { item: Schedule }) => {
    const isPast = item.date < todayStr;
    const isWinner = isPast && Math.random() > 0.5; // Placeholder logic for W/L until actual scores are in Firestore
    const isLoser = isPast && !isWinner;
    
    // In a real app, we'd compare item.team1Score and item.team2Score
    // For now, we'll show a W/L circle if it's in the past to match the mockup
    
    return (
      <View style={styles.matchRow}>
        <View style={styles.matchDateCol}>
          <Text style={styles.matchDate}>{item.date.split('-').reverse().slice(0,2).join('/')}/{item.date.slice(2,4)}</Text>
          <Text style={styles.matchTime}>{isPast ? 'FT' : item.time}</Text>
        </View>

        <View style={styles.matchInfoCol}>
          <Text style={[styles.matchTeamName, item.team1Name === name && styles.boldTeam]}>{item.team1Name}</Text>
          <Text style={[styles.matchTeamName, item.team2Name === name && styles.boldTeam]}>{item.team2Name}</Text>
        </View>

        <View style={styles.matchStatusCol}>
           {isPast ? (
             <View style={styles.scoreRow}>
               <View style={styles.scoreTextCol}>
                 <Text style={styles.scoreValue}>3</Text>
                 <Text style={styles.scoreValue}>0</Text>
               </View>
               <View style={[styles.statusCircle, isWinner ? styles.winCircle : styles.lossCircle]}>
                 <Text style={styles.statusChar}>{isWinner ? 'W' : 'L'}</Text>
               </View>
             </View>
           ) : (
             <View style={styles.scoreRow}>
               <View style={styles.scoreTextCol}>
                 <Text style={styles.scoreValue}>-</Text>
                 <Text style={styles.scoreValue}>-</Text>
               </View>
             </View>
           )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#001A3D', '#002C61']} style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="keyboard-arrow-left" size={32} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Team Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.teamHero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(name || '')}</Text>
          </View>
          <View style={styles.teamInfo}>
            <Text style={styles.teamNameText}>{name}</Text>
            <Text style={styles.teamGradeText}>{gradeBand}</Text>
          </View>
          <View style={styles.sportPill}>
            <Text style={styles.sportPillText}>{sport}</Text>
          </View>
        </View>
      </LinearGradient>

      <FlatList
        data={teamMatches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.scrollContent}
        ListHeaderComponent={() => (
          <>
            <Text style={styles.sectionTitle}>Standings Information</Text>
            <View style={styles.standingsCard}>
              <View style={styles.tableHeader}>
                <Text style={[styles.headCell, { width: 30 }]}>#</Text>
                <Text style={[styles.headCell, { flex: 2 }]}>Club</Text>
                <Text style={[styles.headCell, { flex: 1.5, textAlign: 'center' }]}>GB</Text>
                <Text style={[styles.headCell, { flex: 0.6, textAlign: 'center' }]}>W</Text>
                <Text style={[styles.headCell, { flex: 0.6, textAlign: 'center' }]}>D</Text>
                <Text style={[styles.headCell, { flex: 0.6, textAlign: 'center' }]}>L</Text>
                <Text style={[styles.headCell, { flex: 0.8, textAlign: 'center' }]}>Pts</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.rankText}>1</Text>
                <Text style={[styles.cellText, { flex: 2, fontWeight: '900' }]}>{name}</Text>
                <Text style={[styles.cellText, { flex: 1.5, textAlign: 'center', fontSize: 10 }]}>{gradeBand}</Text>
                <Text style={[styles.cellText, { flex: 0.6, textAlign: 'center', color: '#2563EB' }]}>{wins || 0}</Text>
                <Text style={[styles.cellText, { flex: 0.6, textAlign: 'center' }]}>{draws || 0}</Text>
                <Text style={[styles.cellText, { flex: 0.6, textAlign: 'center', color: '#DC2626' }]}>{losses || 0}</Text>
                <Text style={[styles.cellText, { flex: 0.8, textAlign: 'center', color: '#16A34A', fontWeight: '900' }]}>{points || 0}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Game Information</Text>
          </>
        )}
        renderItem={renderMatchItem}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="event-busy" size={60} color="#E2E8F0" />
            <Text style={styles.emptyText}>No Game information available for this team.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingBottom: 30 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, marginBottom: 20 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  teamHero: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  avatarText: { color: '#002C61', fontSize: 24, fontWeight: '900' },
  teamInfo: { flex: 1 },
  teamNameText: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  teamGradeText: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '600' },
  sportPill: { backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  sportPillText: { color: '#000', fontSize: 14, fontWeight: '700' },
  scrollContent: { padding: 20, paddingBottom: 50 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B', marginTop: 25, marginBottom: 15 },
  standingsCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 10, marginBottom: 10 },
  headCell: { fontSize: 12, fontWeight: '900', color: '#64748B' },
  tableRow: { flexDirection: 'row', alignItems: 'center' },
  rankText: { width: 30, fontSize: 14, fontWeight: '900', color: '#1E293B' },
  cellText: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  matchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  matchDateCol: { width: 80 },
  matchDate: { fontSize: 12, color: '#64748B', fontWeight: '700' },
  matchTime: { fontSize: 12, color: '#1E293B', fontWeight: '900', marginTop: 2 },
  matchInfoCol: { flex: 1, paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: '#E2E8F0' },
  matchTeamName: { fontSize: 16, color: '#64748B', fontWeight: '600', marginBottom: 2 },
  boldTeam: { color: '#1E293B', fontWeight: '900' },
  matchStatusCol: { width: 80, alignItems: 'flex-end' },
  scoreRow: { flexDirection: 'row', alignItems: 'center' },
  scoreTextCol: { marginRight: 10, alignItems: 'flex-end' },
  scoreValue: { fontSize: 14, fontWeight: '900', color: '#1E293B', marginBottom: 2 },
  statusCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  winCircle: { backgroundColor: '#22C55E' },
  lossCircle: { backgroundColor: '#EF4444' },
  statusChar: { color: '#FFF', fontSize: 14, fontWeight: '900' },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#94A3B8', fontSize: 14, textAlign: 'center', marginTop: 10 },
});
