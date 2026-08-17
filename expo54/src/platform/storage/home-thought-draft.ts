import { AsyncStorageStatic } from "@react-native-async-storage/async-storage";
import { Distortion, Thought } from "@/src/model";
import type { HomeThoughtDraftRecord } from "@/src/model/thought-save";
import { z } from "zod";
import { createLatestWinsStorageWriter } from "./serialized-storage-writer";

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

function encodeSpec(spec: Thought.Spec) {
  return {
    automaticThought: spec.automaticThought,
    cognitiveDistortions: Array.from(spec.cognitiveDistortions).map((d) => d.slug),
    challenge: spec.challenge,
    alternativeThought: spec.alternativeThought,
  };
}

function cloneRecord(
  data: Distortion.Data,
  record: HomeThoughtDraftRecord | null
): HomeThoughtDraftRecord | null {
  if (record === null) return null;
  const distortions = Distortion.createParsers(data);
  const encoded = {
    v: "home-thought-draft/v1" as const,
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
  };
  const json = DraftJson.parse(encoded);
  return {
    spec: {
      automaticThought: json.spec.automaticThought,
      cognitiveDistortions: distortions.fromSlugSet.decode(
        new Set(json.spec.cognitiveDistortions)
      ),
      challenge: json.spec.challenge,
      alternativeThought: json.spec.alternativeThought,
    },
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

  async function readPersisted(): Promise<HomeThoughtDraftRecord | null> {
    const raw = await storage.getItem(HOME_THOUGHT_DRAFT_KEY);
    if (raw === null) return null;
    return decode(raw);
  }

  const writer = createLatestWinsStorageWriter<HomeThoughtDraftRecord | null>({
    load: readPersisted,
    clone: (record) => cloneRecord(data, record),
    persist: async (record) => {
      if (record === null) {
        await storage.removeItem(HOME_THOUGHT_DRAFT_KEY);
        return;
      }
      await storage.setItem(HOME_THOUGHT_DRAFT_KEY, encode(record));
    },
  });

  async function read(): Promise<HomeThoughtDraftRecord | null> {
    return writer.read();
  }

  async function write(record: HomeThoughtDraftRecord): Promise<void> {
    if (!Thought.isMeaningfulSpec(record.spec)) {
      await writer.write(null);
      return;
    }
    await writer.write(record);
  }

  async function clear(): Promise<void> {
    await writer.write(null);
  }

  return { read, write, clear };
}

export type HomeThoughtDraft = ReturnType<typeof homeThoughtDraft>;
