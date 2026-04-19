import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { hairline } from '../../constants/designTokens';

type Props = {
  tone?: 'thin' | 'default' | 'strong';
  vertical?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Hairline({ tone = 'default', vertical = false, style }: Props) {
  return (
    <View
      style={[
        vertical ? styles.vertical : styles.horizontal,
        { backgroundColor: hairline[tone] },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  horizontal: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  vertical: {
    width: StyleSheet.hairlineWidth,
    height: '100%',
  },
});
