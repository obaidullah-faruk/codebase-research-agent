import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, Typography, Button } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { ErrorOutlined } from "@mui/icons-material";
import { fetchSession } from "../api/sessions";
import { useSessionSocket } from "../hooks/useSessionSocket";
import SessionDetail from "../components/SessionDetail";
import ErrorBoundary from "../components/ErrorBoundary";
import type { ResearchSession } from "../api/types";

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();

  const { data: initialSession, isLoading, isError, error } = useQuery<ResearchSession>({
    queryKey: ["session", id],
    queryFn: () => fetchSession(id!),
    enabled: !!id,
    staleTime: 0,
    retry: 2,
  });

  const { session, logs, findings, readyState } = useSessionSocket(
    id,
    initialSession ?? null
  );

  if (isError) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 2,
          p: 4,
        }}
      >
        <ErrorOutlined sx={{ fontSize: 48, color: alpha("#FF6B6B", 0.6) }} />
        <Typography variant="h6" sx={{ color: "#FF6B6B" }}>
          Failed to load session
        </Typography>
        <Typography variant="body2" sx={{ color: alpha("#9090C0", 0.7), textAlign: "center" }}>
          {(error as Error)?.message ?? "The session could not be fetched. Make sure the backend is running."}
        </Typography>
        <Button variant="outlined" onClick={() => window.location.reload()} sx={{ mt: 1 }}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <ErrorBoundary>
      <SessionDetail
        session={session}
        logs={logs}
        findings={findings}
        readyState={readyState}
        isLoading={isLoading && !session}
      />
    </ErrorBoundary>
  );
}
