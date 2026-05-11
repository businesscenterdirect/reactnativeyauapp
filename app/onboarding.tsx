import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// Common Logo Component
const LogoHeader = ({ insets }: { insets: any }) => (
  <View style={[styles.logoContainer, { paddingTop: insets.top + 20, zIndex: 1000 }]}>
    <Image
      source={require('../assets/images/icon.png')}
      style={styles.logoIcon}
      resizeMode="contain"
    />
    <Text style={styles.yauText}>YOUTH ATHLETE UNIVERSITY</Text>
  </View>
);

// Interactive Pagination Component (The "Real Toggle")
const Pagination = ({ currentIndex, total, onSelect }: { currentIndex: number, total: number, onSelect: (index: number) => void }) => {
  return (
    <View style={styles.paginationRow}>
      {Array.from({ length: total }).map((_, i) => (
        <TouchableOpacity
          key={i}
          onPress={() => onSelect(i)}
          activeOpacity={0.7}
          style={[
            styles.dot,
            currentIndex === i && {
              backgroundColor: '#E31B23', // Active color
              width: 14,
              height: 14,
              borderRadius: 7,
            }
          ]}
        />
      ))}
    </View>
  );
};

// --- SPLASH 1 ---
const Splash1 = ({ onGetStarted, onSelect, insets, currentIndex }: any) => {
  return (
    <View style={styles.slide}>
      <View style={[styles.topSection, { zIndex: 30, overflow: 'visible' }]} pointerEvents="box-none">
        <LogoHeader insets={insets} />
        <View style={[styles.athleteContainer, { zIndex: 40, overflow: 'visible' }]} pointerEvents="none">
          <Image
            source={require('../assets/images/onboarding/brush_blue.png')}
            style={styles.splash1Brush1}
            resizeMode="contain"
          />
          <Image
            source={require('../assets/images/onboarding/brush_blue_2.png')}
            style={styles.splash1Brush2}
            resizeMode="contain"
          />
          <Image
            source={require('../assets/images/onboarding/brush_blue_3.png')}
            style={styles.splash1Brush3}
            resizeMode="contain"
          />
          <Image
            source={require('../assets/images/onboarding/athlete1.png')}
            style={styles.athleteImage1}
            resizeMode="contain"
          />
        </View>
      </View>
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.textSection}>
          <Text style={styles.titleText}>NEVER MISS</Text>
          <Text style={[styles.highlightText, { color: '#E31B23' }]}>A BEAT</Text>
          <Text style={styles.subtitleText}>From practice times to last-minute updates, everything your team shares stays clear</Text>
          <Pagination currentIndex={currentIndex} total={4} onSelect={onSelect} />
        </View>
        <TouchableOpacity style={styles.getStartedButton} onPress={onGetStarted}>
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// --- SPLASH 2 ---
const Splash2 = ({ onGetStarted, onSelect, insets, currentIndex }: any) => {
  return (
    <View style={styles.slide}>
      <View style={[styles.topSection, { zIndex: 30, overflow: 'visible' }]} pointerEvents="box-none">
        <LogoHeader insets={insets} />
        <View style={[styles.athleteContainer, { zIndex: 40, overflow: 'visible' }]} pointerEvents="none">
          <Image
            source={require('../assets/images/onboarding/brush_red.png')}
            style={styles.splash2Brush1}
            resizeMode="contain"
          />
          <Image
            source={require('../assets/images/onboarding/brush_red_2.png')}
            style={styles.splash2Brush2}
            resizeMode="contain"
          />
          <Image
            source={require('../assets/images/onboarding/athlete2.png')}
            style={styles.athleteImage2}
            resizeMode="contain"
          />
        </View>
      </View>
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.textSection}>
          <Text style={styles.titleText}>NEVER MISS A</Text>
          <Text style={[styles.highlightText, { color: '#E31B23' }]}>GAME MOMENT</Text>
          <Text style={styles.subtitleText}>See schedules, get team updates, and follow standings without switching between apps</Text>
          <Pagination currentIndex={currentIndex} total={4} onSelect={onSelect} />
        </View>
        <TouchableOpacity style={styles.getStartedButton} onPress={onGetStarted}>
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// --- SPLASH 3 ---
const Splash3 = ({ onGetStarted, onSelect, insets, currentIndex }: any) => {
  return (
    <View style={styles.slide}>
      <View style={[styles.topSection, { zIndex: 30, overflow: 'visible' }]} pointerEvents="box-none">
        <LogoHeader insets={insets} />
        <View style={[styles.athleteContainer, { zIndex: 40, overflow: 'visible' }]} pointerEvents="none">
          <Image
            source={require('../assets/images/onboarding/brush_blue.png')}
            style={styles.splash3Brush1}
            resizeMode="contain"
          />
          <Image
            source={require('../assets/images/onboarding/brush_blue.png')}
            style={styles.splash3Brush2}
            resizeMode="contain"
          />
          <Image
            source={require('../assets/images/onboarding/athlete3.png')}
            style={styles.athleteImage3}
            resizeMode="contain"
          />
        </View>
      </View>
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.textSection}>
          <Text style={styles.titleText}>TRACK EVERY</Text>
          <Text style={[styles.highlightText, { color: '#E31B23' }]}>STANDING</Text>
          <Text style={styles.subtitleText}>Follow game results and performance updates with clear and easy-to-understand information</Text>
          <Pagination currentIndex={currentIndex} total={4} onSelect={onSelect} />
        </View>
        <TouchableOpacity style={styles.getStartedButton} onPress={onGetStarted}>
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// --- SPLASH 4 ---
const Splash4 = ({ onGetStarted, onSelect, insets, currentIndex }: any) => {
  return (
    <View style={styles.slide}>
      <View style={[styles.topSection, { zIndex: 30, overflow: 'visible' }]} pointerEvents="box-none">
        <LogoHeader insets={insets} />
        <View style={[styles.athleteContainer, { zIndex: 40, overflow: 'visible' }]} pointerEvents="none">
          <Image
            source={require('../assets/images/onboarding/20.png')}
            style={styles.splash4Brush1}
            resizeMode="contain"
          />
          <Image
            source={require('../assets/images/onboarding/19.png')}
            style={styles.splash4Brush2}
            resizeMode="contain"
          />
          <Image
            source={require('../assets/images/onboarding/athlete4.png')}
            style={styles.athleteImage4}
            resizeMode="contain"
          />
          <Image
            source={require('../assets/images/onboarding/logo_thigh.png')}
            style={styles.splash4ThighLogo}
            resizeMode="contain"
          />
          <Image
            source={require('../assets/images/onboarding/logo_chest.png')}
            style={styles.splash4ChestLogo}
            resizeMode="contain"
          />
        </View>
      </View>
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.textSection}>
          <Text style={styles.titleText}>STAY CONNECTED</Text>
          <Text style={[styles.highlightText, { color: '#E31B23' }]}>TO YOUR TEAM</Text>
          <Text style={styles.subtitleText}>Get real-time schedules, team messages, and track standings.</Text>
          <Pagination currentIndex={currentIndex} total={4} onSelect={onSelect} />
        </View>
        <TouchableOpacity style={styles.getStartedButton} onPress={onGetStarted}>
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      const nextIndex = (currentIndex + 1) % 4;
      goToIndex(nextIndex);
    }, 5000);
    return () => clearInterval(timer);
  }, [currentIndex]);

  const goToIndex = (index: number) => {
    if (index === currentIndex) return;

    // Fade out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      setCurrentIndex(index);
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleNext = () => {
    if (currentIndex < 3) {
      goToIndex(currentIndex + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      goToIndex(currentIndex - 1);
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('HAS_SEEN_ONBOARDING', 'true');
      router.replace('/auth/login' as any);
    } catch (error) {
      console.error('Error saving onboarding state:', error);
      router.replace('/auth/login' as any);
    }
  };

  const renderSplash = () => {
    const props = {
      onGetStarted: completeOnboarding,
      onSelect: goToIndex,
      insets: insets,
      currentIndex: currentIndex
    };

    switch (currentIndex) {
      case 0: return <Splash1 {...props} />;
      case 1: return <Splash2 {...props} />;
      case 2: return <Splash3 {...props} />;
      case 3: return <Splash4 {...props} />;
      default: return null;
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {renderSplash()}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  slide: {
    width,
    height,
    backgroundColor: '#FFF',
  },
  topSection: {
    height: height * 0.6,
    width: '100%',
    alignItems: 'center',
    zIndex: 10,
  },
  logoContainer: {
    alignItems: 'center',
    width: '100%',
    zIndex: 10,
  },
  logoIcon: {
    width: 80,
    height: 80,
  },
  yauText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#002C61',
    marginTop: 15,
    letterSpacing: 0.5,
  },
  skipButton: {
    position: 'absolute',
    right: 20,
    padding: 10,
    zIndex: 100,
  },
  skipButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#E31B23',
    letterSpacing: 1.5,
  },
  athleteContainer: {
    position: 'absolute',
    top: height * 0.25,
    width: '100%',
    height: height * 0.45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brushStroke: {
    position: 'absolute',
    width: width * 1.5,
    height: height * 0.35,
    opacity: 0.8,
    zIndex: 5, // Lower than text
  },
  // --- Splash 1 Brushes ---
  splash1Brush1: {
    position: 'absolute',
    width: width * 1.5,
    height: height * 0.35,
    opacity: 0.8,
    top: '-15%',
    left: '-55%',
    transform: [{ scale: 0.35 }]
  },
  splash1Brush2: {
    position: 'absolute',
    width: width * 1.5,
    height: height * 0.35,
    opacity: 0.8,
    top: '10%',
    left: '-30%',
    transform: [{ scale: 0.4 }]
  },
  splash1Brush3: {
    position: 'absolute',
    width: width * 1.5,
    height: height * 0.35,
    opacity: 0.8,
    top: '35%',
    left: '15%',
    transform: [{ scale: 0.3 }]
  },
  // --- Splash 2 Brushes ---
  splash2Brush1: {
    position: 'absolute',
    width: width * 1.5,
    height: height * 0.35,
    opacity: 0.8,
    top: '-20%',
    right: '-15%',
    transform: [{ rotate: '-5deg' }, { scale: 0.4 }]
  },
  splash2Brush2: {
    position: 'absolute',
    width: width * 1.5,
    height: height * 0.35,
    opacity: 0.8,
    top: '5%',
    left: '0%',
    transform: [{ rotate: '-5deg' }, { scale: 0.4 }]
  },
  // --- Splash 3 Brushes ---
  splash3Brush1: {
    position: 'absolute',
    width: width * 1.5,
    height: height * 0.35,
    opacity: 0.8,
    top: '15%',
    left: '-20%',
    transform: [{ rotate: '-20deg' }, { scale: 0.6 }]
  },
  splash3Brush2: {
    position: 'absolute',
    width: width * 1.5,
    height: height * 0.35,
    opacity: 0.8,
    bottom: '35%',
    right: '-20%',
    transform: [{ rotate: '-20deg' }, { scale: 0.6 }]
  },
  // --- Splash 4 Brushes ---
  splash4Brush1: {
    position: 'absolute',
    width: width * 1.5,
    height: height * 0.35,
    opacity: 0.8,
    top: '20%',
    left: '10%',
    transform: [{ rotate: '10deg' }, { scale: 0.4 }]
  },
  splash4Brush2: {
    position: 'absolute',
    width: width * 1.5,
    height: height * 0.35,
    opacity: 0.8,
    bottom: '45%',
    right: '-25%',
    transform: [{ rotate: '-10deg' }, { scale: 0.35 }]
  },
  athleteImage: {
    width: width * 3,
    height: height * 2,
    zIndex: 100,
  },
  athleteImage1: {
    width: width * 1.5,
    height: height * 0.45,
    zIndex: 100,
    bottom: -height * 0.05,
    top: '-8%', // Moved up from -1%
    right: '5%',
  },
  athleteImage2: {
    width: width * 3,
    height: height * 0.42,
    zIndex: 100,
  },
  athleteImage3: {
    width: width * 1,
    height: height * 0.65,
    zIndex: 100,
    top: '1%', // Move up significantly since it's a tall image
  },
  athleteImage4: {
    width: width * 1.8,
    height: height * 0.60,
    marginRight: width * 0.10,
    zIndex: 100,
    top: '-15%', // Move up to align with logos
  },
  splash4ChestLogo: {
    position: 'absolute',
    width: 25,
    height: 25,
    transform: [{
      rotate: '27deg',
    }],
    left: '17.5%',
    top: '37.5%',
    zIndex: 600,
  },
  splash4ThighLogo: {
    position: 'absolute',
    width: 40,
    height: 40,
    top: '65%',
    left: '40.30%',
    transform: [{
      rotate: '9deg',
    }],
    zIndex: 600,
  },
  bottomSection: {
    height: height * 0.45,
    width: '100%',
    paddingHorizontal: 25,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
    zIndex: 200,
  },
  textSection: {
    alignItems: 'center',
    marginBottom: 30,
    zIndex: 3000, // Explicitly highest for readability
  },
  titleText: {
    fontSize: 34,
    fontWeight: '900',
    color: '#000',
    textAlign: 'center',
    textTransform: 'uppercase',
    lineHeight: 38,
    letterSpacing: -0.5,
    zIndex: 3000, // Ensure text is above all images
  },
  highlightText: {
    fontSize: 42,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
    lineHeight: 46,
    marginTop: -2,
    letterSpacing: -1,
    zIndex: 3000, // Ensure text is above all images
  },
  subtitleText: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
    fontWeight: '500',
    paddingHorizontal: 10,
    zIndex: 3000, // Ensure text is above all images
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  dot: {
    height: 12,
    width: 12,
    borderRadius: 6,
    backgroundColor: '#D1D5DB',
  },
  getStartedButton: {
    backgroundColor: '#002C61',
    borderRadius: 12,
    height: 60,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    zIndex: 600, // Buttons must be interactable and on top
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  nextButton: {
    flex: 1.5,
  },
  backButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#002C61',
    shadowOpacity: 0,
    elevation: 0,
  },
  backButtonText: {
    color: '#002C61',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

