import type { Distortion } from "@/model";

export type SituationId = "interview" | "message" | "mistake";

export interface Situation {
  id: SituationId;
  title: string;
  detail: string;
  autoThought: string;
  distortionSlugs: readonly Distortion.Slug[];
  evidence: readonly string[];
  phrases: readonly string[];
}

const asSlug = (s: string) => s as Distortion.Slug;

export const situationIds: readonly SituationId[] = [
  "interview",
  "message",
  "mistake",
];

export const situations: Record<SituationId, Situation> = {
  interview: {
    id: "interview",
    title: "After an interview",
    detail: "I took a little too long to answer one question.",
    autoThought: "I probably failed.",
    distortionSlugs: [
      asSlug("fortune-telling"),
      asSlug("catastrophizing"),
      asSlug("labeling"),
    ],
    evidence: [
      "I paused before answering.",
      "The other person kept talking with me.",
      "One part wasn't perfect — not all of it.",
      "I don't actually know the outcome yet.",
    ],
    phrases: [
      "I may not have done this perfectly",
      "one moment doesn't decide the outcome",
      "it was still useful practice",
      "I can learn from this",
    ],
  },
  message: {
    id: "message",
    title: "After a difficult message",
    detail: "I'm not sure how someone read my words.",
    autoThought: "I probably upset them.",
    distortionSlugs: [
      asSlug("mind-reading"),
      asSlug("catastrophizing"),
      asSlug("emotional-reasoning"),
    ],
    evidence: [
      "I sent it with good intent.",
      "They haven't said anything upset.",
      "People get busy and reply late for many reasons.",
      "I don't actually know how they read it yet.",
    ],
    phrases: [
      "I may not know how it landed yet",
      "people read messages differently than they're meant",
      "one message doesn't define how someone sees me",
      "I can clarify if it matters",
    ],
  },
  mistake: {
    id: "mistake",
    title: "After making a mistake",
    detail: "I noticed one thing I wish I'd done differently.",
    autoThought: "I always mess this up.",
    distortionSlugs: [
      asSlug("all-or-nothing"),
      asSlug("should-statements"),
      asSlug("self-blaming"),
    ],
    evidence: [
      "I noticed it myself.",
      "One slip doesn't undo the rest of the work.",
      "Mistakes are part of doing anything real.",
      "I can still fix or learn from this one.",
    ],
    phrases: [
      "one mistake doesn't erase everything else I did",
      "mistakes are part of doing anything real",
      "I can learn from this and move on",
      "this doesn't decide how capable I am",
    ],
  },
};
