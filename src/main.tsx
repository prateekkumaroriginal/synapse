import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { NuqsAdapter } from "nuqs/adapters/react-router/v7";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import "@fontsource-variable/geist/wght.css";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <NuqsAdapter>
        <ConvexAuthProvider client={convex}>
          <ThemeProvider>
          <TooltipProvider delayDuration={500}>
            <App />
            <Toaster richColors closeButton />
          </TooltipProvider>
        </ThemeProvider>
      </ConvexAuthProvider>
      </NuqsAdapter>
    </BrowserRouter>
  </StrictMode>,
);
