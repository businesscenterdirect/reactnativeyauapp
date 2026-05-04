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

  return (
    <TouchableOpacity 
      style={[styles.messageItem, showBadge && styles.unreadMessageItem]} 
      onPress={() => onPress(item)}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.avatarBg}>
          <Image source={require('../../assets/images/logo1.png')} style={styles.avatarLogo} resizeMode="contain" />
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
          {item.senderName ? `${item.senderName}: ` : ''}{item.lastMessage || item.description || item.message || 'No preview available'}
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

  const formatTime = (ts: any) => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : (ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts));
    if (isNaN(date.getTime())) return '';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const oneDay = 24 * 60 * 60 * 1000;

    if (diff < oneDay) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } else if (diff < 7 * oneDay) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const displayedMessages = messages;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#001A3D', '#002C61']} style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <Image source={require('../../assets/images/logo1.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <Text style={styles.headerSubtitle}>Stay up to date with the latest from your coach and YAU</Text>
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
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, marginBottom: 10 },
  logo: { width: 32, height: 32 },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, paddingHorizontal: 20, marginBottom: 20, lineHeight: 18 },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 10 },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent'
  },
  tabActive: { borderBottomColor: '#E31B23' },
  tabText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: '#FFF' },
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarLogo: { width: 24, height: 24 },
  messageContent: { flex: 1 },
  messageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },

  messageTime: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  messageTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B', flex: 1, marginRight: 10 },
  unreadBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E31B23',
    alignItems: 'center',
    justifyContent: 'center'
  },
  unreadCount: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  messagePreview: { fontSize: 13, color: '#64748B', lineHeight: 18 },
  unreadMessageItem: {
    backgroundColor: '#F0F9FF',
    borderLeftWidth: 4,
    borderLeftColor: '#0047AB',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0047AB',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  unreadTextStrong: {
    fontWeight: '900',
    color: '#0047AB',
  },
  unreadPreview: {
    color: '#1E293B',
    fontWeight: '700',
  },
  loading: { flex: 1, justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', marginTop: 20, marginBottom: 8 },
  emptyText: { color: '#94A3B8', fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 20 },
});
