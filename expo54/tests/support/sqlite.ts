import Database from "better-sqlite3";
import type { SQLiteDatabase } from "expo-sqlite";

export function createFakeSqliteDatabase(): SQLiteDatabase {
  const db = new Database(":memory:");
  return {
    execAsync: async (source: string) => db.exec(source),
    runAsync: async (source: string, params: readonly unknown[] = []) => {
      const result = db.prepare(source).run(...params as []);
      return { changes: result.changes, lastInsertRowId: Number(result.lastInsertRowid) };
    },
    getAllAsync: async <T>(source: string, params: readonly unknown[] = []) => db.prepare(source).all(...params as []) as T[],
    getFirstAsync: async <T>(source: string, params: readonly unknown[] = []) => (db.prepare(source).get(...params as []) ?? null) as T | null,
    withTransactionAsync: async (task: () => Promise<void>) => {
      db.exec("BEGIN");
      try { await task(); db.exec("COMMIT"); } catch (error) { db.exec("ROLLBACK"); throw error; }
    },
  } as unknown as SQLiteDatabase;
}
