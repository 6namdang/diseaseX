import { View, Text } from 'react-native';
import { COLORS } from '../../constants/theme';

export default function DosingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg,
      alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: COLORS.text }}>Dosing</Text>
    </View>
  );
}