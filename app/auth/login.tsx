import { MaterialIcons } from '@expo/vector-icons';
// import { LinearGradient } from 'expo-linear-gradient';
import { router, Link } from 'expo-router';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  Animated,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '../../src/context/UserContext';
import apiService from '../../src/services/api';
import { auth } from '../../src/services/firebase';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const { setUser } = useUser();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  const slides = [
    {
      title: 'WELCOME TO',
      highlight: 'YAU',
      subtitle: 'Log in or create an account to stay connected with your team.',
    },
    {
      title: 'STAY',
      highlight: 'UPDATED',
      subtitle: 'Get real-time schedules, standings, and messages from your coaches.',
    },
    {
      title: 'TRACK',
      highlight: 'PROGRESS',
      subtitle: 'Monitor your athlete\'s performance and growth throughout the season.',
    },
    {
      title: 'JOIN THE',
      highlight: 'COMMUNITY',
      subtitle: 'Experience the premium youth sports platform designed for excellence.',
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const storedEmail = await AsyncStorage.getItem('@yau_remember_email');
        const storedPassword = await AsyncStorage.getItem('@yau_remember_password');
        if (storedEmail && storedPassword) {
          setEmail(storedEmail);
          setPassword(storedPassword);
          setRememberMe(true);
        }
      } catch (e) {
        console.error('Failed to load credentials', e);
      }
    };
    loadCredentials();
  }, []);

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Enter Email', 'Please enter your email address first, then tap Forgot Password.');
      return;
    }
    if (!validateEmail(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    setForgotLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert('Reset Email Sent', `A password reset link has been sent to ${email.trim()}. Check your inbox (including spam).`);
    } catch (err: any) {
      const msg = err.code === 'auth/user-not-found'
        ? 'No account found with that email address.'
        : 'Unable to send reset email. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setForgotLoading(false);
    }
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Required Fields', 'Please enter both email and password.');
      return;
    }

    if (!validateEmail(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const firebaseUser = userCredential.user;

      try {
        const response = await apiService.getMemberByEmail(email.trim());
        const member = response.data;

        if (!member) {
          Alert.alert('Profile Not Found', 'We couldn\'t find a member profile associated with this account. Please contact support.');
          await auth.signOut();
          setLoading(false);
          return;
        }

        if (member.role && member.role !== 'parent' && member.role !== 'member' && member.role !== 'user') {
          Alert.alert('Unauthorized', "Only registered members and parents can access the mobile app.");
          await auth.signOut();
          setLoading(false);
          return;
        }

        await setUser(member);

        if (rememberMe) {
          await AsyncStorage.setItem('@yau_remember_email', email.trim());
          await AsyncStorage.setItem('@yau_remember_password', password);
        } else {
          await AsyncStorage.removeItem('@yau_remember_email');
          await AsyncStorage.removeItem('@yau_remember_password');
        }

        router.replace('/(tabs)');
      } catch (apiError: any) {
        console.error('[Login] API Error:', apiError);
        Alert.alert('System Error', 'Unable to retrieve your profile. Please try again later.');
        await auth.signOut();
      }
    } catch (authError: any) {
      let message = 'Invalid email or password.';
      switch (authError.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          message = 'Invalid email or password. Please try again.';
          break;
        case 'auth/too-many-requests':
          message = 'Too many failed login attempts. Please try again later.';
          break;
        case 'auth/network-request-failed':
          message = 'Network error. Please check your internet connection.';
          break;
      }
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const headerHeight = useRef(new Animated.Value(height * 0.5)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const showListener = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideListener = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showListener, (event) => {
      setKeyboardVisible(true);
      Animated.parallel([
        Animated.timing(headerHeight, {
          toValue: height * 0.22,
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
          toValue: height * 0.5,
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
        <View style={[styles.headerSection, { paddingTop: insets.top + (keyboardVisible ? 25 : 40) }]}>
          <Image
            source={require('../../assets/favicon.png')}
            style={[styles.logoIcon, keyboardVisible && { width: 40, height: 40, marginBottom: 5 }]}
            resizeMode="contain"
          />
          <Text style={[styles.yauText, keyboardVisible && { fontSize: 12, marginBottom: 5 }]}>YAU SPORTS</Text>

          <Animated.View style={[styles.welcomeContainer, { opacity: headerOpacity }]}>
            {!keyboardVisible && slides.map((slide, index) => (
              <View
                key={index}
                style={[
                  styles.slideWrapper,
                  { display: activeSlide === index ? 'flex' : 'none' }
                ]}
              >
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <Text style={styles.welcomeText}>{slide.title} </Text>
                  <Text style={[styles.welcomeText, styles.yauRed]}>{slide.highlight}</Text>
                </View>
                <Text style={styles.subTitleText}>{slide.subtitle}</Text>
              </View>
            ))}

            {!keyboardVisible && (
              <View style={styles.pagination}>
                {slides.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, activeSlide === i && styles.activeDot]}
                  />
                ))}
              </View>
            )}
          </Animated.View>
        </View>
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.cardContainer, { marginTop: keyboardVisible ? height * 0.2 : height * 0.44 }]}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, keyboardVisible && { paddingTop: 20 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formCard}>
            <View style={[styles.inputGroup, { marginTop: keyboardVisible ? 10 : 24 }]}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={{ marginTop: 16 }}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="*******"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <MaterialIcons name={showPassword ? 'visibility' : 'visibility-off'} size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.checkboxRow}
                activeOpacity={0.7}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[
                  styles.checkbox,
                  { alignItems: 'center', justifyContent: 'center' },
                  rememberMe && { backgroundColor: '#002C61', borderColor: '#002C61' }
                ]}>
                  {rememberMe && <MaterialIcons name="check" size={16} color="#fff" />}
                </View>
                <Text style={styles.rememberText}>Remember me</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={styles.forgotText}>Forgot Password ?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Log In</Text>}
            </TouchableOpacity>

            <View style={styles.signupPrompt}>
              <TouchableOpacity
                style={styles.signupBtn}
                onPress={() => {
                  console.log('Navigating to register...');
                  router.push('/auth/register');
                }}
              >
                <Text style={styles.noAccountText}>Don't have an Account ?</Text>
                <Text style={styles.signupBtnText}>Sign Up</Text>
              </TouchableOpacity>

            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  gradientBg: {
    height: height * 0.5,
    width: width,
    position: 'absolute',
    top: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16, 60, 117, 0.7)',
  },
  headerSection: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  logoIcon: {
    width: 55,
    height: 55,
    marginBottom: 10,
  },
  yauText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 20,
  },
  welcomeContainer: {
    alignItems: 'center',
    marginTop: 0,
  },
  welcomeText: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 40,
    textTransform: 'uppercase',
  },
  yauRed: { color: '#E31B23' },
  subTitleText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 15,
    lineHeight: 20,
    fontWeight: '500',
  },
  cardContainer: {
    flex: 1,
    marginTop: height * 0.44,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 80,
  },
  slideWrapper: {
    alignItems: 'center',
    width: width - 60,
  },
  pagination: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  activeDot: {
    backgroundColor: '#E31B23',
    width: 20,
  },
  formCard: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 58,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
  },
  eyeBtn: {
    padding: 8,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    marginRight: 8,
  },
  rememberText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  forgotText: {
    fontSize: 13,
    color: '#0047AB',
    fontWeight: '700',
  },
  loginBtn: {
    backgroundColor: '#002C61',
    borderRadius: 16,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#002C61',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  btnDisabled: { opacity: 0.7 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#F3F4F6',
  },
  orText: {
    marginHorizontal: 12,
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
  },
  signupPrompt: {
    alignItems: 'center',
    marginTop: 30,
  },
  noAccountText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  signupBtn: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  signupBtnText: {
    fontSize: 16,
    color: '#002C61',
    fontWeight: '700',
  },
});
