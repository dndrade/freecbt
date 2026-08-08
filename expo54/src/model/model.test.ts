import { Action, DistortionData, Model, Settings, Thought } from ".";

const emptyReady: Model.Ready = {
  status: "ready",
  thoughts: new Map(),
  thoughtParseErrors: new Map(),
  deviceColorScheme: null,
  deviceLocale: "en",
  distortionData: DistortionData,
  sessionAuthed: false,
  settings: Settings.empty(),
};

test("basic actions", () => {
  let m: Model.Model;
  const ready = () => {
    expect(m.status).toBe("ready");
    return m as Model.Ready;
  };
  [m] = Model.init;
  expect(m).toEqual(Model.loading);
  [m] = Model.update(m, Action.modelReady(emptyReady));
  expect(m.status).toBe("ready");
  expect(ready().thoughts.size).toBe(0);
  expect(ready().settings.theme).toBe(null);
  [m] = Model.update(m, Action.createThought(Thought.emptySpec(), new Date(0)));
  expect(ready().thoughts.size).toBe(1);
  [m] = Model.update(m, Action.setTheme("dark"));
  expect(ready().settings.theme).toBe("dark");
});

test("import archive merges thoughts without deleting local-only thoughts", () => {
    const localThought = Thought.create(Thought.emptySpec(), new Date(0));
    const importedThought = Thought.create(Thought.emptySpec(), new Date(1));

    const existing: Model.Ready = {
        ...emptyReady,
        thoughts: new Map([[Thought.key(localThought), localThought]]),
    };

    const [updated, cmds] = Model.update(
        existing,
        Action.importArchive({ thoughts: [importedThought] })
    );

    expect(updated.status).toBe("ready");

    const ready = updated as Model.Ready;

    expect(ready.thoughts.get(Thought.key(localThought))).toEqual(localThought);
    expect(ready.thoughts.get(Thought.key(importedThought))).toEqual(
        importedThought
    );

    expect(cmds.some((cmd) => cmd.cmd === "delete-thought")).toBe(false);
});