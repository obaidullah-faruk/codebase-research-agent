import {
  Box,
  Typography,
  Collapse,
  IconButton,
  Paper,
  Tooltip,
  keyframes,
} from "@mui/material";
import {
  ExpandMore,
  ExpandLess,
  Build,
  CheckCircleOutlined,
  ErrorOutlined,
  PlayCircleOutlined,
  ArrowDownward,
} from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import { useEffect, useRef, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { SessionLog, WsLogEvent } from "../api/types";

type FeedItem =
  | (SessionLog & { _live?: false })
  | (WsLogEvent & { id: string; created_at?: string; _live: true });

interface Props {
  logs: FeedItem[];
  isRunning: boolean;
}

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const kindMeta: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  start: { icon: <PlayCircleOutlined sx={{ fontSize: 16 }} />, color: "#6C63FF", label: "Started" },
  tool_call: { icon: <Build sx={{ fontSize: 16 }} />, color: "#00D4AA", label: "Tool Call" },
  answer: { icon: <CheckCircleOutlined sx={{ fontSize: 16 }} />, color: "#51CF66", label: "Answer" },
  error: { icon: <ErrorOutlined sx={{ fontSize: 16 }} />, color: "#FF6B6B", label: "Error" },
};

function ToolCallEntry({ data }: { data: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const tool = data.tool as string | undefined;
  const input = data.input as Record<string, unknown> | undefined;
  const output = data.output as string | undefined;
  const ms = data.duration_ms as number | undefined;

  return (
    <Box>
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "pointer", userSelect: "none" }}
        onClick={() => setOpen((o) => !o)}
      >
        <Typography
          variant="caption"
          sx={{ color: "#00D4AA", fontFamily: "monospace", fontWeight: 700, fontSize: "0.78rem" }}
        >
          {tool ?? "unknown"}
        </Typography>
        {ms !== undefined && (
          <Typography variant="caption" sx={{ color: alpha("#9090C0", 0.6), fontSize: "0.68rem" }}>
            {ms}ms
          </Typography>
        )}
        <IconButton size="small" sx={{ ml: "auto", color: alpha("#9090C0", 0.5), p: 0.25 }}>
          {open ? <ExpandLess sx={{ fontSize: 14 }} /> : <ExpandMore sx={{ fontSize: 14 }} />}
        </IconButton>
      </Box>
      <Collapse in={open}>
        <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1 }}>
          {input && (
            <Box>
              <Typography variant="caption" sx={{ color: alpha("#9090C0", 0.6), display: "block", mb: 0.5 }}>
                INPUT
              </Typography>
              <Box
                component="pre"
                sx={{
                  m: 0, p: 1, borderRadius: 1, fontSize: "0.7rem",
                  fontFamily: "monospace", color: "#C8C8F0",
                  backgroundColor: alpha("#000", 0.4),
                  border: `1px solid ${alpha("#6C63FF", 0.15)}`,
                  overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all",
                }}
              >
                {JSON.stringify(input, null, 2)}
              </Box>
            </Box>
          )}
          {output && (
            <Box>
              <Typography variant="caption" sx={{ color: alpha("#9090C0", 0.6), display: "block", mb: 0.5 }}>
                OUTPUT
              </Typography>
              <Box
                component="pre"
                sx={{
                  m: 0, p: 1, borderRadius: 1, fontSize: "0.7rem",
                  fontFamily: "monospace", color: "#C8C8F0",
                  backgroundColor: alpha("#000", 0.4),
                  border: `1px solid ${alpha("#6C63FF", 0.15)}`,
                  overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all",
                }}
              >
                {output}
              </Box>
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}

function AnswerEntry({ data }: { data: Record<string, unknown> }) {
  const answer = data.answer as string | undefined;
  if (!answer) return null;
  return (
    <Box
      sx={{
        p: 2, borderRadius: 2,
        background: `linear-gradient(135deg, ${alpha("#51CF66", 0.08)}, ${alpha("#00D4AA", 0.05)})`,
        border: `1px solid ${alpha("#51CF66", 0.2)}`,
        "& p": { m: 0, mb: 1, color: "#E8E8FF", lineHeight: 1.8 },
        "& code": {
          fontFamily: "monospace", fontSize: "0.82em",
          backgroundColor: alpha("#6C63FF", 0.15), px: 0.5, borderRadius: 0.5,
        },
        "& pre": {
          p: 1.5, borderRadius: 1.5,
          backgroundColor: alpha("#000", 0.4),
          border: `1px solid ${alpha("#6C63FF", 0.15)}`,
          overflowX: "auto",
        },
        "& h1,& h2,& h3": { color: "#9B94FF", mt: 2, mb: 1 },
        "& ul,& ol": { pl: 3, color: "#C8C8F0" },
        "& blockquote": {
          borderLeft: `3px solid ${alpha("#6C63FF", 0.5)}`,
          ml: 0, pl: 2, color: "#9090C0",
        },
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
    </Box>
  );
}

export default function LiveFeed({ logs, isRunning: _isRunning }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [userScrolled, setUserScrolled] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setUserScrolled(false);
    setShowScrollBtn(false);
  }, []);

  useEffect(() => {
    if (!userScrolled) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      setShowScrollBtn(true);
    }
  }, [logs.length, userScrolled]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    if (atBottom) {
      setUserScrolled(false);
      setShowScrollBtn(false);
    } else {
      setUserScrolled(true);
    }
  };

  if (logs.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          py: 6,
          color: alpha("#9090C0", 0.5),
        }}
      >
        <PlayCircleOutlined sx={{ fontSize: 40, mb: 1.5, opacity: 0.4 }} />
        <Typography variant="body2" sx={{ opacity: 0.6 }}>
          Waiting for agent activity…
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: "relative" }}>
      <Box
        ref={containerRef}
        onScroll={handleScroll}
        sx={{ maxHeight: 480, overflowY: "auto", pr: 0.5 }}
      >
        {logs.map((log, idx) => {
          const kind = "kind" in log ? log.kind : "tool_call";
          const meta = kindMeta[kind] ?? kindMeta.tool_call;
          const isAnswer = kind === "answer";
          const data: Record<string, unknown> =
            "data" in log && log.data
              ? log.data
              : { ...(log as WsLogEvent & { id: string }).data };

          return (
            <Box
              key={log.id ?? idx}
              sx={{ display: "flex", gap: 1.5, mb: 1, animation: `${fadeIn} 0.35s ease-out` }}
            >
              {/* Timeline spine */}
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Box
                  sx={{
                    width: 28, height: 28, borderRadius: "50%",
                    backgroundColor: alpha(meta.color, 0.15),
                    border: `1.5px solid ${alpha(meta.color, 0.4)}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                    color: meta.color,
                  }}
                >
                  {meta.icon}
                </Box>
                {idx < logs.length - 1 && (
                  <Box
                    sx={{
                      width: 1.5, flex: 1, minHeight: 12,
                      backgroundColor: alpha(meta.color, 0.15),
                      mt: 0.5,
                    }}
                  />
                )}
              </Box>

              {/* Content */}
              <Box sx={{ flex: 1, pb: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: meta.color,
                      fontWeight: 700,
                      fontSize: "0.72rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {meta.label}
                  </Typography>
                  {"step" in log && log.step !== undefined && (
                    <Typography variant="caption" sx={{ color: alpha("#9090C0", 0.5), fontSize: "0.68rem" }}>
                      step {log.step}
                    </Typography>
                  )}
                </Box>

                <Paper
                  elevation={0}
                  sx={{
                    p: isAnswer ? 0 : 1.25,
                    borderRadius: 1.5,
                    backgroundColor: isAnswer ? "transparent" : alpha(meta.color, 0.04),
                    border: isAnswer ? "none" : `1px solid ${alpha(meta.color, 0.12)}`,
                  }}
                >
                  {kind === "tool_call" && <ToolCallEntry data={data} />}
                  {kind === "answer" && <AnswerEntry data={data} />}
                  {kind === "error" && (
                    <Typography variant="body2" sx={{ color: "#FF6B6B", fontSize: "0.82rem" }}>
                      {(data.error as string) ?? JSON.stringify(data)}
                    </Typography>
                  )}
                  {kind === "start" && (
                    <Typography variant="body2" sx={{ color: "#9090C0", fontSize: "0.82rem" }}>
                      Research session started
                    </Typography>
                  )}
                </Paper>
              </Box>
            </Box>
          );
        })}
        <div ref={bottomRef} />
      </Box>

      {/* Scroll-to-bottom button */}
      {showScrollBtn && (
        <Tooltip title="Jump to latest">
          <IconButton
            onClick={scrollToBottom}
            size="small"
            sx={{
              position: "absolute",
              bottom: 8,
              right: 8,
              backgroundColor: alpha("#6C63FF", 0.9),
              color: "#fff",
              "&:hover": { backgroundColor: "#6C63FF" },
              boxShadow: "0 2px 12px rgba(108,99,255,0.5)",
            }}
          >
            <ArrowDownward sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}
