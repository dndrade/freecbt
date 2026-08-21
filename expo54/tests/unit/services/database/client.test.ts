jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn(async () => ({ id: Math.random() })),
}));

import * as SQLite from "expo-sqlite";
import { getDatabase } from "@/services/database/client";

test("getDatabase opens the database once and memoizes it", async () => {
  const first = await getDatabase();
  const second = await getDatabase();
  expect(first).toBe(second);
  expect(SQLite.openDatabaseAsync).toHaveBeenCalledTimes(1);
  expect(SQLite.openDatabaseAsync).toHaveBeenCalledWith("freecbt.db");
});
