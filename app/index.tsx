import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useUser } from '../src/context/UserContext';

export default function IndexScreen() {
  const { user, loading } = useUser();
  // Guard: fire at most one redirect per mount to prevent race conditions
  // with login.tsx and (tabs)/_layout.tsx firing their own replaces.
  const redirected = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (redirected.current) return;
    redirected.current = true;

    if (user) {
      // Go directly to messages — avoids a second hop through /(tabs)/
      router.replace('/(tabs)/messages');
    } else {
      router.replace('/auth/login' as any);
    }
  }, [user, loading]);

  return null;
}
