import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ScreenBackdrop } from '../../components/ui/ScreenBackdrop';
import { fonts, glass, palette, radii, space } from '../../constants/designTokens';
import { MOCK_CHAT_AI, MOCK_CHAT_HUMAN, type ChatMsg } from '../../data/mockClinical';
import { useContentInsets } from '../../hooks/useContentInsets';

type Channel = 'ai' | 'human';

export default function ChatScreen() {
  const insets = useContentInsets();
  const [channel, setChannel] = useState<Channel>('ai');
  const [draft, setDraft] = useState('');
  const [aiMsgs, setAiMsgs] = useState(MOCK_CHAT_AI);
  const [humanMsgs, setHumanMsgs] = useState(MOCK_CHAT_HUMAN);
  const listRef = useRef<FlatList<ChatMsg>>(null);

  const messages = channel === 'ai' ? aiMsgs : humanMsgs;
  const pressFx = Platform.OS !== 'web';

  const send = () => {
    const t = draft.trim();
    if (!t) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const msg: ChatMsg = {
      id: `${Date.now()}`,
      from: 'user',
      text: t,
      time: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
    };
    if (channel === 'ai') setAiMsgs((m) => [...m, msg]);
    else setHumanMsgs((m) => [...m, msg]);
    setDraft('');
  };

  return (
    <ScreenBackdrop>
      <KeyboardAvoidingView
        style={[styles.flex, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Supervisor link</Text>
          <View style={styles.segment}>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setChannel('ai');
              }}
              style={[styles.segBtn, channel === 'ai' && styles.segOn]}
            >
              <Feather name="cpu" size={16} color={channel === 'ai' ? palette.white : palette.primary} />
              <Text style={[styles.segTxt, channel === 'ai' && styles.segTxtOn]}>AI</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setChannel('human');
              }}
              style={[styles.segBtn, channel === 'human' && styles.segOn]}
            >
              <Feather name="users" size={16} color={channel === 'human' ? palette.white : palette.primary} />
              <Text style={[styles.segTxt, channel === 'human' && styles.segTxtOn]}>Desk</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>
            {channel === 'ai'
              ? 'Mock assistant — educational prompts only.'
              : 'Mock district desk — not a live paging system.'}
          </Text>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={{
            paddingHorizontal: space.padH,
            paddingBottom: 16,
            gap: 10,
          }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const mine = item.from === 'user';
            return (
              <View style={[styles.row, mine && styles.rowMine]}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                  <Text style={[styles.bubbleText, { color: mine ? palette.white : palette.text }]}>{item.text}</Text>
                  <Text
                    style={[
                      styles.time,
                      { color: mine ? 'rgba(255,255,255,0.85)' : palette.textTertiary },
                    ]}
                  >
                    {item.time}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        <View style={[styles.composer, { paddingBottom: insets.bottom + 12 }]}>
          <TextInput
            style={styles.input}
            placeholder={channel === 'ai' ? 'Ask triage assistant (mock)…' : 'Message district desk (mock)…'}
            placeholderTextColor={palette.textTertiary}
            value={draft}
            onChangeText={setDraft}
            multiline
          />
          <Pressable
            onPress={send}
            style={({ pressed }) => [
              styles.send,
              pressFx && pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Feather name="send" size={18} color={palette.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  list: { flex: 1, backgroundColor: 'transparent' },
  header: { paddingHorizontal: space.padH, paddingBottom: 12, gap: 10 },
  title: { fontFamily: fonts.bold, fontSize: 28, color: palette.secondary },
  segment: { flexDirection: 'row', gap: 10 },
  segBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: glass.stroke,
    backgroundColor: glass.fill,
  },
  segOn: { backgroundColor: palette.primary, borderColor: palette.primary },
  segTxt: { fontFamily: fonts.semibold, fontSize: 14, color: palette.primary },
  segTxtOn: { color: palette.white },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: palette.textSecondary, lineHeight: 18 },
  row: { flexDirection: 'row', justifyContent: 'flex-start' },
  rowMine: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '88%',
    padding: 14,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  bubbleOther: {
    borderColor: glass.stroke,
    backgroundColor: glass.fillStrong,
  },
  bubbleMine: {
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: `${palette.primary}E8`,
  },
  bubbleText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  time: { fontFamily: fonts.medium, fontSize: 11, marginTop: 6 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: space.padH,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: glass.strokeSoft,
    backgroundColor: 'rgba(248,250,252,0.82)',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: glass.stroke,
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: palette.text,
    backgroundColor: glass.fillStrong,
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
});
