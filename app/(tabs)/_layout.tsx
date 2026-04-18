import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { fonts, glass, palette } from '../../constants/designTokens';
import { useContentInsets } from '../../hooks/useContentInsets';
import { useT } from '../../i18n/LanguageContext';

function TabLabel({ source, color }: { source: string; color: string }) {
  const text = useT(source);
  return (
    <Text
      numberOfLines={1}
      style={{
        fontFamily: fonts.medium,
        fontSize: 11,
        letterSpacing: 0.2,
        color,
      }}
    >
      {text}
    </Text>
  );
}

export default function TabLayout() {
  const insets = useContentInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textTertiary,
        tabBarStyle: {
          backgroundColor: Platform.OS === 'ios' ? 'rgba(248,250,252,0.4)' : 'rgba(248,250,252,0.94)',
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
          title: 'Home',
          tabBarLabel: ({ color }) => <TabLabel source="Home" color={color} />,
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="assessments"
        options={{
          title: 'Assess',
          tabBarLabel: ({ color }) => <TabLabel source="Assess" color={color} />,
          tabBarIcon: ({ color, size }) => <Feather name="activity" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          title: 'Queue',
          tabBarLabel: ({ color }) => <TabLabel source="Queue" color={color} />,
          tabBarIcon: ({ color, size }) => <Feather name="layers" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarLabel: ({ color }) => <TabLabel source="Chat" color={color} />,
          tabBarIcon: ({ color, size }) => <Feather name="message-circle" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
