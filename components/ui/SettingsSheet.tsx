import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fonts, glass, palette, radii } from '../../constants/designTokens';
import { useLanguage, useT } from '../../i18n/LanguageContext';
import { LANGUAGES, findLanguage } from '../../i18n/languages';
import { T } from '../../i18n/T';
import { usePatient } from '../../state/PatientContext';

interface Props {
  /** Render the trigger as a small icon-only round button (top-right of a header). */
  compact?: boolean;
  tint?: 'light' | 'dark';
}

/**
 * Settings entry-point: a gear icon that opens a modal sheet with two
 * sections — Language and Current monitored patient.
 */
export function SettingsSheet({ compact = true, tint = 'light' }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => {
          if (Platform.OS !== 'web') Haptics.selectionAsync();
          setOpen(true);
        }}
        accessibilityLabel="Open settings"
        hitSlop={8}
        style={({ pressed }) => [
          styles.trigger,
          compact && styles.triggerCompact,
          tint === 'dark' && styles.triggerDark,
          pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
        ]}
      >
        <Feather
          name="settings"
          size={compact ? 18 : 20}
          color={tint === 'dark' ? palette.white : palette.primary}
        />
        {!compact && (
          <Text style={[styles.triggerText, tint === 'dark' && { color: palette.white }]}>
            <T>Settings</T>
          </Text>
        )}
      </Pressable>

      <SettingsModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang, setLanguage } = useLanguage();
  const { patients, active, setActive } = usePatient();

  const title = useT('Settings');
  const langSection = useT('Language');
  const patientSection = useT('Current patient');
  const langFooter = useT('Auto-translated via MyMemory · cached locally after first load.');
  const patientFooter = useT('Switching patient updates the assessment context across the app.');

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Feather name="x" size={20} color={palette.textSecondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
            <View style={styles.sectionHeader}>
              <Feather name="globe" size={16} color={palette.primary} />
              <Text style={styles.sectionTitle}>{langSection}</Text>
            </View>
            <View style={styles.cardWrap}>
              {LANGUAGES.map((l) => {
                const activeLang = l.code === lang;
                return (
                  <Pressable
                    key={l.code}
                    onPress={async () => {
                      await setLanguage(l.code);
                    }}
                    style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowName, activeLang && styles.rowNameActive]}>
                        {l.native}
                      </Text>
                      <Text style={styles.rowMeta}>
                        {l.name} · {l.code.toUpperCase()}
                      </Text>
                    </View>
                    {activeLang && (
                      <Feather name="check" size={18} color={palette.primary} />
                    )}
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.footerNote}>{langFooter}</Text>

            <View style={[styles.sectionHeader, { marginTop: 22 }]}>
              <Feather name="user" size={16} color={palette.primary} />
              <Text style={styles.sectionTitle}>{patientSection}</Text>
            </View>
            <View style={styles.cardWrap}>
              {patients.map((p) => {
                const isActive = p.id === active.id;
                const dot =
                  p.status === 'good'
                    ? palette.statusGood
                    : p.status === 'monitor'
                      ? palette.statusMonitor
                      : palette.statusAlert;
                return (
                  <Pressable
                    key={p.id}
                    onPress={async () => {
                      await setActive(p.id);
                    }}
                    style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
                  >
                    <View style={[styles.statusDot, { backgroundColor: dot }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowName, isActive && styles.rowNameActive]}>
                        {p.caseId}
                      </Text>
                      <Text style={styles.rowMeta}>
                        <T>{p.label}</T>
                      </Text>
                    </View>
                    {isActive && (
                      <Feather name="check" size={18} color={palette.primary} />
                    )}
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.footerNote}>{patientFooter}</Text>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: glass.fillStrong,
    borderWidth: 1,
    borderColor: glass.stroke,
    flexDirection: 'row',
    gap: 6,
  },
  triggerCompact: {
    paddingHorizontal: 0,
  },
  triggerDark: {
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    borderColor: 'rgba(255,255,255,0.25)',
  },
  triggerText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: palette.primary,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: palette.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontFamily: fonts.bold, fontSize: 22, color: palette.secondary },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    letterSpacing: 0.4,
    color: palette.textSecondary,
    textTransform: 'uppercase',
  },
  cardWrap: {
    borderWidth: 1,
    borderColor: palette.borderLight,
    borderRadius: radii.md,
    backgroundColor: 'rgba(248,250,252,0.6)',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderLight,
    gap: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowName: { fontFamily: fonts.semibold, fontSize: 16, color: palette.secondary },
  rowNameActive: { color: palette.primary },
  rowMeta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: palette.textTertiary,
    marginTop: 2,
  },
  footerNote: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: palette.textTertiary,
    marginTop: 8,
    paddingHorizontal: 4,
  },
});
