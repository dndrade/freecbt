import * as SQLite from "expo-sqlite";
import { migrate } from "./migrator";

const DATABASE_NAME = "freecbt.db";

let database: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (database === null) {
    database = SQLite.openDatabaseAsync(DATABASE_NAME)
      .then(async (db) => {
        await migrate(db);
        return db;
      })
      .catch((error) => {
        database = null;
        throw error;
      });
  }
  return database;
}
