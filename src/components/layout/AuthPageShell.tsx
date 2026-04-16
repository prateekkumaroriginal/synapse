import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function AuthPageShell({
  title,
  subtitle,
  children,
  footerLink,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footerLink: { to: string; label: string; prompt: string };
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background px-4 py-10 text-foreground">
      <div className="mx-auto mb-8 flex w-full max-w-md items-center justify-between gap-4">
        <Link
          to="/"
          className="text-lg font-semibold tracking-tight text-foreground hover:text-primary"
        >
          Synapse
        </Link>
        <ThemeToggle />
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center">
        <div className="mb-8 w-full text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="w-full">{children}</div>
        <div className="mt-8 flex w-full flex-row flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm text-muted-foreground">
          <span>{footerLink.prompt}</span>
          <Link
            to={footerLink.to}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {footerLink.label}
          </Link>
        </div>
      </div>
    </div>
  );
}
