import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Skeleton,
  Divider,
  TextField,
  Tooltip,
  Alert,
} from "@mui/material";
import { Search, History, GitHub, FolderOpen, WifiOff } from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { fetchSessions } from "../api/sessions";
import StatusBadge from "./StatusBadge";
import type { ResearchSession } from "../api/types";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function repoName(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.replace(/^\//, "").split("/");
    return parts.slice(0, 2).join("/");
  } catch {
    // local path — return last segment
    return url.split("/").filter(Boolean).pop() ?? url;
  }
}

function isLocalPath(url: string): boolean {
  return url.startsWith("/") || url.startsWith("~") || url.startsWith(".");
}

export default function SessionList() {
  const { data: sessions, isLoading, isError } = useQuery<ResearchSession[]>({
    queryKey: ["sessions"],
    queryFn: fetchSessions,
    // Only refetch while the window is focused; retry once on failure then stop
    refetchInterval: (query) =>
      query.state.status === "error" ? false : 8000,
    refetchIntervalInBackground: false,
    retry: 1,
    retryDelay: 3000,
  });
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { id: activeId } = useParams();

  const filtered = (sessions ?? []).filter((s) => {
    const q = search.toLowerCase();
    return (
      s.question.toLowerCase().includes(q) ||
      s.repository_url.toLowerCase().includes(q)
    );
  });

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: alpha("#0F0F2A", 0.7),
        borderRight: `1px solid ${alpha("#6C63FF", 0.12)}`,
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: `1px solid ${alpha("#6C63FF", 0.1)}` }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <History sx={{ color: alpha("#6C63FF", 0.8), fontSize: 20 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#E8E8FF" }}>
            Sessions
          </Typography>
          {sessions && sessions.length > 0 && (
            <Box
              sx={{
                ml: "auto",
                px: 1,
                py: 0.25,
                borderRadius: 1,
                backgroundColor: alpha("#6C63FF", 0.15),
              }}
            >
              <Typography variant="caption" sx={{ color: "#9B94FF", fontWeight: 700, fontSize: "0.7rem" }}>
                {sessions.length}
              </Typography>
            </Box>
          )}
        </Box>
        <TextField
          size="small"
          fullWidth
          placeholder="Search sessions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <Search sx={{ fontSize: 16, color: alpha("#9090C0", 0.5), mr: 0.75, flexShrink: 0 }} />
              ),
            },
          }}
          sx={{
            "& .MuiInputBase-root": {
              backgroundColor: alpha("#0A0A1A", 0.5),
              fontSize: "0.8rem",
              borderRadius: 1.5,
            },
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: alpha("#6C63FF", 0.15),
            },
          }}
        />
      </Box>

      {/* List */}
      <Box sx={{ flex: 1, overflowY: "auto" }}>
        {isError ? (
          <Box sx={{ p: 2 }}>
            <Alert
              severity="warning"
              icon={<WifiOff sx={{ fontSize: 16 }} />}
              sx={{
                backgroundColor: alpha("#FFB347", 0.08),
                border: `1px solid ${alpha("#FFB347", 0.25)}`,
                color: "#FFB347",
                fontSize: "0.75rem",
                "& .MuiAlert-icon": { color: "#FFB347" },
              }}
            >
              Backend unreachable
            </Alert>
          </Box>
        ) : isLoading ? (
          <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
            {[...Array(3)].map((_, i) => (
              <Skeleton
                key={i}
                variant="rounded"
                height={68}
                sx={{ backgroundColor: alpha("#6C63FF", 0.06) }}
              />
            ))}
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 6, px: 2 }}>
            <History sx={{ fontSize: 36, color: alpha("#9090C0", 0.2), mb: 1 }} />
            <Typography variant="caption" sx={{ color: alpha("#9090C0", 0.5), textAlign: "center" }}>
              {search ? "No sessions match your search" : "No sessions yet.\nStart one above!"}
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {filtered.map((session, idx) => {
              const isActive = session.id === activeId;
              const local = isLocalPath(session.repository_url);
              return (
                <Box key={session.id}>
                  <ListItemButton
                    selected={isActive}
                    onClick={() => navigate(`/sessions/${session.id}`)}
                    sx={{
                      px: 2,
                      py: 1.5,
                      borderLeft: isActive ? `3px solid #6C63FF` : "3px solid transparent",
                      backgroundColor: isActive ? alpha("#6C63FF", 0.08) : "transparent",
                      "&:hover": { backgroundColor: alpha("#6C63FF", 0.05) },
                      transition: "all 0.2s",
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                          <Tooltip title={session.repository_url} placement="right">
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0, flex: 1 }}>
                              {local
                                ? <FolderOpen sx={{ fontSize: 12, color: alpha("#9090C0", 0.5), flexShrink: 0 }} />
                                : <GitHub sx={{ fontSize: 12, color: alpha("#9090C0", 0.5), flexShrink: 0 }} />
                              }
                              <Typography
                                variant="caption"
                                sx={{
                                  color: alpha("#9B94FF", 0.7),
                                  fontFamily: "monospace",
                                  fontSize: "0.68rem",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {repoName(session.repository_url)}
                              </Typography>
                            </Box>
                          </Tooltip>
                          <Box sx={{ flexShrink: 0 }}>
                            <StatusBadge status={session.status} />
                          </Box>
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography
                            component="span"
                            sx={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              color: isActive ? "#E8E8FF" : "#C8C8F0",
                              fontSize: "0.78rem",
                              lineHeight: 1.4,
                            }}
                          >
                            {session.question}
                          </Typography>
                          <Typography
                            component="span"
                            sx={{
                              display: "block",
                              color: alpha("#9090C0", 0.5),
                              fontSize: "0.66rem",
                              mt: 0.5,
                            }}
                          >
                            {timeAgo(session.created_at)}
                          </Typography>
                        </Box>
                      }
                      disableTypography
                    />
                  </ListItemButton>
                  {idx < filtered.length - 1 && (
                    <Divider sx={{ borderColor: alpha("#6C63FF", 0.06) }} />
                  )}
                </Box>
              );
            })}
          </List>
        )}
      </Box>
    </Box>
  );
}
