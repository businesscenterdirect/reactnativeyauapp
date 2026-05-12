import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppInput from '../../src/components/AppInput';
import { CountryPicker } from '../../src/components/CountryPicker';
import { countries, Country } from '../../src/constants/countries';
import { useUser } from '../../src/context/UserContext';
import { registerForPushNotificationsAsync } from '../../src/services/notifications';
import { GRADE_BANDS, registerMember, SPORTS } from '../../src/services/registration';
import { School, subscribeToSchools } from '../../src/services/schools';
import { auth } from '../../src/services/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Member } from '../../src/types';

const { width, height } = Dimensions.get('window');

// Grade bands and sports are imported from services/registration.ts

// ─── Phone masking ─────────────────────────────────────────────────────────────
function formatPhoneDisplay(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)})-${d.slice(3)}`;
  return `(${d.slice(0, 3)})-${d.slice(3, 6)}-${d.slice(6)}`;
}

// ─── Terms & Conditions text ───────────────────────────────────────────────────
const TERMS_TEXT = `Youth Athlete University (YAU) Terms of Service...`; // Truncated for brevity, normally full text

interface StudentForm {
  firstName: string;
  lastName: string;
  gradeBand: string;
  schoolName: string;
  sports: string[];
  errors?: Record<string, string>;
}

function emptyStudent(): StudentForm {
  return { firstName: '', lastName: '', gradeBand: '', schoolName: '', sports: [], errors: {} };
}

export default function RegisterScreen() {
  const { setUser } = useUser();
  const insets = useSafeAreaInsets();

  // Scroll + keyboard refs
  const scrollRef = useRef<ScrollView>(null);
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);

  // Parent fields
  const [parentFirstName, setParentFirstName] = useState('');
  const [parentLastName, setParentLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');

  // Consent/T&C
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Modals
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0]); // Default to US
  const [modalStudentIndex, setModalStudentIndex] = useState<number | null>(null);

  const [schools, setSchools] = useState<School[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [students, setStudents] = useState<StudentForm[]>([emptyStudent()]);

  const goToStep2 = () => {
    Keyboard.dismiss();
    setStep(2);
    // Scroll to top of form when moving to step 2
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }, 100);
  };

  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const headerHeight = useRef(new Animated.Value(height * 0.45)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const showListener = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideListener = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showListener, () => {
      setKeyboardVisible(true);
      Animated.parallel([
        Animated.timing(headerHeight, {
          toValue: height * 0.2,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(headerOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        })
      ]).start();
    });

    const hideSub = Keyboard.addListener(hideListener, () => {
      setKeyboardVisible(false);
      Animated.parallel([
        Animated.timing(headerHeight, {
          toValue: height * 0.45,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        })
      ]).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    const unsub = subscribeToSchools((s) => { setSchools(s); setSchoolsLoading(false); });
    registerForPushNotificationsAsync().then(t => { if (t) setPushToken(t); });
    return () => unsub();
  }, []);

  useEffect(() => {
    console.log('Selected Country updated:', selectedCountry);
  }, [selectedCountry]);

  const handlePhoneChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 10);
    setPhoneDigits(digits);
  };

  const updateStudent = (index: number, patch: Partial<StudentForm>) => {
    setStudents(prev => prev.map((s, i) => i === index ? { ...s, ...patch, errors: { ...s.errors, ...Object.fromEntries(Object.keys(patch).map(k => [k, ''])) } } : s));
  };

  const toggleSport = (index: number, sport: string) => {
    setStudents(prev => prev.map((s, i) => {
      if (i !== index) return s;
      const has = s.sports.includes(sport);
      return { ...s, sports: has ? s.sports.filter(sp => sp !== sport) : [...s.sports, sport] };
    }));
  };
  const handleRegister = async () => {
    setLoading(true);
    try {
      const result = await registerMember({
        parentFirstName: parentFirstName.trim(),
        parentLastName: parentLastName.trim(),
        email: email.trim(),
        password,
        phone: selectedCountry.dialCode + phoneDigits, // Use dial code
        sport: students[0]?.sports?.[0] || '',
        membershipType: 'free',
        smsConsent,
        students: students.map(s => ({
          firstName: s.firstName.trim(),
          lastName: s.lastName.trim(),
          gradeBand: s.gradeBand,
          schoolName: s.schoolName,
          sports: s.sports,
          ageGroup: GRADE_BANDS.find(g => g.value === s.gradeBand)?.band || 'Band 1',
        })),
        expoPushTokens: pushToken ? [pushToken] : undefined,
      });

      if (result.success) {
        const studentData = students.map(s => ({
          firstName: s.firstName.trim(),
          lastName: s.lastName.trim(),
          grade: s.gradeBand,
          school_name: s.schoolName,
          sports: s.sports,
        }));

        await setUser({
          id: result.memberId,
          firstName: parentFirstName.trim(),
          lastName: parentLastName.trim(),
          email: email.trim(),
          phone: selectedCountry.dialCode + phoneDigits,
          students: studentData,
        } as any);

        // Sign in to Firebase Auth so the auth listener in UserContext is satisfied
        try {
          await signInWithEmailAndPassword(auth, email.trim(), password);
        } catch (signInErr) {
          console.error('Sign in after registration failed:', signInErr);
        }

        Alert.alert(
          'Welcome to YAU! 🏆',
          'Registration complete!',
          [{ text: 'Get Started', onPress: () => router.replace('/(tabs)/' as any) }]
        );
      } else {
        let errorMsg = result.error || 'Registration failed';
        if (errorMsg.includes('auth/email-already-in-use') || errorMsg.includes('already exists')) {
          errorMsg = 'This email is already registered. Please use a different email or log in.';
        }
        Alert.alert('Registration Failed', errorMsg);
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const isStep1Valid = () => {
    const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
    return (
      parentFirstName.trim().length > 0 &&
      parentLastName.trim().length > 0 &&
      validateEmail(email.trim()) &&
      password.length >= 8 &&
      password === confirmPassword &&
      phoneDigits.length >= 10
    );
  };

  const isStep2Valid = () => {
    return students.every(s =>
      s.firstName.trim().length > 0 &&
      s.lastName.trim().length > 0 &&
      s.gradeBand.length > 0 &&
      s.schoolName.trim().length > 0
    ) && termsAccepted;
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../assets/images/background.png')}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      >
        <View style={[styles.overlay, { backgroundColor: 'rgba(0, 26, 61, 0.85)' }]} pointerEvents="none" />
      </ImageBackground>

      <Animated.View 
        style={{ height: headerHeight, width: '100%', position: 'absolute', top: 0, zIndex: 1 }}
        pointerEvents="box-none"
      >
        <View style={[styles.headerSection, { paddingTop: insets.top + (keyboardVisible ? 10 : 40) }]}>
          <Image source={require('../../assets/favicon.png')} style={[styles.logoIcon, keyboardVisible && { width: 40, height: 40, marginBottom: 5 }]} resizeMode="contain" />
          <Text style={[styles.yauHeaderText, keyboardVisible && { fontSize: 10 }]}>YOUTH ATHLETE UNIVERSITY</Text>
          <Animated.View style={{ opacity: headerOpacity, alignItems: 'center' }}>
            {!keyboardVisible && <Text style={styles.mainTitle}>Create Your Account</Text>}
            {!keyboardVisible && <Text style={styles.subTitle}>Let’s get started with your information</Text>}
          </Animated.View>
        </View>
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        style={[styles.cardContainer, { marginTop: keyboardVisible ? height * 0.15 : height * 0.45 }]}
      >
        {/* Progress Indicator */}
        <View style={styles.progressWrapper}>
          <Text style={styles.stepText}>STEP {step} OF 2</Text>
          <View style={styles.stepIndicator}>
            <View style={[styles.stepCircle, step >= 1 && styles.stepCircleActive]}>
              <Text style={[styles.stepNum, step >= 1 && styles.stepNumActive]}>01</Text>
            </View>
            <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
            <View style={[styles.stepCircle, step >= 2 && styles.stepCircleActive]}>
              <Text style={[styles.stepNum, step >= 2 && styles.stepNumActive]}>02</Text>
            </View>
          </View>
        </View>

        <ScrollView 
          ref={scrollRef} 
          contentContainerStyle={[styles.scrollContent, { paddingBottom: keyboardVisible ? 80 : 40 }]} 
          keyboardShouldPersistTaps="handled"
        >
          <View>
            <Text style={styles.sectionTitle}>{step === 1 ? 'Parent Information' : 'Child Information'}</Text>

            {step === 1 ? (
              <View>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>First Name</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        placeholder="First Name"
                        placeholderTextColor="#9CA3AF"
                        value={parentFirstName}
                        onChangeText={setParentFirstName}
                        returnKeyType="next"
                        onSubmitEditing={() => lastNameRef.current?.focus()}
                        blurOnSubmit={false}
                      />
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Last Name</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        ref={lastNameRef}
                        style={styles.input}
                        placeholder="Last Name"
                        placeholderTextColor="#9CA3AF"
                        value={parentLastName}
                        onChangeText={setParentLastName}
                        returnKeyType="next"
                        onSubmitEditing={() => emailRef.current?.focus()}
                        blurOnSubmit={false}
                      />
                    </View>
                  </View>
                </View>

                <Text style={styles.inputLabel}>Email</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={emailRef}
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => phoneRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                </View>

                <Text style={styles.inputLabel}>Phone Number</Text>
                <View style={styles.inputWrapper}>
                  <TouchableOpacity
                    style={styles.phonePrefix}
                    onPress={() => setIsCountryPickerOpen(true)}
                  >
                    <Text style={{ fontSize: 18, marginRight: 4 }}>{selectedCountry.flag}</Text>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>{selectedCountry.dialCode}</Text>
                    <MaterialIcons name="keyboard-arrow-down" size={18} color="#6B7280" style={{ marginLeft: 2 }} />
                  </TouchableOpacity>
                  <View style={styles.phoneDivider} />
                  <TextInput
                    ref={phoneRef}
                    style={styles.input}
                    placeholder="Phone Number"
                    placeholderTextColor="#9CA3AF"
                    value={formatPhoneDisplay(phoneDigits)}
                    onChangeText={handlePhoneChange}
                    keyboardType="phone-pad"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                </View>

                <Text style={styles.inputLabel}>Create Password</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={passwordRef}
                    style={styles.input}
                    placeholder="Create Password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    <MaterialIcons name={showPassword ? 'visibility' : 'visibility-off'} size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.hintText, password.length > 0 && password.length < 8 && { color: '#EF4444', fontWeight: '700' }]}>
                  Must be at least 8 characters
                </Text>

                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={confirmPasswordRef}
                    style={styles.input}
                    placeholder="Confirm Password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                    <MaterialIcons name={showConfirmPassword ? 'visibility' : 'visibility-off'} size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                {confirmPassword.length > 0 && password !== confirmPassword && (
                  <Text style={styles.errorText}>Passwords do not match</Text>
                )}

                <TouchableOpacity
                  style={[styles.primaryBtn, !isStep1Valid() && styles.btnDisabled]}
                  onPress={goToStep2}
                  disabled={!isStep1Valid()}
                >
                  <Text style={styles.primaryBtnText}>Continue</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                {students.map((student, idx) => (
                  <View key={idx}>
                    <View style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Child First Name</Text>
                        <View style={styles.inputWrapper}>
                          <TextInput
                            style={styles.input}
                            placeholder="Child First Name"
                            placeholderTextColor="#9CA3AF"
                            value={student.firstName}
                            onChangeText={v => updateStudent(idx, { firstName: v })}
                          />
                        </View>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Child Last Name</Text>
                        <View style={styles.inputWrapper}>
                          <TextInput
                            style={styles.input}
                            placeholder="Child Last Name"
                            placeholderTextColor="#9CA3AF"
                            value={student.lastName}
                            onChangeText={v => updateStudent(idx, { lastName: v })}
                          />
                        </View>
                      </View>
                    </View>

                    <Text style={styles.inputLabel}>School</Text>
                    <TouchableOpacity style={styles.inputWrapper} onPress={() => { setModalStudentIndex(idx); setIsSchoolModalOpen(true); }}>
                      <Text style={[styles.inputValue, !student.schoolName && styles.placeholderText]}>{student.schoolName || 'Select School'}</Text>
                      <MaterialIcons name="keyboard-arrow-down" size={20} color="#9CA3AF" />
                    </TouchableOpacity>

                    <Text style={styles.inputLabel}>Grade Band</Text>
                    <TouchableOpacity style={styles.inputWrapper} onPress={() => { setModalStudentIndex(idx); setIsGradeModalOpen(true); }}>
                      <Text style={[styles.inputValue, !student.gradeBand && styles.placeholderText]}>{student.gradeBand || 'Select Grade Band'}</Text>
                      <MaterialIcons name="keyboard-arrow-down" size={20} color="#9CA3AF" />
                    </TouchableOpacity>

                    <Text style={styles.inputLabel}>Select one or multiple sports</Text>
                    <View style={styles.chipsRow}>
                      {SPORTS.map(sport => (
                        <TouchableOpacity
                          key={sport}
                          style={[styles.chip, student.sports.includes(sport) && styles.chipSel]}
                          onPress={() => toggleSport(idx, sport)}
                        >
                          <Text style={[styles.chipText, student.sports.includes(sport) && styles.chipTextSel]}>{sport}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.addChildBtn}
                  onPress={() => setStudents(prev => [...prev, emptyStudent()])}
                >
                  <MaterialIcons name="add-circle-outline" size={20} color="#0047AB" />
                  <Text style={styles.addChildText}>Add Another Child</Text>
                </TouchableOpacity>

                <View style={styles.termsRow}>
                  <TouchableOpacity
                    style={[styles.checkbox, smsConsent && styles.checkboxChecked]}
                    onPress={() => setSmsConsent(!smsConsent)}
                  >
                    {smsConsent && <MaterialIcons name="check" size={14} color="#FFF" />}
                  </TouchableOpacity>
                  <Text style={styles.termsText}>
                    I agree to receive text messages from YAU. Message and data rates may apply. Reply STOP to opt out or HELP for help. View our <Text onPress={() => Linking.openURL('https://youthathleteuniversity.org/privacypolicy/')} style={styles.linkText}>Privacy Policy</Text> and <Text onPress={() => Linking.openURL('https://youthathleteuniversity.org/terms')} style={styles.linkText}>Terms of Use</Text>.
                  </Text>
                </View>

                <View style={styles.termsRow}>
                  <TouchableOpacity
                    style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}
                    onPress={() => setTermsAccepted(!termsAccepted)}
                  >
                    {termsAccepted && <MaterialIcons name="check" size={14} color="#FFF" />}
                  </TouchableOpacity>
                  <Text style={styles.termsText}>
                    I agree to the <Text onPress={() => Linking.openURL('https://youthathleteuniversity.org/terms')} style={styles.linkText}>Terms of Service</Text> and <Text onPress={() => Linking.openURL('https://youthathleteuniversity.org/privacypolicy/')} style={styles.linkText}>Privacy Policy</Text>
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, (!isStep2Valid() || loading) && styles.btnDisabled]}
                  onPress={() => { Keyboard.dismiss(); handleRegister(); }}
                  disabled={!isStep2Valid() || loading}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Create Account</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
                  <MaterialIcons name="arrow-back" size={20} color="#6B7280" />
                  <Text style={styles.backBtnText}>Back</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/auth/login' as any)}><Text style={styles.loginLink}>Log In</Text></TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Re-use existing Modals (Grade, School) from legacy code */}
      <Modal visible={isGradeModalOpen} transparent animationType="slide">
        <View style={styles.modalBg}><View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Grade Band</Text>
          <FlatList data={GRADE_BANDS} keyExtractor={i => i.value} renderItem={({ item }) => (
            <TouchableOpacity style={styles.modalItem} onPress={() => { updateStudent(modalStudentIndex!, { gradeBand: item.value }); setIsGradeModalOpen(false); }}>
              <Text style={styles.modalItemText}>{item.label}</Text>
            </TouchableOpacity>
          )} />
          <TouchableOpacity onPress={() => setIsGradeModalOpen(false)}><Text style={styles.closeModal}>Close</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <Modal visible={isSchoolModalOpen} transparent animationType="slide">
        <View style={styles.modalBg}><View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select School</Text>
          <FlatList data={schools} keyExtractor={i => i.id!} renderItem={({ item }) => (
            <TouchableOpacity style={styles.modalItem} onPress={() => { updateStudent(modalStudentIndex!, { schoolName: item.name }); setIsSchoolModalOpen(false); }}>
              <Text style={styles.modalItemText}>{item.name}</Text>
            </TouchableOpacity>
          )} />
          <TouchableOpacity onPress={() => setIsSchoolModalOpen(false)}><Text style={styles.closeModal}>Close</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <Modal visible={isTermsModalOpen} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Terms & Privacy Policy</Text>
              <TouchableOpacity onPress={() => setIsTermsModalOpen(false)}><MaterialIcons name="close" size={24} color="#9CA3AF" /></TouchableOpacity>
            </View>
            <ScrollView style={{ marginTop: 10 }}>
              <Text style={styles.termsContentText}>{TERMS_TEXT}</Text>
            </ScrollView>
            <TouchableOpacity
              style={[styles.primaryBtn, { marginTop: 20 }]}
              onPress={() => { setTermsAccepted(true); setIsTermsModalOpen(false); }}
            >
              <Text style={styles.primaryBtnText}>Accept & Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <CountryPicker
        visible={isCountryPickerOpen}
        onClose={() => setIsCountryPickerOpen(false)}
        onSelect={setSelectedCountry}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  gradientBg: { height: height * 0.45, width: width, position: 'absolute', top: 0 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16, 60, 117, 0.7)',
  },
  headerSection: { alignItems: 'center', paddingHorizontal: 30 },
  logoIcon: { width: 55, height: 55, marginBottom: 10 },
  yauHeaderText: { color: '#FFF', fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },
  mainTitle: { color: '#FFF', fontSize: 32, fontWeight: '900', marginTop: 12, textAlign: 'center' },
  subTitle: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 6, textAlign: 'center' },
  cardContainer: {
    flex: 1,
    marginTop: height * 0.38,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  progressWrapper: { alignItems: 'center', marginTop: 20 },
  stepIndicator: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  stepCircleActive: { backgroundColor: '#0047AB', borderColor: '#0047AB' },
  stepNum: { color: '#9CA3AF', fontSize: 14, fontWeight: '800' },
  stepNumActive: { color: '#FFFFFF' },
  stepLine: { width: 50, height: 2, backgroundColor: '#E5E7EB', marginHorizontal: 0 },
  stepLineActive: { backgroundColor: '#0047AB' },
  stepText: { fontSize: 13, fontWeight: '800', color: '#0047AB', marginBottom: 12, textTransform: 'uppercase' },
  scrollContent: { paddingHorizontal: 24, paddingTop: 80, paddingBottom: 60 },
  sectionTitle: { fontSize: 22, fontWeight: '900', color: '#111827', textAlign: 'center', marginBottom: 20 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  inputLabel: { fontSize: 13, color: '#4B5563', fontWeight: '700', marginBottom: 8, marginTop: 16, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#F3F4F6', borderRadius: 16, paddingHorizontal: 16, height: 58 },
  input: { flex: 1, height: '100%', fontSize: 15, color: '#111827', fontWeight: '600' },
  inputValue: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '600' },
  placeholderText: { color: '#9CA3AF' },
  phonePrefix: { flexDirection: 'row', alignItems: 'center' },
  phoneDivider: { width: 1, height: 24, backgroundColor: '#E5E7EB', marginHorizontal: 12 },
  eyeBtn: { padding: 8 },
  hintText: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  primaryBtn: { backgroundColor: '#002C61', borderRadius: 16, height: 58, alignItems: 'center', justifyContent: 'center', marginTop: 30, shadowColor: '#002C61', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, gap: 8 },
  backBtnText: { color: '#6B7280', fontSize: 15, fontWeight: '700' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#F3F4F6' },
  chipSel: { borderColor: '#0047AB', backgroundColor: '#EFF6FF' },
  chipText: { fontSize: 12, color: '#6B7280', fontWeight: '700' },
  chipTextSel: { color: '#0047AB' },
  addChildBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 58,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#0047AB',
    marginTop: 16,
    backgroundColor: '#F0F7FF',
  },
  addChildText: {
    color: '#0047AB',
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 8,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 24,
    marginBottom: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#0047AB',
    borderColor: '#0047AB',
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  linkText: {
    color: '#0047AB',
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    marginLeft: 4,
  },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: '#6B7280', fontSize: 14 },
  loginLink: { color: '#0047AB', fontWeight: '800', fontSize: 14 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  modalItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalItemText: { fontSize: 15, fontWeight: '600' },
  closeModal: { textAlign: 'center', color: '#0047AB', fontWeight: '800', marginTop: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  termsContentText: { fontSize: 13, color: '#4B5563', lineHeight: 20 },
});
