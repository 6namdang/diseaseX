import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { glass, gradients } from '../../constants/designTokens';

export function ScreenBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient colors={[...gradients.screen]} locations={[0, 0.32, 0.68, 1]} style={styles.root}>
      <View style={styles.blobA} pointerEvents="none" />
      <View style={styles.blobB} pointerEvents="none" />
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  blobA: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: glass.tint,
  },
  blobB: {
    position: 'absolute',
    bottom: 120,
    left: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(20,184,166,0.06)',
  },
});
