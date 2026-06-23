import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { theme, radii } from '@/src/lib/theme';

type Props = TextInputProps & { label?: string; errorText?: string; testID?: string };

export function Input({ label, errorText, style, testID, ...rest }: Props) {
  return (
    <View style={{ marginBottom: 14 }}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        testID={testID}
        placeholderTextColor={theme.textMute}
        style={[styles.input, !!errorText && { borderColor: theme.red }, style]}
        {...rest}
      />
      {!!errorText && <Text style={styles.err}>{errorText}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: theme.textDim, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 },
  input: {
    backgroundColor: theme.bg2,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: theme.text,
    fontSize: 16,
  },
  err: { color: theme.red, marginTop: 6, fontSize: 12 },
});
