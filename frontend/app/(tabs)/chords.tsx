// Biblioteca de Acordes — com filtros por instrumento e dificuldade.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search } from 'lucide-react-native';

import { api } from '@/src/lib/api';
import { theme } from '@/src/lib/theme';

const INSTRUMENTS = [
  { id: '', label: 'Todos' },
  { id: 'violao', label: 'Violão' },
  { id: 'teclado', label: 'Teclado' },
  { id: 'piano', label: 'Piano' },
  { id: 'flauta', label: 'Flauta' },
  { id: 'bateria', label: 'Bateria' },
];
const DIFF = [
  { id: '', label: 'Todas' },
  { id: 'fácil', label: 'Fácil' },
  { id: 'médio', label: 'Médio' },
  { id: 'difícil', label: 'Difícil' },
];

export default function Chords() {
  const [inst, setInst] = useState('');
  const [diff, setDiff] = useState('');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.chords(inst || undefined, diff || undefined);
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, [inst, diff]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(
    () => items.filter((c) => !query || c.name.toLowerCase().includes(query.toLowerCase())),
    [items, query],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <View style={{ padding: 20, paddingBottom: 8 }}>
        <Text style={styles.h1}>Acordes</Text>
        <Text style={styles.subtitle}>Biblioteca completa por instrumento</Text>
        <View style={styles.searchBox}>
          <Search size={16} color={theme.textMute} />
          <TextInput
            testID="chord-search-input"
            placeholder="Buscar acorde..."
            placeholderTextColor={theme.textMute}
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {INSTRUMENTS.map((i) => (
          <TouchableOpacity
            testID={`chord-filter-inst-${i.id || 'all'}`}
            key={`i-${i.id}`}
            onPress={() => setInst(i.id)}
            style={[styles.chip, inst === i.id && styles.chipOn]}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipTxt, inst === i.id && styles.chipTxtOn]}>{i.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {DIFF.map((d) => (
          <TouchableOpacity
            testID={`chord-filter-diff-${d.id || 'all'}`}
            key={`d-${d.id}`}
            onPress={() => setDiff(d.id)}
            style={[styles.chip, diff === d.id && styles.chipOn]}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipTxt, diff === d.id && styles.chipTxtOn]}>{d.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          testID="chord-list"
          data={filtered}
          keyExtractor={(it) => it.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 20 }}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 40, gap: 12 }}
          renderItem={({ item }) => (
            <View style={styles.card} testID={`chord-${item.name}`}>
              <Text style={styles.chordName}>{item.name}</Text>
              <View style={styles.diagram}>
                <Text style={styles.diagramTxt}>{item.diagram}</Text>
              </View>
              <Text style={styles.chordMeta}>{item.instrument}  ·  <Text style={{ color: theme.primary }}>{item.difficulty}</Text></Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Nenhum acorde encontrado.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  h1: { color: theme.text, fontSize: 28, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { color: theme.textDim, fontSize: 14, marginTop: 2, marginBottom: 14 },
  searchBox: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: theme.bg2, borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { color: theme.text, flex: 1, fontSize: 15 },
  chipsRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bg2, flexShrink: 0 },
  chipOn: { backgroundColor: theme.primary, borderColor: theme.primary },
  chipTxt: { color: theme.textDim, fontWeight: '700', fontSize: 12 },
  chipTxtOn: { color: '#0c0c0c' },
  card: { flex: 1, backgroundColor: theme.bg2, borderRadius: 18, borderWidth: 1, borderColor: theme.border, padding: 16, minHeight: 130 },
  chordName: { color: theme.text, fontSize: 18, fontWeight: '900' },
  diagram: { backgroundColor: theme.bg3, borderRadius: 10, padding: 12, marginTop: 8 },
  diagramTxt: { color: theme.text, fontFamily: 'monospace', fontSize: 14, letterSpacing: 1 },
  chordMeta: { color: theme.textMute, fontSize: 11, fontWeight: '700', marginTop: 8, textTransform: 'capitalize' },
  empty: { color: theme.textMute, textAlign: 'center', marginTop: 30 },
});
