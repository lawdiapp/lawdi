"use client";

import { useActionState } from "react";

import { login, type AuthActionState } from "@/app/login/actions";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = {};

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, formAction, pending] = useActionState(login, initialState);
  const error = state.error ?? initialError;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {error ? <FormMessage>{error}</FormMessage> : null}

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
          autoComplete="current-password"
          required
          aria-invalid={Boolean(state.fieldErrors?.password)}
          aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
          className="h-11 px-3"
        />
        {state.fieldErrors?.password ? (
          <p id="password-error" className="text-sm text-destructive">
            {state.fieldErrors.password}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="h-11 w-full text-sm"
      >
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
