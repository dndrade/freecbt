import type { SQLiteDatabase } from "expo-sqlite";
import _ from "lodash";
import { Distortion, Thought } from "@/model";

type Row = { uuid: string; automatic_thought: string; cognitive_distortions: string; challenge: string; alternative_thought: string; created_at: string; updated_at: string };

export function thoughtsService(data: Distortion.Data, db: SQLiteDatabase) {
  const distortions = Distortion.createParsers(data);
  const toThought = (row: Row): Thought.Thought => Thought.Thought.parse({
    uuid: row.uuid, automaticThought: row.automatic_thought,
    cognitiveDistortions: distortions.fromSlugSet.decode(new Set(JSON.parse(row.cognitive_distortions))),
    challenge: row.challenge, alternativeThought: row.alternative_thought,
    createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at),
  });
  async function readAll() { return (await db.getAllAsync<Row>("SELECT * FROM thoughts ORDER BY created_at DESC")).map(toThought); }
  async function read(uuid: Thought.Id) {
    const row = await db.getFirstAsync<Row>("SELECT * FROM thoughts WHERE uuid = ?", [uuid]);
    if (row === null) throw new Error(`no such thought-id: ${uuid}`);
    return toThought(row);
  }
  async function write(thought: Thought.Thought) {
    await db.runAsync(`INSERT INTO thoughts (uuid, automatic_thought, cognitive_distortions, challenge, alternative_thought, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uuid) DO UPDATE SET automatic_thought=excluded.automatic_thought, cognitive_distortions=excluded.cognitive_distortions, challenge=excluded.challenge, alternative_thought=excluded.alternative_thought, updated_at=excluded.updated_at`,
      [thought.uuid, thought.automaticThought, JSON.stringify([...thought.cognitiveDistortions].map((d) => d.slug)), thought.challenge, thought.alternativeThought, thought.createdAt.toISOString(), thought.updatedAt.toISOString()]);
  }
  async function remove(uuid: Thought.Id) { await db.runAsync("DELETE FROM thoughts WHERE uuid = ?", [uuid]); }
  async function clear() { await db.runAsync("DELETE FROM thoughts"); }
  async function persistSubmittedThought(submissionId: Thought.Id, thought: Thought.Thought) {
    if (submissionId !== thought.uuid) throw new Error(`persistSubmittedThought: submissionId ${submissionId} does not match thought.uuid ${thought.uuid}`);
    try { if (_.isEqual(await read(submissionId), thought)) return; } catch (error) { if (!(error instanceof Error) || !error.message.startsWith("no such thought-id:")) throw error; await write(thought); return; }
    throw new Error(`persistSubmittedThought: conflicting record already exists at ${submissionId} for submission ${submissionId}`);
  }
  return { readAll, read, write, remove, clear, persistSubmittedThought };
}
export type ThoughtsService = ReturnType<typeof thoughtsService>;
