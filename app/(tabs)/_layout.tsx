import { ActivityIndicator, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '../../src/context/UserContext';

export default function TabLayout() {
  const { user, loading } = useUser();
  const router = useRouter();
  const hasRedirected = useRef(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Navigation guard: only run after loading completes to prevent unmatched route errors
    if (loading) return;
    if (hasRedirected.current) return;

    // If no user is logged in, send to login screen
    if (!user) {
      if (__DEV__) console.log('[TabLayout] No user, redirecting to login');
      hasRedirected.current = true;
      router.replace('/auth/login' as any);
      return;
    }

    // If user is a parent (default) but has no students, they might need to complete registration
    const isCoach = user?.role === 'coach';
    const hasStudents = user.students && user.students.length > 0;

    if (!isCoach && !hasStudents) {
      if (__DEV__) console.log('[TabLayout] Parent with no students, redirecting to register');
      hasRedirected.current = true;
      router.replace('/auth/register' as any);
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#002C61' }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  const isCoach = user?.role === 'coach';
  if (!user || (!isCoach && (!user.students || user.students.length === 0))) {
    return null; // Redirecting in useEffect
  }

  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#E31B23',
      tabBarInactiveTintColor: '#9CA3AF',
      tabBarStyle: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingTop: 8,
        paddingBottom: 8 + insets.bottom,
        height: 64 + insets.bottom,
        elevation: 0,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      headerShown: false,
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name={focused ? 'home' : 'home'} size={focused ? 28 : 26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name={focused ? 'chat-bubble' : 'chat-bubble-outline'} size={focused ? 26 : 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name={focused ? 'event' : 'event'} size={focused ? 26 : 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="standings"
        options={{
          title: 'Standings',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name={focused ? 'emoji-events' : 'emoji-events'} size={focused ? 26 : 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons name={focused ? 'person' : 'person-outline'} size={focused ? 26 : 24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
