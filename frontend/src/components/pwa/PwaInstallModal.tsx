import React, { useEffect, useId, useRef } from "react";
import { Button } from "../ui";
import { t } from "../../i18n";

interface PwaInstallModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const modalId = useId();
  const titleId = `${modalId}-title`;
  const descriptionId = `${modalId}-description`;

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedElementRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    closeButtonRef.current?.focus();

    const handleCancel = (event: Event) => {
      // The native dialog already handles Escape by closing itself; we only
      // need to sync React state so the component unmounts consistently.
      event.preventDefault();
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      const focusableElements =
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    dialog?.addEventListener("cancel", handleCancel);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      dialog?.removeEventListener("cancel", handleCancel);
      document.removeEventListener("keydown", handleKeyDown);
      if (dialog?.open) {
        dialog.close();
      }
      previouslyFocusedElementRef.current?.focus();
      previouslyFocusedElementRef.current = null;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className=" max-w-md w-5/6 rounded-lg border border-hairline-soft bg-canvas p-xl text-ink shadow-lg"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <div className="flex items-start justify-between gap-md">
        <h2 id={titleId} className="text-heading-4">
          {t.pwaInstall.iosModalTitle}
        </h2>
        <Button
          ref={closeButtonRef}
          className="min-h-touch min-w-touch px-sm py-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onClick={onClose}
          aria-label={t.pwaInstall.iosCloseModal}
        >
          ×
        </Button>
      </div>
      <p id={descriptionId} className="mt-md font-body text-body-sm text-slate">
        {t.pwaInstall.iosModalDescription}
      </p>
      <ol className="mt-md list-decimal space-y-sm pl-xl font-body text-body-sm text-ink">
        <li className="text-start">{t.pwaInstall.iosStepShare}</li>
        <li className="text-start">{t.pwaInstall.iosStepAddToHomeScreen}</li>
        <li className="text-start">{t.pwaInstall.iosStepAdd}</li>
      </ol>
    </dialog>
  );
};
