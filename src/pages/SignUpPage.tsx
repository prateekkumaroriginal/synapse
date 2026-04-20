import { useAuthActions } from "@convex-dev/auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AuthPageShell } from "@/components/layout/AuthPageShell";
import { RedirectIfAuthed } from "@/components/auth/RedirectIfAuthed";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  signUpFormSchema,
  type SignUpFormValues,
} from "../../convex/validations";

export default function SignUpPage() {
  return (
    <RedirectIfAuthed>
      <SignUpForm />
    </RedirectIfAuthed>
  );
}

function SignUpForm() {
  const { signIn } = useAuthActions();

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpFormSchema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = handleSubmit(async (data) => {
    const formData = new FormData();
    formData.set("name", data.name);
    formData.set("email", data.email);
    formData.set("password", data.password);
    formData.set("flow", "signUp");
    try {
      const result = await signIn("password", formData);
      if (result.signingIn === false && result.redirect === undefined) {
        toast.error("Could not create account. Try a different email.");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Sign up failed. Try again.";
      toast.error(message);
    }
  });

  return (
    <AuthPageShell
      title="Create account"
      subtitle="Sign up to create and manage your projects."
      footerLink={{
        to: "/sign-in",
        label: "Sign in",
        prompt: "Already have an account?",
      }}
    >
      <Card className="w-full rounded-2xl">
        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => void onSubmit(e)}
        >
          <CardContent className="flex flex-col gap-4 pt-6 pb-0">
            <FieldGroup>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="signup-name" required>
                  Full name
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="signup-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Jane Doe"
                    className="bg-background"
                    disabled={isSubmitting}
                    aria-invalid={!!errors.name}
                    {...register("name")}
                  />
                  <FieldError errors={[errors.name]} />
                </FieldContent>
              </Field>
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="signup-email" required>
                  Email
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="bg-background"
                    disabled={isSubmitting}
                    aria-invalid={!!errors.email}
                    {...register("email")}
                  />
                  <FieldError errors={[errors.email]} />
                </FieldContent>
              </Field>
              <Field data-invalid={!!errors.password}>
                <FieldLabel htmlFor="signup-password" required>
                  Password
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="bg-background"
                    disabled={isSubmitting}
                    aria-invalid={!!errors.password}
                    {...register("password")}
                  />
                  <FieldError errors={[errors.password]} />
                </FieldContent>
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 pt-0 pb-6">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              Sign up
            </Button>
          </CardFooter>
        </form>
      </Card>
    </AuthPageShell>
  );
}
