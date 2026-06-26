import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LogIn, Music4, Eye, EyeOff } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/src/components/Button';
import { Input } from '@/src/components/Input';
import { useAuth } from '@/src/lib/auth';
import { useToast } from '@/src/components/Toast';
import { theme } from '@/src/lib/theme';

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const { show } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [err, setErr] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const e: typeof err = {};
    if (!email.includes('@')) e.email = 'E-mail inválido';
    if (password.length < 6) e.password = 'Mínimo de 6 caracteres';
    setErr(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      show('Bem-vindo de volta!', 'success');
    } catch (e: any) {
      show(e?.message || 'Falha no login', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Music4 size={40} color={theme.primary} strokeWidth={2.5} />
            <Text style={styles.brandText}>Harmonia</Text>
          </View>
          <Text style={styles.title}>Entre na sua conta</Text>
          <Text style={styles.subtitle}>Continue sua jornada musical</Text>

          <View style={styles.form}>
            <Input
              testID="login-email-input"
              label="E-mail"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              placeholder="voce@email.com"
              errorText={err.email}
            />
            <View style={{ position: 'relative' }}>
              <Input
                testID="login-password-input"
                label="Senha"
                secureTextEntry={!showPwd}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                errorText={err.password}
              />
              <TouchableOpacity
                testID="toggle-password-visibility"
                onPress={() => setShowPwd((s) => !s)}
                activeOpacity={0.7}
                style={{ position: 'absolute', right: 8, top: 32, padding: 10 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {showPwd ? (
                  <EyeOff size={20} color="#A1A1AA" strokeWidth={2} />
                ) : (
                  <Eye size={20} color="#A1A1AA" strokeWidth={2} />
                )}
              </TouchableOpacity>
            </View>
            <Button testID="login-submit-button" title="Entrar" onPress={submit} loading={loading} icon={<LogIn size={18} color="#0c0c0c" strokeWidth={3} />} />
          </View>

          <View style={styles.altRow}>
            <Text style={styles.altTxt}>Ainda não tem conta? </Text>
            <TouchableOpacity testID="go-to-register-link" onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.altLink}>Cadastre-se</Text>
            </TouchableOpacity>
          </View>

          
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 40, paddingBottom: 40 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32 },
  brandText: { color: theme.text, fontSize: 28, fontWeight: '900', letterSpacing: -0.8 },
  title: { color: theme.text, fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  subtitle: { color: theme.textDim, fontSize: 15, marginTop: 4, marginBottom: 28 },
  form: { marginTop: 4 },
  altRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 22 },
  altTxt: { color: theme.textDim, fontSize: 14 },
  altLink: { color: theme.primary, fontWeight: '800', fontSize: 14 },
});
