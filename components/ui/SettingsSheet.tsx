import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { fonts, glass, palette, radii } from '../../constants/designTokens';
import { useLanguage, useT } from '../../i18n/LanguageContext';
import { LANGUAGES } from '../../i18n/languages';
import { T } from '../../i18n/T';
import { usePatient, type PatientStatus } from '../../state/PatientContext';

interface Props {
  /** Render the trigger as a small icon-only round button (top-right of a header). */
  compact?: boolean;
  tint?: 'light' | 'dark';
}

/**
 * Settings entry-point: a gear icon that opens a modal sheet with two
 * sections — Language and Patients (active selection + add/remove).
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

const STATUS_OPTIONS: { id: PatientStatus; label: string; color: string }[] = [
  { id: 'good', label: 'Stable', color: palette.statusGood },
  { id: 'monitor', label: 'Monitor', color: palette.statusMonitor },
  { id: 'alert', label: 'Alert', color: palette.statusAlert },
];

function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang, setLanguage } = useLanguage();
  const { patients, active, setActive, addPatient, removePatient } = usePatient();

  const [showForm, setShowForm] = useState(false);
  const [newCaseId, setNewCaseId] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newStatus, setNewStatus] = useState<PatientStatus>('monitor');
  const [saving, setSaving] = useState(false);

  const title = useT('Settings');
  const langSection = useT('Language');
  const patientSection = useT('Patients');
  const langFooter = useT('Auto-translated via MyMemory · cached locally after first load.');
  const patientFooter = useT('Patients are stored locally on this device (SQLite).');
  const addLabel = useT('Add patient');
  const cancelLabel = useT('Cancel');
  const saveLabel = useT('Save patient');
  const caseIdPh = useT('Case ID (e.g. PT-205)');
  const labelPh = useT('Short description (e.g. Suspected malaria)');
  const removeText = useT('Remove');
  const removeConfirm = useT('Remove patient?');
  const removeConfirmBody = useT('This deletes the patient and all of their assessments from this device.');

  const resetForm = () => {
    setShowForm(false);
    setNewCaseId('');
    setNewLabel('');
    setNewStatus('monitor');
    setSaving(false);
  };

  const handleSave = async () => {
    if (!newCaseId.trim() || !newLabel.trim()) {
      Alert.alert('Missing info', 'Please enter both a case ID and a description.');
      return;
    }
    try {
      setSaving(true);
      const created = await addPatient({
        caseId: newCaseId.trim(),
        label: newLabel.trim(),
        status: newStatus,
      });
      await setActive(created.id);
      resetForm();
    } catch (e) {
      Alert.alert('Could not add patient', String(e));
      setSaving(false);
    }
  };

  const handleRemove = (id: string, caseId: string) => {
    Alert.alert(
      `${removeConfirm}`,
      `${caseId}\n${removeConfirmBody}`,
      [
        { text: cancelLabel, style: 'cancel' },
        {
          text: removeText,
          style: 'destructive',
          onPress: async () => {
            try {
              await removePatient(id);
            } catch (e) {
              Alert.alert('Could not remove', String(e));
            }
          },
        },
      ],
    );
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
                    {activeLang && <Feather name="check" size={18} color={palette.primary} />}
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.footerNote}>{langFooter}</Text>

            <View style={[styles.sectionHeader, { marginTop: 22, justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="users" size={16} color={palette.primary} />
                <Text style={styles.sectionTitle}>{patientSection}</Text>
              </View>
              {!showForm && (
                <Pressable
                  onPress={() => setShowForm(true)}
                  style={({ pressed }) => [
                    styles.addBtn,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Feather name="plus" size={14} color={palette.primary} />
                  <Text style={styles.addBtnText}>{addLabel}</Text>
                </Pressable>
              )}
            </View>

            {showForm && (
              <View style={styles.formCard}>
                <TextInput
                  style={styles.input}
                  placeholder={caseIdPh}
                  placeholderTextColor={palette.textTertiary}
                  value={newCaseId}
                  onChangeText={setNewCaseId}
                  autoCapitalize="characters"
                />
                <TextInput
                  style={styles.input}
                  placeholder={labelPh}
                  placeholderTextColor={palette.textTertiary}
                  value={newLabel}
                  onChangeText={setNewLabel}
                />
                <View style={styles.statusRow}>
                  {STATUS_OPTIONS.map((s) => {
                    const isActive = s.id === newStatus;
                    return (
                      <Pressable
                        key={s.id}
                        onPress={() => setNewStatus(s.id)}
                        style={[
                          styles.statusChip,
                          { borderColor: isActive ? s.color : glass.stroke },
                          isActive && { backgroundColor: `${s.color}1A` },
                        ]}
                      >
                        <View style={[styles.statusChipDot, { backgroundColor: s.color }]} />
                        <Text
                          style={[
                            styles.statusChipText,
                            isActive && { color: s.color, fontFamily: fonts.semibold },
                          ]}
                        >
                          <T>{s.label}</T>
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.formActions}>
                  <Pressable
                    onPress={resetForm}
                    style={({ pressed }) => [
                      styles.secondaryBtn,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text style={styles.secondaryBtnText}>{cancelLabel}</Text>
                  </Pressable>
                  <Pressable
                    disabled={saving}
                    onPress={handleSave}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      saving && { opacity: 0.6 },
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <Text style={styles.primaryBtnText}>{saveLabel}</Text>
                  </Pressable>
                </View>
              </View>
            )}

            <View style={styles.cardWrap}>
              {patients.length === 0 && (
                <View style={[styles.row, { borderBottomWidth: 0 }]}>
                  <Text style={styles.rowMeta}>
                    <T>No patients yet. Tap “Add patient” to start.</T>
                  </Text>
                </View>
              )}
              {patients.map((p) => {
                const isActive = p.id === active?.id;
                const dot =
                  p.status === 'good'
                    ? palette.statusGood
                    : p.status === 'monitor'
                      ? palette.statusMonitor
                      : palette.statusAlert;
                return (
                  <View key={p.id} style={styles.row}>
                    <Pressable
                      onPress={async () => {
                        await setActive(p.id);
                      }}
                      style={({ pressed }) => [
                        { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
                        pressed && { opacity: 0.85 },
                      ]}
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
                      {isActive && <Feather name="check" size={18} color={palette.primary} />}
                    </Pressable>
                    <Pressable
                      onPress={() => handleRemove(p.id, p.caseId)}
                      hitSlop={10}
                      style={({ pressed }) => [
                        styles.deleteBtn,
                        pressed && { opacity: 0.7 },
                      ]}
                      accessibilityLabel={`Remove ${p.caseId}`}
                    >
                      <Feather name="trash-2" size={16} color={palette.statusAlert} />
                    </Pressable>
                  </View>
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
    gap: 8,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: glass.stroke,
    backgroundColor: glass.fill,
  },
  addBtnText: { fontFamily: fonts.semibold, fontSize: 12, color: palette.primary },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${palette.statusAlert}10`,
  },
  formCard: {
    borderWidth: 1,
    borderColor: glass.stroke,
    borderRadius: radii.md,
    padding: 12,
    gap: 10,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  input: {
    borderWidth: 1,
    borderColor: glass.stroke,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: palette.text,
    backgroundColor: palette.white,
  },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  statusChipDot: { width: 8, height: 8, borderRadius: 4 },
  statusChipText: { fontFamily: fonts.medium, fontSize: 12, color: palette.textSecondary },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  secondaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: glass.stroke,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  secondaryBtnText: { fontFamily: fonts.semibold, fontSize: 13, color: palette.textSecondary },
  primaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.sm,
    backgroundColor: palette.primary,
  },
  primaryBtnText: { fontFamily: fonts.semibold, fontSize: 13, color: palette.white },
});
