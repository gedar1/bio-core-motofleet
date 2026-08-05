# Requirements Document

## Introduction

MotoFleet MVP es una plataforma de renta de motocicletas combinada con un marketplace de mandados. La plataforma permite a una empresa administrar su flota de motocicletas, gestionar contratos de renta mensual con motociclistas, y ofrecer un marketplace donde usuarios solicitan mandados (transporte de objetos, compras, trámites) que los motociclistas ejecutan a cambio de una tarifa con comisión para la plataforma.

Este MVP valida la hipótesis central: que los usuarios solicitan mandados y los motociclistas los ejecutan a través de la plataforma, operando en una sola ciudad con pagos manuales y sin tracking en tiempo real.

## Glossary

- **Plataforma**: El sistema web MotoFleet MVP que orquesta la renta de motos y el marketplace de mandados.
- **Admin**: Usuario administrativo que gestiona la flota, contratos, tarifas y comisiones.
- **Motociclista**: Persona que renta una motocicleta de la empresa y ejecuta mandados a través de la Plataforma.
- **Usuario**: Persona registrada que solicita mandados a través de la Plataforma.
- **Codeudor**: Persona garante del Motociclista en un contrato de renta.
- **Motocicleta**: Vehículo propiedad de la empresa, registrado en la Plataforma con placa, marca, modelo, año y documentación.
- **Contrato_de_Renta**: Acuerdo formal entre la empresa y un Motociclista para el uso mensual de una Motocicleta.
- **Mandado**: Solicitud de servicio creada por un Usuario para transporte de objetos, compras o trámites.
- **Tarifa**: Monto calculado por la Plataforma para un Mandado, basado en tipo y distancia estimada.
- **Comisión**: Porcentaje de la Tarifa que retiene la Plataforma por cada Mandado completado.
- **Regla_de_Tarifa**: Configuración que define tarifa base, tarifa por kilómetro y porcentaje de comisión por tipo de Mandado.
- **Pago_de_Renta**: Registro de un pago mensual realizado por un Motociclista por su Contrato_de_Renta.
- **Estado_Motocicleta**: Uno de: disponible, rentada, mantenimiento, retirada.
- **Estado_Contrato**: Uno de: activo, vencido, renovado, cancelado.
- **Estado_Mandado**: Uno de: solicitado, aceptado, recogido, entregado, cancelado.
- **Tipo_Mandado**: Uno de: transporte_objetos, compra, tramite.
- **Método_Pago**: Uno de: efectivo, transferencia.

## Requirements

### Requirement 1: Autenticación y autorización

**User Story:** Como usuario de la Plataforma, quiero autenticarme con credenciales seguras y acceder solo a las funcionalidades de mi rol, para que mis datos estén protegidos y cada actor tenga acceso apropiado.

#### Acceptance Criteria

1. WHEN un Actor proporciona email y contraseña válidos, THE Plataforma SHALL autenticar al Actor y emitir un token JWT con el rol correspondiente (admin, motociclista, usuario) y un tiempo de expiración de 24 horas.
2. WHEN un Actor proporciona credenciales inválidas o una solicitud con campos faltantes (email o contraseña ausentes), THE Plataforma SHALL rechazar la solicitud con un mensaje de error genérico sin revelar qué campo es incorrecto.
3. WHILE un Actor posee un token JWT válido, THE Plataforma SHALL autorizar el acceso a los endpoints correspondientes a su rol.
4. WHEN un token JWT ha expirado, THE Plataforma SHALL rechazar la solicitud y requerir nueva autenticación.
5. IF un Actor intenta acceder a un recurso fuera de su rol, THEN THE Plataforma SHALL retornar un error de autorización con código 403.
6. THE Plataforma SHALL validar que la contraseña tenga entre 8 y 72 caracteres y contenga al menos una letra mayúscula, una letra minúscula y un dígito.
7. IF un Actor acumula 5 intentos fallidos de autenticación consecutivos para un mismo email, THEN THE Plataforma SHALL bloquear temporalmente los intentos de login para ese email durante 15 minutos.
8. WHEN un Actor se autentica exitosamente, THE Plataforma SHALL reiniciar el contador de intentos fallidos para ese email.

---

### Requirement 2: Registro de usuarios

**User Story:** Como persona interesada, quiero registrarme en la Plataforma con mis datos básicos, para poder solicitar mandados.

#### Acceptance Criteria

1. WHEN una persona proporciona nombre (entre 2 y 100 caracteres), teléfono, email, dirección (entre 5 y 200 caracteres) y contraseña (entre 8 y 72 caracteres) válidos, THE Plataforma SHALL crear una cuenta de Usuario con estado activo.
2. IF una persona intenta registrarse con un email ya existente, THEN THE Plataforma SHALL rechazar el registro indicando que el email ya está en uso.
3. IF una persona intenta registrarse con un teléfono ya existente, THEN THE Plataforma SHALL rechazar el registro indicando que el teléfono ya está en uso.
4. THE Plataforma SHALL validar que el email contenga exactamente un carácter "@" seguido de un dominio con al menos un punto, que el teléfono contenga solo dígitos con longitud entre 7 y 15 caracteres, que la contraseña contenga al menos una letra mayúscula, una letra minúscula y un dígito, y que nombre y dirección no estén vacíos.
5. IF una persona envía un formulario de registro con algún campo obligatorio (nombre, teléfono, email, dirección o contraseña) ausente o vacío, THEN THE Plataforma SHALL rechazar el registro indicando los campos faltantes.

---

### Requirement 3: Registro de motociclistas

**User Story:** Como persona interesada en ejecutar mandados, quiero registrarme como motociclista con mis documentos, para poder rentar una moto y acceder al marketplace de mandados.

#### Acceptance Criteria

1. WHEN una persona proporciona nombre, teléfono, email, dirección, contraseña, número de licencia, fecha de vencimiento de licencia, número de seguro, fecha de vencimiento de seguro, monto de fianza, nombre de contacto de emergencia y teléfono de contacto de emergencia, THE Plataforma SHALL crear una cuenta de Motociclista con estado activo y disponibilidad en falso.
2. WHEN una persona intenta registrarse como Motociclista con un email o teléfono ya existente en cualquier cuenta de la Plataforma (Usuario o Motociclista), THE Plataforma SHALL rechazar el registro indicando el campo duplicado.
3. IF la fecha de vencimiento de licencia no es una fecha futura al momento del registro, THEN THE Plataforma SHALL rechazar el registro indicando que la licencia está vencida o vence hoy.
4. IF la fecha de vencimiento de seguro no es una fecha futura al momento del registro, THEN THE Plataforma SHALL rechazar el registro indicando que el seguro está vencido o vence hoy.
5. THE Plataforma SHALL validar que el email tenga formato válido, que el teléfono contenga solo dígitos con longitud entre 7 y 15 caracteres, que la contraseña tenga entre 8 y 72 caracteres, y que el monto de fianza sea mayor a cero.
6. IF algún campo requerido está ausente o no cumple las validaciones de formato, THEN THE Plataforma SHALL rechazar el registro indicando los campos con error.

---

### Requirement 4: Gestión de motocicletas

**User Story:** Como Admin, quiero gestionar el inventario de motocicletas de la empresa, para mantener un registro actualizado de la flota disponible.

#### Acceptance Criteria

1. WHEN el Admin proporciona placa, marca, modelo, año, color, cilindraje, fecha de vencimiento SOAT y fecha de vencimiento tecnomecánica, THE Plataforma SHALL registrar una nueva Motocicleta con Estado_Motocicleta disponible.
2. WHEN el Admin intenta registrar una Motocicleta con una placa ya existente, THE Plataforma SHALL rechazar el registro indicando que la placa está duplicada.
3. THE Plataforma SHALL validar que el año esté entre 1970 y el año actual más 1, que el cilindraje esté entre 50 y 2000 cc, que la placa tenga entre 5 y 7 caracteres alfanuméricos, y que las fechas de vencimiento de SOAT y tecnomecánica sean fechas futuras.
4. WHEN el Admin solicita actualizar los datos de una Motocicleta, THE Plataforma SHALL permitir modificar color, cilindraje, fecha de vencimiento SOAT y fecha de vencimiento tecnomecánica, y registrar la fecha de actualización.
5. IF el Admin solicita cambiar el Estado_Motocicleta a mantenimiento y el estado actual no es disponible, THEN THE Plataforma SHALL rechazar la operación indicando que solo se permite la transición desde el estado disponible.
6. WHEN el Admin solicita cambiar el Estado_Motocicleta a mantenimiento y el estado actual es disponible, THE Plataforma SHALL actualizar el estado a mantenimiento.
7. WHEN el Admin solicita cambiar el Estado_Motocicleta a disponible desde mantenimiento, THE Plataforma SHALL actualizar el estado a disponible.
8. IF el Admin solicita retirar una Motocicleta que tiene un Contrato_de_Renta activo, THEN THE Plataforma SHALL rechazar la operación indicando que la Motocicleta tiene un contrato activo y no puede ser retirada.
9. WHEN el Admin solicita retirar una Motocicleta que no tiene un Contrato_de_Renta activo, THE Plataforma SHALL cambiar el Estado_Motocicleta a retirada independientemente del estado actual.
10. THE Plataforma SHALL permitir al Admin listar todas las Motocicletas con filtros por Estado_Motocicleta, retornando un máximo de 100 resultados por página.

---

### Requirement 5: Gestión de contratos de renta

**User Story:** Como Admin, quiero crear y gestionar contratos de renta mensual entre motociclistas y motocicletas, para formalizar la relación de arriendo y llevar control de pagos.

#### Acceptance Criteria

1. WHEN el Admin crea un Contrato_de_Renta especificando Motociclista, Motocicleta, fecha de inicio, fecha de fin, monto mensual y día de pago, THE Plataforma SHALL validar que la fecha de fin sea posterior a la fecha de inicio, que el día de pago esté entre 1 y 28, que el monto mensual sea mayor a cero, y registrar el contrato con Estado_Contrato activo y cambiar el Estado_Motocicleta a rentada.
2. IF el Admin intenta crear un Contrato_de_Renta para una Motocicleta que ya tiene un contrato activo, THEN THE Plataforma SHALL rechazar la operación indicando que la Motocicleta ya está asignada.
3. IF el Admin intenta crear un Contrato_de_Renta para un Motociclista que ya tiene un contrato activo, THEN THE Plataforma SHALL rechazar la operación indicando que el Motociclista ya tiene un contrato vigente.
4. IF el Admin intenta crear un Contrato_de_Renta para un Motociclista que no tiene al menos un Codeudor registrado, THEN THE Plataforma SHALL rechazar la operación indicando que se requiere al menos un Codeudor.
5. IF el Admin intenta crear un Contrato_de_Renta para una Motocicleta cuyo Estado_Motocicleta no es disponible o para un Motociclista cuyo estado no es activo, THEN THE Plataforma SHALL rechazar la operación indicando el motivo de rechazo.
6. WHEN el Admin cancela un Contrato_de_Renta activo, THE Plataforma SHALL cambiar el Estado_Contrato a cancelado y el Estado_Motocicleta a disponible.
7. WHEN el Admin renueva un Contrato_de_Renta con Estado_Contrato activo o vencido especificando una nueva fecha de fin posterior a la fecha de fin actual, THE Plataforma SHALL actualizar la fecha de fin y cambiar el Estado_Contrato a renovado.
8. WHEN la fecha actual supera la fecha de fin de un Contrato_de_Renta activo, THE Plataforma SHALL cambiar el Estado_Contrato a vencido y el Estado_Motocicleta a disponible.
9. THE Plataforma SHALL permitir al Admin listar todos los contratos con filtros por Estado_Contrato y por Motociclista.

---

### Requirement 6: Gestión de codeudores

**User Story:** Como Admin, quiero registrar codeudores asociados a un motociclista, para cumplir con el requisito de garantía antes de formalizar un contrato de renta.

#### Acceptance Criteria

1. WHEN el Admin registra un Codeudor proporcionando nombre (máximo 100 caracteres), dirección (máximo 200 caracteres), teléfono (máximo 20 caracteres), relación con el Motociclista (máximo 50 caracteres) y documento de identidad (máximo 20 caracteres), THE Plataforma SHALL validar que todos los campos requeridos estén presentes y no vacíos, y asociar el Codeudor al Motociclista especificado.
2. IF el Admin intenta registrar un Codeudor para un Motociclista que no existe, THEN THE Plataforma SHALL rechazar la operación con un mensaje de error indicando que el Motociclista no fue encontrado, sin crear ningún registro.
3. IF el Admin intenta registrar un Codeudor cuyo documento de identidad ya existe asociado al mismo Motociclista, THEN THE Plataforma SHALL rechazar la operación con un mensaje de error indicando duplicidad de documento.
4. WHEN el Admin solicita listar los codeudores de un Motociclista, THE Plataforma SHALL retornar todos los Codeudores asociados a ese Motociclista, o una lista vacía si no tiene codeudores registrados.
5. WHEN el Admin solicita actualizar los datos de un Codeudor existente, THE Plataforma SHALL modificar únicamente los campos proporcionados (nombre, dirección, teléfono, relación, documento de identidad) conservando sin cambio los campos no incluidos en la solicitud.
6. IF el Admin solicita actualizar un Codeudor que no existe, THEN THE Plataforma SHALL rechazar la operación con un mensaje de error indicando que el Codeudor no fue encontrado.

---

### Requirement 7: Registro de pagos de renta

**User Story:** Como Admin, quiero registrar los pagos mensuales de renta que realizan los motociclistas, para llevar un control financiero del negocio.

#### Acceptance Criteria

1. WHEN el Admin registra un Pago_de_Renta especificando Contrato_de_Renta, monto, fecha de pago, Método_Pago y periodo cubierto, THE Plataforma SHALL crear el registro de pago asociado al contrato.
2. IF el Admin intenta registrar un Pago_de_Renta para un periodo ya pagado en el mismo Contrato_de_Renta, THEN THE Plataforma SHALL rechazar la operación indicando que el periodo ya tiene un pago registrado.
3. THE Plataforma SHALL permitir al Admin listar los pagos de un Contrato_de_Renta ordenados por periodo descendente.
4. THE Plataforma SHALL validar que el periodo tenga formato "AAAA-MM" válido, que el monto sea mayor a cero, y que la fecha de pago no sea una fecha futura.
5. IF el Admin intenta registrar un Pago_de_Renta para un Contrato_de_Renta que no existe, THEN THE Plataforma SHALL rechazar la operación indicando que el contrato no fue encontrado.

---

### Requirement 8: Configuración de tarifas y comisiones

**User Story:** Como Admin, quiero configurar las reglas de tarificación por tipo de mandado, para que la Plataforma calcule automáticamente las tarifas y comisiones.

#### Acceptance Criteria

1. WHEN el Admin crea una Regla_de_Tarifa especificando Tipo_Mandado, tarifa base (0.01–999,999.99), tarifa por kilómetro (0.00–9,999.99) y porcentaje de comisión (1.00–50.00), THE Plataforma SHALL registrar la regla como activa con valores almacenados a 2 decimales de precisión.
2. WHEN el Admin desactiva una Regla_de_Tarifa, THE Plataforma SHALL marcar la regla como inactiva.
3. THE Plataforma SHALL mantener exactamente una Regla_de_Tarifa activa por cada Tipo_Mandado.
4. IF el Admin intenta activar una Regla_de_Tarifa para un Tipo_Mandado que ya tiene una regla activa, THEN THE Plataforma SHALL desactivar la regla anterior y activar la nueva.
5. IF el Admin proporciona valores fuera de los rangos permitidos (tarifa base menor a 0.01 o mayor a 999,999.99, tarifa por km menor a 0.00 o mayor a 9,999.99, comisión menor a 1.00 o mayor a 50.00), THEN THE Plataforma SHALL rechazar la operación indicando los campos con valores fuera de rango.

---

### Requirement 9: Creación de mandados

**User Story:** Como Usuario, quiero crear un mandado especificando tipo, origen, destino y descripción, para que un motociclista lo ejecute.

#### Acceptance Criteria

1. WHEN un Usuario con estado activo crea un Mandado especificando Tipo_Mandado (transporte_objetos, compra o tramite), dirección de origen, dirección de destino y descripción, THE Plataforma SHALL calcular la distancia_estimada entre origen y destino en kilómetros, calcular la Tarifa usando la Regla_de_Tarifa activa para ese tipo, calcular la Comisión, calcular la ganancia del Motociclista, y registrar el Mandado con Estado_Mandado solicitado.
2. THE Plataforma SHALL calcular la Tarifa como: tarifa_base + (tarifa_por_km × distancia_estimada), donde distancia_estimada es la distancia en kilómetros entre la dirección de origen y la dirección de destino, con un valor mínimo de 0.5 km.
3. THE Plataforma SHALL calcular la Comisión como: Tarifa × (comision_porcentaje / 100).
4. THE Plataforma SHALL calcular la ganancia del Motociclista como: Tarifa - Comisión.
5. IF no existe una Regla_de_Tarifa activa para el Tipo_Mandado solicitado, THEN THE Plataforma SHALL rechazar la creación del Mandado indicando que no hay tarifa configurada para ese tipo.
6. WHEN un Usuario crea un Mandado, THE Plataforma SHALL requerir y registrar el Método_Pago seleccionado por el Usuario, el cual debe ser uno de: efectivo o transferencia.
7. THE Plataforma SHALL validar que la descripción del Mandado tenga entre 10 y 500 caracteres.
8. IF la descripción del Mandado tiene menos de 10 o más de 500 caracteres, THEN THE Plataforma SHALL rechazar la creación del Mandado indicando que la descripción debe tener entre 10 y 500 caracteres.
9. IF el Usuario no tiene estado activo, THEN THE Plataforma SHALL rechazar la creación del Mandado indicando que la cuenta del usuario no está activa.
10. IF la dirección de origen o la dirección de destino están vacías, THEN THE Plataforma SHALL rechazar la creación del Mandado indicando que ambas direcciones son obligatorias.

---

### Requirement 10: Visualización de mandados disponibles

**User Story:** Como Motociclista, quiero ver los mandados disponibles para aceptar, para poder elegir cuáles ejecutar.

#### Acceptance Criteria

1. WHILE un Motociclista tiene estado activo y disponibilidad en verdadero, THE Plataforma SHALL mostrar los Mandados con Estado_Mandado solicitado, ordenados del más reciente (solicitado_at) al más antiguo.
2. WHILE un Motociclista tiene estado inactivo o suspendido, THE Plataforma SHALL ocultar la lista de Mandados disponibles y mostrar un mensaje indicando que su cuenta no está habilitada para recibir mandados.
3. WHILE un Motociclista tiene un Mandado en curso (Estado_Mandado aceptado o recogido), THE Plataforma SHALL ocultar la lista de Mandados disponibles y mostrar un mensaje indicando que debe completar o cancelar el mandado actual antes de aceptar otro.
4. THE Plataforma SHALL mostrar para cada Mandado disponible: tipo, descripción (máximo 200 caracteres visibles con indicador de truncamiento si excede), dirección de origen, dirección de destino, Tarifa y ganancia estimada del Motociclista.
5. WHEN un Mandado cambia de Estado_Mandado solicitado a otro estado (aceptado por otro Motociclista o cancelado), THE Plataforma SHALL eliminar ese Mandado de la lista de disponibles en un máximo de 30 segundos sin requerir acción manual del Motociclista.
6. IF no existen Mandados con Estado_Mandado solicitado, THEN THE Plataforma SHALL mostrar un mensaje indicando que no hay mandados disponibles en este momento.

---

### Requirement 11: Aceptación y ejecución de mandados

**User Story:** Como Motociclista, quiero aceptar un mandado y marcar los estados de progreso manualmente, para ejecutar el servicio y recibir mi pago.

#### Acceptance Criteria

1. WHEN un Motociclista con estado activo y disponibilidad en verdadero acepta un Mandado con Estado_Mandado solicitado, THE Plataforma SHALL cambiar el Estado_Mandado a aceptado, asignar el Motociclista al Mandado, registrar la fecha de aceptación, y cambiar la disponibilidad del Motociclista a falso.
2. IF un Motociclista intenta aceptar un Mandado mientras tiene otro Mandado en curso (Estado_Mandado aceptado o recogido), THEN THE Plataforma SHALL rechazar la operación indicando que tiene un mandado activo.
3. IF un Motociclista intenta aceptar un Mandado que ya fue aceptado por otro Motociclista, THEN THE Plataforma SHALL rechazar la operación indicando que el mandado ya no está disponible.
4. WHEN el Motociclista marca un Mandado aceptado como recogido, THE Plataforma SHALL cambiar el Estado_Mandado a recogido y registrar la fecha de recogida.
5. WHEN el Motociclista marca un Mandado recogido como entregado, THE Plataforma SHALL cambiar el Estado_Mandado a entregado, registrar la fecha de entrega, y cambiar la disponibilidad del Motociclista a verdadero.
6. IF un Motociclista intenta marcar un Mandado con una transición de estado inválida (por ejemplo de aceptado a entregado, o de solicitado a recogido), THEN THE Plataforma SHALL rechazar la operación indicando que las transiciones válidas son: solicitado→aceptado, aceptado→recogido, recogido→entregado.

---

### Requirement 12: Cancelación de mandados

**User Story:** Como Usuario o Motociclista, quiero poder cancelar un mandado bajo ciertas condiciones, para manejar situaciones imprevistas.

#### Acceptance Criteria

1. WHEN un Usuario cancela un Mandado con Estado_Mandado solicitado, THE Plataforma SHALL cambiar el Estado_Mandado a cancelado y registrar la fecha de cancelación, sin requerir motivo de cancelación.
2. WHEN un Usuario o Motociclista cancela un Mandado con Estado_Mandado aceptado, THE Plataforma SHALL cambiar el Estado_Mandado a cancelado, registrar la fecha de cancelación, registrar el motivo de cancelación, y cambiar la disponibilidad del Motociclista a verdadero.
3. WHEN un Motociclista cancela un Mandado con Estado_Mandado recogido, THE Plataforma SHALL cambiar el Estado_Mandado a cancelado, registrar la fecha de cancelación, registrar el motivo de cancelación, y cambiar la disponibilidad del Motociclista a verdadero.
4. IF un actor intenta cancelar un Mandado con Estado_Mandado entregado o ya cancelado, THEN THE Plataforma SHALL rechazar la operación indicando que el mandado no puede ser cancelado en su estado actual.
5. THE Plataforma SHALL requerir un motivo de cancelación con entre 10 y 500 caracteres para cancelaciones de mandados en estado aceptado o recogido.
6. IF un Usuario intenta cancelar un Mandado en estado recogido, THEN THE Plataforma SHALL rechazar la operación indicando que solo el Motociclista puede cancelar en ese estado.

---

### Requirement 13: Historial y seguimiento de mandados

**User Story:** Como Usuario, quiero ver el estado actual y el historial de mis mandados, para hacer seguimiento de mis solicitudes.

#### Acceptance Criteria

1. THE Plataforma SHALL permitir al Usuario listar todos sus Mandados ordenados por fecha de creación descendente, con paginación de máximo 20 resultados por página.
2. THE Plataforma SHALL mostrar para cada Mandado del Usuario: tipo, descripción, Estado_Mandado actual, dirección de origen, dirección de destino, Tarifa, Método_Pago y timestamps de cada cambio de estado (solicitado_at, aceptado_at, recogido_at, entregado_at, cancelado_at según aplique).
3. THE Plataforma SHALL permitir al Usuario filtrar sus Mandados por Estado_Mandado.
4. THE Plataforma SHALL permitir al Motociclista listar todos los Mandados que le fueron asignados (Estado_Mandado aceptado, recogido, entregado o cancelado con rider_id del Motociclista), ordenados por fecha de aceptación descendente, con paginación de máximo 20 resultados por página.
5. THE Plataforma SHALL permitir al Motociclista filtrar sus Mandados asignados por Estado_Mandado.
6. IF un Usuario o Motociclista solicita su historial de Mandados y no tiene ningún Mandado registrado, THEN THE Plataforma SHALL retornar una lista vacía sin error.

---

### Requirement 14: Notificaciones de cambio de estado

**User Story:** Como Usuario, quiero recibir notificaciones cuando el estado de mi mandado cambia, para estar informado del progreso del servicio.

#### Acceptance Criteria

1. WHEN el Estado_Mandado cambia de solicitado a aceptado, THE Plataforma SHALL enviar una notificación por email al Usuario dentro de los 60 segundos posteriores al cambio, indicando que un Motociclista aceptó el Mandado e incluyendo el tipo y la descripción del Mandado.
2. WHEN el Estado_Mandado cambia de aceptado a recogido, THE Plataforma SHALL enviar una notificación por email al Usuario dentro de los 60 segundos posteriores al cambio, indicando que el objeto fue recogido.
3. WHEN el Estado_Mandado cambia de recogido a entregado, THE Plataforma SHALL enviar una notificación por email al Usuario dentro de los 60 segundos posteriores al cambio, indicando que el Mandado fue completado.
4. WHEN el Estado_Mandado cambia a cancelado y existe un motivo de cancelación registrado, THE Plataforma SHALL enviar una notificación por email al Usuario dentro de los 60 segundos posteriores al cambio, indicando la cancelación y el motivo.
5. WHEN el Estado_Mandado cambia a cancelado y no existe un motivo de cancelación registrado, THE Plataforma SHALL enviar una notificación por email al Usuario dentro de los 60 segundos posteriores al cambio, indicando únicamente que el Mandado fue cancelado.
6. THE Plataforma SHALL utilizar email como canal único de notificaciones en el MVP, enviando al email registrado del Usuario propietario del Mandado.
7. IF el envío de email falla, THEN THE Plataforma SHALL registrar el fallo internamente y reintentar el envío hasta un máximo de 3 intentos con intervalos de 30 segundos entre cada reintento.

---

### Requirement 15: Panel administrativo y métricas

**User Story:** Como Admin, quiero un panel con métricas básicas del negocio, para monitorear la operación y tomar decisiones.

#### Acceptance Criteria

1. THE Plataforma SHALL mostrar al Admin el total de Mandados por Estado_Mandado en un periodo seleccionado, donde el periodo se define como un rango de fechas con formato AAAA-MM-DD y el periodo por defecto es el mes calendario en curso.
2. THE Plataforma SHALL mostrar al Admin el ingreso total por comisiones en el periodo seleccionado, sumando el campo comision_plataforma únicamente de los Mandados con Estado_Mandado entregado cuya fecha de entrega (entregado_at) esté dentro del rango.
3. THE Plataforma SHALL mostrar al Admin el listado de todos los Mandados con filtros por Estado_Mandado, Tipo_Mandado, Motociclista y rango de fechas, donde el rango de fechas filtra por el campo solicitado_at, y los resultados se presentan paginados con un máximo de 50 registros por página ordenados por solicitado_at descendente.
4. THE Plataforma SHALL mostrar al Admin el total de Motocicletas por Estado_Motocicleta.
5. THE Plataforma SHALL mostrar al Admin el total de Contratos_de_Renta por Estado_Contrato.
6. THE Plataforma SHALL mostrar al Admin el total recaudado en pagos de renta en el periodo seleccionado, sumando el campo monto de los Pago_de_Renta cuyo campo periodo (formato AAAA-MM) esté dentro del rango seleccionado.
7. IF el periodo seleccionado no contiene datos de Mandados ni de Pago_de_Renta, THEN THE Plataforma SHALL mostrar los contadores en cero y el listado vacío, sin mensaje de error.

---

### Requirement 16: Interfaz web responsive

**User Story:** Como actor de la Plataforma, quiero acceder desde cualquier dispositivo con navegador web, para usar el sistema sin instalar aplicaciones nativas.

#### Acceptance Criteria

1. THE Plataforma SHALL proveer una interfaz web responsive que se adapte a pantallas de escritorio (1024px o más), tablet (768px a 1023px) y móvil (320px a 767px), de forma que todo el contenido sea accesible sin scroll horizontal y sin requerir zoom manual por parte del usuario.
2. THE Plataforma SHALL renderizar todas las funcionalidades del Motociclista y del Usuario en pantallas móviles con elementos interactivos de al menos 44×44 píxeles de área táctil, sin requerir desplazamiento horizontal ni zoom para completar cualquier acción.
3. THE Plataforma SHALL renderizar el panel administrativo optimizado para pantallas de escritorio, y desde tablet SHALL permitir acceso a las funcionalidades de consulta (listados, filtros y métricas), mientras que las funcionalidades de creación y edición podrán requerir pantalla de escritorio.
4. THE Plataforma SHALL ser compatible con las dos últimas versiones estables de Chrome, Firefox, Safari y Edge tanto en escritorio como en dispositivos móviles.

---

### Requirement 17: Cálculo de tarifa

**User Story:** Como operador de la Plataforma, quiero que la tarifa se calcule automáticamente al crear un mandado, para que el precio sea justo y consistente.

#### Acceptance Criteria

1. WHEN un Usuario crea un Mandado con dirección de origen y dirección de destino, THE Plataforma SHALL calcular la distancia estimada en kilómetros usando la distancia en línea recta (Haversine) entre las coordenadas de origen y destino, con precisión de dos decimales.
2. WHEN la Plataforma calcula la distancia estimada, THE Plataforma SHALL aplicar la fórmula: Tarifa = tarifa_base + (tarifa_por_km × distancia_estimada), usando la Regla_de_Tarifa activa del Tipo_Mandado correspondiente.
3. THE Plataforma SHALL redondear la Tarifa calculada a dos decimales usando redondeo half-up (si el tercer decimal es 5 o mayor, se redondea hacia arriba).
4. THE Plataforma SHALL congelar la Tarifa al momento de creación del Mandado, de forma que cambios posteriores en la Regla_de_Tarifa no afecten mandados ya creados.
5. IF la distancia estimada calculada es menor a 0.5 km, THEN THE Plataforma SHALL utilizar 0.5 km como distancia mínima para el cálculo de la Tarifa.
6. THE Plataforma SHALL garantizar que dado el mismo origen, destino y Regla_de_Tarifa, el cálculo de la Tarifa produzca siempre el mismo resultado (propiedad de idempotencia).

---

### Requirement 18: Transiciones de estado de motocicleta

**User Story:** Como Admin, quiero que los cambios de estado de las motocicletas sigan reglas definidas, para mantener la integridad de la flota.

#### Acceptance Criteria

1. THE Plataforma SHALL permitir la transición de Estado_Motocicleta de disponible a rentada únicamente al crear un Contrato_de_Renta activo.
2. THE Plataforma SHALL permitir la transición de Estado_Motocicleta de rentada a disponible únicamente al cancelar o vencer un Contrato_de_Renta.
3. WHEN el Admin solicita cambiar el Estado_Motocicleta de disponible a mantenimiento, THE Plataforma SHALL actualizar el estado a mantenimiento y registrar la fecha de cambio de estado.
4. WHEN el Admin solicita cambiar el Estado_Motocicleta de mantenimiento a disponible, THE Plataforma SHALL actualizar el estado a disponible y registrar la fecha de cambio de estado.
5. THE Plataforma SHALL permitir la transición de Estado_Motocicleta a retirada desde los estados disponible y mantenimiento por solicitud del Admin, y SHALL bloquear la transición desde rentada mientras exista un Contrato_de_Renta activo asociado.
6. IF el Admin intenta una transición de Estado_Motocicleta no permitida, THEN THE Plataforma SHALL rechazar la operación sin modificar el Estado_Motocicleta actual e indicar en la respuesta las transiciones válidas desde el estado actual.
7. THE Plataforma SHALL tratar el estado retirada como terminal: una Motocicleta en estado retirada no SHALL admitir transición a ningún otro Estado_Motocicleta.
