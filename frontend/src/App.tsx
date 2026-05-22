import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Tooltip,
  Drawer,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Psychology, Add, Menu as MenuIcon } from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useState } from "react";
import SessionList from "./components/SessionList";
import HomePage from "./pages/HomePage";
import SessionPage from "./pages/SessionPage";

const SIDEBAR_WIDTH = 280;

export default function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  const sidebar = <SessionList />;

  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Top bar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          background: alpha("#0A0A1A", 0.85),
          backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${alpha("#6C63FF", 0.12)}`,
          width: "100%",
        }}
      >
        <Toolbar sx={{ minHeight: "52px !important", px: { xs: 1.5, md: 2 } }}>
          {isMobile && (
            <IconButton
              size="small"
              onClick={() => setDrawerOpen(true)}
              sx={{ color: alpha("#9090C0", 0.7), mr: 1 }}
            >
              <MenuIcon sx={{ fontSize: 20 }} />
            </IconButton>
          )}

          {/* Logo */}
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "pointer" }}
            onClick={() => navigate("/")}
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1.5,
                background: "linear-gradient(135deg, #6C63FF, #00D4AA)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Psychology sx={{ fontSize: 17, color: "#fff" }} />
            </Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                letterSpacing: "-0.02em",
                background: "linear-gradient(135deg, #E8E8FF, #9B94FF)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Research Agent
            </Typography>
          </Box>

          <Box sx={{ flex: 1 }} />

          <Tooltip title="New session">
            <IconButton
              size="small"
              onClick={() => navigate("/")}
              sx={{
                backgroundColor: alpha("#6C63FF", 0.15),
                color: "#9B94FF",
                border: `1px solid ${alpha("#6C63FF", 0.25)}`,
                borderRadius: 1.5,
                px: 1.25,
                gap: 0.5,
                "&:hover": { backgroundColor: alpha("#6C63FF", 0.25) },
              }}
            >
              <Add sx={{ fontSize: 18 }} />
              {!isMobile && (
                <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "0.72rem" }}>
                  New
                </Typography>
              )}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Sidebar — persistent on desktop, drawer on mobile */}
      {!isMobile ? (
        <Box
          component="nav"
          sx={{
            width: SIDEBAR_WIDTH,
            flexShrink: 0,
            mt: "52px",
            height: "calc(100vh - 52px)",
            position: "fixed",
            left: 0,
          }}
        >
          {sidebar}
        </Box>
      ) : (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          sx={{
            "& .MuiDrawer-paper": {
              width: SIDEBAR_WIDTH,
              backgroundColor: "#0F0F2A",
              borderRight: `1px solid ${alpha("#6C63FF", 0.12)}`,
              mt: "52px",
              height: "calc(100vh - 52px)",
            },
          }}
        >
          <Box onClick={() => setDrawerOpen(false)} sx={{ height: "100%" }}>
            {sidebar}
          </Box>
        </Drawer>
      )}

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          ml: isMobile ? 0 : `${SIDEBAR_WIDTH}px`,
          mt: "52px",
          height: "calc(100vh - 52px)",
          overflowY: "auto",
        }}
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/sessions/:id" element={<SessionPage />} />
        </Routes>
      </Box>
    </Box>
  );
}
