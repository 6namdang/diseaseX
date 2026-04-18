import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { useAppState } from '../../store/AppContext';
import { submitTriage } from '../../services/api';

const SYMPTOMS = [
  { key: 'fever_high',           label: 'High Fever',           desc: '≥ 38.5°C',                   danger: false },
  { key: 'anemia',               label: 'Anemia Signs',         desc: 'Pale palms or eyes',          danger: false },
  { key: 'respiratory_distress', label: 'Breathing Difficulty', desc: 'Fast or labored breathing',   danger: false },
  { key: 'vomiting',             label: 'Vomiting',             desc: 'Repeated vomiting',           danger: false },
  { key: 'diarrhea',             label: 'Diarrhea',             desc: 'Watery stools',               danger: false },
  { key: 'unable_to_drink',      label: 'Cannot Drink',         desc: 'Refuses or cannot swallow',   danger: true  },
  { key: 'convulsions',          label: 'Convulsions',          desc: 'Seizure activity',            danger: true  },
  { key: 'unconscious',          label: 'Unconscious',          desc: 'Unresponsive or limp',        danger: true  },
];

const LOCATIONS = ['Kwango', 'Kinshasa', 'Kasai', 'Kivu', 'Katanga', 'Equateur'];

export default function TriageScreen() {
  const router = useRouter();
  const { setPatient, setResult } = useAppState();

  const [age, setAge]       = useState('');
  const [weight, setWeight] = useState('');
  const [location, setLocation] = useState('Kwango');
  const [symptoms, setSymptoms] = useState<Record<string, boolean>>({});
  const [loading, setLoading]   = useState(false);

  const toggle = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSymptoms(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const activeCount = Object.values(symptoms).filter(Boolean).length;

  const handleSubmit = async () => {
    if (!age || !weight) {
      Alert.alert('Missing Info', 'Please enter age and weight.');
      return;
    }
    setLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const payload = {
      age:      parseInt(age),
      weight_kg: parseFloat(weight),
      location,
      symptoms,
    };

    setPatient(payload);
    const result = await submitTriage(payload);
    setResult(result);
    setLoading(false);
    router.push('/result');
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.dot} />
          <Text style={s.appName}>DISEASE X</Text>
        </View>

        <Text style={s.title}>Patient Triage</Text>
        <Text style={s.subtitle}>Enter patient info and observed symptoms</Text>

        {/* Patient Info */}
        <View style={s.card}>
          <Text style={s.cardTitle}>PATIENT INFO</Text>
          <View style={s.row}>
            <View style={s.inputGroup}>
              <Text style={s.label}>Age (years)</Text>
              <TextInput
                style={s.input}
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                placeholder="e.g. 4"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            <View style={s.inputGroup}>
              <Text style={s.label}>Weight (kg)</Text>
              <TextInput
                style={s.input}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholder="e.g. 11.5"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </View>

          <Text style={s.label}>Province</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {LOCATIONS.map(loc => (
              <TouchableOpacity
                key={loc}
                style={[s.chip, location === loc && s.chipActive]}
                onPress={() => setLocation(loc)}
              >
                <Text style={[s.chipText, location === loc && s.chipTextActive]}>
                  {loc}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Symptoms */}
        <View style={s.card}>
          <View style={s.cardTitleRow}>
            <Text style={s.cardTitle}>SYMPTOMS</Text>
            {activeCount > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeText}>{activeCount} selected</Text>
              </View>
            )}
          </View>

          {SYMPTOMS.map(sym => {
            const active = !!symptoms[sym.key];
            return (
              <TouchableOpacity
                key={sym.key}
                style={[
                  s.symptomRow,
                  active && (sym.danger ? s.symptomDanger : s.symptomActive),
                ]}
                onPress={() => toggle(sym.key)}
              >
                <View style={s.symptomInfo}>
                  <Text style={[s.symptomLabel, active && { color: COLORS.text }]}>
                    {sym.label}
                  </Text>
                  <Text style={s.symptomDesc}>{sym.desc}</Text>
                </View>
                <View style={[
                  s.checkbox,
                  active && (sym.danger ? s.checkboxDanger : s.checkboxActive),
                ]}>
                  {active && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Submit */}
        <TouchableOpacity onPress={handleSubmit} disabled={loading}>
          <LinearGradient
            colors={loading ? [COLORS.surface, COLORS.surface] : [COLORS.red, '#C41F35']}
            style={s.submitBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="pulse" size={20} color="#fff" />
                  <Text style={s.submitText}>RUN TRIAGE</Text>
                </>
            }
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: COLORS.bg },
  scroll:        { paddingHorizontal: 16 },
  header:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 16, paddingBottom: 4 },
  dot:           { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.red },
  appName:       { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  title:         { color: COLORS.text, fontSize: 28, fontWeight: '800', marginTop: 8 },
  subtitle:      { color: COLORS.textSecondary, fontSize: 14, marginTop: 4, marginBottom: 20 },
  card:          { backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 16, marginBottom: 16 },
  cardTitle:     { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 14 },
  cardTitleRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  badge:         { backgroundColor: COLORS.accent + '20', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText:     { color: COLORS.accent, fontSize: 11, fontWeight: '700' },
  row:           { flexDirection: 'row', gap: 12, marginBottom: 16 },
  inputGroup:    { flex: 1 },
  label:         { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  input:         { backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, color: COLORS.text, fontSize: 16, fontWeight: '600' },
  chip:          { borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, backgroundColor: COLORS.inputBg },
  chipActive:    { backgroundColor: COLORS.accentDim, borderColor: COLORS.accent },
  chipText:      { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  chipTextActive:{ color: COLORS.accent },
  symptomRow:    { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 8, backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.border },
  symptomActive: { borderColor: COLORS.accent + '60', backgroundColor: COLORS.accentDim },
  symptomDanger: { borderColor: COLORS.red + '60', backgroundColor: COLORS.redDim },
  symptomInfo:   { flex: 1 },
  symptomLabel:  { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  symptomDesc:   { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  checkbox:      { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  checkboxActive:{ backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  checkboxDanger:{ backgroundColor: COLORS.red, borderColor: COLORS.red },
  submitBtn:     { borderRadius: 14, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  submitText:    { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
});