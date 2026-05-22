import {
  Card,
  CardContent,
  Box,
  Typography,
  LinearProgress,
  Tooltip,
  Chip,
  Collapse,
  IconButton,
} from "@mui/material";
import {
  InsertDriveFileOutlined,
  ExpandMore,
  ExpandLess,
  Search,
} from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import { useState } from "react";
import type { Finding } from "../api/types";

interface Props {
  finding: Finding | { file_path: string; note: string; confidence: number; evidence_snippet?: string; search_term?: string };
  animate?: boolean;
}

function confidenceColor(c: number): string {
  if (c >= 0.8) return "#51CF66";
  if (c >= 0.5) return "#FFB347";
  return "#FF6B6B";
}

export default function FindingCard({ finding, animate = false }: Props) {
  const [expanded, setExpanded] = useState(false);
  const color = confidenceColor(finding.confidence);
  const hasSnippet = "evidence_snippet" in finding && finding.evidence_snippet;
  const hasSearchTerm = "search_term" in finding && finding.search_term;

  return (
    <Card
      sx={{
        mb: 1.5,
        background: `linear-gradient(135deg, ${alpha("#1A1A3E", 0.9)}, ${alpha("#242456", 0.6)})`,
        border: `1px solid ${alpha(color, 0.2)}`,
        transition: "all 0.3s ease",
        animation: animate ? "slideIn 0.4s ease-out" : "none",
        "@keyframes slideIn": {
          from: { opacity: 0, transform: "translateX(-12px)" },
          to: { opacity: 1, transform: "translateX(0)" },
        },
        "&:hover": {
          border: `1px solid ${alpha(color, 0.4)}`,
          transform: "translateX(4px)",
          boxShadow: `0 4px 20px ${alpha(color, 0.1)}`,
        },
      }}
    >
      <CardContent sx={{ pb: "12px !important", pt: 1.5, px: 2 }}>
        {/* Header row */}
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 1 }}>
          <InsertDriveFileOutlined
            sx={{ fontSize: 16, color: alpha("#6C63FF", 0.8), mt: 0.3, flexShrink: 0 }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="caption"
              sx={{
                fontFamily: "monospace",
                color: "#9B94FF",
                fontSize: "0.72rem",
                wordBreak: "break-all",
                display: "block",
              }}
            >
              {finding.file_path}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
            <Tooltip title={`Confidence: ${(finding.confidence * 100).toFixed(0)}%`}>
              <Box
                sx={{
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  backgroundColor: alpha(color, 0.15),
                  border: `1px solid ${alpha(color, 0.3)}`,
                }}
              >
                <Typography variant="caption" sx={{ color, fontWeight: 700, fontSize: "0.7rem" }}>
                  {(finding.confidence * 100).toFixed(0)}%
                </Typography>
              </Box>
            </Tooltip>
            {(hasSnippet || hasSearchTerm) && (
              <IconButton
                size="small"
                onClick={() => setExpanded((e) => !e)}
                sx={{ color: alpha("#9090C0", 0.7), p: 0.25 }}
              >
                {expanded ? <ExpandLess sx={{ fontSize: 16 }} /> : <ExpandMore sx={{ fontSize: 16 }} />}
              </IconButton>
            )}
          </Box>
        </Box>

        {/* Confidence bar */}
        <LinearProgress
          variant="determinate"
          value={finding.confidence * 100}
          sx={{
            mb: 1,
            height: 3,
            borderRadius: 2,
            backgroundColor: alpha(color, 0.1),
            "& .MuiLinearProgress-bar": { backgroundColor: color },
          }}
        />

        {/* Note */}
        <Typography variant="body2" sx={{ color: "#C8C8F0", lineHeight: 1.6, fontSize: "0.82rem" }}>
          {finding.note}
        </Typography>

        {/* Expandable extras */}
        <Collapse in={expanded}>
          <Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
            {hasSearchTerm && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Search sx={{ fontSize: 13, color: alpha("#9090C0", 0.6) }} />
                <Chip
                  label={finding.search_term}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: "0.68rem",
                    backgroundColor: alpha("#6C63FF", 0.1),
                    color: "#9B94FF",
                  }}
                />
              </Box>
            )}
            {hasSnippet && (
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 1.5,
                  borderRadius: 1.5,
                  backgroundColor: alpha("#000", 0.4),
                  border: `1px solid ${alpha("#6C63FF", 0.15)}`,
                  fontFamily: "monospace",
                  fontSize: "0.72rem",
                  color: "#C8C8F0",
                  overflowX: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {finding.evidence_snippet}
              </Box>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}
