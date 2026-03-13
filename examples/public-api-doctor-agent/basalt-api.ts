import type { ChatCompletion } from "openai/resources/chat/completions";

const BASALT_API_URL = process.env.BASALT_PUBLIC_API_URL ?? "https://api.getbasalt.ai";
const BASALT_API_KEY = process.env.BASALT_API_KEY;

async function basaltFetch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASALT_API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${BASALT_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Basalt API ${path} failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<T>;
}

export interface Experiment {
  id: string;
  name: string;
  featureSlug: string;
  createdAt: string;
}

export async function createExperiment(
  featureSlug: string,
  name: string,
): Promise<Experiment> {
  return basaltFetch<Experiment>("/monitor/experiments", { featureSlug, name });
}

export interface TraceLog {
  id: string;
  type: "generation" | "span" | "function" | "tool" | "retrieval" | "event";
  name?: string;
  parentId?: string;
  input?: unknown;
  output?: unknown;
  startTime?: string | number;
  endTime?: string | number;
  metadata?: Record<string, unknown>;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
  evaluators?: { slug: string }[];
}

export interface CreateTraceParams {
  featureSlug: string;
  name?: string;
  input?: unknown;
  output?: unknown;
  metadata?: Record<string, unknown>;
  organization?: { id: string; name: string };
  user?: { id: string; name: string };
  startTime?: string | number;
  endTime?: string | number;
  experiment?: { id: string };
  logs?: TraceLog[];
  evaluators?: { slug: string }[];
  evaluationConfig?: { sampleRate: number };
}

export async function createTrace(params: CreateTraceParams): Promise<{ id: string }> {
  return basaltFetch<{ id: string }>("/monitor/trace", params);
}

/**
 * Build a span log entry from an OpenAI ChatCompletion response.
 *
 * NOTE: We use type "span" instead of "generation" because the REST API
 * silently drops traces containing generation-type logs. Token counts
 * are included in metadata instead.
 */
export function buildGenerationLog(
  id: string,
  completion: ChatCompletion,
  messages: unknown[],
  responseText: string,
  startTime: number,
  endTime: number,
  metadata?: Record<string, unknown>,
): TraceLog {
  return {
    id,
    type: "span",
    name: `openai/${completion.model}`,
    startTime: new Date(startTime).toISOString(),
    endTime: new Date(endTime).toISOString(),
    input: messages,
    output: responseText,
    metadata: {
      ...metadata,
      inputTokens: completion.usage?.prompt_tokens,
      outputTokens: completion.usage?.completion_tokens,
      model: completion.model,
    },
  };
}
