import { AsyncStorageStatic } from "@react-native-async-storage/async-storage";
import { Distortion, Thought } from "@/src/model";
import { z } from "zod";

export const HOME_THOUGHT_DRAFT_KEY = "@Quirk:home-thought-draft:v1";

const DraftSpecJson = z.object({
  automaticThought: z.string(),
  cognitiveDistortions: z.string().array(),
  challenge: z.string(),
  alternativeThought: z.string(),
});

const DraftCleanupJson = z.object({
  status: z.enum(["none", "clear-failed"]),
  sourceRevision: z.number().int().nonnegative(),
  outboxSubmissionId: z.string(),
  lastError: z.string().nullable(),
  updatedAt: z.iso.datetime(),
});

const DraftJson = z.object({
  v: z.literal("home-thought-draft/v1"),
  spec: DraftSpecJson,
  sourceRevision: z.number().int().nonnegative(),
  updatedAt: z.iso.datetime(),
  draftCleanup: DraftCleanupJson.nullable(),
});

export type HomeThoughtDraftCleanup = {
  status: "none" | "clear-failed";
  sourceRevision: number;
  outboxSubmissionId: Thought.Id;
  lastError: string | null;
  updatedAt: Date;
};

export interface HomeThoughtDraftRecord {
  spec: Thought.Spec;
  sourceRevision: number;
  updatedAt: Date;
  draftCleanup: HomeThoughtDraftCleanup | null;
}

function isMeaningful(spec: Thought.Spec): boolean {
  return (
    spec.automaticThought !== "" ||
    spec.challenge !== "" ||
    spec.alternativeThought !== "" ||
    spec.cognitiveDistortions.size > 0
  );
}

function encodeSpec(spec: Thought.Spec) {
  return {
    automaticThought: spec.automaticThought,
    cognitiveDistortions: Array.from(spec.cognitiveDistortions).map((d) => d.slug),
    challenge: spec.challenge,
    alternativeThought: spec.alternativeThought,
  };
}

export function homeThoughtDraft(
  data: Distortion.Data,
  storage: AsyncStorageStatic
) {
  const distortions = Distortion.createParsers(data);

  function decodeSpec(json: z.infer<typeof DraftSpecJson>): Thought.Spec {
    return {
      automaticThought: json.automaticThought,
      cognitiveDistortions: distortions.fromSlugSet.decode(
        new Set(json.cognitiveDistortions)
      ),
      challenge: json.challenge,
      alternativeThought: json.alternativeThought,
    };
  }

  function encode(record: HomeThoughtDraftRecord): string {
    return JSON.stringify({
      v: "home-thought-draft/v1",
      spec: encodeSpec(record.spec),
      sourceRevision: record.sourceRevision,
      updatedAt: record.updatedAt.toISOString(),
      draftCleanup:
        record.draftCleanup === null
          ? null
          : {
              ...record.draftCleanup,
              updatedAt: record.draftCleanup.updatedAt.toISOString(),
            },
    } satisfies z.input<typeof DraftJson>);
  }

  function decode(raw: string): HomeThoughtDraftRecord {
    const json = DraftJson.parse(JSON.parse(raw));
    return {
      spec: decodeSpec(json.spec),
      sourceRevision: json.sourceRevision,
      updatedAt: new Date(json.updatedAt),
      draftCleanup:
        json.draftCleanup === null
          ? null
          : {
              status: json.draftCleanup.status,
              sourceRevision: json.draftCleanup.sourceRevision,
              outboxSubmissionId: Thought.Id.decode(
                json.draftCleanup.outboxSubmissionId
              ),
              lastError: json.draftCleanup.lastError,
              updatedAt: new Date(json.draftCleanup.updatedAt),
            },
    };
  }

  async function read(): Promise<HomeThoughtDraftRecord | null> {
    const raw = await storage.getItem(HOME_THOUGHT_DRAFT_KEY);
    if (raw === null) return null;
    return decode(raw);
  }

  async function write(record: HomeThoughtDraftRecord): Promise<void> {
    if (!isMeaningful(record.spec)) {
      await clear();
      return;
    }
    await storage.setItem(HOME_THOUGHT_DRAFT_KEY, encode(record));
  }

  async function clear(): Promise<void> {
    await storage.removeItem(HOME_THOUGHT_DRAFT_KEY);
  }

  return { read, write, clear };
}

export type HomeThoughtDraft = ReturnType<typeof homeThoughtDraft>;
