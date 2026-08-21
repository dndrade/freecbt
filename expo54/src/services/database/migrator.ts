import type { SQLiteDatabase } from "expo-sqlite";

export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync("CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)");
  const row = await db.getFirstAsync<{ version: number }>("SELECT version FROM schema_version LIMIT 1");
  if (row !== null) return;
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS thoughts (
      uuid TEXT PRIMARY KEY, automatic_thought TEXT NOT NULL, cognitive_distortions TEXT NOT NULL,
      challenge TEXT NOT NULL, alternative_thought TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS thought_save_outbox (
      submission_id TEXT PRIMARY KEY, thought_json TEXT NOT NULL, source_draft_revision INTEGER NOT NULL,
      attempt_count INTEGER NOT NULL, last_attempt_at TEXT NOT NULL, last_error TEXT, retry_requested INTEGER NOT NULL,
      thought_persisted INTEGER NOT NULL, updated_at TEXT NOT NULL, status TEXT NOT NULL
    );
  `);
  await db.runAsync("INSERT INTO schema_version (version) VALUES (?)", [1]);
}
