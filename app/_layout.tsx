import '../src/services/firebase'; // IMPORTANT: Initialize Firebase before anything else

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { UserProvider } from '../src/context/UserContext';
import { setupNotificationListeners } from '../src/services/notifications';
import { SyncManager } from '../src/components/SyncManager';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Setup notification listeners
  useEffect(() => {
    const subscription = setupNotificationListeners();
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  return (
    <UserProvider>
      <SyncManager>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="auth/register" options={{ headerShown: false }} />
            <Stack.Screen name="auth/login" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            <Stack.Screen 
              name="messages/[id]" 
              options={{ 
                // Use 'card' instead of 'modal' — modal presentation on iOS
                // can leave a ghost (transparent) screen in the stack when
                // the user swipe-dismisses instead of using the back button.
                // That ghost screen sits on top of the tab navigator and
                // intercepts all touches, making the app appear completely frozen.
                presentation: 'card',
                headerShown: false,
                gestureEnabled: true,
                title: 'Message Details'
              }} 
            />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </SyncManager>
    </UserProvider>
  );
}
