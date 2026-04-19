import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { fonts, glass, palette } from '../../constants/designTokens';
import { useContentInsets } from '../../hooks/useContentInsets';
import { useT } from '../../i18n/LanguageContext';

export default function TabLayout() {
  const insets = useContentInsets();
  const tHome = useT('Home');
  const tAssess = useT('Assess');
  const tSmear = useT('Smear');
  const tChat = useT('Chat');
  const tHistory = useT('History');
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textTertiary,
        tabBarStyle: {
          backgroundColor:
            Platform.OS === 'ios' ? 'rgba(248,250,252,0.4)' : 'rgba(248,250,252,0.94)',
          borderTopColor: glass.strokeSoft,
          borderTopWidth: 1,
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 8,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={{ flex: 1, backgroundColor: 'rgba(248,250,252,0.92)' }} />
          ),
        tabBarLabelStyle: {
          fontFamily: fonts.medium,
          fontSize: 11,
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: tHome,
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="assessments"
        options={{
          title: tAssess,
          tabBarIcon: ({ color, size }) => (
            <Feather name="activity" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="smear"
        options={{
          title: tSmear,
          tabBarIcon: ({ color, size }) => (
            <Feather name="droplet" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: tChat,
          tabBarIcon: ({ color, size }) => (
            <Feather name="message-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: tHistory,
          tabBarIcon: ({ color, size }) => <Feather name="list" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
