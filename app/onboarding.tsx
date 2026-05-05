import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Image,
  Dimensions,
  TouchableOpacity,
  Text,
  StatusBar,
  Animated,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface Brush {
  source: any;
  top?: string | number;
  left?: string | number;
  right?: string | number;
  bottom?: string | number;
  rotate?: string;
  scale?: number;
}

interface OnboardingItem {
  id: string;
  title: string;
  highlight: string;
  subtitle: string;
  athlete: any;
  brushes: Brush[];
  brushColor: string;
}

const ONBOARDING_DATA: OnboardingItem[] = [
  {
    id: '1',
    title: 'NEVER MISS',
    highlight: 'A BEAT',
    subtitle: 'From practice times to last-minute updates, everything your team shares stays clear',
    athlete: require('../assets/images/onboarding/athlete1.png'),
    brushes: [
      { source: require('../assets/images/onboarding/brush_red.png'), top: '-15%', left: '-55%', rotate: '0deg', scale: 0.35 }, // Top left, RED
      { source: require('../assets/images/onboarding/brush_red_2.png'), top: '10%', left: '-30%', rotate: '0deg', scale: 0.4 }, // Mid left, RED
      { source: require('../assets/images/onboarding/brush_red.png'), top: '35%', left: '15%', rotate: '0deg', scale: 0.3 }, // Bottom, RED
    ],
    brushColor: '#E31B23',
  },
  {
    id: '2',
    title: 'NEVER MISS A',
    highlight: 'GAME MOMENT',
    subtitle: 'See schedules, get team updates, and follow standings without switching between apps',
    athlete: require('../assets/images/onboarding/athlete2.png'),
    brushes: [
      { source: require('../assets/images/onboarding/brush_red.png'), top: '-20%', right: '-15%', rotate: '-5deg', scale: 0.4 }, // Top red brush, moved up more
      { source: require('../assets/images/onboarding/brush_red_2.png'), top: '5%', left: '0%', rotate: '-5deg', scale: 0.4 }, // Bottom red brush, moved up more
    ],
    brushColor: '#E31B23',
  },
  {
    id: '3',
    title: 'TRACK EVERY',
    highlight: 'STANDING',
    subtitle: 'Follow game results and performance updates with clear and easy-to-understand information',
    athlete: require('../assets/images/onboarding/athlete3.png'),
    brushes: [
      { source: require('../assets/images/onboarding/brush_blue.png'), top: '15%', left: '-20%', rotate: '-20deg', scale: 0.6 }, // 30% total edge offset for gap
      { source: require('../assets/images/onboarding/brush_blue.png'), bottom: '15%', right: '-20%', rotate: '-20deg', scale: 0.6 }, // Fixed syntax error
    ],
    brushColor: '#E31B23',
  },
  {
    id: '4',
    title: 'STAY CONNECTED',
    highlight: 'TO YOUR TEAM',
    subtitle: 'Get real-time schedules, team messages, and track standings.',
    athlete: require('../assets/images/onboarding/athlete4.png'),
    brushes: [
      { source: require('../assets/images/onboarding/20.png'), top: '30%', left: '10%', rotate: '10deg', scale: 0.4 },
      { source: require('../assets/images/onboarding/19.png'), bottom: '30%', right: '-20%', rotate: '-10deg', scale: 0.35 },
    ],
    brushColor: '#E31B23',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleComplete = async () => {
    console.log('Button clicked! currentIndex:', currentIndex, 'Total pages:', ONBOARDING_DATA.length);
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      console.log('Scrolling to next index:', currentIndex + 1);
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      console.log('Final slide reached. Redirecting to login...');
      try {
        await AsyncStorage.setItem('HAS_SEEN_ONBOARDING', 'true');
        console.log('Saved onboarding state. Replacing route...');
        router.replace('/auth/login' as any);
      } catch (error) {
        console.error('Error in handleComplete:', error);
        router.replace('/auth/login' as any);
      }
    }
  };

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const x = event.nativeEvent.contentOffset.x;
        const width = event.nativeEvent.layoutMeasurement.width;
        const index = Math.round(x / width);
        if (index !== currentIndex) {
          console.log('Page changed to:', index);
          setCurrentIndex(index);
        }
      }
    }
  );

  const renderItem = ({ item }: { item: typeof ONBOARDING_DATA[0] }) => {
    return (
      <View style={styles.slide}>
        {/* Top Section: Logo & Athlete */}
        <View style={styles.topSection}>
          <View style={[styles.logoContainer, { paddingTop: insets.top + 20 }]}>
            <Image
              source={require('../assets/images/icon.png')}
              style={styles.logoIcon}
              resizeMode="contain"
            />
            <Text style={styles.yauText}>YOUTH ATHLETE UNIVERSITY</Text>
          </View>

          <View style={styles.athleteContainer} pointerEvents="box-none">
            {item.brushes.map((brush, bIdx) => (
              <Image
                key={bIdx}
                source={brush.source}
                style={[
                  styles.brushStroke,
                  {
                    ...(brush.top ? { top: brush.top as any } : {}),
                    ...(brush.left ? { left: brush.left as any } : {}),
                    ...(brush.right ? { right: brush.right as any } : {}),
                    ...(brush.bottom ? { bottom: brush.bottom as any } : {}),
                    transform: [
                      { rotate: brush.rotate || '0deg' },
                      { scale: brush.scale || 1 }
                    ]
                  }
                ]}
                resizeMode="contain"
              />
            ))}
            <Image
              source={item.athlete}
              style={styles.athleteImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Bottom Section: Text, Dots & Button */}
        <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.textSection}>
            <Text style={styles.titleText}>{item.title}</Text>
            <Text style={[styles.highlightText, { color: item.brushColor }]}>{item.highlight}</Text>
            <Text style={styles.subtitleText}>{item.subtitle}</Text>

            <View style={styles.paginationRow}>
              {ONBOARDING_DATA.map((_, dotIndex) => {
                const inputRange = [(dotIndex - 1) * width, dotIndex * width, (dotIndex + 1) * width];
                const dotWidth = scrollX.interpolate({
                  inputRange,
                  outputRange: [10, 10, 10], // Fixed circular width
                  extrapolate: 'clamp',
                });
                const opacity = scrollX.interpolate({
                  inputRange,
                  outputRange: [0.3, 1, 0.3],
                  extrapolate: 'clamp',
                });
                return (
                  <Animated.View
                    key={dotIndex}
                    style={[
                      styles.dot,
                      { width: dotWidth, opacity },
                      currentIndex === dotIndex && { backgroundColor: ONBOARDING_DATA[dotIndex].brushColor }
                    ]}
                  />
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={handleComplete}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {currentIndex === ONBOARDING_DATA.length - 1 ? 'Get Started' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />

      <Animated.FlatList
        ref={flatListRef}
        data={ONBOARDING_DATA}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        keyExtractor={(item) => item.id}
        bounces={false}
        scrollEventThrottle={16}
        extraData={currentIndex}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
      />
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
  athleteContainer: {
    position: 'absolute',
    top: height * 0.25, // Moved 10% further down (from 0.22)
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
  },
  athleteImage: {
    width: width * 1,
    height: height * 0.35,
    zIndex: 2,
    marginLeft: -width * 0, // Nudged 10% right (from -0.2)
  },
  bottomSection: {
    height: height * 0.42,
    width: '100%',
    paddingHorizontal: 30,
    justifyContent: 'flex-end', // Group everything at the bottom
    backgroundColor: '#FFF',
    zIndex: 10, // Ensure it's above athlete container for touches
  },
  textSection: {
    alignItems: 'center',
    marginBottom: 20, // Add space above the button
  },
  titleText: {
    fontSize: 34,
    fontWeight: '900', // Very bold as per Figma
    color: '#000',
    textAlign: 'center',
    textTransform: 'uppercase',
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  highlightText: {
    fontSize: 42,
    fontWeight: '900', // Very bold as per Figma
    textAlign: 'center',
    textTransform: 'uppercase',
    lineHeight: 46,
    marginTop: -2,
    letterSpacing: -1,
  },
  subtitleText: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
    fontWeight: '500',
    paddingHorizontal: 10,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 15,
  },
  dot: {
    height: 10,
    width: 10, // Base width for circle
    borderRadius: 5,
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
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
