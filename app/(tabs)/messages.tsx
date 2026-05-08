import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '../../src/context/UserContext';
import { AdminPost, subscribeToMessages, markMessageAsRead, isMessageRead } from '../../src/services/messaging';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback } from 'react';

import { useMessageStore, shouldShowBadge } from '../../src/store/useMessageStore';
import { formatMessageTimestamp } from '../../src/utils/dateFormatter';



const stripHtml = (html: string) => {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
};

// Memoized List Item
const MessageItem = React.memo(({
  item,
  onPress,
  formatTime
}: {
  item: any;
  onPress: (msg: any) => void;
  formatTime: (ts: any) => string;
}) => {
  const showBadge = shouldShowBadge(item.unreadCount);
  const preview = stripHtml(item.lastMessage || item.description || item.message || 'No preview available');

  return (
    <TouchableOpacity
      style={[styles.messageItem, showBadge && styles.unreadMessageItem]}
      onPress={() => onPress(item)}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.avatarBg}>
          <Image source={require('../../assets/images/favicon.png')} style={styles.avatarLogo} resizeMode="contain" />
        </View>
        {showBadge && <View style={styles.unreadDot} />}
      </View>

      <View style={styles.messageContent}>
        <View style={styles.messageHeader}>
          <Text style={[styles.messageTime, showBadge && styles.unreadTextStrong]}>
            {formatTime(item.lastActivity || item.createdAt || item.timestamp)}
          </Text>
        </View>

        <View style={styles.titleRow}>
          <Text style={[styles.messageTitle, showBadge && styles.unreadTextStrong]} numberOfLines={1}>{item.title}</Text>
          {showBadge && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>
                {item.unreadCount}
              </Text>
            </View>
          )}
        </View>

        <Text style={[styles.messagePreview, showBadge && styles.unreadPreview]} numberOfLines={1}>
          {preview}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useUser();
  const insets = useSafeAreaInsets();

  const messages = useMessageStore((state: any) => state.groups);
  const loading = useMessageStore((state: any) => state.loading);
  const markAsRead = useMessageStore((state: any) => state.markAsRead);


  const handleOpenMessage = (msg: any) => {
    if (user?.id) {
      markAsRead(user.id, msg.id, msg.lastMessageId || msg.id);
    }
    router.push({
      pathname: '/messages/[id]' as any,
      params: { id: msg.id, message: JSON.stringify(msg) }
    });
  };

  const formatTime = (ts: any) => formatMessageTimestamp(ts);

  const [activeTab, setActiveTab] = useState<'All Messages' | 'From Coach'>('All Messages');

  const displayedMessages = messages.filter((m: any) => {
    if (activeTab === 'All Messages') return true;
    if (activeTab === 'From Coach') return m.role === 'coach' || m.senderRole === 'coach' || m.type === 'coach';
    return true;
  });

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#001A3D', '#002C61']} style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <View style={styles.logoContainer}>
            <Image source={require('../../assets/favicon.png')} style={styles.logo} resizeMode="contain" />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>MESSAGES</Text>
          </View>
          <View style={styles.rightPlaceholder} />
        </View>
        <Text style={styles.headerSubtitle}>Stay up to date with the latest from your coach and YAU</Text>

        <View style={styles.tabsRow}>
          {(['All Messages', 'From Coach'] as const).map((tab) => {
            const pool = tab === 'All Messages'
              ? messages
              : messages.filter((m: any) => m.role === 'coach' || m.senderRole === 'coach' || m.type === 'coach');
            const count = (pool as any[]).reduce((acc: number, m: any) => acc + (m.unreadCount || 0), 0);

            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                  {count > 0 && (
                    <View style={styles.tabBadge}>
                      <Text style={styles.tabBadgeText}>{count}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color="#002C61" /></View>
      ) : (
        <FlatList
          data={displayedMessages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialIcons name="mail-outline" size={80} color="#E2E8F0" />
              <Text style={styles.emptyTitle}>NO MESSAGES</Text>
              <Text style={styles.emptyText}>You're all caught up! Updates from your coach and YAU will appear here.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <MessageItem
              item={item}
              onPress={handleOpenMessage}
              formatTime={formatTime}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingBottom: 0 },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  logoContainer: { flex: 1, alignItems: 'flex-start' },
  logo: { width: 40, height: 40 },
  titleContainer: { flex: 2, alignItems: 'center' },
  rightPlaceholder: { flex: 1 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 1.5 },
  headerSubtitle: { color: '#E2E8F0', fontSize: 13, paddingHorizontal: 20, marginBottom: 15, fontWeight: '400' },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 0, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent'
  },
  tabActive: { borderBottomColor: '#E31B23' },
  tabText: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  tabTextActive: { color: '#FFF', fontWeight: '900' },
  tabBadge: {
    backgroundColor: '#E31B23',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  listContent: { paddingBottom: 100 },
  messageItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center'
  },
  avatarContainer: { marginRight: 16 },
  avatarBg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  avatarLogo: { width: 28, height: 28 },
  messageContent: { flex: 1 },
  messageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },

  messageTime: { fontSize: 11, color: '#94A3B8', fontWeight: '700', marginBottom: 2 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  messageTitle: { fontSize: 16, fontWeight: '900', color: '#1E293B', flex: 1, marginRight: 10, letterSpacing: -0.2 },
  unreadBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E31B23',
    alignItems: 'center',
    justifyContent: 'center'
  },
  unreadCount: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  messagePreview: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  unreadMessageItem: {
    backgroundColor: '#F0F9FF',
    borderLeftWidth: 4,
    borderLeftColor: '#E31B23', // red border to match dot
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E31B23', // Red dot instead of blue
    borderWidth: 2,
    borderColor: '#FFF',
  },
  unreadTextStrong: {
    fontWeight: '900',
    color: '#000000', // Black for unread
  },
  unreadPreview: {
    color: '#000000', // Black for unread
    fontWeight: '700',
  },
  loading: { flex: 1, justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', marginTop: 20, marginBottom: 8 },
  emptyText: { color: '#94A3B8', fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 20 },
});
