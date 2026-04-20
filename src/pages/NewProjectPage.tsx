import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  projectFormSchema,
  type ProjectFormValues,
  type ProjectFormParsed,
} from "../../convex/validations";
import { api } from "../../convex/_generated/api";
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
import { Textarea } from "@/components/ui/textarea";

export default function NewProjectPage() {
  const navigate = useNavigate();
  const createProject = useMutation(api.projects.create);

  const form = useForm<ProjectFormValues, unknown, ProjectFormParsed>({
    resolver: zodResolver(projectFormSchema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = handleSubmit(async (data) => {
    try {
      await createProject({
        name: data.name,
        description: data.description,
      });
      void reset();
      void navigate("/");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not create project.";
      toast.error(message);
    }
  });

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6">
      <Card className="w-full max-w-lg rounded-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            New project
          </CardTitle>
        </CardHeader>
        <form onSubmit={(e) => void onSubmit(e)}>
          <CardContent className="space-y-6 pt-0">
            <FieldGroup>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="new-project-name" required>
                  Name
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="new-project-name"
                    autoComplete="off"
                    placeholder="e.g. Website redesign"
                    disabled={isSubmitting}
                    aria-invalid={!!errors.name}
                    {...register("name")}
                  />
                  <FieldError errors={[errors.name]} />
                </FieldContent>
              </Field>

              <Field data-invalid={!!errors.description}>
                <FieldLabel htmlFor="new-project-description">
                  Description
                </FieldLabel>
                <FieldContent>
                  <Textarea
                    id="new-project-description"
                    autoComplete="off"
                    placeholder="Short summary"
                    disabled={isSubmitting}
                    aria-invalid={!!errors.description}
                    {...register("description")}
                  />
                  <FieldError errors={[errors.description]} />
                </FieldContent>
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex flex-col-reverse gap-2 pt-6 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="sm:min-w-28"
              disabled={isSubmitting}
              onClick={() => {
                if (window.history.length > 1) {
                  void navigate(-1);
                } else {
                  void navigate("/");
                }
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="sm:min-w-28" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
