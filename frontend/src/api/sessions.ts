import axios from "axios";
import type { ResearchSession, CreateSessionPayload } from "./types";

const api = axios.create({
  // Use relative path so Vite's proxy (and production nginx) routes to the backend.
  // Override with VITE_API_BASE_URL only when explicitly set.
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api/v1",
  headers: { "Content-Type": "application/json" },
});

export const fetchSessions = (): Promise<ResearchSession[]> =>
  api.get<ResearchSession[]>("/sessions/").then((r) => r.data);

export const fetchSession = (id: string): Promise<ResearchSession> =>
  api.get<ResearchSession>(`/sessions/${id}/`).then((r) => r.data);

export const createSession = (payload: CreateSessionPayload): Promise<ResearchSession> =>
  api.post<ResearchSession>("/sessions/", payload).then((r) => r.data);

export const cancelSession = (id: string): Promise<void> =>
  api.post(`/sessions/${id}/cancel/`).then(() => undefined);
