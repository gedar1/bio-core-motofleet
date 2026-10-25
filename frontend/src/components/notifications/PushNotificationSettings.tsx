import React from "react";
import { useWebPushNotifications } from "../../hooks/useWebPushNotifications";

const stateLabels: Record<string, string> = {
  disabled: "Push no está habilitado en el servidor.",
  "permission-default": "Activa las notificaciones del dispositivo.",
  "permission-denied":
    "El permiso está bloqueado; cámbialo en el navegador o sistema.",
  inactive: "Las notificaciones del sistema están desactivadas.",
  active: "Las notificaciones del sistema están activas.",
  activating: "Activando notificaciones…",
  deactivating: "Desactivando notificaciones…",
  "owned-by-previous-session":
    "Este dispositivo pertenece a una sesión anterior. No se transferirá automáticamente.",
  error: "No pudimos actualizar Push. Puedes intentarlo de nuevo.",
  unsupported: "Este navegador o contexto no admite notificaciones Push.",
};

export const PushNotificationSettings: React.FC = () => {
  const { state, activate, deactivate, retry } = useWebPushNotifications();
  const canActivate = ["permission-default", "inactive"].includes(state);
  const isBusy = state === "activating" || state === "deactivating";

  return (
    <section
      className="mb-md rounded-md border border-hairline-soft bg-white/50 p-md"
      aria-label="Notificaciones del dispositivo"
    >
      <div className="flex items-start justify-between gap-md">
        <div>
          <h3 className="text-body-sm-medium font-semibold text-ink">
            Notificaciones del dispositivo
          </h3>
          <p className="mt-1 text-body-xs text-ink-muted">
            {stateLabels[state]}
          </p>
        </div>
        {state === "active" ? (
          <button
            type="button"
            onClick={() => void deactivate()}
            disabled={isBusy}
            className="shrink-0 text-body-xs text-ink underline disabled:opacity-50"
          >
            Desactivar
          </button>
        ) : canActivate ? (
          <button
            type="button"
            onClick={() => void activate()}
            disabled={isBusy}
            className="shrink-0 text-body-xs text-ink underline disabled:opacity-50"
          >
            Activar
          </button>
        ) : state === "owned-by-previous-session" || state === "error" ? (
          <button
            type="button"
            onClick={() => void retry()}
            disabled={isBusy}
            className="shrink-0 text-body-xs text-ink underline disabled:opacity-50"
          >
            Reintentar
          </button>
        ) : null}
      </div>
      {/* {errorMessage && (
        <p className="mt-sm text-body-xs text-red-700" role="alert">
          {errorMessage}
        </p>
      )} */}
    </section>
  );
};
