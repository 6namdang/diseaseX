import { StyleSheet, View } from 'react-native';
import { palette } from '../../constants/designTokens';

type Props = {
  children: React.ReactNode;
};

export function ScreenBackdrop({ children }: Props) {
  return <View style={styles.root}>{children}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
});
