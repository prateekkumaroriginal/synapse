import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  ticketCreateFormSchema,
  type TicketCreateFormValues,
  type TicketCreateParsed,
} from "../../convex/validations";
import { TicketRow } from "@/components/tickets/TicketRow";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
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
import { cn } from "@/lib/utils";

export default function ProjectWorkspacePage() {
  const params = useParams();
  const rawProjectId = params.projectId ?? "";
  const projectId =
    rawProjectId.length > 0 ? (rawProjectId as Id<"projects">) : null;

  const project = useQuery(
    api.projects.getProject,
    projectId !== null ? { projectId } : "skip",
  );
  const tickets = useQuery(
    api.tickets.listForProject,
    projectId !== null ? { projectId } : "skip",
  );

  const createTicket = useMutation(api.tickets.create);
  const moveTicket = useMutation(api.tickets.move);
  const [movingTicketId, setMovingTicketId] = useState<Id<"tickets"> | null>(
    null,
  );

  const form = useForm<TicketCreateFormValues, unknown, TicketCreateParsed>({
    resolver: zodResolver(ticketCreateFormSchema),
    mode: "onTouched",
    defaultValues: {
      title: "",
      description: "",
      type: "TASK",
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  const onCreateSubmit = handleSubmit(async (data) => {
    if (projectId === null) {
      return;
    }
    try {
      await createTicket({
        projectId,
        title: data.title,
        description: data.description,
        type: data.type,
      });
      void reset({ title: "", description: "", type: data.type });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not create ticket.";
      toast.error(message);
    }
  });

  async function handleMove(
    ticketId: Id<"tickets">,
    direction: "next" | "prev",
  ) {
    setMovingTicketId(ticketId);
    try {
      await moveTicket({ ticketId, direction });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not update ticket.";
      toast.error(message);
    } finally {
      setMovingTicketId(null);
    }
  }

  if (projectId === null) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <p className="text-muted-foreground">Invalid project link.</p>
        <Button type="button" variant="outline" asChild>
          <Link to="/">
            <ArrowLeft className="size-4" />
            Back to projects
          </Link>
        </Button>
      </div>
    );
  }

  if (project === undefined) {
    return <ProjectWorkspacePage.Skeleton />;
  }

  if (project === null) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <p className="text-muted-foreground">
          This project was not found or you do not have access.
        </p>
        <Button type="button" variant="outline" asChild>
          <Link to="/">
            <ArrowLeft className="size-4" />
            Back to projects
          </Link>
        </Button>
      </div>
    );
  }

  const ticketsReady = tickets !== undefined;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ms-2 mb-1 h-8 px-2 text-muted-foreground"
            asChild
          >
            <Link to="/">
              <ArrowLeft className="size-4" />
              Projects
            </Link>
          </Button>
          <h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
          {project.description ? (
            <p className="max-w-2xl text-sm text-muted-foreground">
              {project.description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <section className="flex min-h-0 flex-col gap-4">
          <h2 className="text-lg font-semibold tracking-tight">Tickets</h2>
          {!ticketsReady ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }, (_, i) => (
                <TicketRow.Skeleton key={i} />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-card/30 px-4 py-10 text-center text-sm text-muted-foreground">
              No tickets yet. Add one using the form.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {tickets.map((ticket) => (
                <li key={ticket._id}>
                  <TicketRow
                    ticket={ticket}
                    movingTicketId={movingTicketId}
                    onMoveNext={(id) => {
                      void handleMove(id, "next");
                    }}
                    onMovePrev={(id) => {
                      void handleMove(id, "prev");
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">New ticket</CardTitle>
            </CardHeader>
            <form onSubmit={(e) => void onCreateSubmit(e)}>
              <CardContent className="space-y-6 pt-0">
                <FieldGroup>
                  <Field data-invalid={!!errors.title}>
                    <FieldLabel htmlFor="ticket-title" required>
                      Title
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id="ticket-title"
                        autoComplete="off"
                        placeholder="What needs to be done?"
                        disabled={isSubmitting}
                        aria-invalid={!!errors.title}
                        {...register("title")}
                      />
                      <FieldError errors={[errors.title]} />
                    </FieldContent>
                  </Field>
                  <Field data-invalid={!!errors.description}>
                    <FieldLabel htmlFor="ticket-description">
                      Description
                    </FieldLabel>
                    <FieldContent>
                      <textarea
                        id="ticket-description"
                        rows={3}
                        disabled={isSubmitting}
                        aria-invalid={!!errors.description}
                        className={cn(
                          "flex w-full min-w-0 rounded-lg border border-input bg-background/75 px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                          "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
                        )}
                        {...register("description")}
                      />
                      <FieldError errors={[errors.description]} />
                    </FieldContent>
                  </Field>
                  <Field data-invalid={!!errors.type}>
                    <FieldLabel htmlFor="ticket-type">Type</FieldLabel>
                    <FieldContent>
                      <select
                        id="ticket-type"
                        disabled={isSubmitting}
                        aria-invalid={!!errors.type}
                        className={cn(
                          "h-9 w-full min-w-0 rounded-lg border border-input bg-background/75 px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow]",
                          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                          "disabled:cursor-not-allowed disabled:opacity-50",
                          "aria-invalid:border-destructive",
                        )}
                        {...register("type")}
                      >
                        <option value="TASK">Task</option>
                        <option value="BUG">Bug</option>
                      </select>
                      <FieldError errors={[errors.type]} />
                    </FieldContent>
                  </Field>
                </FieldGroup>
              </CardContent>
              <CardFooter className="flex justify-end border-t border-border pt-6">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Adding…" : "Add ticket"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </section>
      </div>
    </div>
  );
}

ProjectWorkspacePage.Skeleton = function ProjectWorkspacePageSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <Skeleton className="h-8 w-28 rounded-md" />
        <Skeleton className="h-9 w-64 max-w-full rounded-md" />
        <Skeleton className="h-4 w-full max-w-xl rounded-md" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-7 w-24 rounded-md" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }, (_, i) => (
              <TicketRow.Skeleton key={i} />
            ))}
          </div>
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
};
