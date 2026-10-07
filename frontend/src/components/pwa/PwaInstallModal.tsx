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
  const dialogRef = useRef<HTMLDivElement>(null);
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
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
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

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedElementRef.current?.focus();
      previouslyFocusedElementRef.current = null;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-lg">
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-lg border border-hairline-soft bg-canvas p-xl text-ink shadow-lg"
        role="dialog"
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
            variant="secondary"
            className="min-h-touch min-w-touch px-sm py-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={onClose}
            aria-label={t.pwaInstall.iosCloseModal}
            type="button"
          >
            ×
          </Button>
        </div>
        <p id={descriptionId} className="mt-md font-body text-body-sm text-slate">
          {t.pwaInstall.iosModalDescription}
        </p>
        <ol className="mt-md list-decimal space-y-sm pl-xl font-body text-body-sm text-ink">
          <li>{t.pwaInstall.iosStepShare}</li>
          <li>{t.pwaInstall.iosStepAddToHomeScreen}</li>
          <li>{t.pwaInstall.iosStepAdd}</li>
        </ol>
      </div>
    </div>
  );
};
