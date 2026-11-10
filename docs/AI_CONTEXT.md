# Contexto de trabajo para Kiro

Este documento resume el contexto técnico y las decisiones importantes del proyecto MotoFleet para continuar el trabajo desde otra máquina o en una nueva sesión de Kiro.

## Estado actual

- Repositorio: `bio-core-motofleet`.
- Frontend PWA: `frontend/`.
- Backend: `src/`.
- El frontend y el backend ya compilan correctamente.
- No incluir secretos en este documento, en Git ni en mensajes de Kiro.

## Notificaciones del rider

Se reestructuró el toast de notificaciones:

- `NotificationToast` muestra el título y el mensaje del evento.
- El toast solo conserva la acción `Cerrar`.
- Se eliminaron las acciones redundantes de navegación general, como `Ver disponibles` y `Ver notificaciones`.
- El centro persistente de notificaciones conserva sus funciones válidas, incluyendo listado, contador, marcar como leída, marcar todas como leídas y eliminación individual.
- La navegación contextual del centro debe conservarse si está relacionada con un pedido o recurso específico.

Archivos relacionados:

- `frontend/src/components/notifications/NotificationToast.tsx`
- `frontend/src/components/notifications/NotificationBell.tsx`
- `frontend/src/hooks/useNotifications.ts`

## Validaciones realizadas

El build manual del frontend pasó correctamente:

```text
✓ built in 6.17s
PWA v0.21.2
mode generateSW
precache 31 entries
```

Se generaron correctamente archivos como:

```text
frontend/dist/sw.js
frontend/dist/workbox-9c191d2f.js
```

El build del root también pasó. El warning de tamaño de chunks de Mapbox no bloqueó la compilación.

## Diagnóstico del sonido de notificaciones

Informe completo:

```text
frontend/.agents/tasks/push-notifications-sound-diagnosis.md
```

Hallazgos principales:

- Cuando la aplicación está abierta, el flujo actual muestra un toast HTML.
- El toast no reproduce audio: no hay `new Audio`, `audio.play()`, Web Audio API ni archivo de sonido implementado en el frontend.
- El service worker sí recibe Web Push.
- Cuando existe una ventana visible, el flujo actual evita mostrar una notificación nativa duplicada y entrega el evento a la SPA.
- Por eso, con la aplicación abierta se puede ver el toast sin escuchar ningún sonido.
- Cuando la aplicación está en segundo plano o cerrada, el service worker puede mostrar una notificación nativa mediante `showNotification()`.
- El sonido de esa notificación depende del navegador, del sistema operativo, de los permisos, del volumen, del modo silencio/no molestar y de la configuración del dispositivo.
- Una PWA web no puede seleccionar de forma portable un archivo `.mp3` personalizado como sonido de la notificación nativa.
- El manifest no es el lugar donde se configura un sonido personalizado.

## Service worker local

Se comprobó en DevTools que la PWA local en `http://localhost:4173/` tenía:

- `sw.js` registrado.
- Estado `activated and is running`.
- Cliente controlado en `/user/create-errand`.

Esto confirma que el service worker local está registrado y activo. No demuestra por sí mismo que el toast tenga audio.

## Railway y Web Push

El usuario confirmó que las variables Web Push están configuradas correctamente en el servicio backend de Railway, no en el frontend:

- `WEB_PUSH_ENABLED=true`
- `WEB_PUSH_VAPID_SUBJECT`
- `WEB_PUSH_VAPID_PUBLIC_KEY`
- `WEB_PUSH_VAPID_PRIVATE_KEY`

Las claves VAPID privadas deben permanecer únicamente en el backend. El frontend obtiene la clave pública a través del backend.

El frontend necesita su URL de API, normalmente mediante `VITE_API_BASE_URL`, y el backend debe permitir el origen exacto del frontend mediante CORS. No copiar valores secretos a este archivo.

## Decisión de producto pendiente: sonido híbrido

La opción recomendada es un modelo híbrido:

```text
Aplicación abierta:
Toast + audio HTML configurable

Aplicación en segundo plano:
Push nativo + sonido controlado por el sistema operativo

Aplicación cerrada:
Push nativo + sonido controlado por el sistema operativo
```

### Audio en primer plano

Para implementar sonido mientras el rider usa la aplicación:

- Agregar una melodía breve en `frontend/public/sounds/`.
- Añadir una preferencia para activar o desactivar el sonido.
- Desbloquear el audio mediante una interacción explícita del usuario.
- Reproducir el sonido cuando llegue una notificación nueva y aparezca el toast.
- Manejar el rechazo de `audio.play()` por las políticas de autoplay.
- Considerar el volumen multimedia del dispositivo, que puede ser distinto al volumen de notificaciones.

### Sonido con la aplicación cerrada

En una PWA no se puede garantizar ni elegir una melodía personalizada para `showNotification()`. Descargar una melodía no hace que el sistema operativo la use automáticamente como sonido de notificación.

Si el sonido de marca cuando la aplicación está cerrada es obligatorio, se necesitaría una aplicación nativa o una integración nativa específica para canales de notificaciones y sonidos.

## Pruebas locales

Para probar rápidamente la interfaz y el toast:

```bash
cd frontend
npm run dev
```

Normalmente queda disponible en `http://localhost:5173`.

Para probar el comportamiento generado de la PWA y el service worker:

```bash
cd frontend
npm run build
npm run preview
```

Normalmente queda disponible en `http://localhost:4173`.

Para verificar Push en el navegador:

- `Notification.permission` debe ser `granted`.
- El service worker debe estar `activated`.
- La suscripción Push debe crearse nuevamente si cambian las claves VAPID.
- Para probar una notificación nativa, ocultar o minimizar la pestaña.
- Para probar el toast, mantener la aplicación visible.

## Próximo paso sugerido

Antes de editar código, decidir si se quiere:

1. Mantener el toast y añadir audio de primer plano.
2. Eliminar el toast y mostrar siempre notificaciones nativas.
3. Implementar el modelo híbrido recomendado.

La recomendación actual es la opción 3: toast más audio configurable en primer plano y Push nativo en segundo plano o con la aplicación cerrada.
