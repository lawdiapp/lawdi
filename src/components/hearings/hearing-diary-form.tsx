"use client";

import { CalendarDays, Clock3, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  createHearing,
  type CreateHearingActionState,
  type CreateHearingField,
} from "@/app/cases/[id]/hearings/new/actions";
import { setNextHearing } from "@/app/cases/[id]/hearings/set-next/actions";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, formatTime } from "@/lib/dates";

const initialState: CreateHearingActionState = {};

function FieldError({
  field,
  state,
}: {
  field: CreateHearingField;
  state: CreateHearingActionState;
}) {
  const message = state.fieldErrors?.[field];

  return message ? (
    <p id={`${field}-error`} className="text-sm text-destructive">
      {message}
    </p>
  ) : null;
}

export function HearingDiaryForm({
  caseId,
  caseTitle,
  mode,
  currentDate,
  currentTime,
}: {
  caseId: string;
  caseTitle: string;
  mode: "first" | "subsequent" | "set-next";
  currentDate?: string;
  currentTime?: string | null;
}) {
  const isFirst = mode === "first";
  const isSetNext = mode === "set-next";
  const action = (isSetNext ? setNextHearing : createHearing).bind(null, caseId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [hearingDate, setHearingDate] = useState("");
  const [nextHearingDate, setNextHearingDate] = useState("");
  const [dirty, setDirty] = useState(false);
  const router = useRouter();

  const closeSheet = useCallback(() => {
    if (
      dirty &&
      !window.confirm("Discard your unsaved changes?")
    ) {
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

  function autoResizeNotes(event: FormEvent<HTMLTextAreaElement>) {
    const textarea = event.currentTarget;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 240)}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > 240 ? "auto" : "hidden";
  }

  function updateDirtyState(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    setDirty(
      Array.from(formData.values()).some(
        (value) => typeof value === "string" && value.trim().length > 0,
      ),
    );
  }

  return (
    <main className="fixed inset-0 z-50 flex items-stretch justify-end bg-foreground/20">
      <button
        type="button"
        aria-label="Close hearing update"
        onClick={closeSheet}
        className="absolute inset-0 cursor-default backdrop-blur-[1px]"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="hearing-sheet-title"
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
            id="hearing-sheet-title"
            className="mt-0.5 text-lg font-semibold tracking-tight"
          >
            {isFirst
              ? "Add First Hearing"
              : isSetNext
                ? "Set Next Hearing"
                : "Record Hearing Update"}
          </h1>
        </header>

        <form
          action={formAction}
          onChange={updateDirtyState}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
            {state.error ? <FormMessage>{state.error}</FormMessage> : null}

            {isFirst ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="hearingDate">Hearing date</Label>
                  <Input
                    id="hearingDate"
                    name="hearingDate"
                    type="date"
                    required
                    value={hearingDate}
                    onChange={(event) => setHearingDate(event.target.value)}
                    aria-invalid={Boolean(state.fieldErrors?.hearingDate)}
                    aria-describedby={
                      state.fieldErrors?.hearingDate
                        ? "hearingDate-error"
                        : undefined
                    }
                    className="h-11 px-3"
                  />
                  <FieldError field="hearingDate" state={state} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hearingTime">Hearing time</Label>
                  <Input
                    id="hearingTime"
                    name="hearingTime"
                    type="time"
                    aria-invalid={Boolean(state.fieldErrors?.hearingTime)}
                    aria-describedby={
                      state.fieldErrors?.hearingTime
                        ? "hearingTime-error"
                        : undefined
                    }
                    className="h-11 px-3"
                  />
                  <FieldError field="hearingTime" state={state} />
                </div>
              </div>
            ) : isSetNext ? null : (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg bg-muted/60 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Current hearing</span>
                <span className="flex items-center gap-1.5 font-medium">
                  <CalendarDays
                    className="size-4 text-primary"
                    aria-hidden="true"
                  />
                  {currentDate ? formatDate(currentDate) : "Unavailable"}
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock3 className="size-4" aria-hidden="true" />
                  {formatTime(currentTime ?? null) ?? "Time not set"}
                </span>
              </div>
            )}

            <fieldset className="space-y-2.5">
              <legend className="text-sm font-medium">Next hearing</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nextHearingDate">Date</Label>
                  <Input
                    id="nextHearingDate"
                    name="nextHearingDate"
                    type="date"
                    required={isSetNext}
                    min={isFirst ? hearingDate || undefined : currentDate}
                    value={nextHearingDate}
                    onChange={(event) =>
                      setNextHearingDate(event.target.value)
                    }
                    aria-invalid={Boolean(state.fieldErrors?.nextHearingDate)}
                    aria-describedby={
                      state.fieldErrors?.nextHearingDate
                        ? "nextHearingDate-error"
                        : undefined
                    }
                    className="h-11 px-3"
                  />
                  <FieldError field="nextHearingDate" state={state} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nextHearingTime">Time</Label>
                  <Input
                    id="nextHearingTime"
                    name="nextHearingTime"
                    type="time"
                    disabled={!nextHearingDate}
                    aria-invalid={Boolean(state.fieldErrors?.nextHearingTime)}
                    aria-describedby={
                      state.fieldErrors?.nextHearingTime
                        ? "nextHearingTime-error"
                        : undefined
                    }
                    className="h-11 px-3"
                  />
                  <FieldError field="nextHearingTime" state={state} />
                </div>
              </div>
            </fieldset>

            {!isSetNext ? (
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  maxLength={5000}
                  placeholder="What happened at this hearing?"
                  onInput={autoResizeNotes}
                  aria-invalid={Boolean(state.fieldErrors?.notes)}
                  aria-describedby={
                    state.fieldErrors?.notes ? "notes-error" : undefined
                  }
                  className="flex min-h-20 max-h-60 w-full resize-none overflow-y-hidden rounded-lg border border-input bg-transparent px-3 py-2.5 text-base outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm"
                />
                <FieldError field="notes" state={state} />
              </div>
            ) : null}
          </div>

          <footer className="sticky bottom-0 grid shrink-0 gap-2 border-t bg-background px-4 py-3 sm:flex sm:items-center sm:justify-end sm:px-5">
            <Button
              type="submit"
              disabled={pending}
              className="h-11 sm:order-2 sm:px-6"
            >
              {pending
                ? "Saving…"
                : isFirst
                  ? "Save Hearing"
                  : isSetNext
                    ? "Set Next Hearing"
                    : "Save Update"}
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
