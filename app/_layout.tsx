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

import { useUser } from '../src/context/UserContext';

import * as SplashScreen from 'expo-splash-screen';
import { View, ActivityIndicator } from 'react-native';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

function NavigationContent() {
  const { user, loading } = useUser();
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  // IMPORTANT: Do not render the navigation stack while we are still 
  // determining the initial authentication state. If we render the stack 
  // too early, it will mount the initial route (usually (tabs)), which 
  // will then immediately trigger a redirect to /auth/login if no user 
  // is found. This "double mount" is the primary cause of unclickable 
  // tab bars and "ghost" screens overlapping the UI.
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#002C61', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    /* 
       The 'key' here forces a total destruction and rebuild of the 
       navigation container whenever the user identity changes (login/logout). 
       This is a fail-safe against native view persistence bugs.
    */
    <View style={{ flex: 1 }} key={user?.id || 'guest'}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth/register" />
          <Stack.Screen name="auth/login" />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal', headerShown: true }} />
          <Stack.Screen 
            name="messages/[id]" 
            options={{ 
              presentation: 'card',
              gestureEnabled: true,
              title: 'Message Details'
            }} 
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </View>
  );
}

export default function RootLayout() {
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
        <NavigationContent />
      </SyncManager>
    </UserProvider>
  );
}
