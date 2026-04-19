/**
 * Expo Go fallback for the chat tab. Rendered only when the app is running
 * inside the Expo Go client (`Constants.executionEnvironment === 'storeClient'`),
 * where the custom native modules powering on-device RAG (llama.rn,
 * react-native-fs) are not linked. The shim at app/(tabs)/chat.tsx picks
 * between this stub and {@link ./ChatFull} at module-load time.
 *
 * Every other feature of DiseaseX works in Expo Go — push escalation via
 * ntfy.sh, symptom photo capture, assessments, smear analysis (Claude Vision),
 * and history — so this stub simply explains the limitation without blocking
 * the rest of the app.
 */

import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { fonts, glass, palette, radii, shadow, space } from '../../constants/designTokens';
import { useContentInsets } from '../../hooks/useContentInsets';
import { useT } from '../../i18n/LanguageContext';
import { ScreenBackdrop } from '../ui/ScreenBackdrop';

export default function ChatStub() {
  const insets = useContentInsets();
  const tTitle = useT('Malaria Care AI');
  const tHint = useT('Fully offline. Advice is tailored to the profile you saved during onboarding.');
  const tNotAvailableTitle = useT('Chat requires a development build');
  const tNotAvailableBody = useT(
    'On-device chat uses a local language model (llama.rn) that cannot run inside the Expo Go client. Every other feature — assessments, photo capture, push escalation, blood smear analysis, and history — works normally here.',
  );
  const tWhatToDo = useT('To enable chat, launch the app from a development build instead of Expo Go.');

  return (
    <ScreenBackdrop>
      <View style={[styles.flex, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{tTitle}</Text>
          <Text style={styles.hint}>{tHint}</Text>
        </View>

        <View style={styles.center}>
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Feather name="cpu" size={28} color={palette.primary} />
            </View>
            <Text style={styles.cardTitle}>{tNotAvailableTitle}</Text>
            <Text style={styles.cardBody}>{tNotAvailableBody}</Text>
            <View style={styles.divider} />
            <Text style={styles.cardFootnote}>{tWhatToDo}</Text>
          </View>
        </View>
      </View>
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  header: { paddingHorizontal: space.padH, paddingBottom: 12, gap: 6 },
  title: { fontFamily: fonts.bold, fontSize: 24, color: palette.secondary },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: palette.textSecondary,
    lineHeight: 18,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.padH,
  },
  card: {
    alignItems: 'center',
    gap: 12,
    padding: 24,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: glass.stroke,
    backgroundColor: glass.fillStrong,
    ...shadow.card,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${palette.primary}14`,
    borderWidth: 1,
    borderColor: `${palette.primary}33`,
    marginBottom: 4,
  },
  cardTitle: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: palette.secondary,
    textAlign: 'center',
  },
  cardBody: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: palette.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  divider: {
    alignSelf: 'stretch',
    height: 1,
    backgroundColor: glass.strokeSoft,
    marginVertical: 4,
  },
  cardFootnote: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: palette.primary,
    textAlign: 'center',
    lineHeight: 19,
  },
});
