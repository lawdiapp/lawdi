"use client";

import { useActionState } from "react";

import {
  createPractice,
  type OnboardingActionState,
} from "@/app/onboarding/actions";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: OnboardingActionState = {};

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(
    createPractice,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.error ? <FormMessage>{state.error}</FormMessage> : null}

      <div className="space-y-2">
        <Label htmlFor="practice-name">Practice name</Label>
        <Input
          id="practice-name"
          name="practiceName"
          autoComplete="organization"
          maxLength={120}
          required
          aria-invalid={Boolean(state.fieldError)}
          aria-describedby={state.fieldError ? "practice-name-error" : "practice-name-hint"}
          className="h-11 px-3"
          placeholder="e.g. Sharma Legal Chambers"
        />
        <p
          id={state.fieldError ? "practice-name-error" : "practice-name-hint"}
          className={
            state.fieldError
              ? "text-sm text-destructive"
              : "text-sm text-muted-foreground"
          }
        >
          {state.fieldError ?? "Use the name clients know your practice by."}
        </p>
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="h-11 w-full text-sm"
      >
        {pending ? "Creating practice…" : "Create practice"}
      </Button>
    </form>
  );
}
