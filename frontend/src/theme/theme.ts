import { createTheme, alpha } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    surface: Palette["primary"];
  }
  interface PaletteOptions {
    surface?: PaletteOptions["primary"];
  }
}

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#6C63FF",
      light: "#9B94FF",
      dark: "#4B44CC",
    },
    secondary: {
      main: "#00D4AA",
      light: "#33DDBB",
      dark: "#009977",
    },
    error: {
      main: "#FF6B6B",
    },
    warning: {
      main: "#FFB347",
    },
    success: {
      main: "#51CF66",
    },
    background: {
      default: "#0A0A1A",
      paper: "#0F0F2A",
    },
    surface: {
      main: "#1A1A3E",
      light: "#242456",
      dark: "#0F0F2A",
      contrastText: "#FFFFFF",
    },
    text: {
      primary: "#E8E8FF",
      secondary: "#9090C0",
    },
    divider: alpha("#6C63FF", 0.15),
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, letterSpacing: "-0.02em" },
    h2: { fontWeight: 700, letterSpacing: "-0.01em" },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    body1: { lineHeight: 1.7 },
    body2: { lineHeight: 1.6 },
    caption: { letterSpacing: "0.04em" },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(108, 99, 255, 0.15), transparent)",
          minHeight: "100vh",
        },
        "::-webkit-scrollbar": { width: 6 },
        "::-webkit-scrollbar-track": { background: "transparent" },
        "::-webkit-scrollbar-thumb": {
          background: alpha("#6C63FF", 0.3),
          borderRadius: 3,
        },
        "::-webkit-scrollbar-thumb:hover": { background: alpha("#6C63FF", 0.5) },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: `1px solid ${alpha("#6C63FF", 0.15)}`,
          backdropFilter: "blur(12px)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 10,
          "&.MuiButton-containedPrimary": {
            background: "linear-gradient(135deg, #6C63FF 0%, #9B94FF 100%)",
            boxShadow: `0 4px 20px ${alpha("#6C63FF", 0.4)}`,
            "&:hover": {
              background: "linear-gradient(135deg, #4B44CC 0%, #6C63FF 100%)",
              boxShadow: `0 6px 24px ${alpha("#6C63FF", 0.6)}`,
            },
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            "& fieldset": { borderColor: alpha("#6C63FF", 0.3) },
            "&:hover fieldset": { borderColor: alpha("#6C63FF", 0.6) },
            "&.Mui-focused fieldset": { borderColor: "#6C63FF" },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, fontSize: "0.75rem" },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 4, height: 4 },
        bar: {
          background: "linear-gradient(90deg, #6C63FF, #00D4AA)",
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: "#1A1A3E",
          border: `1px solid ${alpha("#6C63FF", 0.3)}`,
          fontSize: "0.75rem",
        },
      },
    },
  },
});

export default theme;
