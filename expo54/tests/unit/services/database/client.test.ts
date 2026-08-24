const mockOpenDatabaseAsync = jest.fn();
const mockMigrate = jest.fn();
const mockImportLegacyAsyncStorageData = jest.fn();

jest.mock("expo-sqlite", () => ({openDatabaseAsync: mockOpenDatabaseAsync}));
jest.mock("@/services/database/migrator", () => ({migrate: mockMigrate}));
jest.mock("@/features/thoughtRecord/services/legacyImport", () => ({importLegacyAsyncStorageData: mockImportLegacyAsyncStorageData}));
jest.mock("@/services/storage/mmkv", () => ({mmkv: {}}));

async function loadClient() {
  jest.resetModules();
  return import("@/services/database/client");
}

beforeEach(() => {
  mockOpenDatabaseAsync.mockReset();
  mockMigrate.mockReset();
  mockImportLegacyAsyncStorageData.mockReset();
});

test("getDatabase migrates once and memoizes the ready database", async () => {
  const db = {id: "ready"};
  mockOpenDatabaseAsync.mockResolvedValue(db);
  const {getDatabase} = await loadClient();

  expect(await getDatabase()).toBe(db);
  expect(await getDatabase()).toBe(db);
  expect(mockOpenDatabaseAsync).toHaveBeenCalledWith("freecbt.db");
  expect(mockOpenDatabaseAsync).toHaveBeenCalledTimes(1);
  expect(mockMigrate).toHaveBeenCalledWith(db);
  expect(mockMigrate).toHaveBeenCalledTimes(1);
});

test("getDatabase retries opening after an open failure", async () => {
  const db = {id: "retry"};
  mockOpenDatabaseAsync.mockRejectedValueOnce(new Error("open failed")).mockResolvedValueOnce(db);
  const {getDatabase} = await loadClient();

  await expect(getDatabase()).rejects.toThrow("open failed");
  await expect(getDatabase()).resolves.toBe(db);
  expect(mockOpenDatabaseAsync).toHaveBeenCalledTimes(2);
  expect(mockMigrate).toHaveBeenCalledWith(db);
});

test("getDatabase retries opening and migrating after a migration failure", async () => {
  const first = {id: "first"}, second = {id: "second"};
  mockOpenDatabaseAsync.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
  mockMigrate.mockRejectedValueOnce(new Error("migration failed")).mockResolvedValueOnce(undefined);
  const {getDatabase} = await loadClient();

  await expect(getDatabase()).rejects.toThrow("migration failed");
  await expect(getDatabase()).resolves.toBe(second);
  expect(mockOpenDatabaseAsync).toHaveBeenCalledTimes(2);
  expect(mockMigrate).toHaveBeenNthCalledWith(1, first);
  expect(mockMigrate).toHaveBeenNthCalledWith(2, second);
});

test("ensureThoughtRecordReady retries a failed import and memoizes the successful result", async () => {
  const db = {id: "ready"};
  mockOpenDatabaseAsync.mockResolvedValue(db);
  mockImportLegacyAsyncStorageData.mockRejectedValueOnce(new Error("import failed")).mockResolvedValueOnce(undefined);
  jest.resetModules();
  const {ensureThoughtRecordReady} = await import("@/features/thoughtRecord/services/ensureThoughtRecordReady");

  await expect(ensureThoughtRecordReady()).rejects.toThrow("import failed");
  expect(await ensureThoughtRecordReady()).toBe(db);
  expect(await ensureThoughtRecordReady()).toBe(db);
  expect(mockOpenDatabaseAsync).toHaveBeenCalledTimes(1);
  expect(mockImportLegacyAsyncStorageData).toHaveBeenCalledTimes(2);
});
