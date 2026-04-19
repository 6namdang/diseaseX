import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fonts, glass, palette, radii } from '../../constants/designTokens';
import { wipeAllData } from '../../db/database';
import { upsertPatient } from '../../db/patientRepo';
import { usePatient } from '../../hooks/usePatient';
import { useLanguage, useT } from '../../i18n/LanguageContext';
import { LANGUAGES } from '../../i18n/languages';
import { T } from '../../i18n/T';

interface Props {
  /** Render the trigger as a small icon-only round button (top-right of a header). */
  compact?: boolean;
  tint?: 'light' | 'dark';
}

/**
 * Settings entry-point: a gear icon that opens a modal sheet with two
 * sections — Language and Profile (single-patient view + maintenance actions).
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
  const db = useSQLiteContext();
  const { lang, setLanguage } = useLanguage();
  const { patient, refresh } = usePatient();
  const [wiping, setWiping] = useState(false);

  const title = useT('Settings');
  const langSection = useT('Language');
  const profileSection = useT('Profile');
  const dangerSection = useT('Data');
  const langFooter = useT(
    'Auto-translated via MyMemory · cached locally after first load.',
  );
  const profileFooter = useT(
    'Your profile lives only on this device (SQLite). Resetting wipes all local data.',
  );

  const handleLanguage = async (code: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    await setLanguage(code);
    if (patient?.onboardingCompletedAt) {
      try {
        await upsertPatient(db, { preferredLanguage: code });
        await refresh();
      } catch {
        // UI still reflects the language via AsyncStorage
      }
    }
  };

  const openEdit = () => {
    onClose();
    router.push('/welcome');
  };

  const handleReset = () => {
    Alert.alert(
      'Reset all data?',
      'This permanently deletes your profile, assessments, smears, escalations and chat history from this device. You will be returned to onboarding.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            try {
              setWiping(true);
              await wipeAllData(db);
              await refresh();
              onClose();
              router.replace('/welcome');
            } catch (e) {
              Alert.alert('Could not reset', String(e));
            } finally {
              setWiping(false);
            }
          },
        },
      ],
    );
  };

  const readable = (v: unknown): string => {
    if (v === null || v === undefined || v === '') return '—';
    return String(v);
  };

  const pregnancyText = (): string => {
    if (patient?.isPregnant !== true) return '';
    if (patient.pregnancyTrimester) return ` · T${patient.pregnancyTrimester}`;
    return ' · pregnant';
  };

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

          <ScrollView
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
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
                    onPress={() => handleLanguage(l.code)}
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
              <Text style={styles.sectionTitle}>{profileSection}</Text>
            </View>

            {!patient?.onboardingCompletedAt ? (
              <View style={styles.emptyCard}>
                <Text style={styles.rowMeta}>
                  <T>No profile yet. Complete onboarding to get started.</T>
                </Text>
                <Pressable
                  onPress={openEdit}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { marginTop: 10 },
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text style={styles.primaryBtnText}>
                    <T>Start onboarding</T>
                  </Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.cardWrap}>
                  <ProfileRow
                    icon="user"
                    label="Name"
                    value={`${readable(patient.name)}${patient.age != null ? ` · ${patient.age} yrs` : ''}${
                      patient.sex ? ` · ${patient.sex}` : ''
                    }${pregnancyText()}`}
                  />
                  <ProfileRow
                    icon="map-pin"
                    label="Location"
                    value={`${readable(patient.countryName ?? patient.countryCode)}${
                      patient.endemicity ? ` · ${patient.endemicity}` : ''
                    }`}
                  />
                  <ProfileRow
                    icon="bell"
                    label="Clinician"
                    value={`${readable(patient.clinicianName)}${
                      patient.clinicianAlertTopic
                        ? ` · ntfy/${patient.clinicianAlertTopic}`
                        : ''
                    }`}
                  />
                  {patient.allergies.length > 0 && (
                    <ProfileRow
                      icon="alert-circle"
                      label="Allergies"
                      value={patient.allergies.join(', ')}
                    />
                  )}
                  {patient.currentMedications.length > 0 && (
                    <ProfileRow
                      icon="thermometer"
                      label="Medications"
                      value={patient.currentMedications.join(', ')}
                    />
                  )}
                  {patient.chronicConditions.length > 0 && (
                    <ProfileRow
                      icon="heart"
                      label="Conditions"
                      value={patient.chronicConditions.join(', ')}
                    />
                  )}
                </View>

                <View style={styles.actionsRow}>
                  <Pressable
                    onPress={openEdit}
                    style={({ pressed }) => [
                      styles.secondaryBtn,
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <Feather name="edit-2" size={14} color={palette.primary} />
                    <Text style={styles.secondaryBtnText}>
                      <T>Edit profile</T>
                    </Text>
                  </Pressable>
                </View>
              </>
            )}

            <View style={[styles.sectionHeader, { marginTop: 22 }]}>
              <Feather name="trash-2" size={16} color={palette.statusAlert} />
              <Text style={[styles.sectionTitle, { color: palette.statusAlert }]}>
                {dangerSection}
              </Text>
            </View>
            <Pressable
              disabled={wiping}
              onPress={handleReset}
              style={({ pressed }) => [
                styles.dangerBtn,
                wiping && { opacity: 0.6 },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Feather name="trash-2" size={14} color={palette.statusAlert} />
              <Text style={styles.dangerBtnText}>
                <T>{wiping ? 'Resetting…' : 'Reset all data'}</T>
              </Text>
            </Pressable>
            <Text style={styles.footerNote}>{profileFooter}</Text>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ProfileRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <Feather name={icon} size={16} color={palette.primary} />
      <View style={{ flex: 1 }}>
        <Text style={styles.profileLabel}>
          <T>{label}</T>
        </Text>
        <Text style={styles.rowName}>{value}</Text>
      </View>
    </View>
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
  triggerCompact: { paddingHorizontal: 0 },
  triggerDark: {
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    borderColor: 'rgba(255,255,255,0.25)',
  },
  triggerText: { fontFamily: fonts.semibold, fontSize: 13, color: palette.primary },
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
    maxHeight: '88%',
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
  rowName: { fontFamily: fonts.semibold, fontSize: 15, color: palette.secondary },
  rowNameActive: { color: palette.primary },
  rowMeta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: palette.textTertiary,
    marginTop: 2,
  },
  profileLabel: {
    fontFamily: fonts.medium,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: palette.textTertiary,
    marginBottom: 2,
  },
  footerNote: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: palette.textTertiary,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: palette.borderLight,
    borderRadius: radii.md,
    padding: 16,
    backgroundColor: 'rgba(248,250,252,0.6)',
  },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: glass.stroke,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  secondaryBtnText: { fontFamily: fonts.semibold, fontSize: 13, color: palette.primary },
  primaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.sm,
    backgroundColor: palette.primary,
    alignSelf: 'flex-start',
  },
  primaryBtnText: { fontFamily: fonts.semibold, fontSize: 13, color: palette.white },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: `${palette.statusAlert}40`,
    backgroundColor: `${palette.statusAlert}10`,
  },
  dangerBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: palette.statusAlert,
  },
});
