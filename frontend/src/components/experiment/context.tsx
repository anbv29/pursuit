"use client";

import { createContext, useContext } from "react";
import type { ExperimentDetail } from "@/lib/types";

export type ExpCtx = {
  exp: ExperimentDetail;
  /** API path prefix for this experiment, e.g. /workspaces/{ws}/experiments/{id} */
  path: string;
  reload: () => Promise<void>;
  /** Bumped whenever something changes so sibling panels can refetch. */
  version: number;
  touch: () => void;
};

export const ExperimentContext = createContext<ExpCtx | null>(null);

export function useExperiment() {
  const c = useContext(ExperimentContext);
  if (!c) throw new Error("useExperiment outside ExperimentContext");
  return c;
}
