import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/theme';
import { useAppState } from '../../store/AppContext';

const PROVINCES = [
  { name: 'Kwango',    high_risk: true  },
  { name: 'Kinshasa',  high_risk: false },
  { name: 'Kasai',     high_risk: true  },
  { name: 'Kivu',      high_risk: true  },
  { name: 'Katanga',   high_risk: false },
  { name: 'Equateur',  high_risk: true  },
];

export default function IntakeScreen() {
  const router = useRouter();
  const { setPatient, reset } = useAppState();

  const [age,      setAge]      = useState('');
  const [weight,   setWeight]   = useState('');
  const [village,  setVillage]  = useState('');
  const [province, setProvince] = useState<typeof PROVINCES[0] | null>(null);

  const handleNext = () => {
    if (!age || !weight || !province) {
      Alert.alert('Missing Info', 'Please enter age, weight, and select a province.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    reset();
    setPatient({
      id:                   `PT-${Date.now()}`,
      age:                  parseInt(age),
      weight_kg:            parseFloat(weight),
      location:             province.name,
      village:              village || undefined,
      high_prevalence_zone: province.high_risk,
    });
    router.push('/triage');
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.dot} />
          <Text style={s.appName}>DISEASE X</Text>
        </View>

        <Text style={s.title}>New Patient</Text>
        <Text style={s.subtitle}>Step 1 of 3 — Intake & Location</Text>

        {/* Progress bar */}
        <View style={s.progressWrap}>
          <View style={[s.progressStep, s.progressActive]} />
          <View style={s.progressStep} />
          <View style={s.progressStep} />
        </View>

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
          <Text style={s.label}>Village (optional)</Text>
          <TextInput
            style={[s.input, { marginBottom: 0 }]}
            value={village}
            onChangeText={setVillage}
            placeholder="e.g. Panzi"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        {/* Province selector */}
        <View style={s.card}>
          <Text style={s.cardTitle}>PROVINCE / REGION</Text>
          {PROVINCES.map(p => {
            const selected = province?.name === p.name;
            return (
              <TouchableOpacity
                key={p.name}
                style={[s.provinceRow, selected && s.provinceRowActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setProvince(p);
                }}
              >
                <View style={s.provinceLeft}>
                  <Ionicons
                    name="location"
                    size={16}
                    color={selected ? COLORS.accent : COLORS.textMuted}
                  />
                  <Text style={[s.provinceName, selected && { color: COLORS.text }]}>
                    {p.name}
                  </Text>
                </View>
                <View style={[s.riskBadge, p.high_risk ? s.riskHigh : s.riskLow]}>
                  <Text style={[s.riskText, { color: p.high_risk ? COLORS.red : COLORS.green }]}>
                    {p.high_risk ? 'HIGH RISK' : 'LOW RISK'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* High risk warning */}
        {province?.high_risk && (
          <View style={s.warningBox}>
            <Ionicons name="warning" size={18} color={COLORS.yellow} />
            <Text style={s.warningText}>
              {province.name} is a high-prevalence malaria zone.
              Malaria probability index is elevated for this patient.
            </Text>
          </View>
        )}

        {/* Next */}
        <TouchableOpacity onPress={handleNext}>
          <LinearGradient
            colors={[COLORS.accent, '#0080CC']}
            style={s.nextBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={s.nextText}>NEXT — CHECK SEVERE SIGNS</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: COLORS.bg },
  scroll:            { paddingHorizontal: 16 },
  header:            { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 16, paddingBottom: 4 },
  dot:               { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.red },
  appName:           { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  title:             { color: COLORS.text, fontSize: 28, fontWeight: '800', marginTop: 8 },
  subtitle:          { color: COLORS.textSecondary, fontSize: 14, marginTop: 4, marginBottom: 16 },
  progressWrap:      { flexDirection: 'row', gap: 6, marginBottom: 20 },
  progressStep:      { flex: 1, height: 4, borderRadius: 2, backgroundColor: COLORS.border },
  progressActive:    { backgroundColor: COLORS.accent },
  card:              { backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 16, marginBottom: 16 },
  cardTitle:         { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 14 },
  row:               { flexDirection: 'row', gap: 12, marginBottom: 16 },
  inputGroup:        { flex: 1 },
  label:             { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  input:             { backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, color: COLORS.text, fontSize: 16 },
  provinceRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, marginBottom: 8, backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.border },
  provinceRowActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentDim },
  provinceLeft:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  provinceName:      { color: COLORS.textSecondary, fontSize: 15, fontWeight: '600' },
  riskBadge:         { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  riskHigh:          { backgroundColor: COLORS.redDim, borderColor: COLORS.red + '40' },
  riskLow:           { backgroundColor: COLORS.greenDim, borderColor: COLORS.green + '40' },
  riskText:          { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  warningBox:        { flexDirection: 'row', gap: 10, backgroundColor: COLORS.yellowDim, borderWidth: 1, borderColor: COLORS.yellow + '40', borderRadius: 14, padding: 14, marginBottom: 16 },
  warningText:       { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20, flex: 1 },
  nextBtn:           { borderRadius: 14, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  nextText:          { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1 },
});