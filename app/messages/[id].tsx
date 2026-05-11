import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState, useRef } from 'react';
import { 
  ActivityIndicator, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  Keyboard,
  useWindowDimensions
} from 'react-native';
import RenderHTML from 'react-native-render-html';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '../../src/context/UserContext';
import { db } from '../../src/services/firebase';
import { AdminPost, MessageReply, subscribeToReplies, sendReply } from '../../src/services/messaging';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatMessageTimestamp } from '../../src/utils/dateFormatter';

export default function MessageDetailScreen() {
  const { id, message: messageParam } = useLocalSearchParams<{ id: string; message?: string }>();
  const router = useRouter();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  
  const [message, setMessage] = useState<AdminPost | null>(null);
  const [replies, setReplies] = useState<MessageReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [bodyCollapsed, setBodyCollapsed] = useState(true);

  useEffect(() => {
    const loadMessage = async () => {
      if (messageParam) {
        try { setMessage(JSON.parse(messageParam)); } catch (e) {} finally { setLoading(false); }
      } else if (id) {
        try {
          const docRef = doc(db, "admin_posts", id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) setMessage({ id: docSnap.id, ...docSnap.data() } as AdminPost);
        } catch (e) {} finally { setLoading(false); }
      } else { setLoading(false); }
    };
    loadMessage();
  }, [id, messageParam]);

  useEffect(() => {
    if (id) {
      const unsubscribe = subscribeToReplies(id, (fetched) => {
        setReplies(fetched);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      });
      return () => unsubscribe();
    }
  }, [id]);

  useEffect(() => {
    const showListener = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideListener = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showListener, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideListener, () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSendReply = async () => {
    if (!replyText.trim() || !user || !id || sendingReply) return;
    setSendingReply(true);
    try {
      await sendReply(id, user.id!, `${user.firstName} ${user.lastName}`, 'parent', replyText.trim());
      setReplyText('');
      Keyboard.dismiss();
    } catch (e) {} finally { setSendingReply(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#002C61" /></View>;

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
      enabled={keyboardVisible}
    >
      <LinearGradient colors={['#001A3D', '#002C61']} style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>CONVERSATION</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent}>
        <View style={styles.postCard}>
          <View style={styles.tag}><Text style={styles.tagText}>OFFICIAL POST</Text></View>
          <Text style={styles.postTitle}>{message?.title}</Text>
          
          <View style={bodyCollapsed ? styles.collapsedBody : null}>
            <RenderHTML 
              contentWidth={width - 80} 
              source={{ html: message?.description || '' }} 
              baseStyle={styles.postBody}
            />
          </View>
          
          <TouchableOpacity 
            onPress={() => setBodyCollapsed(!bodyCollapsed)}
            style={styles.seeMoreBtn}
          >
            <Text style={styles.seeMoreText}>
              {bodyCollapsed ? '▼ SEE MORE' : '▲ SEE LESS'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.postDate}>{formatMessageTimestamp(message?.createdAt || message?.timestamp)}</Text>
        </View>

        <View style={styles.repliesArea}>
          {replies.map((r) => {
            const isMe = r.userId === user?.id;
            return (
              <View key={r.id} style={[styles.bubbleWrap, isMe ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
                  <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
                    {!isMe && <Text style={styles.bubbleAuthor}>{r.userName}</Text>}
                    <RenderHTML 
                      contentWidth={width - 120} 
                      source={{ html: r.content || '' }} 
                      baseStyle={{
                        ...styles.bubbleText,
                        color: isMe ? '#FFF' : '#111827'
                      }}
                    />
                  <Text style={[styles.bubbleTime, isMe && { color: 'rgba(255,255,255,0.7)' }]}>
                    {formatMessageTimestamp(r.timestamp)}
                  </Text>
                </View>
              </View>
            )
          })}
        </View>
      </ScrollView>

      <View style={[styles.inputBar, { paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom + 5, 15) }]}>
        <TextInput 
          style={styles.input} 
          placeholder="Write a message..." 
          value={replyText} 
          onChangeText={setReplyText} 
          multiline 
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSendReply} disabled={sendingReply}>
          {sendingReply ? <ActivityIndicator size="small" color="#FFF" /> : <MaterialIcons name="send" size={20} color="#FFF" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  postCard: { backgroundColor: '#F8FAFC', borderRadius: 24, padding: 20, marginBottom: 30, borderWidth: 1.5, borderColor: '#F1F5F9' },
  tag: { backgroundColor: '#002C61', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 12 },
  tagText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  postTitle: { fontSize: 20, fontWeight: '900', color: '#111827', marginBottom: 6 },
  postBody: { fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 12 },
  postDate: { fontSize: 11, color: '#94A3B8', fontWeight: '700' },
  repliesArea: { gap: 15 },
  bubbleWrap: { width: '100%' },
  bubble: { maxWidth: '85%', padding: 14, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  myBubble: { backgroundColor: '#E31B23', borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: '#F3F4F6', borderBottomLeftRadius: 4 },
  bubbleAuthor: { fontSize: 10, fontWeight: '900', color: '#002C61', marginBottom: 4, textTransform: 'uppercase' },
  bubbleText: { fontSize: 14, color: '#111827', lineHeight: 20, marginBottom: 4 },
  bubbleTime: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },
  inputBar: { flexDirection: 'row', alignItems: 'center', padding: 15, borderTopWidth: 1.5, borderTopColor: '#F3F4F6', gap: 12, backgroundColor: '#FFF' },
  input: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#002C61', alignItems: 'center', justifyContent: 'center' },
  collapsedBody: { maxHeight: 100, overflow: 'hidden' },
  seeMoreBtn: { marginTop: 4, marginBottom: 12, paddingVertical: 4 },
  seeMoreText: { color: '#E31B23', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
});
