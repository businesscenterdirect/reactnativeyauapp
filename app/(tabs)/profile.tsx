import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '../../src/context/UserContext';
import { signOut } from 'firebase/auth';
import { auth } from '../../src/services/firebase';
import { useState } from 'react';
import { TextInput } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../src/services/firebase';
import { GRADE_BANDS, SPORTS } from '../../src/services/registration';



export default function ProfileScreen() {
  const { user, loading, clearUser, setUser } = useUser();
  const insets = useSafeAreaInsets();
  
  const [isEditing, setIsEditing] = useState(false);
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [studentFirstName, setStudentFirstName] = useState(user?.students?.[0]?.firstName || '');
  const [studentLastName, setStudentLastName] = useState(user?.students?.[0]?.lastName || '');
  const [studentGrade, setStudentGrade] = useState(user?.students?.[0]?.grade || '');
  const [studentSport, setStudentSport] = useState(user?.students?.[0]?.sport || '');
  const [isUpdating, setIsUpdating] = useState(false);

  const [showGradePicker, setShowGradePicker] = useState(false);
  const [showSportPicker, setShowSportPicker] = useState(false);

  const handleSignOut = async () => {
    try { await signOut(auth); } catch (_) { }
    await clearUser();
    router.replace('/auth/login' as any);
  };

  const handleUpdateProfile = async () => {
    if (!user?.id) return;
    setIsUpdating(true);
    try {
      const updates: any = { phone, email };
      
      if (user.students && user.students.length > 0) {
        const updatedStudents = [...user.students];
        updatedStudents[0] = { 
          ...updatedStudents[0], 
          firstName: studentFirstName, 
          lastName: studentLastName,
          grade: studentGrade,
          sport: studentSport
        };
        updates.students = updatedStudents;
      }

      const memberRef = doc(db, 'members', user.id);
      await updateDoc(memberRef, updates);
      // No manual setUser needed - UserContext onSnapshot will catch it
      
      Alert.alert('Success', 'Profile updated successfully!');
      setIsEditing(false);
    } catch (e) {
      console.error('[Profile] Update error:', e);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#002C61" /></View>;
  }

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();

  const PickerModal = ({ visible, onClose, options, onSelect, title }: any) => (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}><MaterialIcons name="close" size={24} color="#64748B" /></TouchableOpacity>
          </View>
          <FlatList
            data={options}
            keyExtractor={item => item}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.optionItem}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text style={styles.optionText}>{item}</Text>
                <MaterialIcons name="chevron-right" size={20} color="#CBD5E1" />
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#001A3D', '#002C61']} style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <Image source={require('../../assets/images/logo1.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.headerTitle}>PROFILE</Text>
        </View>

        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
          <TouchableOpacity style={styles.editCircle} onPress={() => setIsEditing(!isEditing)}>
            <MaterialIcons name={isEditing ? 'close' : 'edit'} size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isEditing && (
          <View style={styles.editCard}>
            <Text style={styles.editTitle}>EDIT PROFILE</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PHONE NUMBER</Text>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone" keyboardType="phone-pad" />
            </View>

            {user?.students && user.students.length > 0 && (
              <>
                <Text style={[styles.editTitle, { marginTop: 10 }]}>EDIT ATHLETE INFO</Text>
                <View style={[styles.inlineInputs, { gap: 12 }]}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>FIRST NAME</Text>
                    <TextInput style={styles.input} value={studentFirstName} onChangeText={setStudentFirstName} placeholder="First Name" />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>LAST NAME</Text>
                    <TextInput style={styles.input} value={studentLastName} onChangeText={setStudentLastName} placeholder="Last Name" />
                  </View>
                </View>

                <View style={[styles.inlineInputs, { gap: 12 }]}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>GRADE</Text>
                    <TouchableOpacity style={styles.selector} onPress={() => setShowGradePicker(true)}>
                      <Text style={[styles.selectorText, !studentGrade && { color: '#94A3B8' }]}>
                        {studentGrade || 'Select Grade'}
                      </Text>
                      <MaterialIcons name="arrow-drop-down" size={24} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>SPORT</Text>
                    <TouchableOpacity style={styles.selector} onPress={() => setShowSportPicker(true)}>
                      <Text style={[styles.selectorText, !studentSport && { color: '#94A3B8' }]}>
                        {studentSport || 'Select Sport'}
                      </Text>
                      <MaterialIcons name="arrow-drop-down" size={24} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}

            <TouchableOpacity 
              style={[styles.saveBtn, isUpdating && { opacity: 0.7 }]} 
              onPress={handleUpdateProfile}
              disabled={isUpdating}
            >
              {isUpdating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>MY ATHLETES</Text>
        {user?.students?.length ? (
          user.students.map((student, i) => (
            <View key={i} style={styles.athleteCard}>
              <View style={styles.athleteIcon}><MaterialIcons name="person" size={24} color="#002C61" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.athleteName}>{student.firstName} {student.lastName}</Text>
                <Text style={styles.athleteDetails}>{student.school_name} • {student.grade}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 8 }}>
                <View style={styles.sportTag}><Text style={styles.sportTagText}>{student.sport}</Text></View>
                <TouchableOpacity 
                  onPress={() => {
                    Alert.alert('Delete Athlete', `Are you sure?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Delete', 
                        style: 'destructive',
                        onPress: async () => {
                          if (!user?.id) return;
                          const updatedStudents = user.students?.filter((_, idx) => idx !== i) || [];
                          try {
                            const memberRef = doc(db, 'members', user.id);
                            await updateDoc(memberRef, { students: updatedStudents });
                            // No manual setUser needed
                          } catch (e) { Alert.alert('Error', 'Failed to delete.'); }
                        }
                      }
                    ]);
                  }}
                  style={styles.deleteBtn}
                >
                  <MaterialIcons name="delete-outline" size={18} color="#E31B23" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}><Text style={styles.emptyText}>No athletes registered</Text></View>
        )}

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <MaterialIcons name="logout" size={20} color="#E31B23" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
        <Text style={styles.version}>Version 2.1.0 Premium</Text>
      </ScrollView>

      <PickerModal visible={showGradePicker} onClose={() => setShowGradePicker(false)} options={GRADE_BANDS.map(g => g.value)} onSelect={setStudentGrade} title="Select Grade" />
      <PickerModal visible={showSportPicker} onClose={() => setShowSportPicker(false)} options={SPORTS} onSelect={setStudentSport} title="Select Sport" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingBottom: 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, marginBottom: 30 },
  logo: { width: 32, height: 32 },
  headerTitle: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  userCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25, gap: 15 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  avatarText: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  userName: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  userEmail: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  sectionTitle: { fontSize: 11, fontWeight: '900', color: '#9CA3AF', marginBottom: 12, letterSpacing: 1 },
  athleteCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 20, padding: 15, marginBottom: 12, borderWidth: 1.5, borderColor: '#F3F4F6' },
  athleteIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  athleteName: { fontSize: 14, fontWeight: '900', color: '#111827', marginBottom: 2 },
  athleteDetails: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  sportTag: { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  sportTagText: { color: '#0047AB', fontSize: 10, fontWeight: '900' },
  emptyCard: { padding: 20, alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 20 },
  emptyText: { color: '#9CA3AF', fontSize: 13, fontWeight: '700' },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 30, paddingVertical: 15, borderRadius: 16, backgroundColor: '#FEF2F2' },
  signOutText: { color: '#E31B23', fontSize: 14, fontWeight: '900' },
  version: { textAlign: 'center', marginTop: 30, fontSize: 11, color: '#D1D5DB', fontWeight: '700' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  editCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  editCard: { backgroundColor: '#F8FAFC', padding: 20, borderRadius: 24, marginBottom: 25, borderWidth: 1.5, borderColor: '#EFF6FF' },
  editTitle: { fontSize: 11, fontWeight: '900', color: '#0047AB', marginBottom: 15, letterSpacing: 1 },
  inputGroup: { marginBottom: 15 },
  inlineInputs: { flexDirection: 'row', marginBottom: 15 },
  inputLabel: { fontSize: 11, fontWeight: '900', color: '#64748B', marginBottom: 8, letterSpacing: 0.5 },
  input: { backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, fontSize: 14, fontWeight: '700', color: '#1E293B' },
  selector: { backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectorText: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  saveBtn: { backgroundColor: '#002C61', borderRadius: 12, padding: 15, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  saveBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  deleteBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FEE2E2' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingBottom: 40, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 16, fontWeight: '900', color: '#1E293B' },
  optionItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  optionText: { fontSize: 15, fontWeight: '700', color: '#334155' },
});
