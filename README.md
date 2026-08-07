# MotoFleet MVP

MotoFleet MVP es una plataforma web **standalone** para administrar la renta de una flota de motocicletas y operar un marketplace de mandados. Conecta a usuarios que solicitan transporte de objetos, compras o trámites con riders que los ejecutan, mientras el equipo administrador gestiona flota, contratos y tarifas.

> Alcance del MVP: operación en una sola ciudad, pagos manuales y sin seguimiento en tiempo real. No forma parte de un monorepo ni depende de `@bio/core`.

## Funcionalidades

### Admin

- Consulta de métricas operativas y listado administrativo de mandados con filtros.
- Registro, listado, actualización y cambio de estado de motocicletas.
- Consulta de riders y gestión de su disponibilidad para recibir mandados.
- Creación, listado, renovación y cancelación de contratos de renta; un contrato requiere rider activo, motocicleta disponible y codeudor.
- Registro y consulta de codeudores y de pagos de renta por contrato.
- Creación, consulta y desactivación de reglas de tarifa y comisión.

### Usuario

- Registro e inicio de sesión.
- Creación de mandados de transporte de objetos, compras y trámites, con origen, destino, coordenadas proporcionadas, método de pago y cálculo de tarifa.
- Consulta del historial propio con estado y seguimiento de los cambios.
- Cancelación de mandados según su estado.

### Rider

- Registro con documentos, inicio de sesión y cambio de disponibilidad.
- Consulta de mandados solicitados, aceptación y actualización manual del flujo: aceptado, recogido y entregado.
- Consulta de mandados asignados y cancelación cuando las reglas de estado lo permiten.

### Estado de cuenta y disponibilidad del rider

El estado de la cuenta (`active`, `suspended` o `inactive`) y la disponibilidad para aceptar mandados son datos distintos. Un rider se registra activo pero inicialmente **no disponible**. Para aceptar un mandado debe estar activo y marcarse disponible; al aceptarlo queda no disponible, y vuelve a estar disponible al entregar o al cancelarse un mandado asignado.

## Arquitectura

- **Frontend:** React, Vite y Tailwind CSS.
- **Backend:** Express y TypeScript, organizado con `atoms` (lógica y esquemas reutilizables) y `molecules` (casos de negocio e I/O).
- **Datos:** SQLite mediante `better-sqlite3` y migraciones SQL.
- **Seguridad y validación:** JWT para autenticación/autorización, bcrypt para contraseñas y Zod en los límites de entrada.
- **Operación:** logging estructurado con Pino y un scheduler propio para expiración de contratos y procesamiento de notificaciones.

## Requisitos previos

- Node.js 20 LTS o superior.
- npm.
- Una configuración SMTP válida solo si se requieren notificaciones por correo.

## Instalación local

Desde la raíz del repositorio, cree la configuración local y prepare el backend. **Nunca haga commit de `.env`; puede contener secretos.**

```bash
cp .env.example .env
npm install
```

Edite `.env` con los valores locales necesarios y arranque los procesos en terminales separadas.

### Terminal 1 — backend

```bash
npm run dev
```

El servidor de API usa `PORT` (por defecto, `3000`) y crea/aplica las migraciones sobre la base SQLite configurada.

### Terminal 2 — frontend

```bash
cd frontend
npm install
npm run dev
```

Vite mostrará en la terminal la URL local de la interfaz. El frontend usa el backend local para las rutas `/api`.

## Variables de entorno

Copie `.env.example` a `.env` y reemplace estos valores de ejemplo de forma segura. **No suba `.env` al repositorio ni comparta sus secretos.**

| Variable     | Ejemplo seguro para desarrollo            | Uso                                      |
| ------------ | ----------------------------------------- | ---------------------------------------- |
| `PORT`       | `3000`                                    | Puerto HTTP de la API.                   |
| `JWT_SECRET` | `replace-with-a-long-random-local-secret` | Secreto para firmar tokens JWT.          |
| `DB_PATH`    | `./data/motofleet.db`                     | Ubicación del archivo SQLite.            |
| `SMTP_HOST`  | `smtp.example.test`                       | Host SMTP para notificaciones por email. |
| `SMTP_PORT`  | `587`                                     | Puerto SMTP.                             |
| `SMTP_USER`  | `local-smtp-user@example.test`            | Usuario SMTP.                            |
| `SMTP_PASS`  | `replace-with-local-smtp-password`        | Contraseña o token SMTP.                 |

## API y autorización

La API se agrupa bajo `/api`. Esta lista es orientativa, no sustituye el contrato completo de cada ruta:

| Grupo                 | Endpoints seleccionados                                                                                                                                               | Acceso                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Autenticación y alta  | `POST /api/auth/login`, `POST /api/users/register`, `POST /api/riders/register`                                                                                       | Público                                                                           |
| Flota y renta         | `/api/motorcycles`, `/api/contracts`, `/api/contracts/:contractId/payments`, `/api/riders/:riderId/cosigners`                                                         | Admin                                                                             |
| Tarifas y operación   | `/api/pricing-rules`, `GET /api/admin/metrics`, `GET /api/admin/errands`                                                                                              | Admin                                                                             |
| Mandados              | `POST /api/errands`, `GET /api/errands/my`, `PATCH /api/errands/:id/cancel`                                                                                           | Usuario; historial/cancelación también aplican al rider según la ruta y el estado |
| Ejecución de mandados | `GET /api/errands/available`, `PATCH /api/errands/:id/accept`, `PATCH /api/errands/:id/pickup`, `PATCH /api/errands/:id/deliver`, `PATCH /api/riders/me/availability` | Rider                                                                             |

Las rutas protegidas requieren `Authorization: Bearer <JWT>`. El backend autoriza por rol (`admin`, `user` o `rider`) y devuelve acceso denegado cuando el rol no corresponde.

## Calidad

Ejecute los controles desde la raíz, salvo donde se indique lo contrario:

```bash
# Backend: compilar TypeScript
npm run build

# Backend: pruebas con Vitest
npm test

# Frontend: comprobación TypeScript y build de Vite
cd frontend
npm run build
```

## Estructura del proyecto

```text
.
├── src/                 # API Express, atoms, molecules, rutas e infraestructura
├── frontend/            # Aplicación React/Vite/Tailwind
├── tests/               # Pruebas unitarias y basadas en propiedades
├── data/                # Base SQLite generada en ejecución
├── docs/                # Guía manual y colección Postman
├── .env.example         # Plantilla de configuración local
└── package.json         # Scripts del backend
```

## Documentación adicional

- [Guía de pruebas manuales](docs/MANUAL_TESTING_GUIDE.md)
- [Colección de Postman](docs/MotoFleet-API.postman_collection.json)

## Limitaciones y próximos pasos

- La geocodificación de mapas/direcciones está diferida: al crear un mandado se proporcionan las coordenadas junto con las direcciones, y la distancia se calcula localmente.
- Las notificaciones por email dependen de una configuración SMTP válida.
- Los pagos son manuales; no hay pasarela de pagos integrada.
- El MVP no incluye rastreo de riders en tiempo real ni está planteado como despliegue de producción.
