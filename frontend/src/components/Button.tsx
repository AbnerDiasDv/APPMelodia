import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme, radii } from '@/src/lib/theme';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  testID?: string;
  fullWidth?: boolean;
};

export function Button({ title, onPress, variant = 'primary', loading, disabled, icon, testID, fullWidth = true }: Props) {
  const bg =
    variant === 'primary' ? theme.primary :
    variant === 'secondary' ? theme.bg3 :
    variant === 'outline' ? 'transparent' :
    variant === 'danger' ? theme.red :
    'transparent';
  const border = variant === 'outline' ? theme.border : 'transparent';
  const color = variant === 'outline' || variant === 'ghost' ? theme.text : variant === 'primary' ? '#0c0c0c' : theme.text;

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        styles.btn,
        { backgroundColor: bg, borderColor: border, borderWidth: variant === 'outline' ? 1.5 : 0 },
        (disabled || loading) && { opacity: 0.5 },
        fullWidth && { alignSelf: 'stretch' },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text style={[styles.txt, { color, marginLeft: icon ? 8 : 0 }]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radii.pill,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  txt: { fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
});
