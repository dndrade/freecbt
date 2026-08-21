import { useCallback, useEffect, useState } from "react";
import { DistortionData, Thought } from "@/model";
import { getDatabase } from "@/services/database/client";
import { thoughtsService } from "../services/thoughtsService";

export function useThoughtHistory() {
  const [thoughts, setThoughts] = useState<readonly Thought.Thought[]>([]), [isLoading, setIsLoading] = useState(true);
  const refresh = useCallback(async () => { setIsLoading(true); try { setThoughts(await thoughtsService(DistortionData, await getDatabase()).readAll()); } finally { setIsLoading(false); } }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  return { thoughts, isLoading, refresh };
}
