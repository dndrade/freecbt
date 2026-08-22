import { useCallback, useEffect, useRef, useState } from "react";
import { DistortionData, Thought } from "@/model";
import { ensureThoughtRecordReady } from "../services/ensureThoughtRecordReady";
import { thoughtsService } from "../services/thoughtsService";

export function useThoughtHistory() {
  const [thoughts, setThoughts] = useState<readonly Thought.Thought[]>([]), [isLoading, setIsLoading] = useState(true), [error, setError] = useState<Error | null>(null);
  const request = useRef(0);
  const refresh = useCallback(async () => { const currentRequest = ++request.current; setIsLoading(true); setError(null); try { const thoughts = await thoughtsService(DistortionData, await ensureThoughtRecordReady()).readAll(); if (currentRequest === request.current) setThoughts(thoughts); } catch (error) { if (currentRequest === request.current) setError(error instanceof Error ? error : new Error(String(error))); } finally { if (currentRequest === request.current) setIsLoading(false); } }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  return { thoughts, isLoading, error, refresh };
}
