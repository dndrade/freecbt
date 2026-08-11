type LoadState<T> = () => Promise<T>;
type PersistState<T> = (state: T) => Promise<void>;
type CloneState<T> = (state: T) => T;

interface Deferred<T> {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
  promise: Promise<T>;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { resolve, reject, promise };
}

function createStateLoader<T>(load: LoadState<T>, clone: CloneState<T>) {
  let loaded = false;
  let state: T;
  let loading: Promise<T> | null = null;

  async function ensureLoaded(): Promise<T> {
    if (loaded) return state;
    if (loading) return loading;
    loading = load().then((value) => {
      state = clone(value);
      loaded = true;
      return clone(state);
    });
    return loading;
  }

  async function read(): Promise<T> {
    return clone(await ensureLoaded());
  }

  async function write(next: T): Promise<T> {
    await ensureLoaded();
    state = clone(next);
    return clone(state);
  }

  return { ensureLoaded, read, write };
}

export function createLatestWinsStorageWriter<T>(options: {
  load: LoadState<T>;
  persist: PersistState<T>;
  clone?: CloneState<T>;
}) {
  const clone = options.clone ?? ((state: T) => state);
  const loader = createStateLoader(options.load, clone);
  let active = false;
  let queued:
    | {
        state: T;
        waiters: Deferred<void>[];
      }
    | null = null;

  async function drain(): Promise<void> {
    if (active) return;
    active = true;
    try {
      while (queued !== null) {
        const batch = queued;
        queued = null;
        try {
          await options.persist(batch.state);
          batch.waiters.forEach((waiter) => waiter.resolve());
        } catch (error) {
          batch.waiters.forEach((waiter) => waiter.reject(error));
        }
      }
    } finally {
      active = false;
    }
  }

  async function write(state: T): Promise<void> {
    const snapshot = clone(state);
    const next = await loader.write(snapshot);
    const waiter = deferred<void>();
    if (queued === null) {
      queued = { state: next, waiters: [waiter] };
    } else {
      queued = {
        state: next,
        waiters: [...queued.waiters, waiter],
      };
    }
    void drain();
    return waiter.promise;
  }

  return {
    read: loader.read,
    write,
  };
}

export function createOrderedStorageWriter<T>(options: {
  load: LoadState<T>;
  persist: PersistState<T>;
  clone?: CloneState<T>;
}) {
  const clone = options.clone ?? ((state: T) => state);
  const loader = createStateLoader(options.load, clone);
  let tail: Promise<void> = Promise.resolve();

  async function mutate<R>(recipe: (state: T) => { state: T; result?: R }): Promise<R | undefined> {
    const run = async () => {
      const current = await loader.read();
      const next = recipe(current);
      await loader.write(next.state);
      await options.persist(next.state);
      return next.result;
    };
    const result = tail.then(run, run);
    tail = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }

  return {
    read: loader.read,
    mutate,
  };
}
