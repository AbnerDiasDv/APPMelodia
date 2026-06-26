// Perfil — câmera para foto, lembrete diário (notificação local), logout.
import { useEffect, useState } from 'react';
import { Alert, Image, Linking, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera as CamIcon, Bell, LogOut, Music4 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '@/src/lib/auth';
import { useToast } from '@/src/components/Toast';
import { api } from '@/src/lib/api';
import { theme } from '@/src/lib/theme';
import { Button } from '@/src/components/Button';

const INSTRUMENTS = ['violao', 'teclado', 'piano', 'flauta', 'bateria'] as const;
const LABELS: Record<string, string> = { violao: 'Violão', teclado: 'Teclado', piano: 'Piano', flauta: 'Flauta', bateria: 'Bateria' };

export default function Profile() {
  const { user, logout, refresh } = useAuth();
  const { show } = useToast();
  const [reminder, setReminder] = useState<boolean>(user?.daily_reminder_enabled ?? true);

  useEffect(() => {
    setReminder(user?.daily_reminder_enabled ?? true);
  }, [user]);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      if (!perm.canAskAgain) {
        Alert.alert('Permissão necessária', 'Habilite a câmera nas configurações.', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir Configurações', onPress: () => Linking.openSettings() },
        ]);
      } else show('Permissão de câmera negada', 'error');
      return;
    }
    const r = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.4, allowsEditing: true, aspect: [1, 1] });
    if (r.canceled || !r.assets?.[0]?.base64) return;
    const dataUri = `data:image/jpeg;base64,${r.assets[0].base64}`;
    try {
      await api.updateMe({ avatar: dataUri });
      await refresh();
      show('Foto atualizada!', 'success');
    } catch (e: any) {
      show(e?.message || 'Erro ao atualizar foto', 'error');
    }
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      show('Permissão de galeria negada', 'error');
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.4, allowsEditing: true, aspect: [1, 1] });
    if (r.canceled || !r.assets?.[0]?.base64) return;
    const dataUri = `data:image/jpeg;base64,${r.assets[0].base64}`;
    try {
      await api.updateMe({ avatar: dataUri });
      await refresh();
      show('Foto atualizada!', 'success');
    } catch (e: any) {
      show(e?.message || 'Erro ao atualizar foto', 'error');
    }
  };

 const toggleReminder = async (val: boolean) => {
    setReminder(val);
    await api.updateMe({ daily_reminder_enabled: val } as any);
    try {
      // Import dinamico para evitar auto-registro de push no Expo Go (SDK 54+)
      const Notifications = await import('expo-notifications');
      if (val) {
        const perm = await Notifications.requestPermissionsAsync();
        if (!perm.granted) {
          setReminder(false);
          await api.updateMe({ daily_reminder_enabled: false } as any);
          show('Sem permissão de notificações', 'error');
          return;
        }
        await Notifications.cancelAllScheduledNotificationsAsync();
        await Notifications.scheduleNotificationAsync({
          content: { title: 'Hora de praticar', body: 'Vamos manter sua sequencia? Abra o APPMelodia.' },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 19, minute: 0 } as any,
        });
        show('Lembrete diário ativado às 19h', 'success');
      } else {
        await Notifications.cancelAllScheduledNotificationsAsync();
        show('Lembrete desativado', 'info');
      }
    } catch {
      show('Notificações disponíveis apenas em build nativo', 'info');
    }
  };

  const setInstrument = async (id: string) => {
    try {
      await api.updateMe({ preferred_instrument: id } as any);
      await refresh();
      show('Instrumento favorito atualizado', 'success');
    } catch (e: any) {
      show(e?.message || 'Erro', 'error');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={styles.avatarRow}>
          <TouchableOpacity testID="avatar-button" onPress={pickPhoto} activeOpacity={0.8}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPh]}>
                <Music4 size={32} color={theme.primary} strokeWidth={2.5} />
              </View>
            )}
            <View style={styles.camBadge}><CamIcon size={14} color="#0c0c0c" strokeWidth={3} /></View>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.name} testID="profile-name">{user?.name}</Text>
            <Text style={styles.email} testID="profile-email">{user?.email}</Text>
            <Text style={styles.role}>{user?.role === 'superadmin' ? 'Superadmin' : 'Aluno'}</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity testID="take-photo-button" onPress={pickPhoto} style={styles.actionBtn} activeOpacity={0.85}>
            <CamIcon size={16} color={theme.text} strokeWidth={2.5} />
            <Text style={styles.actionTxt}>Tirar foto</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="gallery-button" onPress={pickFromLibrary} style={styles.actionBtn} activeOpacity={0.85}>
            <Text style={styles.actionTxt}>Galeria</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.section}>Instrumento favorito</Text>
        <View style={styles.chips}>
          {INSTRUMENTS.map((i) => (
            <TouchableOpacity
              key={i}
              testID={`favorite-instrument-${i}`}
              onPress={() => setInstrument(i)}
              style={[styles.chip, user?.preferred_instrument === i && styles.chipOn]}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipTxt, user?.preferred_instrument === i && styles.chipTxtOn]}>{LABELS[i]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.row} testID="reminder-row">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Bell size={18} color={theme.primary} strokeWidth={2.5} />
            <View>
              <Text style={styles.rowTitle}>Lembrete diário</Text>
              <Text style={styles.rowSub}>Notificação local às 19h</Text>
            </View>
          </View>
          <Switch testID="reminder-switch" value={reminder} onValueChange={toggleReminder} trackColor={{ false: theme.bg3, true: theme.primary }} thumbColor="#fff" />
        </View>

        <View style={{ height: 24 }} />
        <Button testID="logout-button" title="Sair" variant="outline" onPress={() => logout()} icon={<LogOut size={16} color={theme.text} strokeWidth={2.5} />} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 78, height: 78, borderRadius: 39, backgroundColor: theme.bg2 },
  avatarPh: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border },
  camBadge: { position: 'absolute', bottom: -2, right: -2, width: 26, height: 26, borderRadius: 13, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: theme.bg },
  name: { color: theme.text, fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  email: { color: theme.textDim, fontSize: 13, marginTop: 2 },
  role: { color: theme.primary, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.4, marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.bg2, borderWidth: 1, borderColor: theme.border, paddingVertical: 12, borderRadius: 12 },
  actionTxt: { color: theme.text, fontWeight: '700' },
  section: { color: theme.text, fontSize: 15, fontWeight: '800', marginTop: 24, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bg2 },
  chipOn: { backgroundColor: theme.primary, borderColor: theme.primary },
  chipTxt: { color: theme.textDim, fontWeight: '700', fontSize: 13 },
  chipTxtOn: { color: '#0c0c0c' },
  row: { marginTop: 22, padding: 16, backgroundColor: theme.bg2, borderRadius: 16, borderWidth: 1, borderColor: theme.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowTitle: { color: theme.text, fontWeight: '800' },
  rowSub: { color: theme.textDim, fontSize: 12, marginTop: 2 },
});
