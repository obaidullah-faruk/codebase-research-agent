export type SessionStatus = "pending" | "running" | "completed" | "failed";

export interface Finding {
  id: string;
  file_path: string;
  note: string;
  confidence: number;
  evidence_snippet: string;
  search_term: string;
  created_at: string;
}

export interface SessionLog {
  id: string;
  kind: "start" | "tool_call" | "answer" | "error";
  step: number;
  data: Record<string, unknown>;
  created_at: string;
}

// Shape as returned by the API (flat repository fields)
export interface ResearchSession {
  id: string;
  repository_url: string;
  repository_name: string;
  question: string;
  status: SessionStatus;
  answer: string | null;
  error_message: string | null;
  tokens_used: number;
  iterations: number;
  created_at: string;
  completed_at: string | null;
  findings: Finding[];
  logs: SessionLog[];
}

export interface CreateSessionPayload {
  repo_url: string;
  question: string;
}

// WebSocket event shapes
export type WsStatusEvent = { type: "status"; status: SessionStatus };
export type WsLogEvent = { type: "log"; kind: string; step: number; data: Record<string, unknown> };
export type WsFindingEvent = { type: "finding"; file_path: string; note: string; confidence: number };
export type WsAnswerEvent = { type: "answer"; answer: string; tokens_used: number; iterations: number };
export type WsErrorEvent = { type: "error"; error_message: string };

export type WsEvent =
  | WsStatusEvent
  | WsLogEvent
  | WsFindingEvent
  | WsAnswerEvent
  | WsErrorEvent;
