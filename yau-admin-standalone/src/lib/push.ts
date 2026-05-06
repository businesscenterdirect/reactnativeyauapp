/**
 * Service to send Push Notifications using the Expo Push API
 */

export interface PushNotificationPayload {
  to: string | string[];
  title: string;
  body: string;
  data?: any;
  sound?: 'default' | null;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
}

export const sendPushNotification = async (payload: PushNotificationPayload) => {
  try {
    const response = await fetch('/api/push', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log('[Push Service] Result:', result);
    return result;
  } catch (error) {
    console.error('[Push Service] Error sending notification:', error);
    throw error;
  }
};

/**
 * Helper to notify multiple tokens in chunks (Expo limit is 100 per request)
 */
export const broadcastPushNotification = async (tokens: string[], title: string, body: string, data?: any) => {
  if (!tokens || tokens.length === 0) return;

  // Deduplicate tokens - allow both older ExponentPushToken and newer ExpoPushToken formats
  const uniqueTokens = Array.from(new Set(tokens.filter(t => 
    t.startsWith('ExponentPushToken') || t.startsWith('ExpoPushToken')
  )));
  if (uniqueTokens.length === 0) return;

  // Chunk tokens into groups of 100
  const chunks = [];
  for (let i = 0; i < uniqueTokens.length; i += 100) {
    chunks.push(uniqueTokens.slice(i, i + 100));
  }

  const results = await Promise.all(
    chunks.map(chunk => 
      sendPushNotification({
        to: chunk,
        title,
        body,
        data,
        sound: 'default',
        priority: 'high'
      })
    )
  );

  return results;
};
