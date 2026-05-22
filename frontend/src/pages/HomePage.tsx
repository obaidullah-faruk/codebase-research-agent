import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import SessionForm from "../components/SessionForm";
import type { ResearchSession } from "../api/types";

export default function HomePage() {
  const navigate = useNavigate();

  const handleCreated = (session: ResearchSession) => {
    navigate(`/sessions/${session.id}`);
  };

  return (
    <Box
      sx={{
        maxWidth: 680,
        mx: "auto",
        px: { xs: 2, md: 0 },
        py: { xs: 2, md: 4 },
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      {/* Hero */}
      <Box sx={{ textAlign: "center" }}>
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 72,
            height: 72,
            borderRadius: 3,
            background: "linear-gradient(135deg, #6C63FF 0%, #00D4AA 100%)",
            boxShadow: `0 8px 32px ${alpha("#6C63FF", 0.4)}`,
            mb: 2.5,
          }}
        >
          <Typography sx={{ fontSize: 36 }}>🔬</Typography>
        </Box>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 800,
            background: "linear-gradient(135deg, #E8E8FF 0%, #9B94FF 100%)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            mb: 1,
          }}
        >
          Codebase Research
        </Typography>
        <Typography variant="body1" sx={{ color: alpha("#9090C0", 0.8), maxWidth: 440, mx: "auto" }}>
          Ask natural language questions about any GitHub repository or local codebase.
          The AI agent explores the code and delivers precise answers.
        </Typography>
      </Box>

      {/* Form */}
      <SessionForm onCreated={handleCreated} />

      {/* Feature pills */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, justifyContent: "center" }}>
        {[
          { icon: "⚡", label: "Real-time streaming" },
          { icon: "🔍", label: "Deep code search" },
          { icon: "💡", label: "Smart findings" },
          { icon: "📁", label: "Local path support" },
        ].map(({ icon, label }) => (
          <Box
            key={label}
            sx={{
              px: 2, py: 0.75, borderRadius: 10,
              backgroundColor: alpha("#1A1A3E", 0.6),
              border: `1px solid ${alpha("#6C63FF", 0.15)}`,
              display: "flex", alignItems: "center", gap: 0.75,
            }}
          >
            <Typography sx={{ fontSize: "0.85rem" }}>{icon}</Typography>
            <Typography variant="caption" sx={{ color: alpha("#9090C0", 0.8), fontWeight: 500 }}>
              {label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
