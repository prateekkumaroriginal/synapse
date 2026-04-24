import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import NewProjectPage from "@/pages/NewProjectPage";
import ProjectWorkspacePage from "@/pages/ProjectWorkspacePage";
import ProjectSettingsPage from "@/pages/ProjectSettingsPage";
import ArchivedProjectsPage from "@/pages/ArchivedProjectsPage";
import ProjectsPage from "@/pages/ProjectsPage";
import SignInPage from "@/pages/SignInPage";
import SignUpPage from "@/pages/SignUpPage";
import { TicketDetailPage } from "@/pages/TicketDetailPage";

export default function App() {
  return (
    <Routes>
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/sign-up" element={<SignUpPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<ProjectsPage />} />
        <Route path="/projects" element={<Navigate to="/" replace />} />
        <Route path="/projects/new" element={<NewProjectPage />} />
        <Route path="/projects/archived" element={<ArchivedProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectWorkspacePage />} />
        <Route path="/projects/:projectId/settings" element={<ProjectSettingsPage />} />
        <Route path="/projects/:projectId/tickets/:ticketId" element={<TicketDetailPage />} />
      </Route>
    </Routes>
  );
}
