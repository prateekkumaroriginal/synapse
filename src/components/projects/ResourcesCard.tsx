import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { ExternalLink, Link2, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  resourceFormSchema,
  type ResourceFormValues,
} from "../../../convex/validations";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

interface ResourcesCardProps {
  projectId: Id<"projects">;
  isOwner: boolean;
}

export function ResourcesCard({ projectId, isOwner }: ResourcesCardProps) {
  const resources = useQuery(api.projectResources.listForProject, { projectId });
  const addResource = useMutation(api.projectResources.add);
  const removeResource = useMutation(api.projectResources.remove);

  const form = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceFormSchema),
    mode: "onTouched",
    defaultValues: { url: "", label: "", domain: "" },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  const onAdd = handleSubmit(async (data) => {
    try {
      await addResource({
        projectId,
        url: data.url,
        label: data.label || undefined,
        domain: data.domain,
      });
      reset();
      toast.success("Resource added");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not add resource.";
      toast.error(msg);
    }
  });

  const handleRemove = async (resourceId: Id<"projectResources">) => {
    try {
      await removeResource({ resourceId });
      toast.success("Resource removed");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not remove resource.";
      toast.error(msg);
    }
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Resources</CardTitle>
        <CardDescription>
          Useful links and references for this project.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {resources === undefined ? (
          <ResourcesCard.Skeleton />
        ) : resources.length === 0 ? (
          <Empty className="border">
            <EmptyMedia variant="icon">
              <Link2 />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>No resources yet</EmptyTitle>
              <EmptyDescription>
                {isOwner
                  ? "Add links to docs, repos, or any relevant resources."
                  : "No resources have been added to this project."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-2">
            {resources.map((resource) => (
              <div
                key={resource._id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <Badge variant="secondary" className="shrink-0 font-normal">
                    {resource.domain}
                  </Badge>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 truncate text-sm text-foreground underline-offset-4 hover:underline"
                  >
                    {resource.label ?? resource.url}
                    <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
                  </a>
                </div>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => void handleRemove(resource._id)}
                  >
                    <Trash2 className="size-4" />
                    <span className="sr-only">Remove resource</span>
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {isOwner && (
          <form
            onSubmit={(e) => void onAdd(e)}
            className="flex flex-col gap-3 border-t pt-4"
          >
            <FieldGroup>
              <Field data-invalid={!!errors.url}>
                <FieldLabel htmlFor="resource-url" required>
                  URL
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="resource-url"
                    placeholder="https://example.com"
                    autoComplete="off"
                    disabled={isSubmitting}
                    aria-invalid={!!errors.url}
                    {...register("url")}
                  />
                  <FieldError errors={[errors.url]} />
                </FieldContent>
              </Field>
              <div className="flex gap-3">
                <Field data-invalid={!!errors.label} className="flex-1">
                  <FieldLabel htmlFor="resource-label">Label</FieldLabel>
                  <FieldContent>
                    <Input
                      id="resource-label"
                      placeholder="e.g. GitHub Repo"
                      autoComplete="off"
                      disabled={isSubmitting}
                      aria-invalid={!!errors.label}
                      {...register("label")}
                    />
                    <FieldError errors={[errors.label]} />
                  </FieldContent>
                </Field>
                <Field data-invalid={!!errors.domain} className="flex-1">
                  <FieldLabel htmlFor="resource-domain" required>
                    Domain
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="resource-domain"
                      placeholder="e.g. Backend"
                      autoComplete="off"
                      disabled={isSubmitting}
                      aria-invalid={!!errors.domain}
                      {...register("domain")}
                    />
                    <FieldError errors={[errors.domain]} />
                  </FieldContent>
                </Field>
              </div>
            </FieldGroup>
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Resource"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

ResourcesCard.Skeleton = function ResourcesCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-12 w-full rounded-lg" />
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  );
};
