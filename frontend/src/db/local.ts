// SQLite local — cache offline de instrumentos/lições + fila de sessões de prática
// para sincronizar quando o usuário voltar a ter conexão com o backend.
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

type DB = SQLite.SQLiteDatabase | null;
let _db: DB = null;

async function open(): Promise<DB> {
  if (Platform.OS === 'web') return null; // SQLite indisponível no preview web
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('harmonia.db');
  await _db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS cache_kv (
      k TEXT PRIMARY KEY NOT NULL,
      v TEXT NOT NULL,
      ts INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS practice_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      instrument TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      notes TEXT,
      created_at INTEGER NOT NULL
    );
  `);
  return _db;
}

export const localDb = {
  async cacheSet(key: string, value: unknown) {
    const db = await open();
    if (!db) return;
    await db.runAsync(
      'INSERT OR REPLACE INTO cache_kv (k, v, ts) VALUES (?, ?, ?)',
      [key, JSON.stringify(value), Date.now()],
    );
  },
  async cacheGet<T>(key: string): Promise<T | null> {
    const db = await open();
    if (!db) return null;
    const row = await db.getFirstAsync<{ v: string }>(
      'SELECT v FROM cache_kv WHERE k = ?',
      [key],
    );
    if (!row) return null;
    try {
      return JSON.parse(row.v) as T;
    } catch {
      return null;
    }
  },
  async queuePractice(p: { instrument: string; duration_minutes: number; notes?: string }) {
    const db = await open();
    if (!db) return;
    await db.runAsync(
      'INSERT INTO practice_queue (instrument, duration_minutes, notes, created_at) VALUES (?,?,?,?)',
      [p.instrument, p.duration_minutes, p.notes ?? null, Date.now()],
    );
  },
  async pendingPractice(): Promise<{ id: number; instrument: string; duration_minutes: number; notes?: string }[]> {
    const db = await open();
    if (!db) return [];
    const rows = await db.getAllAsync<{ id: number; instrument: string; duration_minutes: number; notes: string | null }>(
      'SELECT id, instrument, duration_minutes, notes FROM practice_queue ORDER BY id ASC',
    );
    return rows.map((r) => ({ ...r, notes: r.notes ?? undefined }));
  },
  async removeFromQueue(id: number) {
    const db = await open();
    if (!db) return;
    await db.runAsync('DELETE FROM practice_queue WHERE id = ?', [id]);
  },
};
