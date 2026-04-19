import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Banner } from '../../components/ui/Banner';
import { ScreenBackdrop } from '../../components/ui/ScreenBackdrop';
import { fonts, glass, palette, radii, space } from '../../constants/designTokens';
import { clearChatHistory, insertChatMessage, listChatMessages } from '../../db/chatRepo';
import type { ChatMessage } from '../../db/types';
import { useContentInsets } from '../../hooks/useContentInsets';
import { usePatient } from '../../hooks/usePatient';
import { useT } from '../../i18n/LanguageContext';
import RAGService from '../../services/ragService';

type UiMessage = ChatMessage | { id: string; role: 'assistant'; content: string; thinking: string; pending: true; createdAt: number };

function ThinkingBubble({ text, streaming }: { text: string; streaming: boolean }) {
  const [open, setOpen] = useState(false);
  const tThinking = useT('Thinking…');
  const tThoughtPrefix = useT('Thought process');
  const tChars = useT('chars');
  if (!text && !streaming) return null;
  return (
    <Pressable onPress={() => setOpen((o) => !o)} style={thinkStyles.wrap}>
      <View style={thinkStyles.header}>
        <Feather name="cpu" size={12} color={palette.textTertiary} />
        <Text style={thinkStyles.label}>
          {streaming ? tThinking : `${tThoughtPrefix} (${text.length} ${tChars})`}
        </Text>
        <Feather
          name={open ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={palette.textTertiary}
        />
      </View>
      {open ? <Text style={thinkStyles.body}>{text.trim()}</Text> : null}
    </Pressable>
  );
}

const thinkStyles = StyleSheet.create({
  wrap: {
    marginBottom: 6,
    padding: 10,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 12,
    color: palette.textTertiary,
    fontStyle: 'italic',
  },
  body: {
    marginTop: 8,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: palette.textSecondary,
    lineHeight: 18,
  },
});

export default function ChatScreen() {
  const insets = useContentInsets();
  const db = useSQLiteContext();
  const { patient, refresh: refreshPatient } = usePatient();

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [pending, setPending] = useState<{
    id: string;
    answer: string;
    thinking: string;
  } | null>(null);
  const [draft, setDraft] = useState('');

  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadLabel, setDownloadLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const tTitle = useT('Malaria Care AI');
  const tClear = useT('Clear');
  const tHint = useT('Fully offline. Advice is tailored to the profile you saved during onboarding.');
  const tProfileIncompleteTitle = useT('Profile incomplete');
  const tProfileIncompleteMsg = useT(
    "The AI can give general info but won't tailor dosing until you finish onboarding.",
  );
  const tErrorPrefix = useT('Error:');
  const tLoadingAI = useT('Loading AI into memory…');
  const tStartingUp = useT('Starting up…');
  const tFailedInit = useT('Failed to initialize AI');
  const tAskPlaceholder = useT('Ask about your symptoms, medicine, dose…');

  const listRef = useRef<FlatList<UiMessage>>(null);

  const loadHistory = useCallback(async () => {
    const rows = await listChatMessages(db, 100);
    setMessages(rows);
  }, [db]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useFocusEffect(
    useCallback(() => {
      refreshPatient();
    }, [refreshPatient]),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (ready) return;
      try {
        setError(null);
        setDownloading(true);
        await RAGService.downloadModels((p, label) => {
          if (cancelled) return;
          setProgress(p);
          setDownloadLabel(label);
        });
        if (cancelled) return;
        setDownloading(false);

        setLoading(true);
        await RAGService.init();
        if (cancelled) return;
        setLoading(false);
        setReady(true);
      } catch (e: any) {
        if (cancelled) return;
        setDownloading(false);
        setLoading(false);
        setError(e?.message ?? tFailedInit);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready]);

  async function send() {
    const text = draft.trim();
    if (!text || !ready || generating) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setDraft('');

    const userMsg = await insertChatMessage(db, 'user', text);
    const nextHistory: ChatMessage[] = [...messages.filter(isPersisted), userMsg];
    setMessages(nextHistory);

    RAGService.setContext(patient, nextHistory);

    const pendingId = `pending-${Date.now()}`;
    setPending({ id: pendingId, answer: '', thinking: '' });
    setGenerating(true);

    try {
      const result = await RAGService.query(
        text,
        (t) => {
          setPending((cur) => (cur ? { ...cur, thinking: cur.thinking + t } : cur));
        },
        (t) => {
          setPending((cur) => (cur ? { ...cur, answer: cur.answer + t } : cur));
        },
      );
      const assistantMsg = await insertChatMessage(
        db,
        'assistant',
        result.answer,
        result.thinking || null,
      );
      setMessages((prev) => [...prev.filter(isPersisted), assistantMsg]);
      setPending(null);
    } catch (e: any) {
      const errMsg = `⚠️ Error: ${e?.message ?? 'unknown'}`;
      const assistantMsg = await insertChatMessage(db, 'assistant', errMsg);
      setMessages((prev) => [...prev.filter(isPersisted), assistantMsg]);
      setPending(null);
    } finally {
      setGenerating(false);
    }
  }

  async function onClearHistory() {
    await clearChatHistory(db);
    setMessages([]);
    setPending(null);
  }

  const listData: UiMessage[] = pending
    ? [
        ...messages,
        {
          id: pending.id,
          role: 'assistant' as const,
          content: pending.answer,
          thinking: pending.thinking,
          pending: true as const,
          createdAt: Date.now(),
        },
      ]
    : messages;

  const statusText = (() => {
    if (error) return `${tErrorPrefix} ${error}`;
    if (downloading) return `${downloadLabel}… ${Math.round(progress * 100)}%`;
    if (loading) return tLoadingAI;
    if (!ready) return tStartingUp;
    return null;
  })();

  return (
    <ScreenBackdrop>
      <KeyboardAvoidingView
        style={[styles.flex, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{tTitle}</Text>
            {messages.length > 0 ? (
              <Pressable onPress={onClearHistory} style={styles.clearBtn}>
                <Feather name="trash-2" size={16} color={palette.textSecondary} />
                <Text style={styles.clearText}>{tClear}</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.hint}>{tHint}</Text>
        </View>

        {!patient?.onboardingCompletedAt && (
          <View style={{ paddingHorizontal: space.padH, marginBottom: 10 }}>
            <Banner
              tone="warning"
              title={tProfileIncompleteTitle}
              message={tProfileIncompleteMsg}
            />
          </View>
        )}

        {statusText ? (
          <View style={styles.status}>
            <Text style={styles.statusTxt}>{statusText}</Text>
          </View>
        ) : null}

        <FlatList
          ref={listRef}
          data={listData}
          keyExtractor={(item) =>
            isPersisted(item) ? String(item.id) : item.id
          }
          style={styles.list}
          contentContainerStyle={{
            paddingHorizontal: space.padH,
            paddingBottom: 16,
            gap: 10,
          }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            ready ? (
              <EmptyState patientName={patient?.name ?? null} />
            ) : null
          }
          renderItem={({ item }) => {
            const mine = isPersisted(item) && item.role === 'user';
            const isAssistant = item.role === 'assistant';
            const streaming = !isPersisted(item);
            return (
              <View style={[styles.row, mine && styles.rowMine]}>
                <View style={{ maxWidth: '88%' }}>
                  {isAssistant && (item.thinking || (streaming && !item.content)) ? (
                    <ThinkingBubble
                      text={item.thinking ?? ''}
                      streaming={streaming && !item.content}
                    />
                  ) : null}
                  <View
                    style={[
                      styles.bubble,
                      mine ? styles.bubbleMine : styles.bubbleOther,
                    ]}
                  >
                    {mine ? (
                      <Text style={[styles.bubbleText, { color: palette.white }]}>
                        {item.content}
                      </Text>
                    ) : (
                      <Markdown style={mdStyles}>
                        {item.content || (streaming ? '…' : '')}
                      </Markdown>
                    )}
                    <Text
                      style={[
                        styles.time,
                        {
                          color: mine
                            ? 'rgba(255,255,255,0.85)'
                            : palette.textTertiary,
                        },
                      ]}
                    >
                      {formatTime(item.createdAt)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
        />

        <View style={[styles.composer, { paddingBottom: insets.bottom + 12 }]}>
          <TextInput
            style={styles.input}
            placeholder={ready ? tAskPlaceholder : tStartingUp}
            placeholderTextColor={palette.textTertiary}
            value={draft}
            onChangeText={setDraft}
            multiline
            editable={ready && !generating}
          />
          <Pressable
            onPress={send}
            disabled={!ready || generating || draft.trim().length === 0}
            style={({ pressed }) => [
              styles.send,
              (!ready || generating || draft.trim().length === 0) && { opacity: 0.4 },
              pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
            ]}
          >
            {generating ? (
              <ActivityIndicator color={palette.white} />
            ) : (
              <Feather name="send" size={18} color={palette.white} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenBackdrop>
  );
}

function EmptyState({ patientName }: { patientName: string | null }) {
  const tHi = useT('Hi');
  const tBody = useT(
    'Ask about your symptoms, your medicine dose, or what to do next. I know your profile — weight, age, pregnancy status, allergies — and will tailor advice to you.',
  );
  return (
    <View style={emptyStyles.wrap}>
      <Feather name="message-circle" size={36} color={palette.primary} />
      <Text style={emptyStyles.title}>
        {patientName ? `${tHi} ${patientName},` : `${tHi},`}
      </Text>
      <Text style={emptyStyles.body}>{tBody}</Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 10,
    padding: 24,
    marginHorizontal: 8,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  title: { fontFamily: fonts.semibold, fontSize: 18, color: palette.secondary },
  body: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: palette.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

function isPersisted(m: UiMessage): m is ChatMessage {
  return (m as any).pending !== true;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const mdStyles = {
  body: { fontFamily: fonts.regular, fontSize: 15, color: palette.text, lineHeight: 22 },
  strong: { fontFamily: fonts.bold, color: palette.text },
  em: { fontFamily: fonts.regular, fontStyle: 'italic' as const },
  heading1: { fontFamily: fonts.bold, fontSize: 18, color: palette.secondary, marginVertical: 6 },
  heading2: { fontFamily: fonts.bold, fontSize: 16, color: palette.secondary, marginVertical: 4 },
  heading3: { fontFamily: fonts.semibold, fontSize: 15, color: palette.secondary, marginVertical: 4 },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  list_item: { fontFamily: fonts.regular, fontSize: 15, color: palette.text },
  code_inline: {
    fontFamily: fonts.medium,
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 2,
    borderRadius: 4,
  },
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  list: { flex: 1, backgroundColor: 'transparent' },
  header: { paddingHorizontal: space.padH, paddingBottom: 12, gap: 6 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.bold, fontSize: 24, color: palette.secondary },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  clearText: { fontFamily: fonts.medium, fontSize: 12, color: palette.textSecondary },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: palette.textSecondary,
    lineHeight: 18,
  },
  status: {
    marginHorizontal: space.padH,
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(13,148,136,0.10)',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(13,148,136,0.30)',
  },
  statusTxt: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: palette.secondary,
    textAlign: 'center',
  },
  row: { flexDirection: 'row', justifyContent: 'flex-start' },
  rowMine: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '100%',
    padding: 14,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  bubbleOther: { borderColor: glass.stroke, backgroundColor: glass.fillStrong },
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
    maxHeight: 120,
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
