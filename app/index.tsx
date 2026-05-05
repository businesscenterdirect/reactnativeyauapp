import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useUser } from '../src/context/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function IndexScreen() {
  const { user, loading: userLoading } = useUser();
  const [loading, setLoading] = useState(true);
  const redirected = useRef(false);

  useEffect(() => {
    async function checkOnboarding() {
      if (userLoading) return;
      if (redirected.current) return;

      try {
        if (user) {
          // Logged in user always goes to tabs
          redirected.current = true;
          router.replace('/(tabs)');
          return;
        }

        const hasSeen = await AsyncStorage.getItem('HAS_SEEN_ONBOARDING');
        
        redirected.current = true;
        if (hasSeen === 'true') {
          router.replace('/auth/login' as any);
        } else {
          router.replace('/onboarding' as any);
        }
      } catch (e) {
        console.error(e);
        router.replace('/auth/login' as any);
      } finally {
        setLoading(false);
      }
    }

    checkOnboarding();
  }, [user, userLoading]);

  return null;
}
