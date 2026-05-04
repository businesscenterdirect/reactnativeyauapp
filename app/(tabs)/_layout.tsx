import { ActivityIndicator, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '../../src/context/UserContext';
import { useMessageStore } from '../../src/store/useMessageStore';

export default function TabLayout() {
  const { user, loading } = useUser();
  const router = useRouter();
  // Reset this ref on every mount so re-login works correctly after logout.
  // If it is not reset, the guard fires 'return' immediately on second mount
  // and leaves a ghost screen from the previous session in the nav stack.
  const hasRedirected = useRef(false);
  const insets = useSafeAreaInsets();
  const totalUnread = useMessageStore((state: any) => state.totalUnread);

  // ── Always reset the redirect guard when this layout mounts ─────────────
  useEffect(() => {
    hasRedirected.current = false;
  }, []);

  // ── Navigation guard ────────────────────────────────────────────────────
  useEffect(() => {
    if (loading) return;
    if (hasRedirected.current) return;

    // No user → go to login
    if (!user) {
      if (__DEV__) console.log('[TabLayout] No user, redirecting to login');
      hasRedirected.current = true;
      router.replace('/auth/login' as any);
      return;
    }

    // Parent with no students → complete registration
    const isCoach = user.role === 'coach';
    const hasStudents = Array.isArray(user.students) && user.students.length > 0;
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
    return null; // Redirecting in useEffect above
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
        elevation: 8, // Increased elevation to ensure it sits above content on Android
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
          tabBarBadge: totalUnread > 0 ? totalUnread : undefined,
          tabBarBadgeStyle: { 
            backgroundColor: '#E31B23', 
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '800',
          },
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
