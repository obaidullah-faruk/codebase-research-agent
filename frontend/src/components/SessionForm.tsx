import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Tooltip,
  Chip,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
} from "@mui/material";
import { GitHub, Psychology, Send, FolderOpen, Link } from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSession } from "../api/sessions";
import type { ResearchSession } from "../api/types";

const EXAMPLE_QUESTIONS = [
  "How is authentication implemented?",
  "What are the main API endpoints?",
  "Explain the data models",
  "Where is error handling done?",
];

type SourceMode = "github" | "local";

interface Props {
  onCreated?: (session: ResearchSession) => void;
}

function friendlyError(err: unknown): string {
  const msg = (err as Error)?.message ?? "";
  if (msg.includes("Network Error") || msg.includes("ERR_CONNECTION_REFUSED")) {
    return "Cannot reach the backend. Make sure the Django server is running on port 8000.";
  }
  const data = (err as { response?: { data?: { detail?: string; repo_url?: string[] } } })?.response?.data;
  if (data?.detail) return data.detail;
  if (data?.repo_url?.[0]) return data.repo_url[0];
  return msg || "Something went wrong. Please try again.";
}

export default function SessionForm({ onCreated }: Props) {
  const [mode, setMode] = useState<SourceMode>("github");
  const [githubUrl, setGithubUrl] = useState("");
  const [localPath, setLocalPath] = useState("");
  const [question, setQuestion] = useState("");
  const folderInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const repoUrl = mode === "github" ? githubUrl : localPath;

  const mutation = useMutation({
    mutationFn: createSession,
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      setGithubUrl("");
      setLocalPath("");
      setQuestion("");
      onCreated?.(session);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim() || !question.trim()) return;
    mutation.mutate({ repo_url: repoUrl.trim(), question: question.trim() });
  };

  const handleFolderPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    // Extract the directory path from the first file's webkitRelativePath
    // e.g. "my-repo/src/index.ts" → folder name is "my-repo"
    // The browser gives us relative paths only; we rely on the file object's
    // full path via the non-standard .path property (Electron/Node) or fallback
    // to the webkitRelativePath root segment so the user can see what was picked.
    const first = files[0];
    const fullPath: string =
      // Electron / some desktop browsers expose .path
      (first as File & { path?: string }).path
        ? (first as File & { path?: string }).path!.replace(/[/\\][^/\\]+$/, "")
        : "/" + first.webkitRelativePath.split("/")[0];
    setLocalPath(fullPath);
    // Reset input so the same folder can be re-picked
    e.target.value = "";
  };

  const isValid = repoUrl.trim().length > 0 && question.trim().length > 0;

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        p: 3,
        borderRadius: 3,
        background: `linear-gradient(135deg, ${alpha("#1A1A3E", 0.95)}, ${alpha("#0F0F2A", 0.9)})`,
        border: `1px solid ${alpha("#6C63FF", 0.2)}`,
        backdropFilter: "blur(20px)",
        boxShadow: `0 8px 40px ${alpha("#6C63FF", 0.1)}`,
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <Box
          sx={{
            width: 40, height: 40, borderRadius: 2,
            background: "linear-gradient(135deg, #6C63FF, #00D4AA)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Psychology sx={{ color: "#fff", fontSize: 22 }} />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#E8E8FF", lineHeight: 1.2 }}>
            New Research Session
          </Typography>
          <Typography variant="caption" sx={{ color: alpha("#9090C0", 0.8) }}>
            Ask anything about a GitHub repository or local codebase
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>

        {/* Source type toggle */}
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_, v) => { if (v) setMode(v); }}
          size="small"
          sx={{
            "& .MuiToggleButtonGroup-grouped": {
              flex: 1,
              border: `1px solid ${alpha("#6C63FF", 0.25)} !important`,
              borderRadius: "10px !important",
              color: alpha("#9090C0", 0.7),
              fontWeight: 600,
              fontSize: "0.8rem",
              py: 0.9,
              textTransform: "none",
              gap: 0.75,
              transition: "all 0.2s",
              "&.Mui-selected": {
                backgroundColor: alpha("#6C63FF", 0.2),
                color: "#9B94FF",
                borderColor: `${alpha("#6C63FF", 0.5)} !important`,
              },
              "&:hover:not(.Mui-selected)": {
                backgroundColor: alpha("#6C63FF", 0.07),
              },
            },
            width: "100%",
            gap: 1,
            backgroundColor: "transparent",
          }}
        >
          <ToggleButton value="github" disableRipple={false}>
            <GitHub sx={{ fontSize: 17 }} />
            GitHub URL
          </ToggleButton>
          <ToggleButton value="local" disableRipple={false}>
            <FolderOpen sx={{ fontSize: 17 }} />
            Local Directory
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Source input */}
        {mode === "github" ? (
          <TextField
            fullWidth
            label="GitHub repository URL"
            placeholder="https://github.com/owner/repo"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            autoFocus
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Link sx={{ color: alpha("#9090C0", 0.55), fontSize: 18 }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              "& .MuiInputBase-root": {
                backgroundColor: alpha("#0A0A1A", 0.6),
                borderRadius: 2,
              },
            }}
          />
        ) : (
          <Box>
            {/* Hidden folder picker */}
            <input
              ref={folderInputRef}
              type="file"
              // @ts-expect-error – non-standard but widely supported
              webkitdirectory=""
              directory=""
              multiple
              style={{ display: "none" }}
              onChange={handleFolderPick}
            />

            <Paper
              elevation={0}
              onClick={() => folderInputRef.current?.click()}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                px: 2,
                py: 1.5,
                borderRadius: 2,
                backgroundColor: alpha("#0A0A1A", 0.6),
                border: `1px solid ${localPath
                  ? alpha("#6C63FF", 0.4)
                  : alpha("#6C63FF", 0.2)}`,
                cursor: "pointer",
                transition: "all 0.2s",
                "&:hover": {
                  borderColor: alpha("#6C63FF", 0.55),
                  backgroundColor: alpha("#0A0A1A", 0.75),
                },
              }}
            >
              <Box
                sx={{
                  width: 36, height: 36, borderRadius: 1.5, flexShrink: 0,
                  background: localPath
                    ? "linear-gradient(135deg, #6C63FF44, #00D4AA44)"
                    : alpha("#6C63FF", 0.1),
                  border: `1px solid ${alpha("#6C63FF", 0.2)}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <FolderOpen sx={{
                  fontSize: 20,
                  color: localPath ? "#9B94FF" : alpha("#9090C0", 0.5),
                }} />
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                {localPath ? (
                  <>
                    <Typography variant="body2" sx={{
                      color: "#E8E8FF", fontWeight: 600, fontSize: "0.85rem",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {localPath.split("/").filter(Boolean).pop()}
                    </Typography>
                    <Typography variant="caption" sx={{
                      color: alpha("#9090C0", 0.6), fontFamily: "monospace",
                      fontSize: "0.68rem", display: "block",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {localPath}
                    </Typography>
                  </>
                ) : (
                  <>
                    <Typography variant="body2" sx={{ color: alpha("#E8E8FF", 0.7), fontWeight: 500, fontSize: "0.85rem" }}>
                      Click to select a directory
                    </Typography>
                    <Typography variant="caption" sx={{ color: alpha("#9090C0", 0.5), fontSize: "0.72rem" }}>
                      Browse your local filesystem
                    </Typography>
                  </>
                )}
              </Box>

              <Button
                variant="outlined"
                size="small"
                component="span"
                onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}
                sx={{
                  flexShrink: 0,
                  borderColor: alpha("#6C63FF", 0.35),
                  color: "#9B94FF",
                  fontSize: "0.72rem",
                  py: 0.5, px: 1.5,
                  borderRadius: 1.5,
                  textTransform: "none",
                  "&:hover": { borderColor: "#6C63FF", backgroundColor: alpha("#6C63FF", 0.1) },
                }}
              >
                Browse
              </Button>
            </Paper>
          </Box>
        )}

        {/* Question */}
        <Box>
          <TextField
            fullWidth
            multiline
            minRows={2}
            maxRows={5}
            label="Research question"
            placeholder="What would you like to know about this codebase?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            sx={{
              "& .MuiInputBase-root": {
                backgroundColor: alpha("#0A0A1A", 0.6),
                borderRadius: 2,
              },
            }}
          />
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1 }}>
            {EXAMPLE_QUESTIONS.map((q) => (
              <Tooltip key={q} title="Use this question">
                <Chip
                  label={q}
                  size="small"
                  onClick={() => setQuestion(q)}
                  sx={{
                    cursor: "pointer",
                    fontSize: "0.7rem",
                    backgroundColor: alpha("#6C63FF", 0.08),
                    color: alpha("#9B94FF", 0.8),
                    border: `1px solid ${alpha("#6C63FF", 0.2)}`,
                    "&:hover": {
                      backgroundColor: alpha("#6C63FF", 0.18),
                      color: "#9B94FF",
                    },
                  }}
                />
              </Tooltip>
            ))}
          </Box>
        </Box>

        {/* Error */}
        {mutation.isError && (
          <Box sx={{
            p: 1.5, borderRadius: 1.5,
            backgroundColor: alpha("#FF6B6B", 0.08),
            border: `1px solid ${alpha("#FF6B6B", 0.3)}`,
          }}>
            <Typography variant="caption" sx={{ color: "#FF6B6B", lineHeight: 1.6 }}>
              {friendlyError(mutation.error)}
            </Typography>
          </Box>
        )}

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={!isValid || mutation.isPending}
          endIcon={mutation.isPending ? <CircularProgress size={18} color="inherit" /> : <Send />}
          sx={{ alignSelf: "flex-end", px: 4, minWidth: 160 }}
        >
          {mutation.isPending ? "Starting…" : "Start Research"}
        </Button>
      </Box>
    </Box>
  );
}
