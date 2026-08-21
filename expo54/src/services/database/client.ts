import * as SQLite from "expo-sqlite";

const DATABASE_NAME = "freecbt.db";

let database: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (database === null) database = await SQLite.openDatabaseAsync(DATABASE_NAME);
  return database;
}
