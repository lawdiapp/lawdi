import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  children: ReactNode;
  footer: ReactNode;
};

export function AuthShell({ children, footer }: AuthShellProps) {
  return (
    <main className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-muted/40 px-4 py-8 sm:px-6 lg:px-8">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-primary/8 to-transparent"
      />
      <div className="relative w-full max-w-md">
        <Link
          href="/"
          className="mx-auto mb-8 flex w-fit items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="Lawdi home"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-sm">
            L
          </span>
          <span>
            <span className="block text-xl font-semibold tracking-tight">Lawdi</span>
            <span className="block text-xs text-muted-foreground">
              Simple practice management for advocates
            </span>
          </span>
        </Link>

        {children}

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {footer}
        </div>
      </div>
    </main>
  );
}
