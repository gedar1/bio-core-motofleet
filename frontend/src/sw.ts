import { clientsClaim } from "workbox-core";
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

interface PushPayload {
  notificationId: string;
  type: string;
  title: string;
  body: string;
  priority: "low" | "normal" | "high" | "critical";
  role: "user" | "rider" | "admin";
  resourceType: string | null;
  resourceId: string | null;
  url: string;
}

const PAYLOAD_KEYS = [
  "notificationId",
  "type",
  "title",
  "body",
  "priority",
  "role",
  "resourceType",
  "resourceId",
  "url",
] as const;
const readyClientIds = new Set<string>();
const ACK_TIMEOUT_MS = 1_000;
const serviceWorker = self as unknown as ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
clientsClaim();

registerRoute(
  new NavigationRoute(createHandlerBoundToURL("/index.html"), {
    denylist: [
      /^\/api(?:\/|$)/,
      /^\/health(?:\/|$)/,
      /^\/assets(?:\/|$)/,
      /^\/icons(?:\/|$)/,
      /^\/manifest\.webmanifest$/,
      /^\/sw\.js$/,
      /^\/favicon\.ico$/,
      /^\/apple-touch-icon\.png$/,
    ],
  }),
);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isBoundedString = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.length >= 1 && value.length <= max;

const isSafeUrl = (value: unknown): value is string => {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return false;
  }
  if (value.includes("\\") || value.includes("#")) return false;
  try {
    const parsed = new URL(value, serviceWorker.location.origin);
    if (
      parsed.origin !== serviceWorker.location.origin ||
      parsed.username ||
      parsed.password ||
      parsed.protocol !== serviceWorker.location.protocol
    ) {
      return false;
    }
    if (parsed.pathname === "/admin") return parsed.search === "?tab=errands";
    return (
      [
        "/user/errands",
        "/rider/available",
        "/rider/errands",
        "/dashboard",
        "/rider",
      ].includes(parsed.pathname) && parsed.search === ""
    );
  } catch {
    return false;
  }
};

const parsePayload = (value: unknown): PushPayload | null => {
  if (!isRecord(value)) return null;
  const keys = Object.keys(value);
  if (
    keys.length !== PAYLOAD_KEYS.length ||
    keys.some(
      (key) => !PAYLOAD_KEYS.includes(key as (typeof PAYLOAD_KEYS)[number]),
    )
  ) {
    return null;
  }
  if (
    !isBoundedString(value.notificationId, 100) ||
    !isBoundedString(value.type, 80) ||
    !isBoundedString(value.title, 120) ||
    !isBoundedString(value.body, 240) ||
    !["low", "normal", "high", "critical"].includes(value.priority as string) ||
    !["user", "rider", "admin"].includes(value.role as string) ||
    (value.resourceType !== null && !isBoundedString(value.resourceType, 80)) ||
    (value.resourceId !== null && !isBoundedString(value.resourceId, 100)) ||
    !isSafeUrl(value.url)
  ) {
    return null;
  }
  return value as unknown as PushPayload;
};

const warnInvalidPayload = (): void => {
  console.warn("MotoFleet Push payload rejected");
};

const hasForegroundAck = async (payload: PushPayload): Promise<boolean> => {
  const windows = await serviceWorker.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  const candidates = windows.filter(
    (client: WindowClient) =>
      client.visibilityState === "visible" && readyClientIds.has(client.id),
  );
  if (candidates.length === 0) return false;

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (acknowledged: boolean) => {
      if (settled) return;
      settled = true;
      resolve(acknowledged);
    };
    const timeout = setTimeout(() => finish(false), ACK_TIMEOUT_MS);
    for (const client of candidates) {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event: MessageEvent<unknown>) => {
        const data = event.data;
        if (
          isRecord(data) &&
          data.type === "MOTOFLEET_PUSH_ACK" &&
          data.notificationId === payload.notificationId
        ) {
          clearTimeout(timeout);
          finish(true);
        }
      };
      client.postMessage({ type: "MOTOFLEET_PUSH", notification: payload }, [
        channel.port2,
      ]);
    }
  });
};

serviceWorker.addEventListener("message", ((event: Event) => {
  const message = event as MessageEvent<unknown>;
  const data = message.data;
  if (!isRecord(data)) return;
  const source = message.source;
  if (data.type === "SKIP_WAITING") {
    void serviceWorker.skipWaiting();
    return;
  }
  if (!source || !("id" in source)) return;
  const clientId = (source as unknown as Client).id;
  if (data.type === "MOTOFLEET_PUSH_READY") readyClientIds.add(clientId);
  if (data.type === "MOTOFLEET_PUSH_NOT_READY") readyClientIds.delete(clientId);
}) as EventListener);

serviceWorker.addEventListener("push", ((event: Event) => {
  const pushEvent = event as unknown as PushEvent;
  let payload: PushPayload | null = null;
  try {
    payload = parsePayload(pushEvent.data?.json());
  } catch {
    warnInvalidPayload();
  }
  if (!payload) {
    warnInvalidPayload();
    return;
  }

  pushEvent.waitUntil(
    (async () => {
      if (await hasForegroundAck(payload)) {
        const windows = await serviceWorker.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
        for (const client of windows) {
          if (
            client.visibilityState === "visible" &&
            readyClientIds.has(client.id)
          ) {
            client.postMessage({
              type: "MOTOFLEET_PUSH_RECEIVED",
              notificationId: payload.notificationId,
            });
          }
        }
        return;
      }
      await serviceWorker.registration.showNotification(payload.title, {
        body: payload.body,
        tag: `motofleet:${payload.notificationId}`,
        renotify: false,
        icon: "/icons/motofleet-192.png",
        badge: "/icons/motofleet-192.png",
        ...(payload.priority === "high" || payload.priority === "critical"
          ? { vibrate: [100, 50, 100] }
          : {}),
        data: { notificationId: payload.notificationId, url: payload.url },
      } as NotificationOptions & { renotify: boolean });
    })().catch(() => undefined),
  );
}) as EventListener);

serviceWorker.addEventListener("notificationclick", ((event: Event) => {
  const clickEvent = event as unknown as NotificationEvent;
  clickEvent.notification.close();
  const data = clickEvent.notification.data;
  const url = isRecord(data) && isSafeUrl(data.url) ? data.url : null;
  if (!url) return;

  clickEvent.waitUntil(
    (async () => {
      const windows = await serviceWorker.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const sameOrigin = windows.filter((client: WindowClient) => {
        try {
          return new URL(client.url).origin === serviceWorker.location.origin;
        } catch {
          return false;
        }
      });
      const existing = sameOrigin[0];
      if (existing) {
        await existing.navigate(url);
        await existing.focus();
        return;
      }
      await serviceWorker.clients.openWindow(url);
    })().catch(() => undefined),
  );
}) as EventListener);
