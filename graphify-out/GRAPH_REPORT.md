# Graph Report - .  (2026-08-04)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 386 nodes · 978 edges · 16 communities (14 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- App.tsx
- ILogger
- app.ts
- .info
- src/index.ts
- stateMachines.ts
- types/api.ts
- MoleculeContainer
- NotificationMolecule.ts
- AuthMolecule
- api.types.ts
- MetricsMolecule
- PinoLoggerAdapter
- useAuth.ts
- tarifa.ts

## God Nodes (most connected - your core abstractions)
1. `ILogger` - 36 edges
2. `useAuth()` - 30 edges
3. `IMolecule` - 25 edges
4. `validate()` - 20 edges
5. `roleGuard()` - 16 edges
6. `ErrandMolecule` - 16 edges
7. `authMiddleware()` - 15 edges
8. `AuthMolecule` - 15 edges
9. `createErrandRoutes()` - 15 edges
10. `createApp()` - 14 edges

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

## Communities (16 total, 2 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.07
Nodes (45): App(), GuestRoute(), ProtectedRoute(), Footer(), TopNav(), Button(), ButtonProps, Caption() (+37 more)

### Community 1 - "ILogger"
Cohesion: 0.05
Nodes (40): hashPassword(), isValidPassword(), verifyPassword(), ContractState, ILogger, AppError, errorHandler(), formatZodError() (+32 more)

### Community 2 - "app.ts"
Cohesion: 0.09
Nodes (40): createApp(), CreateContractInput, createContractSchema, CreateCosignerInput, createCosignerSchema, CreateErrandInput, createErrandSchema, CreateMotorcycleInput (+32 more)

### Community 3 - ".info"
Cohesion: 0.14
Nodes (8): haversineDistance(), toRadians(), isValidContractTransition(), isValidErrandTransition(), ContractMolecule, ErrandMolecule, PaginatedResult, createErrandRoutes()

### Community 4 - "src/index.ts"
Cohesion: 0.15
Nodes (12): __dirname, __filename, logger, main(), closeDatabase(), createDatabase(), getDatabase(), log (+4 more)

### Community 5 - "stateMachines.ts"
Cohesion: 0.16
Nodes (11): contractTransitions, errandTransitions, getValidMotorcycleTransitions(), isValidMotorcycleTransition(), MotorcycleState, motorcycleTransitions, CreateMotorcycleInput, Motorcycle (+3 more)

### Community 6 - "types/api.ts"
Cohesion: 0.10
Nodes (19): AdminMetrics, ApiError, ContractState, Cosigner, Errand, ErrandState, ErrandType, JwtPayload (+11 more)

### Community 7 - "MoleculeContainer"
Cohesion: 0.13
Nodes (4): MoleculeContainer, CosignerMolecule, PricingMolecule, UserMolecule

### Community 8 - "NotificationMolecule.ts"
Cohesion: 0.21
Nodes (5): ErrandState, Errand, ErrandFilters, Notification, NotificationMolecule

### Community 9 - "AuthMolecule"
Cohesion: 0.25
Nodes (3): Request, AuthMolecule, JwtPayload

### Community 10 - "api.types.ts"
Cohesion: 0.22
Nodes (8): ApiError, ContractStatus, ErrandStatus, ErrandType, MotorcycleStatus, PaginatedResult, PaymentMethod, Role

### Community 13 - "useAuth.ts"
Cohesion: 0.33
Nodes (5): AuthContext, AuthContextType, AuthProvider(), AuthUser, decodeToken()

### Community 14 - "tarifa.ts"
Cohesion: 0.60
Nodes (4): calculateFare(), PricingInput, PricingResult, roundHalfUp()

## Knowledge Gaps
- **102 isolated node(s):** `ButtonProps`, `CaptionProps`, `CardProps`, `InputProps`, `RegisterData` (+97 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ILogger` connect `ILogger` to `app.ts`, `.info`, `src/index.ts`, `stateMachines.ts`, `MoleculeContainer`, `NotificationMolecule.ts`, `AuthMolecule`, `MetricsMolecule`, `PinoLoggerAdapter`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Why does `Scheduler` connect `src/index.ts` to `ILogger`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `IMolecule` connect `ILogger` to `app.ts`, `.info`, `stateMachines.ts`, `MoleculeContainer`, `NotificationMolecule.ts`, `AuthMolecule`, `MetricsMolecule`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `ButtonProps`, `CaptionProps`, `CardProps` to the rest of the system?**
  _102 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06630211893369788 - nodes in this community are weakly interconnected._
- **Should `ILogger` be split into smaller, more focused modules?**
  _Cohesion score 0.0539906103286385 - nodes in this community are weakly interconnected._
- **Should `app.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09096045197740113 - nodes in this community are weakly interconnected._