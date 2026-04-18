import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { ONBOARDING_KEY } from '../constants/appStorage';
import { palette } from '../constants/designTokens';

export default function Index() {
  const [route, setRoute] = useState<'welcome' | 'tabs' | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const v = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (!cancelled) setRoute(v === '1' ? 'tabs' : 'welcome');
      } catch {
        if (!cancelled) setRoute('welcome');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (route === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background }}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  if (route === 'welcome') return <Redirect href="/welcome" />;
  return <Redirect href="/(tabs)" />;
}
