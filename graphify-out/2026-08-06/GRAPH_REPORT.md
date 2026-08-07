# Graph Report - bio-core-motofleet  (2026-08-06)

## Corpus Check
- 114 files · ~68,285 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 771 nodes · 1540 edges · 36 communities (32 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8ec22285`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.tsx
- src/index.ts
- app.ts
- .info
- Scheduler
- 2. Pruebas de API (Backend)
- types/api.ts
- ILogger
- ErrandMolecule.ts
- RiderMolecule.ts
- api.types.ts
- MetricsMolecule.ts
- PinoLoggerAdapter
- Requirements
- DESIGN-mistral.ai.md
- Correctness Properties
- DESIGN-bugatti.md
- schemas.ts
- What You Must Do When Invoked
- Módulos funcionales
- Entidades principales
- Atoms (src/atoms/ — funciones puras)
- IMolecule
- MoleculeContainer
- PricingMolecule
- graphify reference: extra exports and benchmark
- graphify reference: query, path, explain
- Implementation Plan: MotoFleet MVP
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- extraction-spec.md

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 42 edges
2. `ILogger` - 37 edges
3. `IMolecule` - 25 edges
4. `Button()` - 20 edges
5. `translateStatus()` - 20 edges
6. `validate()` - 20 edges
7. `Requirements` - 20 edges
8. `es` - 19 edges
9. `t` - 18 edges
10. `roleGuard()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `createApp()` --indirect_call--> `errorHandler()`  [INFERRED]
  src/app.ts → src/middleware/errorHandler.middleware.ts
- `createErrandRoutes()` --indirect_call--> `authMiddleware()`  [INFERRED]
  src/routes/errand.routes.ts → src/middleware/auth.middleware.ts
- `createMetricsRoutes()` --indirect_call--> `authMiddleware()`  [INFERRED]
  src/routes/metrics.routes.ts → src/middleware/auth.middleware.ts
- `ProtectedRoute()` --calls--> `useAuth()`  [EXTRACTED]
  frontend/src/App.tsx → frontend/src/context/AuthContext.tsx
- `GuestRoute()` --calls--> `useAuth()`  [EXTRACTED]
  frontend/src/App.tsx → frontend/src/context/AuthContext.tsx

## Import Cycles
- None detected.

## Communities (36 total, 4 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.06
Nodes (68): App(), GuestRoute(), ProtectedRoute(), Footer(), TopNav(), Button(), ButtonProps, Caption() (+60 more)

### Community 1 - "src/index.ts"
Cohesion: 0.13
Nodes (17): ContractState, __dirname, __filename, logger, createLogger(), AppError, errorHandler(), formatZodError() (+9 more)

### Community 2 - "app.ts"
Cohesion: 0.33
Nodes (13): createApp(), authMiddleware(), roleGuard(), formatZodError(), validate(), createAuthRoutes(), createContractRoutes(), createCosignerRoutes() (+5 more)

### Community 3 - ".info"
Cohesion: 0.07
Nodes (23): haversineDistance(), toRadians(), contractTransitions, errandTransitions, getValidMotorcycleTransitions(), isValidContractTransition(), isValidErrandTransition(), isValidMotorcycleTransition() (+15 more)

### Community 4 - "Scheduler"
Cohesion: 0.11
Nodes (13): main(), closeDatabase(), createDatabase(), getDatabase(), log, runMigrations(), ScheduledTask, Scheduler (+5 more)

### Community 5 - "2. Pruebas de API (Backend)"
Cohesion: 0.04
Nodes (44): 1. Arrancar el Backend, 2.10 Crear Regla de Tarifa (Admin), 2.11 Crear Mandado (User), 2.12 Ver Mandados Disponibles (Rider), 2.13 Aceptar Mandado (Rider), 2.14 Flujo Completo del Mandado (Rider), 2.15 Acceso Denegado (User intenta acceder a admin), 2.16 Métricas Admin (+36 more)

### Community 6 - "types/api.ts"
Cohesion: 0.10
Nodes (19): AdminMetrics, ApiError, ContractState, Cosigner, Errand, ErrandState, ErrandType, JwtPayload (+11 more)

### Community 7 - "ILogger"
Cohesion: 0.13
Nodes (5): ILogger, Cosigner, CosignerMolecule, CreateCosignerInput, UpdateCosignerInput

### Community 8 - "ErrandMolecule.ts"
Cohesion: 0.17
Nodes (12): ErrandState, Express, jwt, logger, Request, CreateErrandInput, Errand, ErrandFilters (+4 more)

### Community 9 - "RiderMolecule.ts"
Cohesion: 0.20
Nodes (5): hashPassword(), isValidPassword(), verifyPassword(), AuthMolecule, jwt

### Community 10 - "api.types.ts"
Cohesion: 0.22
Nodes (8): ApiError, ContractStatus, ErrandStatus, ErrandType, MotorcycleStatus, PaginatedResult, PaymentMethod, Role

### Community 11 - "MetricsMolecule.ts"
Cohesion: 0.18
Nodes (10): AdminErrand, AdminErrandFilters, ContractsByStatus, ErrandsByStatus, listAllRiders(), listMotorcyclesForSelection(), listRidersForSelection(), MetricsMolecule (+2 more)

### Community 13 - "Requirements"
Cohesion: 0.05
Nodes (42): Acceptance Criteria, Acceptance Criteria, Acceptance Criteria, Acceptance Criteria, Acceptance Criteria, Acceptance Criteria, Acceptance Criteria, Acceptance Criteria (+34 more)

### Community 14 - "DESIGN-mistral.ai.md"
Cohesion: 0.05
Nodes (40): Badges & Status, Border Radius Scale, Brand & Accent, Breakpoints, Buttons, Cards & Containers, Code, Collapsing Strategy (+32 more)

### Community 16 - "Correctness Properties"
Cohesion: 0.05
Nodes (39): Architecture, Categorías de errores, Cobertura esperada, Correctness Properties, Data Models, Decisiones técnicas clave, Diagrama de alto nivel, Documento de Diseño — MotoFleet MVP (+31 more)

### Community 17 - "DESIGN-bugatti.md"
Cohesion: 0.05
Nodes (37): Border Radius Scale, Brand & Accent, Breakpoints, Buttons, Cards & Containers, Collapsing Strategy, Colors, Components (+29 more)

### Community 18 - "schemas.ts"
Cohesion: 0.07
Nodes (29): CreateContractInput, createContractSchema, CreateCosignerInput, createCosignerSchema, CreateErrandInput, createErrandSchema, CreateMotorcycleInput, createMotorcycleSchema (+21 more)

### Community 19 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 20 - "Módulos funcionales"
Cohesion: 0.09
Nodes (22): 10. Administración, 1. Gestión de motos, 2. Contratos de renta, 3. Afiliación de motos, 4. Mandados, 5. Usuarios (solicitantes), 6. Motociclistas, 7. Pagos (+14 more)

### Community 21 - "Entidades principales"
Cohesion: 0.10
Nodes (19): Admin, Codeudor (Cosigner), Contrato de Renta (RentalContract), Diagrama simplificado, Entidades principales, Errand.estado, Estados y transiciones, Mandado (Errand) (+11 more)

### Community 22 - "Atoms (src/atoms/ — funciones puras)"
Cohesion: 0.10
Nodes (20): API Endpoints, Atoms (src/atoms/ — funciones puras), `auth.middleware.ts`, `AuthMolecule`, Components and Interfaces, `ContractMolecule`, `ErrandMolecule`, `errorHandler.middleware.ts` (+12 more)

### Community 23 - "IMolecule"
Cohesion: 0.16
Nodes (7): IMolecule, CreateUserInput, User, UserMolecule, MIGRATIONS_PATH, mockLogger, TEST_DB_PATH

### Community 24 - "MoleculeContainer"
Cohesion: 0.17
Nodes (4): MoleculeContainer, NotificationMolecule, PaymentMolecule, RiderMolecule

### Community 25 - "PricingMolecule"
Cohesion: 0.18
Nodes (4): PricingMolecule, CreateOp, DeactivateOp, Op

### Community 26 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 27 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 28 - "Implementation Plan: MotoFleet MVP"
Cohesion: 0.33
Nodes (5): Implementation Plan: MotoFleet MVP, Notes, Overview, Task Dependency Graph, Tasks

### Community 29 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 30 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 31 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

## Knowledge Gaps
- **354 isolated node(s):** `ButtonProps`, `CaptionProps`, `CardProps`, `InputProps`, `RegisterData` (+349 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ILogger` connect `ILogger` to `src/index.ts`, `.info`, `Scheduler`, `ErrandMolecule.ts`, `RiderMolecule.ts`, `MetricsMolecule.ts`, `PinoLoggerAdapter`, `IMolecule`, `MoleculeContainer`, `PricingMolecule`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `Scheduler` connect `Scheduler` to `src/index.ts`, `ILogger`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `IMolecule` connect `IMolecule` to `src/index.ts`, `.info`, `ILogger`, `ErrandMolecule.ts`, `RiderMolecule.ts`, `MetricsMolecule.ts`, `MoleculeContainer`, `PricingMolecule`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `ButtonProps`, `CaptionProps`, `CardProps` to the rest of the system?**
  _354 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.060719640179910044 - nodes in this community are weakly interconnected._
- **Should `src/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Should `.info` be split into smaller, more focused modules?**
  _Cohesion score 0.06721215663354763 - nodes in this community are weakly interconnected._