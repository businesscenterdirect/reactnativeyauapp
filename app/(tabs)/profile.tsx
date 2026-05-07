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
import { CountryPicker } from '../../src/components/CountryPicker';
import { countries, Country } from '../../src/constants/countries';
import { createAccountDeletionRequest } from '../../src/services/messaging';

// Phone masking
function formatPhoneDisplay(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)})-${d.slice(3)}`;
  return `(${d.slice(0, 3)})-${d.slice(3, 6)}-${d.slice(6)}`;
}



export default function ProfileScreen() {
  const { user, loading, clearUser, setUser } = useUser();
  const insets = useSafeAreaInsets();

  const [isEditing, setIsEditing] = useState(false);

  const initialPhone = user?.phone || '';
  const matchedCountry = countries.reduce((prev, curr) => {
    if (initialPhone.startsWith(curr.dialCode) && curr.dialCode.length > (prev?.dialCode?.length || 0)) {
      return curr;
    }
    return prev;
  }, { dialCode: '' } as Country);
  const defaultCountry = matchedCountry.dialCode ? matchedCountry : countries[0];
  const initialDigits = matchedCountry.dialCode ? initialPhone.slice(matchedCountry.dialCode.length) : initialPhone;

  const [selectedCountry, setSelectedCountry] = useState<Country>(defaultCountry);
  const [phoneDigits, setPhoneDigits] = useState(initialDigits);
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);

  const [email, setEmail] = useState(user?.email || '');
  const [studentFirstName, setStudentFirstName] = useState(user?.students?.[0]?.firstName || '');
  const [studentLastName, setStudentLastName] = useState(user?.students?.[0]?.lastName || '');
  const [studentGrade, setStudentGrade] = useState(user?.students?.[0]?.grade || '');
  const [studentSport, setStudentSport] = useState(user?.students?.[0]?.sport || '');
  const [isUpdating, setIsUpdating] = useState(false);

  const [showGradePicker, setShowGradePicker] = useState(false);
  const [showSportPicker, setShowSportPicker] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteDetails, setDeleteDetails] = useState('');

  const DELETION_REASONS = [
    'Accidentally created this account',
    'I already have another account',
    'I have left the program / no longer need it',
    'Not satisfied with the service',
    'Other'
  ];

  const handleSignOut = async () => {
    try { await signOut(auth); } catch (_) { }
    await clearUser();
    router.replace('/auth/login' as any);
  };

  const handleUpdateProfile = async () => {
    if (!user?.id) return;
    setIsUpdating(true);
    try {
      const updates: any = { phone: selectedCountry.dialCode + phoneDigits.replace(/\D/g, ''), email };

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

  const handleConfirmDelete = async () => {
    if (!user || !deleteReason) return;
    if (deleteReason === 'Other' && !deleteDetails.trim()) {
      Alert.alert('Required', 'Please provide more details for your reason.');
      return;
    }

    setIsDeletingAccount(true);
    try {
      await createAccountDeletionRequest(user, deleteReason, deleteDetails);
      setShowDeleteModal(false);
      Alert.alert(
        'Request Sent',
        'Your deletion request has been sent to the YAU team. We will process your request and contact you if needed.',
        [{ text: 'OK' }]
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to send request. Please try again.');
    } finally {
      setIsDeletingAccount(false);
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
          <View style={styles.logoContainer}>
            <Image source={require('../../assets/favicon.png')} style={styles.logo} resizeMode="contain" />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>PROFILE</Text>
          </View>
          <View style={styles.rightPlaceholder} />
        </View>

        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={[styles.editCircle, { backgroundColor: 'rgba(255,255,255,0.1)' }]} onPress={() => setShowDeleteModal(true)}>
              <MaterialIcons name="delete-forever" size={20} color="#E31B23" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.editCircle} onPress={() => setIsEditing(!isEditing)}>
              <MaterialIcons name={isEditing ? 'close' : 'edit'} size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
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
              <View style={styles.phoneInputWrapper}>
                <TouchableOpacity
                  style={styles.phonePrefix}
                  onPress={() => setIsCountryPickerOpen(true)}
                >
                  <Text style={{ fontSize: 16, marginRight: 4 }}>{selectedCountry.flag}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B' }}>{selectedCountry.dialCode}</Text>
                  <MaterialIcons name="keyboard-arrow-down" size={18} color="#64748B" style={{ marginLeft: 2 }} />
                </TouchableOpacity>
                <View style={styles.phoneDivider} />
                <TextInput 
                  style={styles.phoneInput} 
                  value={formatPhoneDisplay(phoneDigits)} 
                  onChangeText={(text) => setPhoneDigits(text.replace(/\D/g, '').slice(0, 10))} 
                  placeholder="Phone" 
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad" 
                />
              </View>
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

      <PickerModal visible={showSportPicker} onClose={() => setShowSportPicker(false)} options={SPORTS} onSelect={setStudentSport} title="Select Sport" />
      <CountryPicker visible={isCountryPickerOpen} onClose={() => setIsCountryPickerOpen(false)} onSelect={setSelectedCountry} />

      {/* Delete Account Modal */}
      <Modal visible={showDeleteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Delete Account</Text>
                <Text style={styles.modalSubtitle}>Please tell us why you want to leave</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDeleteModal(false)}>
                <MaterialIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }}>
              {DELETION_REASONS.map((reason) => (
                <TouchableOpacity 
                  key={reason} 
                  style={[styles.reasonOption, deleteReason === reason && styles.reasonOptionSelected]}
                  onPress={() => setDeleteReason(reason)}
                >
                  <View style={[styles.radio, deleteReason === reason && styles.radioSelected]}>
                    {deleteReason === reason && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[styles.reasonText, deleteReason === reason && styles.reasonTextSelected]}>{reason}</Text>
                </TouchableOpacity>
              ))}

              {deleteReason === 'Other' && (
                <View style={{ marginTop: 15 }}>
                  <Text style={styles.inputLabel}>PLEASE SPECIFY</Text>
                  <TextInput 
                    style={[styles.input, { height: 100, textAlignVertical: 'top' }]} 
                    placeholder="Tell us more..." 
                    multiline
                    value={deleteDetails}
                    onChangeText={setDeleteDetails}
                  />
                </View>
              )}

              <TouchableOpacity 
                style={[styles.confirmDeleteBtn, (!deleteReason || isDeletingAccount) && { opacity: 0.5 }]}
                onPress={handleConfirmDelete}
                disabled={!deleteReason || isDeletingAccount}
              >
                {isDeletingAccount ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.confirmDeleteText}>Submit Deletion Request</Text>
                )}
              </TouchableOpacity>
              
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingBottom: 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 25 },
  logoContainer: { flex: 1, alignItems: 'flex-start' },
  logo: { width: 40, height: 40 },
  titleContainer: { flex: 2, alignItems: 'center' },
  rightPlaceholder: { flex: 1 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 1.5 },
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
  phoneInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, minHeight: 46 },
  phonePrefix: { flexDirection: 'row', alignItems: 'center' },
  phoneDivider: { width: 1, height: 24, backgroundColor: '#E2E8F0', marginHorizontal: 8 },
  phoneInput: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1E293B', padding: 0 },
  selector: { backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectorText: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  saveBtn: { backgroundColor: '#002C61', borderRadius: 12, padding: 15, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  saveBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  deleteBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FEE2E2' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingBottom: 0, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  modalSubtitle: { fontSize: 13, color: '#64748B', fontWeight: '500', marginTop: 2 },
  reasonOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, backgroundColor: '#F8FAFC', marginBottom: 10, borderWidth: 1.5, borderColor: 'transparent' },
  reasonOptionSelected: { borderColor: '#002C61', backgroundColor: '#F0F9FF' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  radioSelected: { borderColor: '#002C61' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#002C61' },
  reasonText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  reasonTextSelected: { color: '#1E293B', fontWeight: '800' },
  confirmDeleteBtn: { backgroundColor: '#E31B23', borderRadius: 16, padding: 18, alignItems: 'center', justifyContent: 'center', marginTop: 20, shadowColor: '#E31B23', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  confirmDeleteText: { color: '#FFF', fontSize: 15, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  optionItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  optionText: { fontSize: 15, fontWeight: '700', color: '#334155' },
});
