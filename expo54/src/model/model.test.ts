import { Action, Cmd, DistortionData, Model, Settings, Thought } from ".";

const emptyReady: Model.Ready = {
  status: "ready",
  thoughts: new Map(),
  thoughtParseErrors: new Map(),
  deviceColorScheme: null,
  deviceLocale: "en",
  distortionData: DistortionData,
  sessionAuthed: false,
  settings: Settings.empty(),
  onboardingCompletion: "idle",
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

test("onboarding completion persists only after a successful result", () => {
  const error = new Error("settings write failed");
  let m: Model.Model = emptyReady;

  const [saving, savingCmds] = Model.update(
    m,
    Action.beginOnboardingCompletion()
  );
  m = saving;
  expect((m as Model.Ready).onboardingCompletion).toBe("saving");
  expect((m as Model.Ready).settings.existingUser).toBe(false);
  expect(savingCmds).toEqual([
    Cmd.completeOnboarding({ ...emptyReady.settings, existingUser: true }),
  ]);

  const [duplicate, duplicateCmds] = Model.update(
    m,
    Action.beginOnboardingCompletion()
  );
  expect(duplicate).toBe(m);
  expect(duplicateCmds).toEqual([]);

  [m] = Model.update(m, Action.onboardingCompletionSucceeded());
  expect((m as Model.Ready).onboardingCompletion).toBe("idle");
  expect((m as Model.Ready).settings.existingUser).toBe(true);

  [m] = Model.update(
    emptyReady,
    Action.beginOnboardingCompletion()
  );
  [m] = Model.update(m, Action.onboardingCompletionFailed(error));
  expect((m as Model.Ready).onboardingCompletion).toEqual({
    status: "failure",
    error,
  });
  expect((m as Model.Ready).settings.existingUser).toBe(false);

  const [retry, retryCmds] = Model.update(
    m,
    Action.beginOnboardingCompletion()
  );
  expect((retry as Model.Ready).onboardingCompletion).toBe("saving");
  expect(retryCmds).toHaveLength(1);
});
