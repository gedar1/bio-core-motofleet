import { useCallback, useEffect, useRef, useState } from "react";

const DISMISSED_STORAGE_KEY = "ryd-favorcitos:pwa-install-dismissed";

export type BeforeInstallPromptOutcome = "accepted" | "dismissed";
export type InstallPromptResult = BeforeInstallPromptOutcome | "unavailable";

export interface BeforeInstallPromptChoice {
  readonly outcome: BeforeInstallPromptOutcome;
  readonly platform: string;
}

export interface BeforeInstallPromptEvent extends Event {
  readonly prompt: () => Promise<void>;
  readonly userChoice: Promise<BeforeInstallPromptChoice>;
}

interface NavigatorWithStandalone extends Navigator {
  readonly standalone?: boolean;
}

interface InstallState {
  readonly isInstalled: boolean;
  readonly isIOS: boolean;
}

function getIsInstalled(): boolean {
  if (typeof window === "undefined") return false;

  const navigatorWithStandalone = navigator as NavigatorWithStandalone;
  if (navigatorWithStandalone.standalone === true) return true;

  try {
    return window.matchMedia("(display-mode: standalone)").matches;
  } catch {
    return false;
  }
}

function getIsIOS(): boolean {
  if (typeof navigator === "undefined") return false;

  const platform = navigator.platform;
  const userAgent = navigator.userAgent;
  const isAppleMobileDevice = /iPad|iPhone|iPod/.test(userAgent);
  const isIPadOS = platform === "MacIntel" && navigator.maxTouchPoints > 1;

  return isAppleMobileDevice || isIPadOS;
}

function getInitialInstallState(): InstallState {
  return {
    isInstalled: getIsInstalled(),
    isIOS: getIsIOS(),
  };
}

function readDismissed(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return window.sessionStorage.getItem(DISMISSED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function isPwaPreviewEnabled(): boolean {
  if (!import.meta.env.DEV || typeof window === "undefined") return false;

  return new URLSearchParams(window.location.search).get("pwaPreview") === "1";
}

function isBeforeInstallPromptEvent(
  event: Event,
): event is BeforeInstallPromptEvent {
  const candidate = event as Partial<BeforeInstallPromptEvent>;
  return (
    typeof candidate.prompt === "function" &&
    candidate.userChoice !== undefined &&
    candidate.userChoice !== null &&
    typeof candidate.userChoice.then === "function"
  );
}

export function usePwaInstall() {
  const isPreview = isPwaPreviewEnabled();
  const initialState = getInitialInstallState();
  const initialDismissed = readDismissed();
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(initialState.isIOS);
  const [isInstalled, setIsInstalled] = useState(initialState.isInstalled);
  const [isDismissed, setIsDismissed] = useState(initialDismissed);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const dismissedRef = useRef(initialDismissed);

  useEffect(() => {
    const dismissed = readDismissed();
    dismissedRef.current = dismissed;
    setIsDismissed(dismissed);
    setIsIOS(getIsIOS());
    setIsInstalled(getIsInstalled());

    const handleBeforeInstallPrompt = (event: Event) => {
      if (!isBeforeInstallPromptEvent(event)) return;

      event.preventDefault();
      if ((!isPreview && dismissedRef.current) || getIsInstalled()) return;

      deferredPrompt.current = event;
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      deferredPrompt.current = null;
      setCanInstall(false);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<InstallPromptResult> => {
    const event = deferredPrompt.current;
    if (!event || (!isPreview && dismissedRef.current)) return "unavailable";

    // The browser's deferred event is single-use. Clear it before prompting
    // so a second click cannot try to consume it again.
    deferredPrompt.current = null;
    setCanInstall(false);

    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === "accepted") setIsInstalled(true);
      return choice.outcome;
    } catch {
      // The browser owns the prompt lifecycle; report that no result was available.
      return "unavailable";
    }
  }, [isPreview]);

  const dismiss = useCallback(() => {
    dismissedRef.current = true;
    deferredPrompt.current = null;
    setCanInstall(false);
    setIsDismissed(true);

    try {
      window.sessionStorage.setItem(DISMISSED_STORAGE_KEY, "true");
    } catch {
      // Storage may be unavailable in private browsing or restricted contexts.
    }
  }, []);

  return {
    canInstall,
    isIOS,
    isInstalled,
    isDismissed,
    isPreview,
    promptInstall,
    dismiss,
  };
}
