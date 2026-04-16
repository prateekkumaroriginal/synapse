import { Route, Routes } from "react-router-dom";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import NewProjectPage from "@/pages/NewProjectPage";
import ProjectsPage from "@/pages/ProjectsPage";
import SignInPage from "@/pages/SignInPage";
import SignUpPage from "@/pages/SignUpPage";

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
        <Route path="/projects/new" element={<NewProjectPage />} />
      </Route>
    </Routes>
  );
}
