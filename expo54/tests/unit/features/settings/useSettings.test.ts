const values = new Map<string, string>();

jest.mock("@/services/storage/zustandStorage", () => ({
  zustandMmkvStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  },
}));

import { useSettings } from "@/features/settings/hooks/useSettings";

beforeEach(() => {
  values.clear();
  useSettings.setState({
    settings: { locale: null, reminders: false, existingUser: false },
  });
});

test("defaults to public defaults with no persisted MMKV record", () => {
  expect(useSettings.getState().settings).toEqual({
    locale: null,
    reminders: false,
    existingUser: false,
  });
});

test("setLocale, setReminders, and completeOnboarding are synchronous and update state immediately", () => {
  useSettings.getState().setLocale("es");
  useSettings.getState().setReminders(true);
  useSettings.getState().completeOnboarding();

  expect(useSettings.getState().settings).toEqual({
    locale: "es",
    reminders: true,
    existingUser: true,
  });
  expect(JSON.parse(values.get("@SettingsStore:v1")!).state.settings).toEqual({
    locale: "es",
    reminders: true,
    existingUser: true,
  });
});

test("every setter call persists the full settings slice to MMKV synchronously", () => {
  useSettings.getState().setReminders(true);
  const persisted = JSON.parse(values.get("@SettingsStore:v1")!);
  expect(persisted.state.settings).toEqual({
    locale: null,
    reminders: true,
    existingUser: false,
  });
});

test("the persisted MMKV record contains only locale, reminders, and existingUser", () => {
  useSettings.getState().setLocale("fr");
  const persisted = JSON.parse(values.get("@SettingsStore:v1")!);
  expect(Object.keys(persisted.state.settings).sort()).toEqual([
    "existingUser",
    "locale",
    "reminders",
  ]);
});

test("does not read MMKV at all until something explicitly sets state (skipHydration guard)", () => {
  values.set(
    "@SettingsStore:v1",
    JSON.stringify({
      state: {
        settings: { locale: "de", reminders: true, existingUser: true },
      },
      version: 0,
    }),
  );
  // Re-affirms the default set in beforeEach was never overwritten by an
  // automatic read of the value seeded above -- there is no rehydrate call
  // anywhere in this store, so nothing should have consumed it yet.
  expect(useSettings.getState().settings).toEqual({
    locale: null,
    reminders: false,
    existingUser: false,
  });
});

test("rehydrate rejects a schema-invalid persisted settings slice", async () => {
  const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  values.set(
    "@SettingsStore:v1",
    JSON.stringify({ state: { settings: { locale: 123 } }, version: 0 }),
  );

  await useSettings.persist.rehydrate();

  expect(useSettings.getState().settings).toEqual({
    locale: null,
    reminders: false,
    existingUser: false,
  });
  expect(warnSpy).toHaveBeenCalledTimes(1);
  expect(warnSpy).toHaveBeenCalledWith(
    "Discarding invalid persisted settings:",
    expect.anything(),
  );
  warnSpy.mockRestore();
});

test("rehydrate against an empty MMKV record does not warn", async () => {
  const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

  await useSettings.persist.rehydrate();

  expect(warnSpy).not.toHaveBeenCalled();
  warnSpy.mockRestore();
});
