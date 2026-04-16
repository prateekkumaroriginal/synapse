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
  emailPasswordFormSchema,
  type EmailPasswordFormValues,
} from "../../convex/validations";

export default function SignInPage() {
  return (
    <RedirectIfAuthed>
      <SignInForm />
    </RedirectIfAuthed>
  );
}

function SignInForm() {
  const { signIn } = useAuthActions();

  const form = useForm<EmailPasswordFormValues>({
    resolver: zodResolver(emailPasswordFormSchema),
    mode: "onTouched",
    defaultValues: {
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
    formData.set("email", data.email);
    formData.set("password", data.password);
    formData.set("flow", "signIn");
    try {
      const result = await signIn("password", formData);
      if (result.signingIn === false && result.redirect === undefined) {
        toast.error("Could not sign in. Check your email and password.");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Sign in failed. Try again.";
      toast.error(message);
    }
  });

  return (
    <AuthPageShell
      title="Sign in"
      subtitle="Use your email and password to access your projects."
      footerLink={{
        to: "/sign-up",
        label: "Create an account",
        prompt: "Don't have an account?",
      }}
    >
      <Card className="w-full rounded-2xl">
        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => void onSubmit(e)}
        >
          <CardContent className="flex flex-col gap-4 pt-6 pb-0">
            <FieldGroup>
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="signin-email" required>
                  Email
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="signin-email"
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
                <FieldLabel htmlFor="signin-password" required>
                  Password
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="signin-password"
                    type="password"
                    autoComplete="current-password"
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
              Sign in
            </Button>
          </CardFooter>
        </form>
      </Card>
    </AuthPageShell>
  );
}
