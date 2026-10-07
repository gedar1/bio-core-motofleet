import React, { useEffect, useState } from "react";
import { Button } from "../ui";
import { t } from "../../i18n";
import { usePwaInstall } from "../../hooks";
import { PwaInstallModal } from "./PwaInstallModal";

type FeedbackKind = "success" | "cancelled" | "unavailable" | "preview";

const FEEDBACK_DURATION_MS = 5000;

export const PwaInstallCta: React.FC = () => {
  const {
    canInstall,
    isIOS,
    isInstalled,
    isDismissed,
    isPreview,
    promptInstall,
    // dismiss,
  } = usePwaInstall();
  const [feedback, setFeedback] = useState<FeedbackKind | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInstallFlowActive, setIsInstallFlowActive] = useState(false);

  useEffect(() => {
    if (!feedback) return;

    const timeoutId = window.setTimeout(() => {
      setFeedback(null);
    }, FEEDBACK_DURATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [feedback]);

  const handleInstall = () => {
    if (isInstallFlowActive) return;

    if (isPreview) {
      setFeedback("preview");
      return;
    }

    if (isIOS) {
      setIsModalOpen(true);
      return;
    }

    if (!canInstall) {
      setFeedback("unavailable");
      return;
    }

    setIsInstallFlowActive(true);
    void promptInstall().then((result) => {
      setIsInstallFlowActive(false);
      setFeedback(
        result === "accepted"
          ? "success"
          : result === "dismissed"
            ? "cancelled"
            : "unavailable",
      );
    });
  };

  const isButtonVisible = !isInstalled && (isPreview || !isDismissed);
  const feedbackMessage = feedback
    ? {
        success: t.pwaInstall.success,
        cancelled: t.pwaInstall.cancelled,
        unavailable: t.pwaInstall.unavailable,
        preview: t.pwaInstall.previewNotice,
      }[feedback]
    : null;

  if (!isButtonVisible && !feedback && !isInstallFlowActive) {
    return null;
  }

  return (
    <>
      {isButtonVisible && (
        <div className="mt-lg flex items-center justify-center gap-sm">
          <Button
            type="button"
            onClick={handleInstall}
            aria-label={
              isPreview
                ? t.pwaInstall.previewButton
                : t.pwaInstall.installButton
            }
            aria-busy={isInstallFlowActive}
            disabled={isInstallFlowActive}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {isPreview
              ? t.pwaInstall.previewButton
              : t.pwaInstall.installButton}
          </Button>
          {/* <button
            type="button"
            className="min-h-touch min-w-touch rounded-md p-xs text-xl leading-none text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={dismiss}
            disabled={isInstallFlowActive}
            aria-label={t.pwaInstall.dismiss}
          >
            ×
          </button> */}
        </div>
      )}
      {feedbackMessage && (
        <div
          className="fixed inset-x-lg bottom-lg z-40 mx-auto flex max-w-md items-center justify-between gap-md rounded-md border border-hairline-soft bg-canvas px-lg py-md text-body-sm text-ink shadow-lg"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <span>{feedbackMessage}</span>
          <button
            type="button"
            className="min-h-touch min-w-touch shrink-0 rounded-md p-xs text-xl leading-none text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => setFeedback(null)}
            aria-label={t.pwaInstall.dismissStatus}
          >
            ×
          </button>
        </div>
      )}
      <PwaInstallModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
