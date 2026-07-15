"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheckBig,
  FileText,
  Scale,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import {
  createCase,
  type CreateCaseActionState,
  type CreateCaseField,
} from "@/app/cases/new/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type CaseClientOption = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};

type Draft = {
  caseTitle: string;
  caseNumber: string;
  courtName: string;
  caseType: string;
  cnrNumber: string;
  filingDate: string;
  notes: string;
  existingClientId: string;
  newClientName: string;
  newClientPhone: string;
  newClientEmail: string;
};

type ClientMode = "existing" | "new";
type WizardStep = 1 | 2 | 3;

const initialActionState: CreateCaseActionState = {};

const initialDraft: Draft = {
  caseTitle: "",
  caseNumber: "",
  courtName: "",
  caseType: "",
  cnrNumber: "",
  filingDate: "",
  notes: "",
  existingClientId: "",
  newClientName: "",
  newClientPhone: "",
  newClientEmail: "",
};

const stepNames = ["Case details", "Client", "Review", "Success"];

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  );
}

function OptionalLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center justify-between gap-3">
      <span>{children}</span>
      <span className="text-xs font-normal text-muted-foreground">Optional</span>
    </span>
  );
}

function ReviewRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="grid gap-1 border-b py-3 last:border-0 sm:grid-cols-[140px_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words font-medium">
        {value || "Not provided"}
      </dd>
    </div>
  );
}

export function CaseWizard({ clients }: { clients: CaseClientOption[] }) {
  const [step, setStep] = useState<WizardStep>(1);
  const [draft, setDraft] = useState(initialDraft);
  const [clientMode, setClientMode] = useState<ClientMode>(
    clients.length > 0 ? "existing" : "new",
  );
  const [clientErrors, setClientErrors] = useState<
    Partial<Record<CreateCaseField, string>>
  >({});
  const [state, formAction, pending] = useActionState(
    createCase,
    initialActionState,
  );
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.error) {
      errorSummaryRef.current?.focus();
    }
  }, [state]);

  function updateDraft(field: keyof Draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setClientErrors((current) => ({ ...current, [field]: undefined }));
  }

  function focusField(field: CreateCaseField) {
    window.requestAnimationFrame(() => {
      document.getElementById(field)?.focus();
    });
  }

  function continueFromDetails() {
    const errors: Partial<Record<CreateCaseField, string>> = {};

    if (!draft.caseTitle.trim()) errors.caseTitle = "Enter a case title.";
    if (!draft.caseNumber.trim()) errors.caseNumber = "Enter the case number.";
    if (!draft.courtName.trim()) errors.courtName = "Enter the court name.";

    setClientErrors(errors);

    const firstError = Object.keys(errors)[0] as CreateCaseField | undefined;
    if (firstError) {
      focusField(firstError);
      return;
    }

    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function continueFromClient() {
    const errors: Partial<Record<CreateCaseField, string>> = {};

    if (clientMode === "existing" && !draft.existingClientId) {
      errors.existingClientId = "Choose a client from your practice.";
    }

    if (clientMode === "new") {
      if (!draft.newClientName.trim()) {
        errors.newClientName = "Enter the new client’s name.";
      }
      if (
        draft.newClientEmail &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.newClientEmail)
      ) {
        errors.newClientEmail = "Enter a valid email address.";
      }
    }

    setClientErrors(errors);
    const firstError = Object.keys(errors)[0] as CreateCaseField | undefined;

    if (firstError) {
      focusField(firstError);
      return;
    }

    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const selectedClient = clients.find(
    (client) => client.id === draft.existingClientId,
  );
  const clientName =
    clientMode === "existing" ? selectedClient?.name : draft.newClientName;
  const activeStep = state.success ? 4 : step;

  if (state.success && state.caseId) {
    return (
      <Card className="mx-auto w-full max-w-2xl gap-6 py-8 shadow-sm sm:py-10">
        <CardHeader className="items-center gap-4 px-6 text-center sm:px-10">
          <span className="grid size-14 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-700">
            <CircleCheckBig className="size-7" aria-hidden="true" />
          </span>
          <div className="space-y-2">
            <p className="text-sm font-medium text-emerald-700">Step 4 · Success</p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Your case is ready
            </h1>
            <CardDescription className="mx-auto max-w-lg leading-6">
              {draft.caseTitle} has been added with its client and is ready in
              the Case Command Center.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 px-6 sm:grid-cols-2 sm:px-10">
          <Link
            href={`/cases/${state.caseId}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            Open Case Command Center
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href="/cases"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            View all cases
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="min-w-0 space-y-5">
        <ol aria-label="Case creation progress" className="grid grid-cols-4 gap-2">
          {stepNames.map((name, index) => {
            const position = index + 1;
            const complete = position < activeStep;
            const current = position === activeStep;

            return (
              <li key={name} className="min-w-0">
                <div
                  className={cn(
                    "h-1.5 rounded-full bg-border",
                    (complete || current) && "bg-primary",
                  )}
                />
                <p
                  className={cn(
                    "mt-2 truncate text-xs text-muted-foreground",
                    current && "font-medium text-foreground",
                  )}
                >
                  {position}. {name}
                </p>
              </li>
            );
          })}
        </ol>

        {step === 1 ? (
          <Card className="gap-6 py-6 shadow-sm sm:py-8">
            <CardHeader className="gap-3 px-5 sm:px-8">
              <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <FileText className="size-5" aria-hidden="true" />
              </span>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Step 1 of 3
                </p>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Case details
                </h1>
                <CardDescription className="max-w-2xl leading-6">
                  Start with the details you use to identify this matter in court.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 px-5 sm:px-8">
              <div className="space-y-2">
                <Label htmlFor="caseTitle">Case title</Label>
                <Input
                  id="caseTitle"
                  value={draft.caseTitle}
                  onChange={(event) => updateDraft("caseTitle", event.target.value)}
                  placeholder="e.g. Sharma v. State of Maharashtra"
                  maxLength={200}
                  required
                  aria-invalid={Boolean(clientErrors.caseTitle)}
                  aria-describedby={clientErrors.caseTitle ? "caseTitle-error" : undefined}
                  className="h-11 px-3"
                />
                <FieldError id="caseTitle-error" message={clientErrors.caseTitle} />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="caseNumber">Case number</Label>
                  <Input
                    id="caseNumber"
                    value={draft.caseNumber}
                    onChange={(event) => updateDraft("caseNumber", event.target.value)}
                    placeholder="e.g. WP/1234/2026"
                    maxLength={120}
                    required
                    aria-invalid={Boolean(clientErrors.caseNumber)}
                    aria-describedby={clientErrors.caseNumber ? "caseNumber-error" : undefined}
                    className="h-11 px-3"
                  />
                  <FieldError id="caseNumber-error" message={clientErrors.caseNumber} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="caseType">
                    <OptionalLabel>Case type</OptionalLabel>
                  </Label>
                  <Input
                    id="caseType"
                    value={draft.caseType}
                    onChange={(event) => updateDraft("caseType", event.target.value)}
                    placeholder="e.g. Civil appeal"
                    maxLength={120}
                    className="h-11 px-3"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="courtName">Court name</Label>
                <Input
                  id="courtName"
                  value={draft.courtName}
                  onChange={(event) => updateDraft("courtName", event.target.value)}
                  placeholder="e.g. Bombay High Court"
                  maxLength={200}
                  required
                  aria-invalid={Boolean(clientErrors.courtName)}
                  aria-describedby={clientErrors.courtName ? "courtName-error" : undefined}
                  className="h-11 px-3"
                />
                <FieldError id="courtName-error" message={clientErrors.courtName} />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cnrNumber">
                    <OptionalLabel>CNR number</OptionalLabel>
                  </Label>
                  <Input
                    id="cnrNumber"
                    value={draft.cnrNumber}
                    onChange={(event) => updateDraft("cnrNumber", event.target.value)}
                    placeholder="Court record number"
                    maxLength={80}
                    className="h-11 px-3 uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filingDate">
                    <OptionalLabel>Filing date</OptionalLabel>
                  </Label>
                  <Input
                    id="filingDate"
                    type="date"
                    value={draft.filingDate}
                    onChange={(event) => updateDraft("filingDate", event.target.value)}
                    className="h-11 px-3"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">
                  <OptionalLabel>Notes</OptionalLabel>
                </Label>
                <textarea
                  id="notes"
                  value={draft.notes}
                  onChange={(event) => updateDraft("notes", event.target.value)}
                  placeholder="Add context that will help your practice understand this matter."
                  maxLength={5000}
                  rows={5}
                  className="min-h-28 w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2.5 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-between">
                <Link
                  href="/dashboard"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Cancel
                </Link>
                <Button type="button" onClick={continueFromDetails} className="h-11 px-5">
                  Continue to client
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {step === 2 ? (
          <Card className="gap-6 py-6 shadow-sm sm:py-8">
            <CardHeader className="gap-3 px-5 sm:px-8">
              <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <UserRound className="size-5" aria-hidden="true" />
              </span>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Step 2 of 3</p>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Client</h1>
                <CardDescription className="max-w-2xl leading-6">
                  Connect the matter to a client already in Lawdi or add one now.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 px-5 sm:px-8">
              <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Client choice">
                <button
                  type="button"
                  onClick={() => {
                    setClientMode("existing");
                    setClientErrors({});
                  }}
                  disabled={clients.length === 0}
                  aria-pressed={clientMode === "existing"}
                  className={cn(
                    "min-h-20 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
                    clientMode === "existing" && "border-primary bg-primary/5 ring-1 ring-primary",
                  )}
                >
                  <span className="block font-medium">Select existing</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {clients.length === 0 ? "No saved clients yet" : `${clients.length} client${clients.length === 1 ? "" : "s"} available`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setClientMode("new");
                    updateDraft("existingClientId", "");
                    setClientErrors({});
                  }}
                  aria-pressed={clientMode === "new"}
                  className={cn(
                    "min-h-20 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    clientMode === "new" && "border-primary bg-primary/5 ring-1 ring-primary",
                  )}
                >
                  <span className="block font-medium">Create new client</span>
                  <span className="mt-1 block text-sm text-muted-foreground">Add only the essentials</span>
                </button>
              </div>

              {clientMode === "existing" ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Choose a client</p>
                  <div id="existingClientId" tabIndex={-1} className="grid gap-3">
                    {clients.map((client) => {
                      const selected = draft.existingClientId === client.id;
                      return (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => updateDraft("existingClientId", client.id)}
                          aria-pressed={selected}
                          className={cn(
                            "flex min-h-16 items-center justify-between gap-4 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                            selected && "border-primary bg-primary/5 ring-1 ring-primary",
                          )}
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{client.name}</span>
                            <span className="mt-1 block truncate text-sm text-muted-foreground">
                              {client.phone || client.email || "No contact details"}
                            </span>
                          </span>
                          <span
                            className={cn(
                              "grid size-6 shrink-0 place-items-center rounded-full border",
                              selected && "border-primary bg-primary text-primary-foreground",
                            )}
                          >
                            {selected ? <Check className="size-3.5" aria-hidden="true" /> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <FieldError id="existingClientId-error" message={clientErrors.existingClientId} />
                </div>
              ) : (
                <div className="space-y-5 rounded-xl border bg-muted/20 p-4 sm:p-5">
                  <div className="space-y-2">
                    <Label htmlFor="newClientName">Client name</Label>
                    <Input
                      id="newClientName"
                      value={draft.newClientName}
                      onChange={(event) => updateDraft("newClientName", event.target.value)}
                      autoComplete="name"
                      maxLength={200}
                      required
                      aria-invalid={Boolean(clientErrors.newClientName)}
                      aria-describedby={clientErrors.newClientName ? "newClientName-error" : undefined}
                      className="h-11 px-3"
                    />
                    <FieldError id="newClientName-error" message={clientErrors.newClientName} />
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="newClientPhone"><OptionalLabel>Phone</OptionalLabel></Label>
                      <Input
                        id="newClientPhone"
                        type="tel"
                        value={draft.newClientPhone}
                        onChange={(event) => updateDraft("newClientPhone", event.target.value)}
                        autoComplete="tel"
                        maxLength={40}
                        className="h-11 px-3"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newClientEmail"><OptionalLabel>Email</OptionalLabel></Label>
                      <Input
                        id="newClientEmail"
                        type="email"
                        inputMode="email"
                        value={draft.newClientEmail}
                        onChange={(event) => updateDraft("newClientEmail", event.target.value)}
                        autoComplete="email"
                        maxLength={320}
                        aria-invalid={Boolean(clientErrors.newClientEmail)}
                        aria-describedby={clientErrors.newClientEmail ? "newClientEmail-error" : undefined}
                        className="h-11 px-3"
                      />
                      <FieldError id="newClientEmail-error" message={clientErrors.newClientEmail} />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="h-11 px-5">
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Back
                </Button>
                <Button type="button" onClick={continueFromClient} className="h-11 px-5">
                  Review case
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {step === 3 ? (
          <Card className="gap-6 py-6 shadow-sm sm:py-8">
            <CardHeader className="gap-3 px-5 sm:px-8">
              <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <Scale className="size-5" aria-hidden="true" />
              </span>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Step 3 of 3</p>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Review and save</h1>
                <CardDescription className="max-w-2xl leading-6">
                  Check the case and client details before adding them to your practice.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 px-5 sm:px-8">
              {state.error ? (
                <div
                  ref={errorSummaryRef}
                  tabIndex={-1}
                  role="alert"
                  className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive outline-none"
                >
                  {state.error}
                </div>
              ) : null}

              <section aria-labelledby="review-case-heading">
                <div className="flex items-center justify-between gap-4">
                  <h2 id="review-case-heading" className="font-semibold">Case details</h2>
                  <button type="button" onClick={() => setStep(1)} className="text-sm font-medium text-primary hover:underline">
                    Edit
                  </button>
                </div>
                <dl className="mt-2">
                  <ReviewRow label="Title" value={draft.caseTitle} />
                  <ReviewRow label="Case number" value={draft.caseNumber} />
                  <ReviewRow label="Court" value={draft.courtName} />
                  <ReviewRow label="Case type" value={draft.caseType} />
                  <ReviewRow label="CNR number" value={draft.cnrNumber} />
                  <ReviewRow label="Filing date" value={draft.filingDate} />
                  <ReviewRow label="Notes" value={draft.notes || "No notes added"} />
                </dl>
              </section>

              <section aria-labelledby="review-client-heading" className="border-t pt-5">
                <div className="flex items-center justify-between gap-4">
                  <h2 id="review-client-heading" className="font-semibold">Client</h2>
                  <button type="button" onClick={() => setStep(2)} className="text-sm font-medium text-primary hover:underline">
                    Edit
                  </button>
                </div>
                <dl className="mt-2">
                  <ReviewRow label={clientMode === "new" ? "New client" : "Existing client"} value={clientName} />
                  {clientMode === "existing" ? (
                    <>
                      <ReviewRow label="Phone" value={selectedClient?.phone ?? undefined} />
                      <ReviewRow label="Email" value={selectedClient?.email ?? undefined} />
                    </>
                  ) : (
                    <>
                      <ReviewRow label="Phone" value={draft.newClientPhone} />
                      <ReviewRow label="Email" value={draft.newClientEmail} />
                    </>
                  )}
                </dl>
              </section>

              <form action={formAction} className="border-t pt-5">
                <input type="hidden" name="caseTitle" value={draft.caseTitle} />
                <input type="hidden" name="caseNumber" value={draft.caseNumber} />
                <input type="hidden" name="courtName" value={draft.courtName} />
                <input type="hidden" name="caseType" value={draft.caseType} />
                <input type="hidden" name="cnrNumber" value={draft.cnrNumber} />
                <input type="hidden" name="filingDate" value={draft.filingDate} />
                <input type="hidden" name="notes" value={draft.notes} />
                <input type="hidden" name="clientMode" value={clientMode} />
                <input type="hidden" name="existingClientId" value={clientMode === "existing" ? draft.existingClientId : ""} />
                <input type="hidden" name="newClientName" value={clientMode === "new" ? draft.newClientName : ""} />
                <input type="hidden" name="newClientPhone" value={clientMode === "new" ? draft.newClientPhone : ""} />
                <input type="hidden" name="newClientEmail" value={clientMode === "new" ? draft.newClientEmail : ""} />

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                  <Button type="button" variant="outline" onClick={() => setStep(2)} disabled={pending} className="h-11 px-5">
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Back
                  </Button>
                  <Button type="submit" disabled={pending} className="h-11 px-6">
                    {pending ? "Saving case…" : "Save case"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <aside className="min-w-0 lg:sticky lg:top-6" aria-label="Case draft summary">
        <Card className="gap-4 py-5 shadow-sm">
          <CardHeader className="px-5">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Draft summary</p>
            <h2 className="break-words text-lg font-semibold tracking-tight">
              {draft.caseTitle || "Untitled case"}
            </h2>
          </CardHeader>
          <CardContent className="space-y-4 px-5 text-sm">
            <div>
              <p className="text-muted-foreground">Case number</p>
              <p className="mt-1 break-words font-medium">{draft.caseNumber || "Not added"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Court</p>
              <p className="mt-1 break-words font-medium">{draft.courtName || "Not added"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Client</p>
              <p className="mt-1 break-words font-medium">{clientName || "Not selected"}</p>
            </div>
            <p className="rounded-lg bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">
              Nothing is saved until you confirm the review.
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
