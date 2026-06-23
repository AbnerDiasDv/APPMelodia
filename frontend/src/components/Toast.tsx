// Toast simples: provider monta um overlay em alto z-index dentro do root layout.
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { theme, radii } from '@/src/lib/theme';

type Variant = 'success' | 'error' | 'info';
type ToastApi = { show: (msg: string, variant?: Variant) => void };

const Ctx = createContext<ToastApi | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ msg: string; variant: Variant } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string, variant: Variant = 'info') => {
    setState({ msg, variant });
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
        setState(null),
      );
    }, 2800);
  }, [opacity]);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {state && (
        <Animated.View
          pointerEvents="none"
          testID="app-toast"
          style={[styles.toast, { opacity }, state.variant === 'error' && { borderColor: theme.red }, state.variant === 'success' && { borderColor: theme.green }]}
        >
          <View style={[styles.dot, state.variant === 'success' && { backgroundColor: theme.green }, state.variant === 'error' && { backgroundColor: theme.red }, state.variant === 'info' && { backgroundColor: theme.primary }]} />
          <Text style={styles.txt}>{state.msg}</Text>
        </Animated.View>
      )}
    </Ctx.Provider>
  );
}

export function useToast() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useToast fora do ToastProvider');
  return v;
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: theme.bg2,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radii.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 9999,
    elevation: 12,
  },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.primary },
  txt: { color: theme.text, flex: 1, fontWeight: '600' },
});
