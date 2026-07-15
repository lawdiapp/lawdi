"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  createFollowUp,
  type CreateFollowUpActionState,
  type CreateFollowUpField,
} from "@/app/cases/[id]/follow-ups/new/actions";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: CreateFollowUpActionState = {};

function FieldError({
  field,
  state,
}: {
  field: CreateFollowUpField;
  state: CreateFollowUpActionState;
}) {
  const message = state.fieldErrors?.[field];

  return message ? (
    <p id={`${field}-error`} className="text-sm text-destructive">
      {message}
    </p>
  ) : null;
}

export function FollowUpForm({
  caseId,
  caseTitle,
}: {
  caseId: string;
  caseTitle: string;
}) {
  const action = createFollowUp.bind(null, caseId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [reminderDate, setReminderDate] = useState("");
  const [dirty, setDirty] = useState(false);
  const router = useRouter();

  const closeSheet = useCallback(() => {
    if (dirty && !window.confirm("Discard your unsaved follow-up?")) {
      return;
    }

    router.replace(`/cases/${caseId}`, { scroll: false });
  }, [caseId, dirty, router]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirty) return;

      event.preventDefault();
      event.returnValue = "";
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeSheet();
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeSheet, dirty]);

  function updateDirtyState(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    setDirty(
      Array.from(formData.entries()).some(
        ([name, value]) =>
          !name.startsWith("$ACTION_") &&
          typeof value === "string" &&
          value.trim().length > 0,
      ),
    );
  }

  return (
    <main className="fixed inset-0 z-50 flex items-stretch justify-end bg-foreground/20">
      <button
        type="button"
        aria-label="Close Add Follow-up"
        onClick={closeSheet}
        className="absolute inset-0 cursor-default backdrop-blur-[1px]"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="follow-up-sheet-title"
        className="relative z-10 flex h-svh w-full flex-col overflow-hidden bg-background shadow-2xl md:max-w-[480px] md:border-l"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={closeSheet}
          className="absolute right-2.5 top-2.5 z-20 grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>

        <header className="border-b px-4 py-3 pr-12 sm:px-5 sm:pr-12">
          <p className="truncate text-xs font-medium text-muted-foreground">
            {caseTitle}
          </p>
          <h1
            id="follow-up-sheet-title"
            className="mt-0.5 text-lg font-semibold tracking-tight"
          >
            Add Follow-up
          </h1>
        </header>

        <form
          action={formAction}
          onChange={updateDirtyState}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
            {state.error ? <FormMessage>{state.error}</FormMessage> : null}

            <div className="space-y-2">
              <Label htmlFor="title">Follow-up / Next action</Label>
              <Input
                id="title"
                name="title"
                maxLength={300}
                required
                autoFocus
                placeholder="e.g. File written submissions"
                aria-invalid={Boolean(state.fieldErrors?.title)}
                aria-describedby={
                  state.fieldErrors?.title ? "title-error" : undefined
                }
                className="h-11 px-3"
              />
              <FieldError field="title" state={state} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due date</Label>
              <Input
                id="dueDate"
                name="dueDate"
                type="date"
                aria-invalid={Boolean(state.fieldErrors?.dueDate)}
                aria-describedby={
                  state.fieldErrors?.dueDate ? "dueDate-error" : undefined
                }
                className="h-11 px-3"
              />
              <FieldError field="dueDate" state={state} />
            </div>

            <fieldset className="space-y-2.5">
              <legend className="text-sm font-medium">Reminder</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="reminderDate">Date</Label>
                  <Input
                    id="reminderDate"
                    name="reminderDate"
                    type="date"
                    value={reminderDate}
                    onChange={(event) => setReminderDate(event.target.value)}
                    aria-invalid={Boolean(state.fieldErrors?.reminderDate)}
                    aria-describedby={
                      state.fieldErrors?.reminderDate
                        ? "reminderDate-error"
                        : undefined
                    }
                    className="h-11 px-3"
                  />
                  <FieldError field="reminderDate" state={state} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reminderTime">Time</Label>
                  <Input
                    id="reminderTime"
                    name="reminderTime"
                    type="time"
                    required={Boolean(reminderDate)}
                    disabled={!reminderDate}
                    aria-invalid={Boolean(state.fieldErrors?.reminderTime)}
                    aria-describedby={
                      state.fieldErrors?.reminderTime
                        ? "reminderTime-error"
                        : undefined
                    }
                    className="h-11 px-3"
                  />
                  <FieldError field="reminderTime" state={state} />
                </div>
              </div>
            </fieldset>
          </div>

          <footer className="sticky bottom-0 grid shrink-0 gap-2 border-t bg-background px-4 py-3 sm:flex sm:items-center sm:justify-end sm:px-5">
            <Button
              type="submit"
              disabled={pending}
              className="h-11 sm:order-2 sm:px-6"
            >
              {pending ? "Adding…" : "Add Follow-up"}
            </Button>
            <button
              type="button"
              onClick={closeSheet}
              className="inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:order-1"
            >
              Cancel
            </button>
          </footer>
        </form>
      </section>
    </main>
  );
}
