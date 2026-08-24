import { createFakeSqliteDatabase } from "@/tests/support/sqlite";
import { migrate } from "@/services/database/migrator";

test("migrate creates the thought tables and is idempotent", async () => {
  const db = createFakeSqliteDatabase();
  await migrate(db);
  await migrate(db);
  const names = (await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'")).map(({ name }) => name);
  expect(names).toEqual(expect.arrayContaining(["thoughts", "thought_save_outbox", "schema_version"]));
  expect(await db.getFirstAsync("SELECT version FROM schema_version LIMIT 1")).toEqual({ version: 1 });
});
