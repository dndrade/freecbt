import { createFakeSqliteDatabase } from "@/tests/support/sqlite";

test("fake database round-trips a row through exec/run/getAll/getFirst", async () => {
  const db = createFakeSqliteDatabase();
  await db.execAsync("CREATE TABLE t (id TEXT PRIMARY KEY, value TEXT NOT NULL)");
  await db.runAsync("INSERT INTO t (id, value) VALUES (?, ?)", ["a", "1"]);
  expect(await db.getFirstAsync("SELECT * FROM t WHERE id = ?", ["a"])).toEqual({ id: "a", value: "1" });
  expect(await db.getAllAsync("SELECT id FROM t")).toEqual([{ id: "a" }]);
});

test("withTransactionAsync rolls back on throw", async () => {
  const db = createFakeSqliteDatabase();
  await db.execAsync("CREATE TABLE t (id TEXT PRIMARY KEY)");
  await expect(db.withTransactionAsync(async () => {
    await db.runAsync("INSERT INTO t (id) VALUES (?)", ["rolled-back"]);
    throw new Error("boom");
  })).rejects.toThrow("boom");
  expect(await db.getAllAsync("SELECT id FROM t")).toEqual([]);
});
