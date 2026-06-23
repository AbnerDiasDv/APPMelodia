// Tela inicial do Aluno: saudação, streak, atalho da lição do dia e cards de instrumentos.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Flame, ChevronRight, Sparkles } from 'lucide-react-native';

import { api } from '@/src/lib/api';
import { useAuth } from '@/src/lib/auth';
import { theme } from '@/src/lib/theme';
import { localDb } from '@/src/db/local';

type Inst = { id: string; name: string; description: string; image: string; color: string; lessons_total: number; lessons_completed: number };

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<Inst[]>([]);
  const [stats, setStats] = useState<{ streak_days: number; total_minutes: number; lessons_done: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [insts, st] = await Promise.all([api.instruments(), api.myStats()]);
      setItems(insts);
      setStats(st);
      // cache offline (SQLite local)
      await localDb.cacheSet('instruments', insts);
    } catch {
      // fallback ao cache offline
      const cached = await localDb.cacheGet<Inst[]>('instruments');
      if (cached) setItems(cached);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const preferred = items.find((i) => i.id === user?.preferred_instrument) ?? items[0];

  if (loading) {
    return (
      <SafeAreaView style={styles.flexCenter} edges={['top']}>
        <ActivityIndicator color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <FlatList
        testID="home-list"
        data={items}
        keyExtractor={(it) => it.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 20 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl tintColor={theme.primary} refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.hello}>Olá, {user?.name?.split(' ')[0] ?? 'aluno'}</Text>
            <Text style={styles.subhello}>Pronto para mais um dia de música?</Text>

            <View style={styles.statsRow}>
              <View style={[styles.statBox, { backgroundColor: '#1F1A14' }]} testID="stat-streak">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Flame size={16} color={theme.primary} strokeWidth={2.6} />
                  <Text style={styles.statLbl}>Sequência</Text>
                </View>
                <Text style={styles.statVal}>{stats?.streak_days ?? 0}d</Text>
              </View>
              <View style={styles.statBox} testID="stat-minutes">
                <Text style={styles.statLbl}>Minutos</Text>
                <Text style={styles.statVal}>{stats?.total_minutes ?? 0}</Text>
              </View>
              <View style={styles.statBox} testID="stat-lessons">
                <Text style={styles.statLbl}>Lições</Text>
                <Text style={styles.statVal}>{stats?.lessons_done ?? 0}</Text>
              </View>
            </View>

            {preferred && (
              <TouchableOpacity
                testID="daily-cta"
                style={styles.dailyCard}
                onPress={() => router.push(`/instrument/${preferred.id}`)}
                activeOpacity={0.85}
              >
                <View style={styles.dailyHead}>
                  <Sparkles size={14} color={theme.primary} strokeWidth={2.6} />
                  <Text style={styles.dailyKicker}>LIÇÃO DO DIA</Text>
                </View>
                <Text style={styles.dailyTitle}>{preferred.name}: continue de onde parou</Text>
                <Text style={styles.dailyDesc}>{preferred.lessons_completed}/{preferred.lessons_total} lições concluídas</Text>
                <View style={styles.dailyCtaRow}>
                  <Text style={styles.dailyCtaTxt}>Continuar</Text>
                  <ChevronRight size={16} color="#0c0c0c" strokeWidth={3} />
                </View>
              </TouchableOpacity>
            )}

            <Text style={styles.section}>Instrumentos</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            testID={`instrument-card-${item.id}`}
            style={styles.card}
            onPress={() => router.push(`/instrument/${item.id}`)}
            activeOpacity={0.85}
          >
            <Image source={{ uri: item.image }} style={styles.cardImg} />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${(item.lessons_completed / Math.max(1, item.lessons_total)) * 100}%`, backgroundColor: item.color }]} />
              </View>
              <Text style={styles.cardMeta}>{item.lessons_completed}/{item.lessons_total} lições</Text>
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flexCenter: { flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' },
  header: { padding: 20 },
  hello: { color: theme.text, fontSize: 28, fontWeight: '900', letterSpacing: -0.8 },
  subhello: { color: theme.textDim, fontSize: 14, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  statBox: { flex: 1, padding: 14, backgroundColor: theme.bg2, borderRadius: 16, borderWidth: 1, borderColor: theme.border },
  statLbl: { color: theme.textDim, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 },
  statVal: { color: theme.text, fontSize: 22, fontWeight: '900', marginTop: 6 },
  dailyCard: { marginTop: 20, padding: 18, borderRadius: 20, backgroundColor: theme.primary },
  dailyHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dailyKicker: { color: '#0c0c0c', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  dailyTitle: { color: '#0c0c0c', fontSize: 20, fontWeight: '900', marginTop: 8 },
  dailyDesc: { color: '#0c0c0cAA', fontSize: 13, marginTop: 4 },
  dailyCtaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 14 },
  dailyCtaTxt: { color: '#0c0c0c', fontWeight: '900' },
  section: { color: theme.text, fontSize: 18, fontWeight: '800', marginTop: 22, marginBottom: 8 },
  card: { flex: 1, backgroundColor: theme.bg2, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: theme.border },
  cardImg: { width: '100%', height: 110 },
  cardBody: { padding: 12 },
  cardTitle: { color: theme.text, fontSize: 16, fontWeight: '800' },
  progressBar: { height: 6, backgroundColor: theme.bg3, borderRadius: 4, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  cardMeta: { color: theme.textDim, fontSize: 11, marginTop: 6, fontWeight: '600' },
});
