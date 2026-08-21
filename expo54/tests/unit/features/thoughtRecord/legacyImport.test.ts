import { DistortionData, Thought } from "@/model";
import { importLegacyAsyncStorageData } from "@/features/thoughtRecord/services/legacyImport";
import { thoughtsService } from "@/features/thoughtRecord/services/thoughtsService";
import { migrate } from "@/services/database/migrator";
import { createFakeAsyncStorage } from "@/tests/support/async-storage";
import { createFakeSqliteDatabase } from "@/tests/support/sqlite";

test("legacy import is non-destructive and runs once", async () => {
  const thought = Thought.Thought.parse({ uuid: "00000001-1111-4111-8111-000000000001", automaticThought: "a", cognitiveDistortions: new Set([DistortionData.list[0]]), challenge: "c", alternativeThought: "b", createdAt: new Date(), updatedAt: new Date() });
  const storage = createFakeAsyncStorage({ [`@Quirk:thoughts:${thought.uuid}`]: Thought.createParsers(DistortionData).fromString.encode(thought) });
  const db = createFakeSqliteDatabase(); await migrate(db);
  const values = new Map<string, string>(); const mmkv = { getString: (key: string) => values.get(key), set: (key: string, value: string) => values.set(key, value), delete: (key: string) => values.delete(key) };
  await importLegacyAsyncStorageData(DistortionData, db, storage, mmkv);
  expect(await thoughtsService(DistortionData, db).readAll()).toEqual([thought]);
  await thoughtsService(DistortionData, db).clear(); await importLegacyAsyncStorageData(DistortionData, db, storage, mmkv);
  expect(await thoughtsService(DistortionData, db).readAll()).toEqual([]);
  expect(await storage.getItem(`@Quirk:thoughts:${thought.uuid}`)).not.toBeNull();
});
