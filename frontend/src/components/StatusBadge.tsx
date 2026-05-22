import React from "react";
import { Chip, keyframes } from "@mui/material";
import {
  HourglassEmpty,
  PlayArrow,
  CheckCircle,
  ErrorOutlined,
} from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import type { SessionStatus } from "../api/types";

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

interface Props {
  status: SessionStatus;
  size?: "small" | "medium";
}

const config: Record<SessionStatus, { label: string; color: string; icon: React.ReactElement }> = {
  pending: {
    label: "Pending",
    color: "#FFB347",
    icon: <HourglassEmpty sx={{ fontSize: 14 }} />,
  },
  running: {
    label: "Running",
    color: "#6C63FF",
    icon: <PlayArrow sx={{ fontSize: 14 }} />,
  },
  completed: {
    label: "Completed",
    color: "#51CF66",
    icon: <CheckCircle sx={{ fontSize: 14 }} />,
  },
  failed: {
    label: "Failed",
    color: "#FF6B6B",
    icon: <ErrorOutlined sx={{ fontSize: 14 }} />,
  },
};

export default function StatusBadge({ status, size = "small" }: Props) {
  const { label, color, icon } = config[status];
  const isRunning = status === "running";

  return (
    <Chip
      size={size}
      label={label}
      icon={icon}
      sx={{
        color,
        backgroundColor: alpha(color, 0.12),
        border: `1px solid ${alpha(color, 0.3)}`,
        animation: isRunning ? `${pulse} 2s ease-in-out infinite` : "none",
        "& .MuiChip-icon": { color },
        fontWeight: 700,
        letterSpacing: "0.05em",
        fontSize: "0.7rem",
        textTransform: "uppercase",
      }}
    />
  );
}
