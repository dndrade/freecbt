import { useCallback, useEffect, useState } from "react";
import { DistortionData, Thought } from "@/model";
import { ensureThoughtRecordReady } from "../services/ensureThoughtRecordReady";
import { thoughtsService } from "../services/thoughtsService";

export function useThoughtHistory() {
  const [thoughts, setThoughts] = useState<readonly Thought.Thought[]>([]), [isLoading, setIsLoading] = useState(true), [error, setError] = useState<Error | null>(null);
  const refresh = useCallback(async () => { setIsLoading(true); setError(null); try { setThoughts(await thoughtsService(DistortionData, await ensureThoughtRecordReady()).readAll()); } catch (error) { setError(error instanceof Error ? error : new Error(String(error))); } finally { setIsLoading(false); } }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  return { thoughts, isLoading, error, refresh };
}
