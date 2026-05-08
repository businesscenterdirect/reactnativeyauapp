import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';

const DEV = __DEV__;

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(projectId?: string): Promise<string | null> {
  try {
    if (DEV) console.log('[Notifications] Starting push notification registration...');
    
    // Configure Android notification channel
    if (Platform.OS === 'android') {
      if (DEV) console.log('[Notifications] Configuring Android notification channel...');
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F97316',
      });
    }

    // Request permissions (handles Android 13+ POST_NOTIFICATIONS automatically)
    if (DEV) console.log('[Notifications] Checking permissions...');
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      if (DEV) console.log('[Notifications] Requesting permissions...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      if (DEV) console.log('[Notifications] Push notification permission denied');
      return null;
    }

    // Get Expo push token
    if (DEV) console.log('[Notifications] Getting Expo push token...');
    let token;
    if (projectId) {
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } else {
      token = (await Notifications.getExpoPushTokenAsync()).data;
    }
    
    if (!token) {
      if (DEV) console.log('[Notifications] Failed to get Expo push token');
      return null;
    }
    
    if (DEV) console.log('[Notifications] Push token:', token);
    if (DEV) console.log('[Notifications] Expo Push Token registered successfully');
    return token;
  } catch (error) {
    if (DEV) console.error('[Notifications] Push notification registration error:', (error as Error).message);
    if (DEV) console.error('[Notifications] Full error:', error);
    return null;
  }
}

export function setupNotificationListeners() {
  try {
    // Handle notification responses (user taps notification)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const data = response.notification.request.content.data;
      if (__DEV__) console.log('[Notifications] Response received with data:', data);

      if (data && data.messageId) {
        router.push(`/messages/${data.messageId}` as any);
      } else if (data && data.screen === 'messages') {
        router.push('/(tabs)/messages');
      } else if (data && data.screen === 'schedule') {
        router.push('/(tabs)/schedule');
      } else {
        router.push('/(tabs)/messages');
      }
    });

    // Handle notifications while app is in foreground
    const notificationSubscription = Notifications.addNotificationReceivedListener((notification) => {
      if (__DEV__) console.log('[Notifications] Foreground notification received:', notification.request.content.title);
      // Data sync is handled by Firestore SyncManager, 
      // but we could trigger a local alert or sound here if needed.
    });

    return {
      remove: () => {
        responseSubscription.remove();
        notificationSubscription.remove();
      }
    };
  } catch (e) {
    if (DEV) console.log('Notification listeners not available in this environment.');
    return null;
  }
}

// Helper function to set notification badge count
export async function setBadgeCount(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    if (DEV) console.error('Error setting badge count:', error);
  }
}
