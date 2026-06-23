// Lista de lições de um instrumento.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { ChevronLeft, CheckCircle2, PlayCircle, Lock } from 'lucide-react-native';

import { api } from '@/src/lib/api';
import { theme } from '@/src/lib/theme';

const META: Record<string, { label: string; image: string; color: string; desc: string }> = {
  violao: { label: 'Violão', image: 'https://images.unsplash.com/photo-1525201548942-d8732f6617a0?w=900&q=80', color: '#E87A3E', desc: 'Domine acordes e ritmos populares.' },
  teclado: { label: 'Teclado', image: 'https://images.unsplash.com/photo-1513883049090-d0b7439799bf?w=900&q=80', color: '#34D399', desc: 'Timbres, escalas e harmonia no teclado.' },
  piano: { label: 'Piano', image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=900&q=80', color: '#FBBF24', desc: 'Técnica clássica e leitura de partitura.' },
  flauta: { label: 'Flauta', image: 'https://images.unsplash.com/photo-1621368286550-f54551f39b91?w=900&q=80', color: '#60A5FA', desc: 'Respiração, dedilhado e expressão.' },
  bateria: { label: 'Bateria', image: 'https://images.unsplash.com/photo-1524230659092-07f99a75c013?w=900&q=80', color: '#F472B6', desc: 'Grooves, coordenação e ritmos.' },
};

export default function InstrumentScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const meta = META[id as string];
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.lessons(id);
      setLessons(data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View>
          <Image source={{ uri: meta?.image }} style={styles.hero} />
          <View style={styles.heroOverlay} />
          <TouchableOpacity testID="back-button" onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={22} color={theme.text} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>{meta?.label}</Text>
            <Text style={styles.heroSub}>{meta?.desc}</Text>
          </View>
        </View>

        <View style={{ padding: 20 }}>
          <Text style={styles.section}>Lições</Text>
          {loading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: 18 }} />
          ) : (
            lessons.map((l, idx) => {
              const previousDone = idx === 0 || lessons[idx - 1]?.completed;
              const locked = !previousDone && !l.completed;
              return (
                <TouchableOpacity
                  key={l.id}
                  testID={`lesson-card-${l.id}`}
                  disabled={locked}
                  onPress={() => router.push(`/lesson/${l.id}`)}
                  activeOpacity={0.85}
                  style={[styles.lesson, locked && { opacity: 0.55 }]}
                >
                  <View style={[styles.lessonIcon, { backgroundColor: l.completed ? '#10381F' : theme.bg3 }]}>
                    {locked ? <Lock size={18} color={theme.textMute} strokeWidth={2.5} /> :
                      l.completed ? <CheckCircle2 size={22} color={theme.green} strokeWidth={2.5} /> :
                      <PlayCircle size={22} color={theme.primary} strokeWidth={2.5} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lessonTitle}>{l.title}</Text>
                    <Text style={styles.lessonMeta}>{l.level}  ·  {l.duration_minutes} min</Text>
                    {l.completed && l.score !== null && l.score !== undefined && (
                      <Text style={styles.score}>Quiz: {l.score}%</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', height: 220, backgroundColor: theme.bg2 },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000000A0' },
  backBtn: { position: 'absolute', top: 12, left: 12, width: 40, height: 40, borderRadius: 20, backgroundColor: '#0c0c0cAA', alignItems: 'center', justifyContent: 'center' },
  heroTextWrap: { position: 'absolute', left: 20, right: 20, bottom: 18 },
  heroTitle: { color: theme.text, fontSize: 34, fontWeight: '900', letterSpacing: -1 },
  heroSub: { color: theme.textDim, fontSize: 13, marginTop: 4 },
  section: { color: theme.text, fontSize: 18, fontWeight: '800', marginBottom: 10 },
  lesson: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: theme.bg2, borderWidth: 1, borderColor: theme.border, padding: 16, borderRadius: 16, marginBottom: 10 },
  lessonIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  lessonTitle: { color: theme.text, fontWeight: '800', fontSize: 15 },
  lessonMeta: { color: theme.textDim, fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  score: { color: theme.green, fontSize: 12, marginTop: 4, fontWeight: '800' },
});
