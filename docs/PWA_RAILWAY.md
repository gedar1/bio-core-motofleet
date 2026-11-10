# MotoFleet PWA en Railway

## Servicio frontend

La PWA sirve la SPA desde `frontend` y el canal Push Web opcional usa los endpoints autenticados descritos abajo. El servicio que sirve la SPA debe usar como directorio raíz `frontend`, instalar dependencias con `npm ci`, ejecutar `npm run build` y publicar `frontend/dist` como directorio estático.

Debe servirse por HTTPS en producción. `localhost` también puede registrar el service worker durante desarrollo local. El proveedor debe responder con `200` y tipos MIME correctos para:

- `/manifest.webmanifest` (`application/manifest+json` o `application/json`)
- `/sw.js` (`application/javascript`)
- `/favicon.ico` (`image/x-icon`)
- `/apple-touch-icon.png` y `/icons/*.png` (`image/png`)
- `/assets/*` con el tipo MIME correspondiente al recurso hashado

El frontend debe incluir estos archivos PNG preparados con el logo de MotoFleet:

- `frontend/public/icons/motofleet-192.png`, `frontend/public/icons/motofleet-512.png` y `frontend/public/icons/motofleet-512-maskable.png` son PNG reales de 192/512 px; `frontend/public/apple-touch-icon.png` usa el PNG de 192px. El icono maskable tiene fondo de marca y margen seguro, y se declara con `purpose: "maskable"` en el manifest.

No se debe enlazar en producción a rutas bajo `/src/assets`.

## Push Web

La PWA usa `vite-plugin-pwa` con estrategia `injectManifest`: el worker editable es `frontend/src/sw.ts` y conserva el precache mediante `precacheAndRoute(self.__WB_MANIFEST)`. El fallback SPA excluye `/api`, `/health`, assets, manifest, iconos y el propio worker; no existe runtime cache para API, tokens, direcciones, estados, Mapbox ni formularios.

El backend entrega Web Push estándar con VAPID. `WEB_PUSH_ENABLED=false` es seguro por defecto; una pareja VAPID inválida mantiene la aplicación arrancable pero responde `503 PUSH_NOT_CONFIGURED`. Las suscripciones se asocian al `{id, role}` del JWT, el endpoint es único y nunca se transfiere automáticamente a otra cuenta. El alta repetida del mismo propietario actualiza las claves; un propietario diferente recibe `409 PUSH_SUBSCRIPTION_OWNED`. No hay reintentos automáticos: `404/410` elimina la fila; red, timeout, `408`, `429`, `5xx` y otros `4xx` se registran sin bloquear la operación ni borrar la bandeja.

Producción requiere HTTPS; localhost sirve para desarrollo. La disponibilidad en iOS/iPadOS depende de la versión y del contexto soportado, incluida la instalación de la PWA cuando corresponda. Sonido y vibración dependen de OS, permisos, volumen, modo silencio/no molestar, batería y canal de notificaciones; MotoFleet no promete audio ni vibración universal.

Configurar el fallback de `GET` hacia `/index.html` para las rutas de React, incluyendo `/`, `/login`, `/user/*`, `/rider/*` y `/admin/*`. Excluir explícitamente del fallback:

- `/api/*`
- `/health`
- `/assets/*`
- `/icons/*`
- `/manifest.webmanifest`
- `/sw.js`
- `/favicon.ico`
- `/apple-touch-icon.png`

Así, una ruta profunda de React carga la SPA, mientras que las llamadas API siguen llegando al servicio API y nunca reciben `index.html` como respuesta de fallback.

## Configuración en Railway

Según la arquitectura del proyecto, configurar en el servicio frontend los campos equivalentes a:

- **Root Directory:** `frontend`
- **Build Command:** `npm ci && npm run build`
- **Output/Static Directory:** `dist`
- **SPA fallback:** `/index.html` para documentos de la SPA, con las exclusiones anteriores

Si Railway usa un único servicio para frontend y backend, el proxy o servidor que expone `frontend/dist` debe aplicar esas mismas reglas sin modificar `src/app.ts`, las rutas `/api` ni los contratos existentes.

## Alcance de esta fase

El service worker precachea solo el shell generado y recursos estáticos públicos. No tiene `runtimeCaching`, no almacena respuestas de `/api`, tokens, cabeceras `Authorization`, direcciones, estados de mandados, datos de Mapbox ni formularios. Push Web es un canal adicional para las notificaciones persistidas existentes; no modifica la lógica de mandados ni crea una segunda fila funcional.
