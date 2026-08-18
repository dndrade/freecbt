import { render } from "@testing-library/react-native";
import React from "react";
import { View } from "react-native";
import { DistortionData, Model, Settings, Thought } from "@/src/model";
import { ExportScreen } from "@/src/features/export/export-screen";
import { toCSV, toMarkdown } from "@/src/features/export/export-format";

const mockLinks: Array<{ name: string; body: () => string }> = [];

jest.mock("@/src/platform/sharing/download-or-share", () => ({
  DownloadOrShareLink: (props: { name: string; body: () => string }) => {
    mockLinks.push(props);
    return null;
  },
}));

jest.mock("@/src/components", () => ({
  Screen: ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, null, children),
  ScreenHeader: () => null,
}));

const T = Thought.createParsers(DistortionData);
const thoughts = [
  T.fromJson.decode({
    uuid: "plain-id",
    createdAt: "2020-01-02T03:04:05.000Z",
    updatedAt: "2020-01-02T03:04:05.000Z",
    automaticThought: "normal thought",
    cognitiveDistortions: [],
    challenge: "",
    alternativeThought: "",
    v: Thought.VERSION,
  }),
  T.fromJson.decode({
    uuid: "special-id",
    createdAt: "2021-02-03T04:05:06.000Z",
    updatedAt: "2021-02-03T04:05:06.000Z",
    automaticThought: "# hash _ under = equal ` tick :FreeCBT:",
    cognitiveDistortions: ["all-or-nothing", "mind-reading"],
    challenge: 'comma, double " single \' newline\nvalue',
    alternativeThought: "alternative",
    v: Thought.VERSION,
  }),
];

const model = Model.ready({
  sessionAuthed: false,
  distortionData: DistortionData,
  thoughts: new Map(thoughts.map((thought) => [Thought.key(thought), thought])),
  thoughtParseErrors: new Map(),
  settings: Settings.empty(),
  onboardingCompletion: "idle",
  homeThoughtDraft: null,
  homeThoughtDraftRevision: 0,
  homeThoughtDraftPersistence: "idle",
  thoughtSaveOutbox: [],
  thoughtSaveResult: "idle",
  deviceColorScheme: null,
  deviceLocale: "en",
});

const translate = (key: string) => key;

function captureRouteBodies(): Record<string, string> {
  mockLinks.length = 0;
  render(
    React.createElement(ExportScreen, {
      model,
      dispatch: jest.fn(),
      style: {} as never,
      translate,
    })
  );
  return Object.fromEntries(mockLinks.map(({ name, body }) => [name, body()]));
}

test("captures the current Markdown golden output", () => {
  expect(toMarkdown({ thoughts, translate })).toBe(String.raw`created: 1/2/2020 3:04:05 AM
updated: 1/2/2020 3:04:05 AM
id: plain-id

## auto_thought

normal thought

## cog_distortion

🤷

## challenge

🤷

## alt_thought

🤷

---
created: 2/3/2021 4:05:06 AM
updated: 2/3/2021 4:05:06 AM
id: special-id

## auto_thought

\# hash \_ under \= equal \` tick \:FreeCBT\:

## cog_distortion

- all_or_nothing_thinking
- mind_reading

## challenge

comma, double " single ' newline
value

## alt_thought

alternative
`);
});

test("captures the current CSV golden output", () => {
  expect(toCSV(thoughts)).toBe(String.raw`uuid,createdAt,updatedAt,automaticThought,cognitiveDistortions,challenge,alternativeThought
plain-id,2020-01-02T03:04:05.000Z,2020-01-02T03:04:05.000Z,normal thought,,,
special-id,2021-02-03T04:05:06.000Z,2021-02-03T04:05:06.000Z,# hash _ under = equal ${String.fromCharCode(96)} tick :FreeCBT:,"all-or-nothing,mind-reading","comma, double "" single ' newline
value",alternative`);
});

test("captures the current JSON serialization path", () => {
  expect(captureRouteBodies()["FreeCBT.json"]).toBe(
    String.raw`{"v":"Archive-v2","thoughts":[{"automaticThought":"normal thought","cognitiveDistortions":[],"challenge":"","alternativeThought":"","createdAt":"2020-01-02T03:04:05.000Z","updatedAt":"2020-01-02T03:04:05.000Z","uuid":"plain-id","v":"Thought-v2"},{"automaticThought":"# hash _ under = equal ${String.fromCharCode(96)} tick :FreeCBT:","cognitiveDistortions":["all-or-nothing","mind-reading"],"challenge":"comma, double \" single ' newline\nvalue","alternativeThought":"alternative","createdAt":"2021-02-03T04:05:06.000Z","updatedAt":"2021-02-03T04:05:06.000Z","uuid":"special-id","v":"Thought-v2"}]}`
  );
});
