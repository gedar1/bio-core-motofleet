# MotoFleet MVP

MotoFleet MVP es una plataforma web **standalone** para administrar una flota de motocicletas y operar un marketplace de mandados. Conecta usuarios que solicitan transporte de objetos, compras o trámites con riders que los ejecutan, mientras el equipo administrador gestiona flota, contratos y tarifas.

> Alcance actual: operación en una sola ciudad, pagos manuales y sin rastreo de riders en tiempo real. El proyecto no forma parte de un monorepo ni depende de `@bio/core`.

## Funcionalidades

### Administración

- Gestión de motocicletas, riders, documentos de identidad, codeudores, contratos y pagos de renta.
- Métricas operativas, mandados con filtros y reglas de tarifa administrables.
- Interfaz centrada en tablas y gestión de escritorio; no usa el flujo operativo map-first.

### Usuario: solicitud de mandados

- Registro e inicio de sesión.
- Selección de origen y destino en un único mapa Mapbox: búsqueda restringida a Colombia, geolocalización, toque y arrastre de pines.
- Reverse geocoding para convertir un pin seleccionado en una dirección legible cuando es posible; las coordenadas siguen siendo la fuente precisa de la ubicación.
- Previsualización de la ruta vial, distancia y duración antes de crear el mandado.
- Experiencia **mobile-first**: el mapa es la región principal y el formulario de tipo, descripción y pago se muestra como panel inferior.
- Consulta y cancelación de mandados propios según el estado.

### Rider: ejecución de mandados

- Registro con documentos, inicio de sesión y control de disponibilidad.
- Consulta y aceptación de mandados disponibles; la ruta Mapbox se abre bajo demanda para evitar solicitudes innecesarias.
- Para el mandado activo, la vista móvil carga una ruta Mapbox como superficie principal y presenta las acciones operativas en un panel inferior.
- Flujo manual de estados: `requested` → `accepted` → `picked_up` → `delivered`; también permite cancelación cuando aplican las reglas.
- Enlaces opcionales a Google Maps y Waze, además de copiar la ubicación. Son solo ayudas de navegación: nunca cambian la ruta, tarifa o estado oficiales de MotoFleet.

### Rutas y precios

- El backend usa Mapbox Directions con perfil `driving-traffic` como fuente autoritativa de distancia y duración.
- La tarifa se calcula exclusivamente en el backend con distancia vial y valores enteros COP; el frontend nunca envía ni calcula precios.
- Si Mapbox no está disponible, la creación productiva falla de forma segura. El fallback Haversine solo puede habilitarse explícitamente con `ROUTING_ALLOW_HAVERSINE_FALLBACK=true`.
- Cada mandado guarda un snapshot de distancia, duración, proveedor/perfil de ruteo y valores monetarios COP.

## Arquitectura

- **Frontend:** React, Vite, Tailwind CSS, Mapbox GL y `react-map-gl`.
- **Backend:** Express y TypeScript con capas `Routes → Molecules → Atoms / puertos de dominio`.
- **Ruteo:** `RoutingProvider` es un puerto de dominio; `MapboxRoutingProvider` es su adaptador de infraestructura actual.
- **Datos:** SQLite mediante `better-sqlite3` y migraciones SQL forward-only.
- **Seguridad:** JWT, bcrypt, Zod, tokens Mapbox separados por frontend/backend y errores de proveedor normalizados.
- **Operación:** logging estructurado con Pino y scheduler para expiración de contratos y notificaciones.

## Requisitos previos

- **Node.js 20 LTS** (el entorno de desarrollo validado usa Node `20.20.0`).
- npm y Git Bash en Windows.
- Una cuenta Mapbox con dos tokens distintos:
  - token público restringido para el navegador;
  - token dedicado al backend para Directions.
- Configuración SMTP válida solo si se requieren notificaciones por correo.

## Instalación local

Desde Git Bash en la raíz del repositorio:

```bash
cp .env.example .env
npm install

cd frontend
cp .env.example .env
npm install
cd ..
```

Nunca haga commit de `.env`, ni copie tokens o credenciales en tickets, chats o código fuente.

### Configuración de Mapbox

El backend y el frontend usan variables distintas. No intercambie los tokens.

**`.env` en la raíz (solo backend):**

```dotenv
MAPBOX_SECRET_TOKEN=pk.your-server-only-token
# Opcional y desactivado por defecto. No usar en producción normal.
ROUTING_ALLOW_HAVERSINE_FALLBACK=false
```

**`frontend/.env` (solo token público visible en el bundle):**

```dotenv
VITE_MAPBOX_PUBLIC_TOKEN=pk.your-restricted-public-token
```

El token `VITE_MAPBOX_PUBLIC_TOKEN` debe limitarse por URL/origen y permisos mínimos. Nunca use el prefijo `VITE_` para un token secreto, credenciales de pago o cualquier secreto de backend.

### Ejecución

Use terminales separadas de Git Bash.

**Terminal 1 — backend**

```bash
npm run dev
```

El backend carga `.env`, aplica migraciones y sirve la API en `PORT` (por defecto, `3000`).

**Terminal 2 — frontend**

```bash
cd frontend
npm run dev
```

Vite mostrará la URL local de la interfaz y redirigirá las llamadas `/api` al backend configurado.

## Variables de entorno

| Variable                                           | Requerida     | Uso                                                                                             |
| -------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------- |
| `PORT`                                             | No            | Puerto HTTP de la API; por defecto `3000`.                                                      |
| `JWT_SECRET`                                       | Sí            | Secreto para firmar JWT. Use un valor largo y aleatorio.                                        |
| `DB_PATH`                                          | No            | Ruta del archivo SQLite; por defecto `./data/motofleet.db`.                                     |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | No            | Configuración de notificaciones por email.                                                      |
| `MAPBOX_SECRET_TOKEN`                              | Sí para ruteo | Token de backend usado únicamente por Mapbox Directions.                                        |
| `ROUTING_ALLOW_HAVERSINE_FALLBACK`                 | No            | Actívelo solo con `true` para una contingencia explícita; por defecto el sistema falla cerrado. |
| `VITE_MAPBOX_PUBLIC_TOKEN`                         | Sí para mapas | Variable de `frontend/.env` para renderizar mapas y geocodificación en el navegador.            |

## API y autorización

Todas las rutas de la API se agrupan bajo `/api`; las protegidas requieren `Authorization: Bearer <JWT>` y autorización por rol (`admin`, `user` o `rider`).

| Grupo                           | Endpoints seleccionados                                                                                                                                                                                     | Acceso                                                    |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Autenticación y alta            | `POST /api/auth/login`, `POST /api/users/register`, `POST /api/riders/register`                                                                                                                             | Público                                                   |
| Flota y renta                   | `/api/motorcycles`, `/api/contracts`, `/api/contracts/:contractId/payments`, `/api/riders/:riderId/cosigners`                                                                                               | Admin                                                     |
| Tarifas y operación             | `/api/pricing-rules`, `GET /api/admin/metrics`, `GET /api/admin/errands`                                                                                                                                    | Admin                                                     |
| Creación y consulta de mandados | `POST /api/errands`, `POST /api/errands/route-estimate`, `GET /api/errands/my`, `PATCH /api/errands/:id/cancel`                                                                                             | Usuario; historial/cancelación también según rol y estado |
| Ejecución del rider             | `GET /api/errands/available`, `GET /api/errands/:id/route-preview`, `PATCH /api/errands/:id/accept`, `PATCH /api/errands/:id/pickup`, `PATCH /api/errands/:id/deliver`, `PATCH /api/riders/me/availability` | Rider                                                     |

`POST /api/errands/route-estimate` sirve únicamente para la previsualización de creación y no persiste ni cotiza un mandado. `GET /api/errands/:id/route-preview` limita al rider a mandados disponibles o asignados a él; así el navegador no puede usar el backend como proxy de rutas arbitrarias.

## Calidad y validación

Ejecute los controles desde Git Bash:

```bash
# Backend: compilar TypeScript
npm run build

# Verificar la migración 14.7 y su idempotencia
npm run verify:migration:14.7

# Pruebas de propiedades de tarifas y reglas de precio
npm test -- tests/properties/tarifa.property.test.ts tests/properties/pricingRule.property.test.ts

# Frontend: comprobación TypeScript y build de Vite
cd frontend
npm run build
```

El build de frontend puede advertir que el chunk de Mapbox supera 500 kB. Es un warning conocido y no bloquea la compilación actual.

## Estructura del proyecto

```text
.
├── src/
│   ├── atoms/                    # Validación, tarifas COP y funciones puras
│   ├── domains/errands/          # Puerto RoutingProvider y DTOs de ruta
│   ├── infrastructure/routing/   # Adaptador Mapbox Directions
│   ├── migrations/               # Migraciones SQLite forward-only
│   ├── molecules/                # Casos de negocio y ciclo de mandados
│   └── routes/                   # Endpoints Express y autorización
├── frontend/
│   └── src/                      # React, UX mobile-first y componentes Mapbox
├── tests/                        # Pruebas unitarias y basadas en propiedades
├── data/                         # SQLite generada en ejecución
├── docs/                         # Guía manual y colección Postman
├── .env.example                  # Plantilla del backend
└── package.json                  # Scripts del backend
```

## Documentación adicional

- [Guía de pruebas manuales](docs/MANUAL_TESTING_GUIDE.md)
- [Colección de Postman](docs/MotoFleet-API.postman_collection.json)
- [Requisitos del dominio](docs/motofleet/REQUIREMENTS.md)
- [Modelo de dominio](docs/motofleet/DOMAIN_MODEL.md)

## Limitaciones y próximos pasos

- Los enlaces de Google Maps y Waze son externos y opcionales; MotoFleet continúa usando Mapbox como fuente de ruta y precio.
- No hay rastreo de riders en tiempo real, pagos integrados ni despliegue de producción definido.
- El fallback Haversine no debe sustituir el ruteo vial normal; es una contingencia explícita.
- Una siguiente mejora es persistir o cachear la geometría de ruta para disminuir solicitudes Directions al alternar entre mandados.
