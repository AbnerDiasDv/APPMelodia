// Gestão de usuários do Superadmin: busca, filtros, banir/desbanir, deletar.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { ChevronLeft, Search, Ban, Check, Trash2 } from 'lucide-react-native';

import { api } from '@/src/lib/api';
import { useToast } from '@/src/components/Toast';
import { theme } from '@/src/lib/theme';

const FILTERS = [
  { id: '', label: 'Todos' },
  { id: 'aluno', label: 'Alunos' },
  { id: 'superadmin', label: 'Admins' },
  { id: 'banned', label: 'Banidos' },
];

export default function UsersAdmin() {
  const router = useRouter();
  const { show } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const opts: any = {};
      if (q) opts.search = q;
      if (filter === 'aluno' || filter === 'superadmin') opts.role = filter;
      if (filter === 'banned') opts.banned = true;
      const data = await api.adminUsers(opts);
      setUsers(data);
    } finally {
      setLoading(false);
    }
  }, [q, filter]);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleBan = async (u: any) => {
    try {
      await api.adminPatchUser(u.id, { is_banned: !u.is_banned });
      show(u.is_banned ? 'Usuário liberado' : 'Usuário banido', 'success');
      load();
    } catch (e: any) {
      show(e?.message || 'Erro', 'error');
    }
  };

  const remove = async (u: any) => {
    try {
      await api.adminDeleteUser(u.id);
      show('Usuário removido', 'success');
      load();
    } catch (e: any) {
      show(e?.message || 'Erro', 'error');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <View style={{ paddingHorizontal: 20 }}>
        <View style={styles.headRow}>
          <TouchableOpacity testID="back-button" onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={20} color={theme.text} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.h1}>Usuários</Text>
        </View>
        <View style={styles.searchBox}>
          <Search size={16} color={theme.textMute} />
          <TextInput
            testID="user-search-input"
            placeholder="Buscar por nome ou e-mail"
            placeholderTextColor={theme.textMute}
            value={q}
            onChangeText={setQ}
            style={styles.searchInput}
            autoCapitalize="none"
          />
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={`f-${f.id}`}
            testID={`user-filter-${f.id || 'all'}`}
            onPress={() => setFilter(f.id)}
            style={[styles.chip, filter === f.id && styles.chipOn]}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipTxt, filter === f.id && styles.chipTxtOn]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          testID="admin-users-list"
          data={users}
          keyExtractor={(u) => u.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 }}
          renderItem={({ item }) => (
            <View style={styles.userCard} testID={`user-${item.email}`}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.userName}>{item.name}</Text>
                  {item.role === 'superadmin' && <View style={styles.badgeAdmin}><Text style={styles.badgeAdminTxt}>ADMIN</Text></View>}
                  {item.is_banned && <View style={styles.badgeBan}><Text style={styles.badgeBanTxt}>BANIDO</Text></View>}
                </View>
                <Text style={styles.userEmail}>{item.email}</Text>
                <Text style={styles.userMeta}>{item.preferred_instrument || '—'}  ·  {new Date(item.created_at).toLocaleDateString('pt-BR')}</Text>
              </View>
              {item.role !== 'superadmin' && (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity testID={`ban-${item.email}`} onPress={() => toggleBan(item)} style={[styles.actionBtn, item.is_banned ? { backgroundColor: '#10381F' } : { backgroundColor: '#3A1518' }]}>
                    {item.is_banned ? <Check size={16} color={theme.green} strokeWidth={2.5} /> : <Ban size={16} color={theme.red} strokeWidth={2.5} />}
                  </TouchableOpacity>
                  <TouchableOpacity testID={`delete-${item.email}`} onPress={() => remove(item)} style={[styles.actionBtn, { backgroundColor: theme.bg3 }]}>
                    <Trash2 size={16} color={theme.text} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Nenhum usuário encontrado.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.bg2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border },
  h1: { color: theme.text, fontSize: 26, fontWeight: '900', letterSpacing: -0.8 },
  searchBox: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: theme.bg2, borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { color: theme.text, flex: 1, fontSize: 15 },
  chipsRow: { paddingHorizontal: 20, gap: 8, paddingVertical: 12 },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bg2, flexShrink: 0 },
  chipOn: { backgroundColor: theme.primary, borderColor: theme.primary },
  chipTxt: { color: theme.textDim, fontWeight: '700', fontSize: 12 },
  chipTxtOn: { color: '#0c0c0c' },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.bg2, borderWidth: 1, borderColor: theme.border, borderRadius: 14, padding: 14, marginBottom: 10 },
  userName: { color: theme.text, fontWeight: '800', fontSize: 15 },
  userEmail: { color: theme.textDim, fontSize: 12, marginTop: 2 },
  userMeta: { color: theme.textMute, fontSize: 11, marginTop: 4, textTransform: 'capitalize' },
  badgeAdmin: { backgroundColor: theme.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeAdminTxt: { color: '#0c0c0c', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  badgeBan: { backgroundColor: theme.red, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeBanTxt: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  actionBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  empty: { color: theme.textMute, textAlign: 'center', marginTop: 30 },
});
