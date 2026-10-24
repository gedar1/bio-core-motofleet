import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api, ApiError } from "../services/api";
import { webPushSession } from "../services/webPushSession";
import type { WebPushState } from "../types/api";

const isSupported = (): boolean => {
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(
    window.location.hostname,
  );
  return (
    (window.isSecureContext || local) &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
};

const decodeApplicationServerKey = (key: string): Uint8Array => {
  const normalized = key.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = window.atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const isUnauthorized = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 401;

export interface UseWebPushNotificationsReturn {
  state: WebPushState;
  errorMessage: string | null;
  activate: () => Promise<void>;
  deactivate: () => Promise<void>;
  retry: () => Promise<void>;
}

export const useWebPushNotifications = (): UseWebPushNotificationsReturn => {
  const { token } = useAuth();
  const [state, setState] = useState<WebPushState>("unsupported");
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const cleanupUnregisterRef = useRef<(() => void) | null>(null);
  const ownedEndpointRef = useRef<string | null>(null);
  const stateOperationRef = useRef(0);

  useEffect(() => {
    if (token) webPushSession.start(token);
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    const operation = ++stateOperationRef.current;
    if (!token || !isSupported()) {
      setState(token ? "unsupported" : "inactive");
      setVapidPublicKey(null);
      return () => {
        cancelled = true;
      };
    }

    setErrorMessage(null);
    void api
      .getWebPushVapidPublicKey(token)
      .then(({ publicKey }) => {
        if (
          cancelled ||
          stateOperationRef.current !== operation ||
          !webPushSession.isCurrent(webPushSession.getGeneration(), token)
        )
          return;
        setVapidPublicKey(publicKey);
        setState(
          Notification.permission === "denied"
            ? "permission-denied"
            : Notification.permission === "default"
              ? "permission-default"
              : "inactive",
        );
        void navigator.serviceWorker.ready
          .then((registration) => registration.pushManager.getSubscription())
          .then((subscription) => {
            if (
              cancelled ||
              stateOperationRef.current !== operation ||
              !subscription ||
              !webPushSession.isCurrent(webPushSession.getGeneration(), token)
            )
              return;
            cleanupUnregisterRef.current?.();
            cleanupUnregisterRef.current = webPushSession.registerCleanup(
              subscription.endpoint,
              async (logoutToken) => {
                try {
                  await api.deleteWebPushSubscription(
                    logoutToken,
                    subscription.endpoint,
                  );
                } finally {
                  await subscription.unsubscribe();
                }
              },
            );
            setState("active");
          });
      })
      .catch((error: unknown) => {
        if (cancelled || stateOperationRef.current !== operation) return;
        if (error instanceof ApiError && error.code === "PUSH_NOT_CONFIGURED") {
          setState("disabled");
          return;
        }
        if (isUnauthorized(error)) {
          webPushSession.invalidateCurrentSession();
          setState("inactive");
          return;
        }
        setState("error");
        setErrorMessage(
          error instanceof Error ? error.message : "No pudimos consultar Push.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const activate = useCallback(async () => {
    if (
      !token ||
      !vapidPublicKey ||
      state === "activating" ||
      state === "active"
    )
      return;
    const operation = ++stateOperationRef.current;
    const generation = webPushSession.getGeneration();
    setState("activating");
    setErrorMessage(null);
    ownedEndpointRef.current = null;

    let subscription: PushSubscription | null = null;
    let endpoint = "";
    let unregisterCleanup: (() => void) | null = null;
    const cleanupSubscription = async (logoutToken: string) => {
      if (!subscription || !endpoint) return;
      try {
        await api.deleteWebPushSubscription(logoutToken, endpoint);
      } finally {
        await subscription.unsubscribe();
      }
    };

    try {
      let permission = Notification.permission;
      if (permission === "default") {
        permission = await Notification.requestPermission();
      }
      if (permission !== "granted") {
        setState(
          permission === "denied" ? "permission-denied" : "permission-default",
        );
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      if (
        stateOperationRef.current !== operation ||
        !webPushSession.isCurrent(generation, token)
      )
        return;
      subscription = await registration.pushManager.getSubscription();
      if (
        subscription?.expirationTime !== null &&
        subscription?.expirationTime !== undefined &&
        subscription.expirationTime <= Date.now()
      ) {
        await subscription.unsubscribe();
        subscription = null;
      }
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeApplicationServerKey(
            vapidPublicKey,
          ) as unknown as BufferSource,
        });
      }

      const serialized = subscription.toJSON();
      if (
        !serialized.endpoint ||
        !serialized.keys?.p256dh ||
        !serialized.keys.auth
      ) {
        throw new Error("El navegador no devolvió una suscripción válida.");
      }
      endpoint = serialized.endpoint;
      const cleanupCompleted = await webPushSession.waitForCleanup(endpoint);
      if (!cleanupCompleted) {
        ownedEndpointRef.current = endpoint;
        setState("owned-by-previous-session");
        setErrorMessage(
          "La limpieza de la sesión anterior no terminó; no se transferirá la suscripción.",
        );
        return;
      }
      if (
        stateOperationRef.current !== operation ||
        !webPushSession.isCurrent(generation, token)
      )
        return;

      const cleanup = async (logoutToken: string) => {
        await cleanupSubscription(logoutToken);
      };
      cleanupUnregisterRef.current?.();
      unregisterCleanup = webPushSession.registerCleanup(endpoint, cleanup);
      cleanupUnregisterRef.current = unregisterCleanup;
      if (
        stateOperationRef.current !== operation ||
        !webPushSession.isCurrent(generation, token)
      ) {
        await cleanupSubscription(token).catch(() => undefined);
        unregisterCleanup?.();
        return;
      }

      await api.subscribeWebPush(token, {
        endpoint,
        expirationTime: serialized.expirationTime ?? null,
        keys: { p256dh: serialized.keys.p256dh, auth: serialized.keys.auth },
      });
      if (
        stateOperationRef.current !== operation ||
        !webPushSession.isCurrent(generation, token)
      ) {
        await cleanupSubscription(token).catch(() => undefined);
        unregisterCleanup?.();
        if (cleanupUnregisterRef.current === unregisterCleanup) {
          cleanupUnregisterRef.current = null;
        }
        return;
      }

      setState("active");
    } catch (error: unknown) {
      if (isUnauthorized(error)) webPushSession.invalidateCurrentSession();
      if (
        stateOperationRef.current !== operation ||
        !webPushSession.isCurrent(generation, token)
      ) {
        await cleanupSubscription(token).catch(() => undefined);
        unregisterCleanup?.();
        return;
      }
      if (error instanceof ApiError && error.code === "PUSH_NOT_CONFIGURED") {
        setState("disabled");
      } else if (
        error instanceof ApiError &&
        error.code === "PUSH_SUBSCRIPTION_OWNED"
      ) {
        ownedEndpointRef.current = endpoint || null;
        setState("owned-by-previous-session");
      } else {
        setState("error");
      }
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No pudimos activar las notificaciones.",
      );
      if (
        !(error instanceof ApiError && error.code === "PUSH_SUBSCRIPTION_OWNED")
      ) {
        unregisterCleanup?.();
        if (cleanupUnregisterRef.current === unregisterCleanup) {
          cleanupUnregisterRef.current = null;
        }
      }
    }
  }, [state, token, vapidPublicKey]);

  const deactivate = useCallback(async () => {
    if (!token || state === "deactivating") return;
    stateOperationRef.current += 1;
    setState("deactivating");
    setErrorMessage(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        try {
          await api.deleteWebPushSubscription(token, endpoint);
        } finally {
          await subscription.unsubscribe();
          cleanupUnregisterRef.current?.();
          cleanupUnregisterRef.current = null;
        }
      }
    } catch (error: unknown) {
      if (isUnauthorized(error)) webPushSession.invalidateCurrentSession();
      setErrorMessage(
        error instanceof ApiError && error.code === "PUSH_NOT_CONFIGURED"
          ? "Push quedó desactivado en el servidor; no se modificó tu bandeja."
          : "Se desactivó en este dispositivo; la suscripción remota puede requerir reintento.",
      );
    } finally {
      setState("inactive");
    }
  }, [state, token]);

  const retry = useCallback(async () => {
    const endpoint = ownedEndpointRef.current;
    if (state === "owned-by-previous-session" && endpoint && token) {
      if (!webPushSession.hasCleanup(endpoint)) {
        setErrorMessage(
          "No hay un token autorizado para limpiar la sesión anterior. Usa otro dispositivo o la revocación operativa.",
        );
        return;
      }
      setState("deactivating");
      await webPushSession.cleanup(endpoint, token);
      ownedEndpointRef.current = null;
      cleanupUnregisterRef.current?.();
      cleanupUnregisterRef.current = null;
      setState("inactive");
      setErrorMessage(
        "Se limpió la suscripción local; puedes activarla de nuevo si este dispositivo pertenece a tu sesión.",
      );
      return;
    }
    await activate();
  }, [activate, state, token]);

  return { state, errorMessage, activate, deactivate, retry };
};
