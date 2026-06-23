// Progresso do aluno: streak, gráficos de tempo e distribuição por instrumento.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Flame, Clock, Target } from 'lucide-react-native';

import { api } from '@/src/lib/api';
import { theme } from '@/src/lib/theme';
import { BarChart } from '@/src/components/Charts';

const COLORS: Record<string, string> = {
  violao: '#E87A3E',
  teclado: '#34D399',
  piano: '#FBBF24',
  flauta: '#60A5FA',
  bateria: '#F472B6',
};
const LABELS: Record<string, string> = {
  violao: 'Violão',
  teclado: 'Teclado',
  piano: 'Piano',
  flauta: 'Flauta',
  bateria: 'Bateria',
};

export default function Progress() {
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [recent, setRecent] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([api.myStats(), api.practice()]);
      setStats(s);
      setRecent(p.slice(0, 10));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !stats) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <ActivityIndicator color={theme.primary} />
      </SafeAreaView>
    );
  }

  const last7 = stats.last_7_days.map((d: any) => ({ label: d.date.slice(8), value: d.minutes }));
  const totalByInst = stats.by_instrument as { instrument: string; minutes: number }[];
  const maxInst = Math.max(1, ...totalByInst.map((x) => x.minutes));
  const lessonsPct = stats.lessons_total > 0 ? (stats.lessons_done / stats.lessons_total) * 100 : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text style={styles.h1}>Seu progresso</Text>
        <Text style={styles.subtitle}>Acompanhe sua evolução musical</Text>

        <View style={styles.kpiRow}>
          <View style={[styles.kpi, { backgroundColor: '#1F1A14' }]} testID="kpi-streak">
            <Flame size={18} color={theme.primary} strokeWidth={2.6} />
            <Text style={styles.kpiVal}>{stats.streak_days}d</Text>
            <Text style={styles.kpiLbl}>Sequência</Text>
          </View>
          <View style={styles.kpi} testID="kpi-minutes">
            <Clock size={18} color={theme.green} strokeWidth={2.6} />
            <Text style={styles.kpiVal}>{stats.total_minutes}</Text>
            <Text style={styles.kpiLbl}>Minutos</Text>
          </View>
          <View style={styles.kpi} testID="kpi-sessions">
            <Target size={18} color={theme.yellow} strokeWidth={2.6} />
            <Text style={styles.kpiVal}>{stats.total_sessions}</Text>
            <Text style={styles.kpiLbl}>Sessões</Text>
          </View>
        </View>

        <View style={styles.card} testID="chart-week">
          <Text style={styles.cardTitle}>Minutos nos últimos 7 dias</Text>
          <View style={{ alignItems: 'center', marginTop: 12 }}>
            <BarChart data={last7} color={theme.primary} testID="weekly-bar-chart" />
          </View>
        </View>

        <View style={styles.card} testID="chart-instruments">
          <Text style={styles.cardTitle}>Por instrumento</Text>
          {totalByInst.length === 0 && <Text style={styles.empty}>Nenhuma prática registrada ainda.</Text>}
          {totalByInst.map((it) => (
            <View key={it.instrument} style={styles.instRow}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={styles.instLbl}>{LABELS[it.instrument] || it.instrument}</Text>
                <Text style={styles.instMin}>{it.minutes} min</Text>
              </View>
              <View style={styles.bar}>
                <View style={[styles.barFill, { width: `${(it.minutes / maxInst) * 100}%`, backgroundColor: COLORS[it.instrument] || theme.primary }]} />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.card} testID="card-lessons-progress">
          <Text style={styles.cardTitle}>Lições concluídas</Text>
          <Text style={styles.lessonsTxt}>{stats.lessons_done} <Text style={{ color: theme.textDim }}>de {stats.lessons_total}</Text></Text>
          <View style={styles.bar}><View style={[styles.barFill, { width: `${lessonsPct}%`, backgroundColor: theme.green }]} /></View>
        </View>

        <Text style={styles.section}>Histórico recente</Text>
        {recent.length === 0 && <Text style={styles.empty}>Nada por aqui. Use o metrônomo ou conclua uma lição para registrar.</Text>}
        {recent.map((r) => (
          <View key={r.id} style={styles.histItem} testID={`history-${r.id}`}>
            <View style={[styles.histDot, { backgroundColor: COLORS[r.instrument] || theme.primary }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.histTitle}>{LABELS[r.instrument] || r.instrument}</Text>
              <Text style={styles.histMeta}>{r.notes || 'Sessão livre'}</Text>
            </View>
            <Text style={styles.histMin}>{r.duration_minutes} min</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' },
  h1: { color: theme.text, fontSize: 28, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { color: theme.textDim, fontSize: 14, marginTop: 2, marginBottom: 18 },
  kpiRow: { flexDirection: 'row', gap: 10 },
  kpi: { flex: 1, backgroundColor: theme.bg2, borderWidth: 1, borderColor: theme.border, borderRadius: 18, padding: 14 },
  kpiVal: { color: theme.text, fontSize: 22, fontWeight: '900', marginTop: 8 },
  kpiLbl: { color: theme.textDim, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 2 },
  card: { backgroundColor: theme.bg2, borderWidth: 1, borderColor: theme.border, borderRadius: 20, padding: 18, marginTop: 16 },
  cardTitle: { color: theme.text, fontSize: 15, fontWeight: '800' },
  instRow: { marginTop: 14 },
  instLbl: { color: theme.text, fontWeight: '700' },
  instMin: { color: theme.textDim, fontWeight: '700' },
  bar: { height: 8, backgroundColor: theme.bg3, borderRadius: 4, overflow: 'hidden', marginTop: 8 },
  barFill: { height: '100%', borderRadius: 4 },
  lessonsTxt: { color: theme.text, fontSize: 26, fontWeight: '900', marginTop: 8 },
  section: { color: theme.text, fontSize: 17, fontWeight: '800', marginTop: 22, marginBottom: 10 },
  empty: { color: theme.textMute, marginTop: 10, fontSize: 13 },
  histItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.bg2, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: theme.border, marginBottom: 8 },
  histDot: { width: 10, height: 10, borderRadius: 5 },
  histTitle: { color: theme.text, fontWeight: '800', textTransform: 'capitalize' },
  histMeta: { color: theme.textMute, fontSize: 12, marginTop: 2 },
  histMin: { color: theme.primary, fontWeight: '900' },
});
