# Implementation Plan: MotoFleet MVP

## Overview

Standalone Express + SQLite REST API for motorcycle fleet rental and errand marketplace. The project is fully independent (`bio-core-motofleet/`) with no external monorepo dependencies. Implementation follows atoms → molecules → routes layering with infrastructure bootstrapped first.

## Tasks

- [x] 1. Project scaffold and infrastructure
  - [x] 1.1 Create package.json, tsconfig.json, vitest.config.ts, .env.example
    - Initialize standalone `package.json` with dependencies: express, better-sqlite3, zod, jsonwebtoken, bcrypt, uuid, pino, pino-pretty, nodemailer
    - Add devDependencies: typescript, vitest, fast-check, supertest, @types/express, @types/better-sqlite3, @types/jsonwebtoken, @types/bcrypt, @types/uuid, @types/nodemailer
    - Create `tsconfig.json` targeting ES2022, module NodeNext, strict mode
    - Create `vitest.config.ts` with test paths for `tests/`
    - Create `.env.example` with PORT, JWT_SECRET, DB_PATH, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
    - Create `.gitignore` (node_modules, data/\*.db, dist/, .env)
    - Create `data/.gitkeep`
    - _Requirements: All (project foundation)_

  - [x] 1.2 Implement `src/infrastructure/logger.ts`
    - Define `ILogger` interface (info, warn, error, debug, child)
    - Implement `PinoLoggerAdapter` wrapping Pino with pino-pretty in dev
    - Export `createLogger(module: string): ILogger` factory
    - _Requirements: Non-functional (logging strategy from design)_

  - [x] 1.3 Implement `src/infrastructure/database.ts`
    - Implement `createDatabase(dbPath)` with WAL mode enabled
    - Implement `runMigrations(db, migrationsDir)` reading .sql files in order
    - Implement `getDatabase()` singleton and `closeDatabase()` cleanup
    - _Requirements: All (data persistence foundation)_

  - [x] 1.4 Implement `src/infrastructure/scheduler.ts`
    - Implement `Scheduler` class with `register`, `unregister`, `pause`, `resume`, `trigger`, `list`, `shutdown` methods
    - Uses setInterval internally, tracks lastRun/nextRun/runCount/errors per task
    - _Requirements: 5.8, 14.7 (contract expiry, notification retry)_

  - [x] 1.5 Create `src/migrations/001_initial.sql`
    - Full SQL schema: users, riders, admins, cosigners, motorcycles, rental_contracts, rental_payments, pricing_rules, errands, login_attempts, notification_queue
    - All CHECK constraints, UNIQUE constraints, and indexes as defined in design
    - _Requirements: All (data model)_

- [x] 2. Atoms — pure functions and validation schemas
  - [x] 2.1 Implement `src/atoms/schemas.ts`
    - Define Zod schemas: emailSchema, phoneSchema, passwordSchema
    - Define createUserSchema, createRiderSchema, createMotorcycleSchema, createContractSchema, createPaymentSchema, createErrandSchema, createPricingRuleSchema, createCosignerSchema, loginSchema
    - All validation rules per requirements (field lengths, formats, ranges)
    - _Requirements: 1.6, 2.1, 2.4, 3.1, 3.5, 4.1, 4.3, 5.1, 6.1, 7.4, 8.1, 8.5, 9.6, 9.7_

  - [x] 2.2 Implement `src/atoms/haversine.ts`
    - Implement `haversineDistance(origin, destination)` returning km with 2 decimals
    - Apply 0.5 km floor for distances shorter than that
    - _Requirements: 17.1, 17.5_

  - [x] 2.3 Implement `src/atoms/tarifa.ts`
    - Define `PricingInput` and `PricingResult` interfaces
    - Implement `roundHalfUp(value, decimals)` with half-up rounding
    - Implement `calculateTarifa(input)` computing tarifa, comisionPlataforma, gananciaRider
    - _Requirements: 9.2, 9.3, 9.4, 17.2, 17.3, 17.6_

  - [x] 2.4 Implement `src/atoms/password.ts`
    - Implement `hashPassword(plain)` using bcrypt
    - Implement `verifyPassword(plain, hash)` comparing with bcrypt
    - Implement `isValidPassword(password)` checking 8-72 chars, 1 uppercase, 1 lowercase, 1 digit
    - _Requirements: 1.6, 2.4, 3.5_

  - [x] 2.5 Implement `src/atoms/stateMachines.ts`
    - Define MotorcycleState, ContractState, ErrandState types
    - Implement `isValidMotorcycleTransition(from, to, context?)` with valid transition map
    - Implement `isValidContractTransition(from, to)`
    - Implement `isValidErrandTransition(from, to)`
    - Implement `getValidMotorcycleTransitions(from, context?)` and `getValidErrandTransitions(from)`
    - _Requirements: 4.5, 4.6, 4.7, 4.9, 5.6, 5.7, 5.8, 11.4, 11.5, 11.6, 12.4, 18.1–18.7_

  - [x]\* 2.6 Write property tests for tarifa calculation (fast-check)
    - **Property 1: Cálculo de tarifa — correctitud y descomposición**
    - **Property 3: Redondeo half-up**
    - **Validates: Requirements 9.2, 9.3, 9.4, 17.2, 17.3, 17.6**
    - File: `tests/properties/tarifa.property.test.ts`

  - [x]\* 2.7 Write property tests for haversine distance (fast-check)
    - **Property 2: Distancia Haversine — correctitud y mínimo**
    - **Validates: Requirements 17.1, 17.5**
    - File: `tests/properties/haversine.property.test.ts`

  - [x]\* 2.8 Write property tests for state machines (fast-check)
    - **Property 4: Máquina de estados de motocicleta**
    - **Property 5: Máquina de estados de mandado**
    - **Validates: Requirements 11.4, 11.5, 11.6, 12.4, 18.1–18.7**
    - File: `tests/properties/stateMachines.property.test.ts`

  - [x]\* 2.9 Write property tests for password validation (fast-check)
    - **Property 6: Validación de contraseña**
    - **Validates: Requirements 1.6, 2.4, 3.5**
    - File: `tests/properties/validation.property.test.ts`

  - [ ]\* 2.10 Write unit tests for atoms
    - Test haversine edge cases (same point, antipodal, equator)
    - Test tarifa edge cases (minimum distance, maximum values)
    - Test schemas validation (valid/invalid inputs for each schema)
    - Test password validation (edge cases at boundaries)
    - Files: `tests/atoms/haversine.test.ts`, `tests/atoms/tarifa.test.ts`, `tests/atoms/stateMachines.test.ts`, `tests/atoms/password.test.ts`, `tests/atoms/schemas.test.ts`
    - _Requirements: 1.6, 2.4, 9.2, 17.1, 17.5, 18.1–18.7_

- [x] 3. Checkpoint — Atoms complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Middleware
  - [x] 4.1 Implement `src/middleware/auth.middleware.ts`
    - Extract JWT from `Authorization: Bearer <token>` header
    - Verify token and inject `req.user = { id, role, email }` into request
    - Return 401 with generic error if token missing, invalid, or expired
    - _Requirements: 1.1, 1.3, 1.4_

  - [x] 4.2 Implement `src/middleware/roleGuard.middleware.ts`
    - Factory function `roleGuard(...allowedRoles: Role[])` returning middleware
    - Return 403 if `req.user.role` not in allowed roles
    - _Requirements: 1.5_

  - [x] 4.3 Implement `src/middleware/validate.middleware.ts`
    - Factory function `validate(schema, source?)` creating Zod validation middleware
    - Validate body (default), query, or params
    - Transform ZodError into `ApiError` with field-level details
    - _Requirements: 2.4, 2.5, 3.5, 3.6, 4.3, 7.4, 8.5, 9.7, 9.8, 9.10_

  - [x] 4.4 Implement `src/middleware/errorHandler.middleware.ts`
    - Define `AppError` class with status, code, message, details
    - Global error handler catching AppError, ZodError, and generic errors
    - Log with Pino (error level for 5xx, warn for 4xx)
    - Return standardized JSON response, never expose stack traces to client
    - _Requirements: Non-functional (error handling strategy)_

  - [x]\* 4.5 Write property test for role-based authorization (fast-check)
    - **Property 7: Autorización basada en roles**
    - **Validates: Requirements 1.3, 1.5**
    - File: `tests/properties/authorization.property.test.ts`

- [x] 5. Molecules — business logic
  - [x] 5.1 Implement `src/molecules/IMolecule.ts`
    - Define `IMolecule` interface locally: name, version, initialize?, dispose?
    - _Requirements: Non-functional (design convention)_

  - [x] 5.2 Implement `src/molecules/AuthMolecule.ts`
    - `login(email, password)` — lookup user/rider/admin by email, verify password, emit JWT
    - `verifyToken(token)` — decode and validate JWT
    - `getFailedAttempts`, `incrementFailedAttempts`, `resetFailedAttempts`, `isAccountLocked`
    - Implement lockout: 5 failed attempts → 15 min lock
    - _Requirements: 1.1, 1.2, 1.4, 1.7, 1.8_

  - [x] 5.3 Implement `src/molecules/UserMolecule.ts`
    - `register(data)` — validate uniqueness (email, phone), hash password, insert user
    - `getById(id)`, `getByEmail(email)`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 5.4 Implement `src/molecules/RiderMolecule.ts`
    - `register(data)` — validate uniqueness across users+riders, validate license/insurance dates, hash password, insert rider
    - `getById(id)`, `setAvailability(riderId, available)`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 5.5 Implement `src/molecules/CosignerMolecule.ts`
    - `create(riderId, data)` — validate rider exists, check document uniqueness per rider
    - `listByRider(riderId)`, `update(cosignerId, partialData)`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 5.6 Implement `src/molecules/MotorcycleMolecule.ts`
    - `create(data)` — validate plate uniqueness, insert with estado=disponible
    - `update(id, data)` — partial update of allowed fields
    - `changeStatus(id, newStatus)` — validate transition via state machine
    - `list(filters, page)` — paginated list with status filter (max 100/page)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_

  - [x] 5.7 Implement `src/molecules/ContractMolecule.ts`
    - `create(data)` — validate motorcycle disponible, rider active, no active contract for either, rider has cosigner
    - `cancel(contractId)` — set estado=cancelado, motorcycle→disponible
    - `renew(contractId, newEndDate)` — validate new date > current end
    - `expireOverdue()` — batch: mark overdue contracts as vencido, set motorcycle→disponible
    - `list(filters)`, `getById(contractId)`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [x] 5.8 Implement `src/molecules/PaymentMolecule.ts`
    - `create(contractId, data)` — validate contract exists, period not already paid, format/amount checks
    - `listByContract(contractId)` — ordered by periodo descending
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 5.9 Implement `src/molecules/PricingMolecule.ts`
    - `create(data)` — auto-deactivate existing active rule for same type, insert new active rule
    - `deactivate(ruleId)` — mark inactive
    - `getActiveByType(tipoMandado)` — return current active rule or null
    - `list()` — all rules
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 5.10 Implement `src/molecules/ErrandMolecule.ts`
    - `create(userId, data)` — validate user active, get pricing rule, calculate tarifa via atoms, insert errand
    - `accept(errandId, riderId)` — validate rider available, errand in solicitado, transition state
    - `markPickedUp(errandId, riderId)` — validate state aceptado→recogido
    - `markDelivered(errandId, riderId)` — validate state recogido→entregado, set rider available
    - `cancel(errandId, actorId, role, reason?)` — validate cancellation rules by role/state
    - `listAvailable()`, `listByUser(userId, filters, page)`, `listByRider(riderId, filters, page)`
    - _Requirements: 9.1–9.10, 10.1–10.6, 11.1–11.6, 12.1–12.6, 13.1–13.6_

  - [x] 5.11 Implement `src/molecules/NotificationMolecule.ts`
    - `sendErrandStatusChange(errandId, newStatus, reason?)` — queue email notification
    - `processQueue()` — send pending, retry up to 3 times with 30s intervals
    - Email content varies by state change (accepted, picked up, delivered, cancelled)
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

  - [x] 5.12 Implement `src/molecules/MetricsMolecule.ts`
    - `getErrandsByStatus(startDate, endDate)` — count by status in period
    - `getCommissionTotal(startDate, endDate)` — sum comision_plataforma for delivered errands
    - `getMotorcyclesByStatus()` — count by motorcycle status
    - `getContractsByStatus()` — count by contract status
    - `getRentalPaymentsTotal(startDate, endDate)` — sum payments in period
    - `listErrands(filters, page)` — admin errand list with multiple filters (max 50/page)
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_

  - [x]\* 5.13 Write property test for pricing rule uniqueness (fast-check)
    - **Property 9: Invariante de unicidad de regla de tarifa activa**
    - **Validates: Requirements 8.3, 8.4**
    - File: `tests/properties/pricingRule.property.test.ts`

  - [x]\* 5.14 Write property test for partial update (fast-check)
    - **Property 10: Actualización parcial preserva campos no modificados**
    - **Validates: Requirements 6.5**
    - File: `tests/properties/partialUpdate.property.test.ts`

  - [x]\* 5.15 Write property test for auth rejection (fast-check)
    - **Property 8: Rechazo de autenticación no revela información**
    - **Validates: Requirements 1.2**
    - File: `tests/properties/validation.property.test.ts` (append to existing)

  - [ ]\* 5.16 Write unit tests for molecules
    - Test AuthMolecule: successful login, failed attempts, lockout, expired token
    - Test ErrandMolecule: full flow, role-based cancellation, state transition errors
    - Test ContractMolecule: valid creation, business rule rejections
    - Files: `tests/molecules/auth.test.ts`, `tests/molecules/errand.test.ts`, `tests/molecules/contract.test.ts`
    - _Requirements: 1.1–1.8, 5.1–5.9, 9.1–9.10, 11.1–11.6, 12.1–12.6_

- [x] 6. Checkpoint — Molecules complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Routes — Express handlers
  - [x] 7.1 Implement `src/routes/auth.routes.ts`
    - POST `/api/auth/login` — public, validate body with loginSchema, call AuthMolecule.login
    - _Requirements: 1.1, 1.2, 1.7, 1.8_

  - [x] 7.2 Implement `src/routes/user.routes.ts`
    - POST `/api/users/register` — public, validate body with createUserSchema, call UserMolecule.register
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 7.3 Implement `src/routes/rider.routes.ts`
    - POST `/api/riders/register` — public, validate body with createRiderSchema, call RiderMolecule.register
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 7.4 Implement `src/routes/motorcycle.routes.ts`
    - GET `/api/motorcycles` — admin, list with filters/pagination
    - POST `/api/motorcycles` — admin, validate with createMotorcycleSchema, create
    - PUT `/api/motorcycles/:id` — admin, partial update
    - PATCH `/api/motorcycles/:id/status` — admin, change status
    - _Requirements: 4.1–4.10_

  - [x] 7.5 Implement `src/routes/contract.routes.ts`
    - GET `/api/contracts` — admin, list with filters
    - POST `/api/contracts` — admin, validate with createContractSchema, create
    - PATCH `/api/contracts/:id/cancel` — admin, cancel contract
    - PATCH `/api/contracts/:id/renew` — admin, renew contract
    - _Requirements: 5.1–5.9_

  - [x] 7.6 Implement `src/routes/cosigner.routes.ts`
    - GET `/api/riders/:riderId/cosigners` — admin, list cosigners
    - POST `/api/riders/:riderId/cosigners` — admin, validate with createCosignerSchema, create
    - PUT `/api/cosigners/:id` — admin, update cosigner
    - _Requirements: 6.1–6.6_

  - [x] 7.7 Implement `src/routes/payment.routes.ts`
    - GET `/api/contracts/:contractId/payments` — admin, list payments
    - POST `/api/contracts/:contractId/payments` — admin, validate with createPaymentSchema, create
    - _Requirements: 7.1–7.5_

  - [x] 7.8 Implement `src/routes/pricing.routes.ts`
    - GET `/api/pricing-rules` — admin, list all rules
    - POST `/api/pricing-rules` — admin, validate with createPricingRuleSchema, create
    - PATCH `/api/pricing-rules/:id/deactivate` — admin, deactivate rule
    - _Requirements: 8.1–8.5_

  - [x] 7.9 Implement `src/routes/errand.routes.ts`
    - POST `/api/errands` — user, validate with createErrandSchema, create errand
    - GET `/api/errands/available` — rider, list available errands
    - GET `/api/errands/my` — user|rider, list own errands with filters/pagination
    - PATCH `/api/errands/:id/accept` — rider, accept errand
    - PATCH `/api/errands/:id/pickup` — rider, mark picked up
    - PATCH `/api/errands/:id/deliver` — rider, mark delivered
    - PATCH `/api/errands/:id/cancel` — user|rider, cancel errand
    - _Requirements: 9.1–9.10, 10.1–10.6, 11.1–11.6, 12.1–12.6, 13.1–13.6_

  - [x] 7.10 Implement `src/routes/metrics.routes.ts`
    - GET `/api/admin/metrics` — admin, return aggregated metrics for period
    - GET `/api/admin/errands` — admin, filtered/paginated errand list
    - _Requirements: 15.1–15.7_

- [x] 8. App wiring and server startup
  - [x] 8.1 Implement `src/app.ts`
    - Create Express app, configure JSON body parser, CORS
    - Mount all route modules under `/api/`
    - Register global error handler middleware
    - Export configured app (no listen — that's in index.ts)
    - _Requirements: All (application assembly)_

  - [x] 8.2 Implement `src/index.ts`
    - Load env vars, initialize database, run migrations
    - Instantiate all molecules with db and logger dependencies
    - Register scheduler tasks: contract expiry check (hourly), notification queue processing (every 10s)
    - Start Express server on configured PORT
    - Graceful shutdown: close database, shutdown scheduler on SIGTERM/SIGINT
    - _Requirements: 5.8, 14.7 (scheduler), All (server lifecycle)_

- [x] 9. Checkpoint — Backend API complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Integration tests
  - [ ]\* 10.1 Write integration tests for authentication flow
    - Register user → login → access protected resource → expired token rejection
    - Failed login attempts → account lockout → unlock after 15 min
    - File: `tests/integration/auth.integration.test.ts`
    - _Requirements: 1.1–1.8, 2.1–2.5_

  - [ ]\* 10.2 Write integration tests for errand lifecycle
    - User creates errand → rider accepts → marks pickup → marks delivery
    - Cancellation scenarios by user and rider at different states
    - Notification queue populated on state changes
    - File: `tests/integration/errand.integration.test.ts`
    - _Requirements: 9.1–9.10, 11.1–11.6, 12.1–12.6, 14.1–14.5_

  - [ ]\* 10.3 Write integration tests for contract lifecycle
    - Register cosigner → create contract → register payments → expire contract
    - Business rule validation (no cosigner, motorcycle occupied, rider has contract)
    - File: `tests/integration/contract.integration.test.ts`
    - _Requirements: 5.1–5.9, 6.1–6.4, 7.1–7.5_

  - [ ]\* 10.4 Write integration tests for admin metrics
    - Seed data, query metrics for period, validate aggregation
    - File: `tests/integration/metrics.integration.test.ts`
    - _Requirements: 15.1–15.7_

- [x] 11. Frontend scaffold (minimal)
  - [x] 11.1 Initialize frontend project
    - Create `frontend/package.json` with React, Vite, Tailwind dependencies
    - Create `frontend/vite.config.ts` with API proxy to backend
    - Create `frontend/tailwind.config.js`
    - Create `frontend/index.html` shell
    - Create `frontend/src/App.tsx` with router placeholder
    - Create `frontend/src/types/` with shared API types
    - _Requirements: 16.1–16.4_

- [x] 12. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The frontend scaffold (task 11) is minimal — full frontend implementation is a later phase
- All molecules receive `db` and `logger` via constructor injection (no global state)
- The project is standalone — NO imports from `@bio/core` or any external monorepo package

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.5"] },
    { "id": 2, "tasks": ["2.1", "2.2", "2.3", "2.4", "2.5"] },
    { "id": 3, "tasks": ["2.6", "2.7", "2.8", "2.9", "2.10"] },
    { "id": 4, "tasks": ["4.1", "4.2", "4.3", "4.4"] },
    { "id": 5, "tasks": ["4.5", "5.1"] },
    { "id": 6, "tasks": ["5.2", "5.3", "5.4", "5.5", "5.6"] },
    { "id": 7, "tasks": ["5.7", "5.8", "5.9", "5.10", "5.11", "5.12"] },
    { "id": 8, "tasks": ["5.13", "5.14", "5.15", "5.16"] },
    {
      "id": 9,
      "tasks": [
        "7.1",
        "7.2",
        "7.3",
        "7.4",
        "7.5",
        "7.6",
        "7.7",
        "7.8",
        "7.9",
        "7.10"
      ]
    },
    { "id": 10, "tasks": ["8.1"] },
    { "id": 11, "tasks": ["8.2"] },
    { "id": 12, "tasks": ["10.1", "10.2", "10.3", "10.4"] },
    { "id": 13, "tasks": ["11.1"] }
  ]
}
```

- [x] 13. Rider identity documents enhancement
  - [x] 13.1 Add forward-only SQLite migration `002_add_rider_identity_documents.sql` with nullable legacy-safe `document_type` and `document_number` columns and a partial unique index on their non-null pair.
  - [x] 13.2 Extend rider Zod validation and `RiderMolecule` registration/persistence with canonical Colombia document types, normalized number validation, and duplicate rejection.
  - [x] 13.3 Add required type/number controls to the Admin rider registration form and show document type or pending status only in admin list/selection views.
  - [x] 13.4 Add focused document schema tests and validate backend plus frontend builds.
  - _Requirements: 3.1, 3.2, 3.5, 3.6; Rider identity document enhancement_

- [ ] 14. Migración Mapbox y cotización vial COP
  - [x] 14.1 Añadir dependencias frontend fijadas para `react-map-gl`, `mapbox-gl` y `@mapbox/search-js-react`; documentar el token público restringido requerido.
  - [x] 14.2 Implementar `RoutePickerMapbox` con mapa único, pines de origen/destino, geocodificación restringida a Colombia, geolocalización explícita y polilínea GeoJSON del backend.
  - [x] 14.3 Definir/ajustar los DTOs de coordenadas y estimación, incluyendo validación de latitud, longitud, distancia, duración, proveedor y perfil.
  - [x] 14.4 Implementar `MapboxRoutingProvider` en `src/infrastructure/routing/` con `@mapbox/mapbox-sdk`, `driving-traffic`, timeout y errores normalizados; mantener el contrato `RoutingProvider`.
  - [x] 14.5 Crear `POST /api/errands/route-estimate`, protegido para usuarios, sin creación de mandado ni lógica de cobro.
  - [x] 14.6 Actualizar `ErrandMolecule.create` para que la cotización productiva use la distancia del proveedor y rechace fallos del proveedor en producción.
  - [x] 14.7 Crear migración SQLite forward-only para el snapshot de ruta y valores COP; definir y ejecutar estrategia de backfill segura para datos monetarios existentes.
  - [x] 14.8 Actualizar el átomo de tarifa para operar con enteros COP, incluyendo mínimo de distancia y redondeos deterministas.
  - [x] 14.9 Retirar Leaflet, OSRM y Nominatim únicamente después de validar el flujo Mapbox end-to-end en ambiente de prueba.
  - [ ] 14.10 Agregar pruebas unitarias con proveedor de rutas falso, pruebas de endpoint de estimación, pruebas de error/timeout y pruebas de que el backend no confía en tarifas del cliente.
  - [ ] 14.11 Definir el puerto `PaymentGateway` y DTOs de intención de pago COP, sin integrar todavía Wompi o Mercado Pago.
  - _Requirements: 19.1–19.7, 20.1–20.7, 21.1–21.5, 22.1–22.4_
