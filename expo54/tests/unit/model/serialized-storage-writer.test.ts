import {
  createLatestWinsStorageWriter,
  createOrderedStorageWriter,
} from "@/src/platform/storage/serialized-storage-writer";

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("createLatestWinsStorageWriter", () => {
  test("persists the newest queued value after an older write has already started", async () => {
    const firstWrite = deferred<void>();
    const persisted: string[] = [];
    let calls = 0;
    const writer = createLatestWinsStorageWriter<string>({
      load: async () => "initial",
      persist: async (value: string) => {
        calls += 1;
        if (calls === 1) await firstWrite.promise;
        persisted.push(value);
      },
    });

    const older = writer.write("older");
    const newer = writer.write("newer");
    firstWrite.resolve();

    await Promise.all([older, newer]);

    await expect(writer.read()).resolves.toBe("newer");
    expect(persisted).toEqual(["older", "newer"]);
  });

  test("propagates a failed latest write without losing the latest in-memory value", async () => {
    const firstWrite = deferred<void>();
    const failure = new Error("persist failed");
    let calls = 0;
    const writer = createLatestWinsStorageWriter<string>({
      load: async () => "initial",
      persist: async (value: string) => {
        calls += 1;
        if (calls === 1) {
          await firstWrite.promise;
          return;
        }
        if (value === "newer") throw failure;
      },
    });

    const older = writer.write("older");
    const newer = writer.write("newer");
    firstWrite.resolve();

    await older;
    await expect(newer).rejects.toThrow(failure);
    await expect(writer.read()).resolves.toBe("newer");
  });
});

describe("createOrderedStorageWriter", () => {
  test("serializes queued mutations over the latest in-memory state", async () => {
    const firstWrite = deferred<void>();
    const persisted: string[][] = [];
    let calls = 0;
    const writer = createOrderedStorageWriter<string[]>({
      load: async () => [],
      persist: async (value: string[]) => {
        calls += 1;
        if (calls === 1) await firstWrite.promise;
        persisted.push([...value]);
      },
    });

    const insert = writer.mutate((state: string[]) => ({ state: [...state, "inserted"] }));
    const update = writer.mutate((state: string[]) => ({
      state: state.map((value: string) => `${value}:updated`),
    }));
    const remove = writer.mutate(() => ({ state: [] }));
    firstWrite.resolve();

    await Promise.all([insert, update, remove]);

    await expect(writer.read()).resolves.toEqual([]);
    expect(persisted).toEqual([["inserted"], ["inserted:updated"], []]);
  });

  test("continues from the latest in-memory state after a failed persist", async () => {
    const firstWrite = deferred<void>();
    const failure = new Error("persist failed");
    let calls = 0;
    const writer = createOrderedStorageWriter<string[]>({
      load: async () => [],
      persist: async (value: string[]) => {
        calls += 1;
        if (calls === 1) {
          await firstWrite.promise;
          return;
        }
        if (value.includes("newer")) throw failure;
      },
    });

    const first = writer.mutate((state: string[]) => ({ state: [...state, "older"] }));
    const second = writer.mutate((state: string[]) => ({ state: [...state, "newer"] }));
    firstWrite.resolve();

    await first;
    await expect(second).rejects.toThrow(failure);
    await expect(writer.read()).resolves.toEqual(["older", "newer"]);
  });
});
