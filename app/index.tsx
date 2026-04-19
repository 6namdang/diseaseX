import { Redirect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { palette } from '../constants/designTokens';
import { isOnboarded } from '../db/patientRepo';

export default function Index() {
  const db = useSQLiteContext();
  const [route, setRoute] = useState<'welcome' | 'tabs' | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ok = await isOnboarded(db);
        if (!cancelled) setRoute(ok ? 'tabs' : 'welcome');
      } catch {
        if (!cancelled) setRoute('welcome');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db]);

  if (route === null) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: palette.background,
        }}
      >
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  if (route === 'welcome') return <Redirect href="/welcome" />;
  return <Redirect href="/(tabs)" />;
}
