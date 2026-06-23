import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { UserPlus } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/src/components/Button';
import { Input } from '@/src/components/Input';
import { useAuth } from '@/src/lib/auth';
import { useToast } from '@/src/components/Toast';
import { theme } from '@/src/lib/theme';

const INSTRUMENTS = [
  { id: 'violao', label: 'Violão' },
  { id: 'teclado', label: 'Teclado' },
  { id: 'piano', label: 'Piano' },
  { id: 'flauta', label: 'Flauta' },
  { id: 'bateria', label: 'Bateria' },
] as const;

export default function Register() {
  const router = useRouter();
  const { register } = useAuth();
  const { show } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [instrument, setInstrument] = useState<string>('violao');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<{ name?: string; email?: string; password?: string; confirm?: string }>({});

  const validate = () => {
    const e: typeof err = {};
    if (name.trim().length < 2) e.name = 'Informe seu nome';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'E-mail inválido';
    if (password.length < 6) e.password = 'Mínimo de 6 caracteres';
    if (password !== confirm) e.confirm = 'Senhas não coincidem';
    setErr(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await register({ name: name.trim(), email: email.trim().toLowerCase(), password, preferred_instrument: instrument });
      show('Conta criada com sucesso!', 'success');
    } catch (e: any) {
      show(e?.message || 'Falha no cadastro', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Criar conta</Text>
          <Text style={styles.subtitle}>Comece sua jornada no Harmonia</Text>

          <View style={{ marginTop: 24 }}>
            <Input testID="register-name-input" label="Nome" value={name} onChangeText={setName} placeholder="Seu nome" errorText={err.name} />
            <Input testID="register-email-input" label="E-mail" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={email} onChangeText={setEmail} placeholder="voce@email.com" errorText={err.email} />
            <Input testID="register-password-input" label="Senha" secureTextEntry value={password} onChangeText={setPassword} placeholder="Mínimo 6 caracteres" errorText={err.password} />
            <Input testID="register-confirm-input" label="Confirmar senha" secureTextEntry value={confirm} onChangeText={setConfirm} placeholder="••••••••" errorText={err.confirm} />

            <Text style={styles.label}>Instrumento preferido</Text>
            <View style={styles.chips}>
              {INSTRUMENTS.map((i) => (
                <TouchableOpacity
                  testID={`instrument-chip-${i.id}`}
                  key={i.id}
                  onPress={() => setInstrument(i.id)}
                  style={[styles.chip, instrument === i.id && styles.chipActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipTxt, instrument === i.id && styles.chipTxtActive]}>{i.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ marginTop: 8 }} />
            <Button testID="register-submit-button" title="Criar conta" onPress={submit} loading={loading} icon={<UserPlus size={18} color="#0c0c0c" strokeWidth={3} />} />
          </View>

          <View style={styles.altRow}>
            <Text style={styles.altTxt}>Já tem conta? </Text>
            <TouchableOpacity testID="go-to-login-link" onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.altLink}>Entrar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 40 },
  title: { color: theme.text, fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  subtitle: { color: theme.textDim, fontSize: 15, marginTop: 4 },
  label: { color: theme.textDim, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 6, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bg2 },
  chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  chipTxt: { color: theme.textDim, fontWeight: '700', fontSize: 13 },
  chipTxtActive: { color: '#0c0c0c' },
  altRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 22 },
  altTxt: { color: theme.textDim, fontSize: 14 },
  altLink: { color: theme.primary, fontWeight: '800', fontSize: 14 },
});
