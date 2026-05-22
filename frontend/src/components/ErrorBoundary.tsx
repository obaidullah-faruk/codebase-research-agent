import { Component, type ReactNode } from "react";
import { Box, Typography, Button } from "@mui/material";
import { ErrorOutlined } from "@mui/icons-material";
import { alpha } from "@mui/material/styles";

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <Box sx={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:2, p:4 }}>
          <ErrorOutlined sx={{ fontSize: 48, color: alpha("#FF6B6B", 0.6) }} />
          <Typography variant="h6" sx={{ color: "#FF6B6B" }}>Something went wrong</Typography>
          <Box component="pre" sx={{ p:2, borderRadius:2, backgroundColor: alpha("#000",0.4), color:"#FF9090", fontSize:"0.78rem", maxWidth:600, overflowX:"auto", whiteSpace:"pre-wrap", wordBreak:"break-all" }}>
            {this.state.error.message}
            {"\n\n"}
            {this.state.error.stack}
          </Box>
          <Button variant="outlined" onClick={() => window.location.reload()}>Reload</Button>
        </Box>
      );
    }
    return this.props.children;
  }
}
