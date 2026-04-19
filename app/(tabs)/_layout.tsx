import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { fonts, glass, palette, signal } from '../../constants/designTokens';
import { useContentInsets } from '../../hooks/useContentInsets';
import { useT } from '../../i18n/LanguageContext';

function TabIcon({
  name,
  color,
  size,
  focused,
}: {
  name: keyof typeof Feather.glyphMap;
  color: string;
  size: number;
  focused: boolean;
}) {
  return (
    <View style={styles.iconWrap}>
      {focused && <View style={styles.activeGlow} />}
      <Feather name={name} size={size} color={color} />
    </View>
  );
}

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
        tabBarActiveTintColor: signal.base,
        tabBarInactiveTintColor: palette.textTertiary,
        tabBarStyle: {
          backgroundColor: 'rgba(7,8,11,0.75)',
          borderTopColor: glass.strokeSoft,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 68 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 10,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={{ flex: 1, backgroundColor: 'rgba(7,8,11,0.95)' }} />
          ),
        tabBarLabelStyle: {
          fontFamily: fonts.medium,
          fontSize: 10,
          letterSpacing: 0.4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: tHome,
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="home" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="assessments"
        options={{
          title: tAssess,
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="activity" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="smear"
        options={{
          title: tSmear,
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="droplet" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: tChat,
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="message-circle" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: tHistory,
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="list" color={color} size={size} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeGlow: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: signal.glowSoft,
  },
});
