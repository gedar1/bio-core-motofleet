# MotoFleet — Modelo de Dominio (MVP)

## Entidades principales

### Usuario (User)

Persona que solicita mandados.

| Campo         | Tipo     | Requerido | Notas                        |
| ------------- | -------- | --------- | ---------------------------- |
| id            | UUID     | ✅        | PK                           |
| nombre        | string   | ✅        |                              |
| telefono      | string   | ✅        | Único                        |
| email         | string   | ✅        | Único                        |
| direccion     | string   | ✅        | Dirección principal          |
| password_hash | string   | ✅        |                              |
| estado        | enum     | ✅        | activo, suspendido, inactivo |
| created_at    | datetime | ✅        |                              |
| updated_at    | datetime | ✅        |                              |

---

### Motociclista (Rider)

Persona que renta moto y ejecuta mandados.

| Campo                        | Tipo     | Requerido | Notas                            |
| ---------------------------- | -------- | --------- | -------------------------------- |
| id                           | UUID     | ✅        | PK                               |
| nombre                       | string   | ✅        |                                  |
| telefono                     | string   | ✅        | Único                            |
| email                        | string   | ✅        | Único                            |
| direccion                    | string   | ✅        |                                  |
| password_hash                | string   | ✅        |                                  |
| licencia_numero              | string   | ✅        | Número de licencia de conducción |
| licencia_vencimiento         | date     | ✅        |                                  |
| seguro_numero                | string   | ✅        | Póliza de seguro                 |
| seguro_vencimiento           | date     | ✅        |                                  |
| fianza                       | decimal  | ✅        | Monto de fianza pagado           |
| contacto_emergencia_nombre   | string   | ✅        |                                  |
| contacto_emergencia_telefono | string   | ✅        |                                  |
| estado                       | enum     | ✅        | activo, suspendido, inactivo     |
| disponible                   | boolean  | ✅        | Si está disponible para mandados |
| created_at                   | datetime | ✅        |                                  |
| updated_at                   | datetime | ✅        |                                  |

---

### Codeudor (Cosigner)

Garante del motociclista en el contrato de renta.

| Campo               | Tipo     | Requerido | Notas                                     |
| ------------------- | -------- | --------- | ----------------------------------------- |
| id                  | UUID     | ✅        | PK                                        |
| rider_id            | UUID     | ✅        | FK → Rider                                |
| nombre              | string   | ✅        |                                           |
| direccion           | string   | ✅        |                                           |
| telefono            | string   | ✅        |                                           |
| relacion            | string   | ✅        | Parentesco o relación con el motociclista |
| documento_identidad | string   | ✅        |                                           |
| created_at          | datetime | ✅        |                                           |

---

### Moto (Motorcycle)

Vehículo propiedad de la empresa.

| Campo                     | Tipo     | Requerido | Notas                                        |
| ------------------------- | -------- | --------- | -------------------------------------------- |
| id                        | UUID     | ✅        | PK                                           |
| placa                     | string   | ✅        | Único                                        |
| marca                     | string   | ✅        |                                              |
| modelo                    | string   | ✅        |                                              |
| año                       | integer  | ✅        |                                              |
| color                     | string   | ✅        |                                              |
| cilindraje                | integer  | ✅        | cc                                           |
| soat_vencimiento          | date     | ✅        |                                              |
| tecnomecanica_vencimiento | date     | ✅        |                                              |
| estado                    | enum     | ✅        | disponible, rentada, mantenimiento, retirada |
| created_at                | datetime | ✅        |                                              |
| updated_at                | datetime | ✅        |                                              |

---

### Contrato de Renta (RentalContract)

Relación formal entre empresa y motociclista por una moto.

| Campo         | Tipo     | Requerido | Notas                                |
| ------------- | -------- | --------- | ------------------------------------ |
| id            | UUID     | ✅        | PK                                   |
| rider_id      | UUID     | ✅        | FK → Rider                           |
| motorcycle_id | UUID     | ✅        | FK → Motorcycle                      |
| fecha_inicio  | date     | ✅        |                                      |
| fecha_fin     | date     | ✅        |                                      |
| monto_mensual | decimal  | ✅        | Valor de la renta mensual            |
| dia_pago      | integer  | ✅        | Día del mes para cobro (1-31)        |
| estado        | enum     | ✅        | activo, vencido, renovado, cancelado |
| notas         | text     | ❌        | Observaciones                        |
| created_at    | datetime | ✅        |                                      |
| updated_at    | datetime | ✅        |                                      |

---

### Pago de Renta (RentalPayment)

Registro de cada pago mensual.

| Campo       | Tipo     | Requerido | Notas                         |
| ----------- | -------- | --------- | ----------------------------- |
| id          | UUID     | ✅        | PK                            |
| contract_id | UUID     | ✅        | FK → RentalContract           |
| monto       | decimal  | ✅        |                               |
| fecha_pago  | date     | ✅        |                               |
| metodo_pago | enum     | ✅        | efectivo, transferencia       |
| periodo     | string   | ✅        | "2026-08" (año-mes que cubre) |
| notas       | text     | ❌        |                               |
| created_at  | datetime | ✅        |                               |

---

### Mandado (Errand)

Solicitud de servicio creada por un usuario.

| Campo               | Tipo     | Requerido | Notas                                                |
| ------------------- | -------- | --------- | ---------------------------------------------------- |
| id                  | UUID     | ✅        | PK                                                   |
| user_id             | UUID     | ✅        | FK → User (quien solicita)                           |
| rider_id            | UUID     | ❌        | FK → Rider (quien lo toma, null hasta aceptar)       |
| tipo                | enum     | ✅        | transporte_objetos, compra, tramite                  |
| descripcion         | text     | ✅        | Qué necesita el usuario                              |
| origen_direccion    | string   | ✅        | Punto A                                              |
| destino_direccion   | string   | ✅        | Punto B                                              |
| tarifa              | decimal  | ✅        | Calculada por la plataforma                          |
| comision_plataforma | decimal  | ✅        | % retenido                                           |
| ganancia_rider      | decimal  | ✅        | tarifa - comisión                                    |
| estado              | enum     | ✅        | solicitado, aceptado, recogido, entregado, cancelado |
| metodo_pago         | enum     | ✅        | efectivo, transferencia                              |
| motivo_cancelacion  | text     | ❌        | Si fue cancelado                                     |
| solicitado_at       | datetime | ✅        | Cuando se creó                                       |
| aceptado_at         | datetime | ❌        | Cuando el rider lo tomó                              |
| recogido_at         | datetime | ❌        | Cuando recogió el objeto/compra                      |
| entregado_at        | datetime | ❌        | Cuando lo entregó                                    |
| cancelado_at        | datetime | ❌        |                                                      |
| created_at          | datetime | ✅        |                                                      |
| updated_at          | datetime | ✅        |                                                      |

---

### Tarifa (PricingRule)

Configuración de precios por tipo de mandado.

| Campo               | Tipo     | Requerido | Notas                                  |
| ------------------- | -------- | --------- | -------------------------------------- |
| id                  | UUID     | ✅        | PK                                     |
| tipo_mandado        | enum     | ✅        | transporte_objetos, compra, tramite    |
| tarifa_base         | decimal  | ✅        | Precio mínimo                          |
| tarifa_por_km       | decimal  | ✅        | Precio adicional por km estimado       |
| comision_porcentaje | decimal  | ✅        | % que retiene la plataforma (ej: 15.0) |
| activa              | boolean  | ✅        | Si esta regla está vigente             |
| created_at          | datetime | ✅        |                                        |
| updated_at          | datetime | ✅        |                                        |

---

### Admin

Usuario administrativo de la empresa.

| Campo         | Tipo     | Requerido | Notas                |
| ------------- | -------- | --------- | -------------------- |
| id            | UUID     | ✅        | PK                   |
| nombre        | string   | ✅        |                      |
| email         | string   | ✅        | Único                |
| password_hash | string   | ✅        |                      |
| rol           | enum     | ✅        | superadmin, operador |
| estado        | enum     | ✅        | activo, inactivo     |
| created_at    | datetime | ✅        |                      |

---

## Relaciones

```
Admin (gestiona todo)

Motorcycle 1 ←→ 0..1 RentalContract (activo)
RentalContract N ←→ 1 Rider
RentalContract 1 ←→ N RentalPayment

Rider 1 ←→ 0..N Cosigner (al menos 1 requerido)
Rider 1 ←→ N Errand (como ejecutor)

User 1 ←→ N Errand (como solicitante)

PricingRule → aplica a Errand (por tipo)
```

### Diagrama simplificado

```
┌─────────┐       ┌────────────────┐       ┌────────────┐
│  Admin  │       │  Motorcycle    │       │   Rider    │
└─────────┘       └───────┬────────┘       └─────┬──────┘
                          │ 1                     │ 1
                          ▼                       ▼
                  ┌───────────────┐       ┌────────────┐
                  │RentalContract │◄──────►│  Cosigner  │
                  └───────┬───────┘       └────────────┘
                          │ 1
                          ▼
                  ┌───────────────┐
                  │ RentalPayment │
                  └───────────────┘

┌──────────┐              ┌─────────┐
│   User   │──── N ──────►│ Errand  │◄──── N ────│ Rider │
└──────────┘  (solicita)  └────┬────┘  (ejecuta)
                               │
                               ▼
                       ┌──────────────┐
                       │ PricingRule  │ (determina tarifa)
                       └──────────────┘
```

---

## Estados y transiciones

### Motorcycle.estado

```
disponible → rentada (al crear contrato activo)
rentada → disponible (al cancelar/vencer contrato)
disponible → mantenimiento (admin la saca)
mantenimiento → disponible (admin la devuelve)
cualquiera → retirada (baja definitiva)
```

### RentalContract.estado

```
activo → vencido (fecha_fin pasó sin renovar)
activo → renovado (se extiende fecha_fin)
activo → cancelado (terminación anticipada)
vencido → renovado (pago tardío + acuerdo)
```

### Errand.estado

```
solicitado → aceptado (rider lo toma)
solicitado → cancelado (usuario cancela antes de que alguien lo tome)
aceptado → recogido (rider confirma que recogió)
aceptado → cancelado (rider o usuario cancela)
recogido → entregado (rider confirma entrega)
recogido → cancelado (problema durante ejecución)
```

---

## Reglas de negocio

1. Una moto solo puede tener **un contrato activo** a la vez.
2. Un rider puede tener **un solo contrato activo** (una moto a la vez).
3. Un rider debe tener **al menos un codeudor** para firmar contrato.
4. La tarifa del mandado se calcula al momento de creación y **no cambia** después.
5. El rider solo ve mandados si su estado es `activo` y `disponible = true`.
6. Un rider solo puede tener **un mandado en curso** a la vez (no puede aceptar otro hasta entregar/cancelar).
7. La comisión se calcula como: `tarifa × (comision_porcentaje / 100)`.
8. Los pagos de renta se registran manualmente (admin confirma recepción).

---

## Notas para implementación

- **Auth:** JWT con roles en el token (admin, rider, user). Tres tablas separadas permiten campos específicos por rol.
- **Base de datos:** SQLite para MVP (compatible con bio-core). Migrar a PostgreSQL si escala.
- **IDs:** UUID v4 para todas las entidades.
- **Timestamps:** UTC siempre, formatear en frontend según timezone del usuario.
- **Soft delete:** No en MVP. Si se necesita, agregar `deleted_at` después.
