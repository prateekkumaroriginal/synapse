import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, UserMinus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  projectSettingsFormSchema,
  type ProjectSettingsFormValues,
  type ProjectSettingsParsed,
} from "../../convex/validations";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { initialsFromViewer } from "@/lib/viewer-display";
import { ConfirmDangerDialog } from "@/components/projects/ConfirmDangerDialog";
import { InviteMemberDialog } from "@/components/projects/InviteMemberDialog";
import { ResourcesCard } from "@/components/projects/ResourcesCard";

export default function ProjectSettingsPage() {
  const params = useParams();
  const navigate = useNavigate();
  const rawProjectId = params.projectId ?? "";
  const projectId =
    rawProjectId.length > 0 ? (rawProjectId as Id<"projects">) : null;

  const project = useQuery(
    api.projects.getProject,
    projectId !== null ? { projectId } : "skip",
  );

  const viewer = useQuery(api.users.getViewerProfile);
  const members = useQuery(
    api.projectMembers.listForProject,
    projectId !== null ? { projectId } : "skip",
  );

  const updateProject = useMutation(api.projects.update);
  const archiveProject = useMutation(api.projects.archive);
  const unarchiveProject = useMutation(api.projects.unarchive);
  const deleteProject = useMutation(api.projects.deleteProject);
  const removeMember = useMutation(api.projectMembers.removeMember);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [dangerAction, setDangerAction] = useState<
    "Archive" | "Delete" | null
  >(null);
  const [dangerPending, setDangerPending] = useState(false);

  const form = useForm<ProjectSettingsFormValues, unknown, ProjectSettingsParsed>({
    resolver: zodResolver(projectSettingsFormSchema),
    mode: "onTouched",
    values: {
      name: project?.name || "",
      description: project?.description || "",
      gitRemoteUrl: project?.gitRemoteUrl || "",
      defaultBranch: project?.defaultBranch || "",
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = form;
  const gitRemoteUrl = watch("gitRemoteUrl");
  const hasGitRemoteUrl = typeof gitRemoteUrl === "string" && gitRemoteUrl.trim().length > 0;

  if (projectId === null || project === null) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <p className="text-muted-foreground">Project not found.</p>
        <Button type="button" variant="outline" asChild>
          <Link to="/">
            <ArrowLeft className="size-4" />
            Back to projects
          </Link>
        </Button>
      </div>
    );
  }

  if (project === undefined || viewer === undefined) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
        <Skeleton className="h-9 w-64 rounded-md" />
        <Skeleton className="h-[400px] w-full rounded-2xl" />
      </div>
    );
  }

  const isOwner = viewer !== null && project.ownerId === viewer._id;

  const onUpdateSubmit = handleSubmit(async (data) => {
    try {
      await updateProject({
        projectId,
        name: data.name,
        description: data.description,
        gitRemoteUrl: data.gitRemoteUrl,
        defaultBranch: data.defaultBranch,
      });
      toast.success("Project updated");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not update project.";
      toast.error(message);
    }
  });

  const handleDangerConfirm = async () => {
    setDangerPending(true);
    try {
      if (dangerAction === "Archive") {
        await archiveProject({ projectId });
        toast.success("Project archived");
        navigate("/projects/archived");
      } else if (dangerAction === "Delete") {
        await deleteProject({ projectId });
        toast.success("Project deleted");
        navigate("/");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Action failed";
      toast.error(msg);
    } finally {
      setDangerPending(false);
      setDangerAction(null);
    }
  };

  const handleUnarchive = async () => {
    try {
      await unarchiveProject({ projectId });
      toast.success("Project restored");
      navigate(`/projects/${projectId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Action failed";
      toast.error(msg);
    }
  };

  const handleRemoveMember = async (memberId: Id<"projectMembers">) => {
    try {
      await removeMember({ projectId, memberId });
      toast.success("Member removed");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove member";
      toast.error(msg);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" asChild className="shrink-0">
          <Link
            to={project.isArchived ? "/projects/archived" : `/projects/${projectId}`}
          >
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-semibold tracking-tight">Project Settings</h1>
      </div>

      <div className="flex flex-col gap-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Project Info</CardTitle>
            <CardDescription>
              General details about the project.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isOwner ? (
              <form onSubmit={(e) => void onUpdateSubmit(e)} className="flex flex-col gap-4">
                <FieldGroup>
                  <Field data-invalid={!!errors.name}>
                    <FieldLabel htmlFor="settings-name" required>
                      Name
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id="settings-name"
                        autoComplete="off"
                        disabled={isSubmitting}
                        aria-invalid={!!errors.name}
                        {...register("name")}
                      />
                      <FieldError errors={[errors.name]} />
                    </FieldContent>
                  </Field>
                  <Field data-invalid={!!errors.description}>
                    <FieldLabel htmlFor="settings-description">
                      Description
                    </FieldLabel>
                    <FieldContent>
                      <Textarea
                        id="settings-description"
                        autoComplete="off"
                        disabled={isSubmitting}
                        aria-invalid={!!errors.description}
                        {...register("description")}
                      />
                      <FieldError errors={[errors.description]} />
                    </FieldContent>
                  </Field>
                  <Field data-invalid={!!errors.gitRemoteUrl}>
                    <FieldLabel htmlFor="settings-git-remote-url">
                      Git repository URL
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id="settings-git-remote-url"
                        autoComplete="off"
                        placeholder="https://github.com/org/repo"
                        disabled={isSubmitting}
                        aria-invalid={!!errors.gitRemoteUrl}
                        {...register("gitRemoteUrl", {
                          setValueAs: (value: unknown) =>
                            typeof value === "string" && value.trim().length > 0
                              ? value.trim()
                              : undefined,
                        })}
                      />
                      <FieldError errors={[errors.gitRemoteUrl]} />
                    </FieldContent>
                  </Field>
                  <Field data-invalid={!!errors.defaultBranch}>
                    <FieldLabel htmlFor="settings-default-branch">
                      Default branch
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id="settings-default-branch"
                        autoComplete="off"
                        placeholder="main"
                        disabled={isSubmitting || !hasGitRemoteUrl}
                        aria-invalid={!!errors.defaultBranch}
                        {...register("defaultBranch", {
                          setValueAs: (value: unknown) =>
                            typeof value === "string" && value.trim().length > 0
                              ? value.trim()
                              : undefined,
                        })}
                      />
                      <FieldError errors={[errors.defaultBranch]} />
                    </FieldContent>
                  </Field>
                </FieldGroup>
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting || !isDirty}>
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Name</h3>
                  <p className="text-base">{project.name}</p>
                </div>
                {project.description && (
                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                    <p className="text-base">{project.description}</p>
                  </div>
                )}
                {project.gitRemoteUrl && (
                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-medium text-muted-foreground">Git repository URL</h3>
                    <p className="break-all text-base">{project.gitRemoteUrl}</p>
                  </div>
                )}
                {project.gitRemoteUrl && (
                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-medium text-muted-foreground">Default branch</h3>
                    <p className="text-base">{project.defaultBranch ?? "main"}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <ResourcesCard projectId={projectId} isOwner={isOwner} />

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-6">
            <div className="flex flex-col gap-1.5">
              <CardTitle>Project Members</CardTitle>
              <CardDescription>
                People with access to this project.
              </CardDescription>
            </div>
            {isOwner && (
              <Button onClick={() => setInviteOpen(true)} size="sm">
                Invite Member
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {members === undefined ? (
              <div className="flex flex-col gap-4">
                <Skeleton className="h-14 w-full rounded-md" />
                <Skeleton className="h-14 w-full rounded-md" />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {members.map((member) => {
                  const isProjectOwner = member.userId === project.ownerId;
                  return (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between gap-4 rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <Avatar className="size-10 shrink-0 border">
                          <AvatarFallback className="bg-secondary text-sm font-medium text-secondary-foreground">
                            {initialsFromViewer(member.email, member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col overflow-hidden">
                          <span className="truncate text-sm font-medium">
                            {member.name || "Unknown"}
                          </span>
                          {member.email && (
                            <span className="truncate text-xs text-muted-foreground">
                              {member.email}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {isProjectOwner ? (
                          <Badge variant="secondary" className="font-normal">
                            Owner
                          </Badge>
                        ) : isOwner && member._id !== null ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => void handleRemoveMember(member._id!)}
                          >
                            <UserMinus className="size-4" />
                            <span className="sr-only">Remove member</span>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {isOwner && (
          <Card className="rounded-2xl border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Destructive actions that affect the entire project.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {project.isArchived ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium">Project is archived</p>
                    <p className="text-sm text-muted-foreground">
                      You can delete the project permanently or restore it to active.
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" onClick={() => void handleUnarchive()}>
                      Unarchive
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setDangerAction("Delete")}
                    >
                      Delete Project
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Archive this project</p>
                    <p className="text-sm text-muted-foreground">
                      Remove the project from the active list. You can still access it later.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                    onClick={() => setDangerAction("Archive")}
                  >
                    Archive Project
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <InviteMemberDialog
        projectId={projectId}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
      />

      <ConfirmDangerDialog
        action={dangerAction || "Archive"}
        open={dangerAction !== null}
        onOpenChange={(op) => {
          if (!op) setDangerAction(null);
        }}
        projectName={project.name}
        onConfirm={() => void handleDangerConfirm()}
        isPending={dangerPending}
      />
    </div>
  );
}
