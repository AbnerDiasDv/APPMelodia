// Dashboard global Superadmin: KPIs, atividade 14d, distribuição por instrumento, top alunos.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Users, Activity, Shield, LogOut, BarChart3 } from 'lucide-react-native';

import { api } from '@/src/lib/api';
import { useAuth } from '@/src/lib/auth';
import { theme } from '@/src/lib/theme';
import { BarChart } from '@/src/components/Charts';

const LABELS: Record<string, string> = { violao: 'Violão', teclado: 'Teclado', piano: 'Piano', flauta: 'Flauta', bateria: 'Bateria' };
const COLORS: Record<string, string> = { violao: '#E87A3E', teclado: '#34D399', piano: '#FBBF24', flauta: '#60A5FA', bateria: '#F472B6' };

export default function AdminDashboard() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await api.adminStats();
      setStats(s);
    } catch {
      // Token sem permissão (e.g. após mudança de role) — Gate fará o redirect.
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !stats) {
    return (
      <SafeAreaView style={styles.center}><ActivityIndicator color={theme.primary} /></SafeAreaView>
    );
  }

  const last14 = stats.activity_14d.map((d: any) => ({ label: d.date.slice(8), value: d.sessions }));
  const maxInst = Math.max(1, ...stats.by_instrument.map((x: any) => x.minutes));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl tintColor={theme.primary} refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>Superadmin · {user?.name}</Text>
            <Text style={styles.h1}>Painel Geral</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity testID="admin-users-link" style={styles.iconBtn} onPress={() => router.push('/admin/users')}>
              <Users size={18} color={theme.primary} strokeWidth={2.5} />
            </TouchableOpacity>
            <TouchableOpacity testID="admin-logout-button" style={styles.iconBtn} onPress={logout}>
              <LogOut size={18} color={theme.text} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.kpiGrid}>
          <View style={[styles.kpi, { backgroundColor: '#1F1A14' }]} testID="admin-kpi-users">
            <Users size={18} color={theme.primary} strokeWidth={2.6} />
            <Text style={styles.kpiVal}>{stats.total_users}</Text>
            <Text style={styles.kpiLbl}>Alunos</Text>
          </View>
          <View style={styles.kpi} testID="admin-kpi-active">
            <Activity size={18} color={theme.green} strokeWidth={2.6} />
            <Text style={styles.kpiVal}>{stats.active_users_7d}</Text>
            <Text style={styles.kpiLbl}>Ativos 7d</Text>
          </View>
          <View style={styles.kpi} testID="admin-kpi-sessions">
            <BarChart3 size={18} color={theme.yellow} strokeWidth={2.6} />
            <Text style={styles.kpiVal}>{stats.total_sessions}</Text>
            <Text style={styles.kpiLbl}>Sessões</Text>
          </View>
          <View style={styles.kpi} testID="admin-kpi-banned">
            <Shield size={18} color={theme.red} strokeWidth={2.6} />
            <Text style={styles.kpiVal}>{stats.banned_users}</Text>
            <Text style={styles.kpiLbl}>Banidos</Text>
          </View>
        </View>

        <View style={styles.card} testID="admin-activity-chart">
          <Text style={styles.cardTitle}>Atividade (últimos 14 dias)</Text>
          <View style={{ marginTop: 12, alignItems: 'center' }}>
            <BarChart data={last14} color={theme.primary} testID="activity-bar-chart" />
          </View>
        </View>

        <View style={styles.card} testID="admin-by-instrument">
          <Text style={styles.cardTitle}>Minutos por instrumento</Text>
          {stats.by_instrument.length === 0 && <Text style={styles.empty}>Sem dados ainda.</Text>}
          {stats.by_instrument.map((it: any) => (
            <View key={it.instrument} style={styles.instRow}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.instLbl}>{LABELS[it.instrument] || it.instrument}</Text>
                <Text style={styles.instMin}>{it.minutes} min · {it.sessions} sessões</Text>
              </View>
              <View style={styles.bar}><View style={[styles.barFill, { width: `${(it.minutes / maxInst) * 100}%`, backgroundColor: COLORS[it.instrument] || theme.primary }]} /></View>
            </View>
          ))}
        </View>

        <View style={styles.card} testID="admin-top-users">
          <Text style={styles.cardTitle}>Top 5 alunos por prática</Text>
          {stats.top_users.length === 0 && <Text style={styles.empty}>Sem alunos ativos ainda.</Text>}
          {stats.top_users.map((u: any, i: number) => (
            <View key={u.id} style={styles.userRow} testID={`top-user-${i}`}>
              <Text style={styles.rank}>#{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{u.name}</Text>
                <Text style={styles.userMail}>{u.email}</Text>
              </View>
              <Text style={styles.userMin}>{u.minutes} min</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity testID="open-users-management" style={styles.cta} onPress={() => router.push('/admin/users')} activeOpacity={0.85}>
          <Users size={18} color="#0c0c0c" strokeWidth={3} />
          <Text style={styles.ctaTxt}>Gerenciar usuários</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18 },
  kicker: { color: theme.textDim, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  h1: { color: theme.text, fontSize: 28, fontWeight: '900', letterSpacing: -0.8 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.bg2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: { width: '47.5%', backgroundColor: theme.bg2, borderWidth: 1, borderColor: theme.border, borderRadius: 18, padding: 14 },
  kpiVal: { color: theme.text, fontSize: 24, fontWeight: '900', marginTop: 8 },
  kpiLbl: { color: theme.textDim, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 2 },
  card: { backgroundColor: theme.bg2, borderWidth: 1, borderColor: theme.border, borderRadius: 20, padding: 18, marginTop: 16 },
  cardTitle: { color: theme.text, fontSize: 15, fontWeight: '800' },
  empty: { color: theme.textMute, marginTop: 10 },
  instRow: { marginTop: 14 },
  instLbl: { color: theme.text, fontWeight: '700' },
  instMin: { color: theme.textDim, fontWeight: '700', fontSize: 12 },
  bar: { height: 8, backgroundColor: theme.bg3, borderRadius: 4, overflow: 'hidden', marginTop: 8 },
  barFill: { height: '100%', borderRadius: 4 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  rank: { color: theme.primary, fontSize: 16, fontWeight: '900', width: 28 },
  userName: { color: theme.text, fontWeight: '800' },
  userMail: { color: theme.textMute, fontSize: 12 },
  userMin: { color: theme.text, fontWeight: '900' },
  cta: { marginTop: 22, backgroundColor: theme.primary, padding: 16, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ctaTxt: { color: '#0c0c0c', fontWeight: '900', fontSize: 15 },
});
