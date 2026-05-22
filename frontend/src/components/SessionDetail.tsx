import {
  Box,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Divider,
  Skeleton,
  Alert,
  Tooltip,
  IconButton,
  Tab,
  Tabs,
} from "@mui/material";
import {
  GitHub,
  AccessTime,
  Token,
  Loop,
  FolderOpen,
  ContentCopy,
  OpenInNew,
  FindInPage,
} from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import { useState } from "react";
import { ReadyState } from "react-use-websocket";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import StatusBadge from "./StatusBadge";
import FindingCard from "./FindingCard";
import LiveFeed from "./LiveFeed";
import type { ResearchSession, Finding, SessionLog } from "../api/types";

interface Props {
  session: ResearchSession | null;
  logs: SessionLog[];
  findings: Finding[];
  readyState: number;
  isLoading?: boolean;
}

function StatPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        px: 1.5,
        py: 0.75,
        borderRadius: 2,
        backgroundColor: alpha("#1A1A3E", 0.6),
        border: `1px solid ${alpha("#6C63FF", 0.15)}`,
      }}
    >
      <Box sx={{ color: alpha("#9B94FF", 0.7), display: "flex" }}>{icon}</Box>
      <Box>
        <Typography variant="caption" sx={{ color: alpha("#9090C0", 0.6), fontSize: "0.62rem", display: "block", lineHeight: 1 }}>
          {label}
        </Typography>
        <Typography variant="caption" sx={{ color: "#E8E8FF", fontWeight: 700, fontSize: "0.78rem" }}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

function WsBadge({ readyState }: { readyState: number }) {
  const states: Record<number, { label: string; color: string }> = {
    [ReadyState.CONNECTING]: { label: "Connecting", color: "#FFB347" },
    [ReadyState.OPEN]: { label: "Live", color: "#51CF66" },
    [ReadyState.CLOSING]: { label: "Closing", color: "#FF6B6B" },
    [ReadyState.CLOSED]: { label: "Disconnected", color: alpha("#9090C0", 0.6) },
    [ReadyState.UNINSTANTIATED]: { label: "Idle", color: alpha("#9090C0", 0.4) },
  };
  const s = states[readyState] ?? states[ReadyState.UNINSTANTIATED];
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <Box
        sx={{
          width: 7, height: 7, borderRadius: "50%",
          backgroundColor: s.color,
          boxShadow: readyState === ReadyState.OPEN ? `0 0 6px ${s.color}` : "none",
        }}
      />
      <Typography variant="caption" sx={{ color: s.color, fontSize: "0.68rem", fontWeight: 600 }}>
        {s.label}
      </Typography>
    </Box>
  );
}

function isLocalPath(url: string): boolean {
  return url.startsWith("/") || url.startsWith("~") || url.startsWith(".");
}

export default function SessionDetail({ session, logs, findings, readyState, isLoading }: Props) {
  const [tab, setTab] = useState(0);
  const [copied, setCopied] = useState(false);

  if (isLoading) {
    return (
      <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
        <Skeleton variant="rounded" height={80} sx={{ backgroundColor: alpha("#6C63FF", 0.06) }} />
        <Skeleton variant="rounded" height={200} sx={{ backgroundColor: alpha("#6C63FF", 0.06) }} />
        <Skeleton variant="rounded" height={300} sx={{ backgroundColor: alpha("#6C63FF", 0.06) }} />
      </Box>
    );
  }

  if (!session) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", py: 12 }}>
        <FindInPage sx={{ fontSize: 64, color: alpha("#6C63FF", 0.2), mb: 2 }} />
        <Typography variant="h6" sx={{ color: alpha("#9090C0", 0.5), fontWeight: 400 }}>
          Select a session to view details
        </Typography>
      </Box>
    );
  }

  const isRunning = session.status === "running" || session.status === "pending";
  const repoUrl = session.repository_url;
  const local = isLocalPath(repoUrl);

  const handleCopy = () => {
    if (session.answer) {
      navigator.clipboard.writeText(session.answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const elapsed = session.completed_at
    ? ((new Date(session.completed_at).getTime() - new Date(session.created_at).getTime()) / 1000).toFixed(1) + "s"
    : "—";

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: "flex", flexDirection: "column", gap: 2.5 }}>
      {/* Header card */}
      <Card>
        <CardContent sx={{ pb: "16px !important" }}>
          {isRunning && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
                {local
                  ? <FolderOpen sx={{ fontSize: 16, color: alpha("#9B94FF", 0.7) }} />
                  : <GitHub sx={{ fontSize: 16, color: alpha("#9B94FF", 0.7) }} />
                }
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: "monospace", color: "#9B94FF", fontSize: "0.75rem",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}
                >
                  {repoUrl}
                </Typography>
                {!local && (
                  <Tooltip title="Open on GitHub">
                    <IconButton
                      size="small"
                      component="a"
                      href={repoUrl}
                      target="_blank"
                      sx={{ p: 0.25, color: alpha("#9090C0", 0.5) }}
                    >
                      <OpenInNew sx={{ fontSize: 13 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: "#E8E8FF", lineHeight: 1.4 }}>
                {session.question}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.75 }}>
              <StatusBadge status={session.status} size="medium" />
              <WsBadge readyState={readyState} />
            </Box>
          </Box>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2 }}>
            <StatPill icon={<AccessTime sx={{ fontSize: 14 }} />} label="Duration" value={elapsed} />
            <StatPill icon={<Token sx={{ fontSize: 14 }} />} label="Tokens" value={session.tokens_used.toLocaleString()} />
            <StatPill icon={<Loop sx={{ fontSize: 14 }} />} label="Iterations" value={session.iterations} />
            <StatPill icon={<FindInPage sx={{ fontSize: 14 }} />} label="Findings" value={findings.length} />
          </Box>
        </CardContent>
      </Card>

      {/* Error alert */}
      {session.status === "failed" && session.error_message && (
        <Alert
          severity="error"
          sx={{
            backgroundColor: alpha("#FF6B6B", 0.08),
            border: `1px solid ${alpha("#FF6B6B", 0.3)}`,
            color: "#FF6B6B",
            "& .MuiAlert-icon": { color: "#FF6B6B" },
          }}
        >
          {session.error_message}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: `1px solid ${alpha("#6C63FF", 0.15)}` }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            minHeight: 40,
            "& .MuiTab-root": { minHeight: 40, fontSize: "0.8rem", fontWeight: 600, color: alpha("#9090C0", 0.7), textTransform: "none" },
            "& .Mui-selected": { color: "#9B94FF !important" },
            "& .MuiTabs-indicator": { backgroundColor: "#6C63FF" },
          }}
        >
          <Tab label={`Activity (${logs.length})`} />
          <Tab label={`Findings (${findings.length})`} />
          {session.answer && <Tab label="Answer" />}
        </Tabs>
      </Box>

      {/* Activity */}
      {tab === 0 && (
        <Card>
          <CardContent>
            <LiveFeed logs={logs} isRunning={isRunning} />
          </CardContent>
        </Card>
      )}

      {/* Findings */}
      {tab === 1 && (
        <Box>
          {findings.length === 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 6 }}>
              <FindInPage sx={{ fontSize: 40, color: alpha("#9090C0", 0.2), mb: 1 }} />
              <Typography variant="body2" sx={{ color: alpha("#9090C0", 0.5) }}>
                No findings yet
              </Typography>
            </Box>
          ) : (
            findings.map((f, i) => (
              <FindingCard key={(f as { id?: string }).id ?? i} finding={f} />
            ))
          )}
        </Box>
      )}

      {/* Answer */}
      {tab === 2 && session.answer && (
        <Card>
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="subtitle2" sx={{ color: "#9B94FF", fontWeight: 700 }}>
                Final Answer
              </Typography>
              <Tooltip title={copied ? "Copied!" : "Copy answer"}>
                <IconButton size="small" onClick={handleCopy} sx={{ color: alpha("#9090C0", 0.6) }}>
                  <ContentCopy sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
            <Divider sx={{ mb: 2, borderColor: alpha("#6C63FF", 0.1) }} />
            <Box
              sx={{
                "& p": { color: "#E8E8FF", lineHeight: 1.8, mb: 1.5 },
                "& h1,& h2,& h3,& h4": { color: "#9B94FF", mt: 2.5, mb: 1 },
                "& code": {
                  fontFamily: "monospace", fontSize: "0.85em",
                  backgroundColor: alpha("#6C63FF", 0.15),
                  px: 0.75, py: 0.25, borderRadius: 0.75,
                },
                "& pre": {
                  p: 2, borderRadius: 2,
                  backgroundColor: alpha("#000", 0.5),
                  border: `1px solid ${alpha("#6C63FF", 0.15)}`,
                  overflowX: "auto",
                  "& code": { backgroundColor: "transparent", p: 0 },
                },
                "& ul,& ol": { pl: 3, color: "#C8C8F0", lineHeight: 1.8 },
                "& blockquote": {
                  borderLeft: `3px solid ${alpha("#6C63FF", 0.5)}`,
                  ml: 0, pl: 2, color: "#9090C0",
                },
                "& table": { width: "100%", borderCollapse: "collapse" },
                "& th,& td": { border: `1px solid ${alpha("#6C63FF", 0.2)}`, px: 1.5, py: 0.75, color: "#C8C8F0" },
                "& th": { backgroundColor: alpha("#6C63FF", 0.1), color: "#9B94FF" },
                "& a": { color: "#6C63FF" },
              }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{session.answer}</ReactMarkdown>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
