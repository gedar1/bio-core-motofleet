# Plataforma de Renta de Motos + Mandados — Requerimientos

## Visión

Plataforma que combina la administración de renta de motos con un marketplace de mandados (transporte de objetos, compras, trámites), donde los motociclistas son los ejecutores y la plataforma cobra comisiones.

---

## Actores del sistema

| Actor                    | Descripción                                                                   |
| ------------------------ | ----------------------------------------------------------------------------- |
| **Admin**                | Empresa. Gestiona motos, contratos, tarifas, comisiones, aprueba afiliaciones |
| **Propietario afiliado** | Dueño de moto que la pone a rentar a través de la plataforma                  |
| **Motociclista**         | Renta moto (de empresa o afiliado) o tiene propia. Ejecuta mandados           |
| **Usuario**              | Persona registrada que solicita mandados                                      |

---

## Módulos funcionales

### 1. Gestión de motos

- Registro de motos propias (placa, marca, modelo, año, SOAT, tecnicomecánica)
- Registro de motos afiliadas (mismos datos + datos del propietario)
- Estado de moto: disponible, rentada, en mantenimiento, retirada
- GPS vinculado a cada moto (ubicación en tiempo real)
- Historial de asignaciones

### 2. Contratos de renta

- Contrato mensual (posibilidad de otros planes a futuro)
- Datos del arrendatario: nombre, dirección, teléfono, licencia, seguro, fianza, contacto de emergencia
- Datos del codeudor: nombre, dirección, teléfono, relación
- Estados: activo, vencido, renovado, cancelado
- Recordatorios de vencimiento y pago

### 3. Afiliación de motos

- Propietario registra moto para que la empresa la ponga a rentar
- La empresa cobra comisión por la gestión
- Contrato de afiliación entre propietario y empresa
- Reportes de ingresos para el propietario

### 4. Mandados

- **Tipos:** transporte de objetos, compras, trámites (NO personas)
- **Flujo:** solicitado → aceptado → en curso → completado / cancelado
- **Tarifa:** definida por la plataforma (no por el motociclista)
- **Asignación:** marketplace — el motociclista decide si toma el mandado
- **Tracking:** GPS en tiempo real durante la ejecución
- **Comisión:** la plataforma retiene % de cada mandado
- **Datos del mandado:** origen, destino, descripción, tipo, tarifa, motociclista asignado, timestamps

### 5. Usuarios (solicitantes)

- Registro con datos básicos (nombre, teléfono, email, dirección)
- Historial de mandados
- Calificación de motociclistas (futuro)
- Canales de acceso: web, app móvil, WhatsApp, Instagram, Facebook

### 6. Motociclistas

- Registro: datos personales + licencia + moto asignada o propia
- Ver mandados disponibles en su zona
- Aceptar/rechazar mandados
- Historial de mandados ejecutados
- Balance de ganancias (tarifa - comisión)

### 7. Pagos

- Efectivo
- Transferencia bancaria
- Pasarelas digitales (Nequi, Daviplata, PSE — a integrar)
- Registro de pagos de renta (mensualidades)
- Registro de pagos por mandados
- Liquidación de comisiones

### 8. Canales (omnicanalidad)

- Web (responsive)
- App móvil (React Native / Flutter)
- WhatsApp Business API
- Instagram DM
- Facebook Messenger

### 9. GPS y tracking

- Ubicación en tiempo real de motos/motociclistas
- Mapa para el usuario durante un mandado activo
- Mapa para admin con vista de toda la flota
- Historial de recorridos

### 10. Administración

- Dashboard admin: métricas, motos, contratos, mandados, ingresos
- Configuración de tarifas y comisiones
- Gestión de usuarios y motociclistas
- Reportes financieros

---

## Modelo de ingresos

| Fuente                  | Detalle                             |
| ----------------------- | ----------------------------------- |
| Renta de motos propias  | Mensualidad directa al motociclista |
| Comisión por afiliación | % sobre renta de motos de terceros  |
| Comisión por mandado    | % sobre cada mandado completado     |

---

## Restricciones y decisiones

- MVP para una ciudad
- Sin transporte de personas
- Tarifa centralizada (la define la plataforma)
- Pagos fuera de plataforma inicialmente (efectivo/transferencia)
- Sin mantenimiento de motos en MVP

---

## Fases propuestas

### Fase 1 — MVP (detallado)

**Objetivo:** Validar que la gente pide mandados y los motociclistas los toman.

**Admin:**

- CRUD motos (registro, estado: disponible/rentada/mantenimiento/retirada)
- CRUD contratos de renta (datos arrendatario + codeudor)
- Ver mandados y métricas básicas
- Configurar tarifas y comisiones

**Motociclista:**

- Registro con documentos (licencia, seguro, fianza)
- Ver mandados disponibles
- Aceptar/rechazar mandado
- Marcar estados manualmente: aceptado → recogido → entregado

**Usuario:**

- Registro básico (nombre, teléfono, email, dirección)
- Crear mandado (tipo, origen, destino, descripción)
- Ver estado del mandado (estados, sin mapa en tiempo real)
- Historial de mandados

**Sistema:**

- Cálculo de tarifa automático (por tipo + distancia estimada)
- Comisión automática sobre cada mandado
- Notificación básica (email o SMS) al cambiar estado del mandado
- Auth con roles (admin / motociclista / usuario)
- Web responsive (un solo canal)
- Pagos manuales (efectivo / transferencia, registro en sistema)

**Excluido del MVP:**

- ❌ GPS/tracking en tiempo real (muy complejo, no valida el negocio)
- ❌ Omnicanalidad (WhatsApp, Instagram, Facebook)
- ❌ Pasarelas de pago integradas
- ❌ Afiliación de motos de terceros
- ❌ App móvil nativa
- ❌ Calificaciones
- ❌ Mantenimiento de motos

### Fase 2 — Tracking + WhatsApp + Afiliación

- GPS en tiempo real (app del motociclista enviando ubicación)
- Mapa para el usuario durante mandado activo
- Mapa admin con vista de flota
- WhatsApp Business API como canal de entrada de mandados
- Afiliación de motos de terceros (propietario afiliado + comisión)

### Fase 3 — Omnicanalidad + Pagos + Móvil

- Instagram DM, Facebook Messenger como canales
- Pasarelas de pago (Nequi, Daviplata, PSE)
- App móvil nativa (React Native / Flutter)
- Calificaciones de motociclistas
- Historial de recorridos GPS

---

## Relación con bio-core

| Capacidad bio-core    | Uso en este proyecto              |
| --------------------- | --------------------------------- |
| Multi-tenant          | Cada empresa de renta = tenant    |
| Células memory        | CRUD de todas las entidades       |
| Células communication | Notificaciones, omnicanalidad     |
| Células sensory/http  | Integración con APIs de pago, GPS |
| Scheduler             | Recordatorios, vencimientos       |
| Dashboard React       | Panel admin                       |
| MCP Server            | Operaciones asistidas por IA      |

Se crearía un vertical `@bio/motofleet` (nombre tentativo) con moléculas específicas: rentas, mandados, tarificación, afiliación.

---

## Siguiente paso

Definir modelo de dominio (entidades + relaciones) y crear spec formal para Fase 1 (MVP).
