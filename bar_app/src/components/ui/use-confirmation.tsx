"use client";

import { useEffect, useId, useRef, useState } from "react";

type Confirmation = {
  title: string;
  message: string;
  confirmLabel?: string;
};

function ConfirmationDialog({ title, message, confirmLabel = "Continue", onAnswer }: Confirmation & {
  onAnswer: (confirmed: boolean) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return <dialog ref={dialogRef} aria-labelledby={titleId} aria-describedby={messageId}
    onCancel={(event) => { event.preventDefault(); onAnswer(false); }}
    className="fixed inset-auto left-[50vw] top-[50dvh] m-0 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-neutral-300 bg-neutral-50 p-6 text-foreground shadow-xl backdrop:bg-black/60">
    <h2 id={titleId} className="text-xl font-semibold">{title}</h2>
    <p id={messageId} className="mt-3 text-sm leading-6 text-neutral-600">{message}</p>
    <div className="mt-6 flex flex-wrap justify-end gap-3">
      <button type="button" autoFocus onClick={() => onAnswer(false)} className="rounded-md border border-neutral-300 px-4 py-3 text-sm font-medium">Cancel</button>
      <button type="button" onClick={() => onAnswer(true)} className="rounded-md bg-primary px-4 py-3 text-sm font-semibold text-on-primary hover:bg-accent">{confirmLabel}</button>
    </div>
  </dialog>;
}

export function useConfirmation() {
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const pending = useRef<((confirmed: boolean) => void) | null>(null);

  useEffect(() => () => {
    pending.current?.(false);
    pending.current = null;
  }, []);

  function confirm(options: Confirmation) {
    pending.current?.(false);
    return new Promise<boolean>((resolve) => {
      pending.current = resolve;
      setConfirmation(options);
    });
  }

  function answer(confirmed: boolean) {
    pending.current?.(confirmed);
    pending.current = null;
    setConfirmation(null);
  }

  return {
    confirm,
    confirmationDialog: confirmation ? <ConfirmationDialog {...confirmation} onAnswer={answer} /> : null,
  };
}
