# MotoFleet MVP — Guía de Prueba Manual

## Pre-requisitos

```bash
cd bio-core-motofleet
npm install        # si no lo has hecho
cp .env.example .env  # crear archivo de configuración local
```

## 1. Arrancar el Backend

```bash
npx tsx src/index.ts
```

Deberías ver:

```
INFO: Database connection opened
INFO: Migration executed (001_initial.sql)
INFO: MotoFleet MVP server running on port 3000
INFO: Tarea registrada (expire-contracts)
INFO: Tarea registrada (process-notifications)
```

## 2. Pruebas de API (Backend)

Abre otra terminal. Usa `node -e` o cualquier cliente HTTP (Postman, Insomnia, curl).

### 2.1 Registro de Usuario

```bash
node -e "
fetch('http://localhost:3000/api/users/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'German Arbelaez',
    phone: '3001234567',
    email: 'german@test.com',
    address: 'Calle 10 #20-30 Medellin',
    password: 'Test1234'
  })
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))
"
```

**Esperado:** Status 201, respuesta con id, name, phone, email, address, status='active' (sin password_hash).

### 2.2 Registro Duplicado (debe fallar)

```bash
node -e "
fetch('http://localhost:3000/api/users/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Otro User',
    phone: '3001234567',
    email: 'otro@test.com',
    address: 'Calle 20',
    password: 'Test1234'
  })
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))
"
```

**Esperado:** Status 409, `{ code: 'CONFLICT', message: 'Phone is already in use' }`

### 2.3 Login

```bash
node -e "
fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'german@test.com',
    password: 'Test1234'
  })
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))
"
```

**Esperado:** Status 200, `{ token: 'eyJ...', role: 'user' }`

Guarda el token para las siguientes pruebas:

```bash
set TOKEN=<pega_el_token_aqui>
```

### 2.4 Login con Credenciales Inválidas

```bash
node -e "
fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'noexiste@test.com',
    password: 'wrong'
  })
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))
"
```

**Esperado:** Status 401, mensaje genérico (no revela si email o password es incorrecto).

### 2.5 Registro de Motociclista

```bash
node -e "
fetch('http://localhost:3000/api/riders/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Carlos Rider',
    phone: '3109876543',
    email: 'carlos@rider.com',
    address: 'Carrera 50 #30-10',
    password: 'Rider1234',
    licenseNumber: 'LIC-12345',
    licenseExpiry: '2027-12-31',
    insuranceNumber: 'SEG-99999',
    insuranceExpiry: '2027-06-30',
    deposit: 500000,
    emergencyContactName: 'Maria Rider',
    emergencyContactPhone: '3201112233'
  })
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))
"
```

**Esperado:** Status 201, rider creado con status='active', available=false.

### 2.6 Crear Admin (seed manual en DB)

El admin no tiene endpoint de registro público. Crea uno directamente en la DB:

```bash
node -e "
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const { v4: uuid } = require('uuid');

async function seed() {
  const db = new Database('./data/motofleet.db');
  const hash = await bcrypt.hash('Admin1234', 10);
  db.prepare('INSERT INTO admins (id, name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?)').run(
    uuid(), 'Admin MotoFleet', 'admin@motofleet.com', hash, 'superadmin', 'active'
  );
  console.log('Admin created');
  db.close();
}
seed();
"
```

### 2.7 Login como Admin

```bash
node -e "
fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@motofleet.com',
    password: 'Admin1234'
  })
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))
"
```

**Esperado:** `{ token: '...', role: 'admin' }`. Guarda este token como ADMIN_TOKEN.

### 2.8 Registrar Motocicleta (Admin)

```bash
node -e "
const TOKEN = '<ADMIN_TOKEN>';
fetch('http://localhost:3000/api/motorcycles', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
  body: JSON.stringify({
    plate: 'ABC123',
    brand: 'Yamaha',
    model: 'FZ25',
    year: 2024,
    color: 'Negro',
    displacement: 250,
    soatExpiry: '2027-03-15',
    techInspectionExpiry: '2027-06-20'
  })
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))
"
```

**Esperado:** Status 201, moto creada con status='available'.

### 2.9 Listar Motocicletas (Admin)

```bash
node -e "
const TOKEN = '<ADMIN_TOKEN>';
fetch('http://localhost:3000/api/motorcycles', {
  headers: { 'Authorization': 'Bearer ' + TOKEN }
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))
"
```

### 2.10 Crear Regla de Tarifa (Admin)

```bash
node -e "
const TOKEN = '<ADMIN_TOKEN>';
fetch('http://localhost:3000/api/pricing-rules', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
  body: JSON.stringify({
    errandType: 'transporte_objetos',
    baseFare: 5000,
    perKmFare: 1500,
    commissionPercent: 15
  })
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))
"
```

### 2.11 Crear Mandado (User)

```bash
node -e "
const TOKEN = '<USER_TOKEN>';
fetch('http://localhost:3000/api/errands', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
  body: JSON.stringify({
    type: 'transporte_objetos',
    originAddress: 'Centro Comercial Santafe',
    originLat: 6.2518,
    originLng: -75.5636,
    destinationAddress: 'Parque Lleras',
    destinationLat: 6.2088,
    destinationLng: -75.5672,
    description: 'Llevar paquete de documentos importantes al destino',
    paymentMethod: 'efectivo'
  })
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))
"
```

**Esperado:** Status 201, mandado creado con tarifa calculada, status='requested'.

### 2.12 Ver Mandados Disponibles (Rider)

```bash
node -e "
const TOKEN = '<RIDER_TOKEN>';
fetch('http://localhost:3000/api/errands/available', {
  headers: { 'Authorization': 'Bearer ' + TOKEN }
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))
"
```

### 2.13 Aceptar Mandado (Rider)

```bash
node -e "
const TOKEN = '<RIDER_TOKEN>';
const ERRAND_ID = '<ID_DEL_MANDADO>';
fetch('http://localhost:3000/api/errands/' + ERRAND_ID + '/accept', {
  method: 'PATCH',
  headers: { 'Authorization': 'Bearer ' + TOKEN }
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))
"
```

### 2.14 Flujo Completo del Mandado (Rider)

```bash
# Marcar recogido
node -e "
const TOKEN = '<RIDER_TOKEN>';
const ERRAND_ID = '<ID>';
fetch('http://localhost:3000/api/errands/' + ERRAND_ID + '/pickup', {
  method: 'PATCH',
  headers: { 'Authorization': 'Bearer ' + TOKEN }
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))
"

# Marcar entregado
node -e "
const TOKEN = '<RIDER_TOKEN>';
const ERRAND_ID = '<ID>';
fetch('http://localhost:3000/api/errands/' + ERRAND_ID + '/deliver', {
  method: 'PATCH',
  headers: { 'Authorization': 'Bearer ' + TOKEN }
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))
"
```

### 2.15 Acceso Denegado (User intenta acceder a admin)

```bash
node -e "
const TOKEN = '<USER_TOKEN>';
fetch('http://localhost:3000/api/motorcycles', {
  headers: { 'Authorization': 'Bearer ' + TOKEN }
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))
"
```

**Esperado:** Status 403, `{ code: 'FORBIDDEN', message: 'Access denied' }`

### 2.16 Métricas Admin

```bash
node -e "
const TOKEN = '<ADMIN_TOKEN>';
fetch('http://localhost:3000/api/admin/metrics', {
  headers: { 'Authorization': 'Bearer ' + TOKEN }
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))
"
```

---

## 3. Pruebas Frontend

### 3.1 Instalar dependencias

```bash
cd frontend
npm install
```

### 3.2 Arrancar dev server

```bash
npm run dev
```

Deberías ver: `VITE v5.x.x ready in XXms → Local: http://localhost:5173/`

### 3.3 Verificar en browser

Abre http://localhost:5173 — deberías ver:

- Header "MotoFleet"
- Texto "MotoFleet MVP" y "Motorcycle fleet rental & errand marketplace"
- El proxy de Vite redirige `/api/*` al backend en localhost:3000

---

## 4. Verificar Tests

```bash
# Property tests (37 tests)
npx vitest --run tests/properties/

# TypeScript check
npx tsc --noEmit

# Build
npx tsc
```

---

## 5. Troubleshooting

| Problema                  | Solución                                                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `EADDRINUSE :3000`        | Matar proceso previo: `npx kill-port 3000` o `taskkill /F /PID <pid>`                                                       |
| bcrypt tarda mucho        | Normal la primera vez (~1-2s). Si se cuelga indefinidamente, verificar que `better-sqlite3` y `bcrypt` compilaron nativo OK |
| `Cannot find module`      | Verificar que `npm install` completó sin errores                                                                            |
| DB locked                 | Cerrar conexiones previas, borrar `data/motofleet.db` y reiniciar                                                           |
| Frontend no conecta a API | Verificar que backend está corriendo en :3000 antes de iniciar frontend                                                     |

---

## 6. Resetear DB (limpiar datos)

```bash
del data\motofleet.db
npx tsx src/index.ts    # se recrea automáticamente con las migraciones
```
