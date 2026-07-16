"use client";

import { Archive, MoreHorizontal, Pencil, Plus, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function CaseOverflowMenu({ caseId }: { caseId: string }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="grid size-8 shrink-0 place-items-center rounded-full border-[0.5px] border-border bg-background text-muted-foreground transition-colors hover:bg-muted"
      >
        <MoreHorizontal className="size-4" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute top-full right-0 z-20 mt-2 w-56 overflow-hidden rounded-[12px] border-[0.5px] border-border bg-popover p-1.5 shadow-lg"
        >
          <Link
            href={`/cases/${caseId}/follow-ups/new`}
            scroll={false}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex min-h-10 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium hover:bg-muted"
          >
            <Plus className="size-4 text-muted-foreground" aria-hidden="true" />
            Add follow-up
          </Link>
          <Link
            href={`/cases/${caseId}/documents/new`}
            scroll={false}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex min-h-10 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium hover:bg-muted"
          >
            <Upload className="size-4 text-muted-foreground" aria-hidden="true" />
            Upload document
          </Link>
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            role="menuitem"
            disabled
            className="flex min-h-10 w-full cursor-not-allowed items-center gap-2.5 rounded-md px-2.5 text-left text-sm font-medium text-muted-foreground opacity-60"
          >
            <Pencil className="size-4" aria-hidden="true" />
            <span className="flex-1">Edit case details</span>
            <span className="text-[10px]">Soon</span>
          </button>
          <button
            type="button"
            role="menuitem"
            disabled
            className="flex min-h-10 w-full cursor-not-allowed items-center gap-2.5 rounded-md px-2.5 text-left text-sm font-medium text-muted-foreground opacity-60"
          >
            <Archive className="size-4" aria-hidden="true" />
            <span className="flex-1">Archive case</span>
            <span className="text-[10px]">Soon</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
