"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export function CaseDetailSheet({
  title,
  description,
  triggerLabel,
  triggerClassName,
  children,
  open: openProp,
  onOpenChange,
}: {
  title: string;
  description?: string;
  triggerLabel?: string;
  triggerClassName?: string;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, setOpen]);

  return (
    <>
      {triggerLabel ? (
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className={cn(
            "inline-flex min-h-10 items-center justify-center rounded-lg px-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5",
            triggerClassName,
          )}
        >
          {triggerLabel}
        </button>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label={`Close ${title}`}
            className="absolute inset-0 bg-foreground/20 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            className="absolute inset-0 flex min-w-0 flex-col bg-background shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:w-full sm:max-w-xl sm:border-l"
          >
            <header className="flex min-h-16 shrink-0 items-center gap-3 border-b px-4 sm:px-5">
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="truncate text-base font-semibold tracking-tight">
                  {title}
                </h2>
                {description ? (
                  <p id={descriptionId} className="mt-0.5 truncate text-xs text-muted-foreground">
                    {description}
                  </p>
                ) : null}
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
              {children}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
