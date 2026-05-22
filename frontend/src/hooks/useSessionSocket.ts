import { useEffect, useReducer, useRef } from "react";
import _useWebSocketModule from "react-use-websocket";
// CJS interop: the module may be the function itself or wrap it under .default
const useWebSocket: typeof _useWebSocketModule =
  (typeof _useWebSocketModule === "function"
    ? _useWebSocketModule
    : (_useWebSocketModule as { default: typeof _useWebSocketModule }).default);
import type {
  ResearchSession,
  Finding,
  SessionLog,
  WsEvent,
} from "../api/types";

interface SocketState {
  session: ResearchSession | null;
  logs: SessionLog[];
  findings: Finding[];
}

type Action =
  | { type: "INIT"; session: ResearchSession }
  | { type: "STATUS"; status: ResearchSession["status"] }
  | { type: "LOG"; log: SessionLog }
  | { type: "FINDING"; finding: Finding }
  | { type: "ANSWER"; answer: string; tokens_used: number; iterations: number }
  | { type: "ERROR"; error_message: string };

let _logIdCounter = 0;
function nextId() {
  return `live-${++_logIdCounter}`;
}

function reducer(state: SocketState, action: Action): SocketState {
  switch (action.type) {
    case "INIT":
      return {
        session: action.session,
        logs: action.session.logs ?? [],
        findings: action.session.findings ?? [],
      };
    case "STATUS":
      if (!state.session) return state;
      return { ...state, session: { ...state.session, status: action.status } };
    case "LOG":
      return { ...state, logs: [...state.logs, action.log] };
    case "FINDING":
      return { ...state, findings: [...state.findings, action.finding] };
    case "ANSWER":
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          answer: action.answer,
          tokens_used: action.tokens_used,
          iterations: action.iterations,
          status: "completed",
        },
        logs: [
          ...state.logs,
          {
            id: nextId(),
            kind: "answer",
            step: action.iterations,
            data: { answer: action.answer, tokens_used: action.tokens_used },
            created_at: new Date().toISOString(),
          } as SessionLog,
        ],
      };
    case "ERROR":
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          status: "failed",
          error_message: action.error_message,
        },
      };
    default:
      return state;
  }
}

// Derive WebSocket base from the page origin so it works through the Vite proxy
// and in production without hardcoding localhost.
function getWsBase(): string {
  if (import.meta.env.VITE_WS_BASE_URL) return import.meta.env.VITE_WS_BASE_URL;
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}`;
}
const WS_BASE = getWsBase();

export function useSessionSocket(sessionId: string | undefined, initialSession: ResearchSession | null) {
  const [state, dispatch] = useReducer(reducer, {
    session: initialSession,
    logs: initialSession?.logs ?? [],
    findings: initialSession?.findings ?? [],
  });

  // Reset initialized flag whenever the session ID changes (navigation between sessions)
  const prevSessionId = useRef<string | undefined>(undefined);
  const initialized = useRef(false);
  if (prevSessionId.current !== sessionId) {
    prevSessionId.current = sessionId;
    initialized.current = false;
  }

  // Sync reducer once REST snapshot arrives
  useEffect(() => {
    if (initialSession && !initialized.current) {
      dispatch({ type: "INIT", session: initialSession });
      initialized.current = true;
    }
  }, [initialSession]);

  const isDone =
    state.session?.status === "completed" || state.session?.status === "failed";

  const wsUrl =
    sessionId && !isDone
      ? `${WS_BASE}/ws/sessions/${sessionId}/`
      : null;

  const { readyState, lastJsonMessage } = useWebSocket<WsEvent>(wsUrl, {
    shouldReconnect: () => !isDone,
    reconnectInterval: 2000,
    reconnectAttempts: 5,
  });

  useEffect(() => {
    if (!lastJsonMessage) return;
    const event = lastJsonMessage;

    switch (event.type) {
      case "status":
        dispatch({ type: "STATUS", status: event.status });
        break;
      case "log":
        dispatch({
          type: "LOG",
          log: {
            id: nextId(),
            kind: event.kind as SessionLog["kind"],
            step: event.step,
            data: event.data,
            created_at: new Date().toISOString(),
          },
        });
        break;
      case "finding":
        dispatch({
          type: "FINDING",
          finding: {
            id: nextId(),
            file_path: event.file_path,
            note: event.note,
            confidence: event.confidence,
            evidence_snippet: "",
            search_term: "",
            created_at: new Date().toISOString(),
          },
        });
        break;
      case "answer":
        dispatch({
          type: "ANSWER",
          answer: event.answer,
          tokens_used: event.tokens_used,
          iterations: event.iterations,
        });
        break;
      case "error":
        dispatch({ type: "ERROR", error_message: event.error_message });
        break;
    }
  }, [lastJsonMessage]);

  return { ...state, readyState };
}
