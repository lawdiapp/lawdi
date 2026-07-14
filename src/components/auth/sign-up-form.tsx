"use client";

import { CheckCircle2 } from "lucide-react";
import { useActionState } from "react";

import { signUp, type SignUpActionState } from "@/app/sign-up/actions";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: SignUpActionState = {};

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  if (state.success) {
    return (
      <div className="flex flex-col items-center py-4 text-center" role="status">
        <span className="mb-5 grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <CheckCircle2 className="size-7" aria-hidden="true" />
        </span>
        <h2 className="text-xl font-semibold tracking-tight">Check your email</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          We sent you a confirmation link. Open it to verify your email and
          continue to Lawdi.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.error ? <FormMessage>{state.error}</FormMessage> : null}

      <div className="space-y-2">
        <Label htmlFor="full-name">Full name</Label>
        <Input
          id="full-name"
          name="fullName"
          autoComplete="name"
          required
          aria-invalid={Boolean(state.fieldErrors?.fullName)}
          aria-describedby={state.fieldErrors?.fullName ? "full-name-error" : undefined}
          className="h-11 px-3"
        />
        {state.fieldErrors?.fullName ? (
          <p id="full-name-error" className="text-sm text-destructive">
            {state.fieldErrors.fullName}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          aria-invalid={Boolean(state.fieldErrors?.email)}
          aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
          className="h-11 px-3"
        />
        {state.fieldErrors?.email ? (
          <p id="email-error" className="text-sm text-destructive">
            {state.fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          aria-invalid={Boolean(state.fieldErrors?.password)}
          aria-describedby="password-hint"
          className="h-11 px-3"
        />
        <p
          id="password-hint"
          className={state.fieldErrors?.password ? "text-sm text-destructive" : "text-sm text-muted-foreground"}
        >
          {state.fieldErrors?.password ?? "Use at least 8 characters."}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm password</Label>
        <Input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          aria-invalid={Boolean(state.fieldErrors?.confirmPassword)}
          aria-describedby={
            state.fieldErrors?.confirmPassword ? "confirm-password-error" : undefined
          }
          className="h-11 px-3"
        />
        {state.fieldErrors?.confirmPassword ? (
          <p id="confirm-password-error" className="text-sm text-destructive">
            {state.fieldErrors.confirmPassword}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="h-11 w-full text-sm"
      >
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
