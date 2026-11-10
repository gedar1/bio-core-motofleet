# MotoFleet MVP — Alcance de entrega del código

**Estado:** código actual / MVP funcional  
**Tipo de entrega:** código fuente, documentación técnica y recursos de configuración  
**Alcance:** aplicación web para administrar una flota de motocicletas y operar mandados en una ciudad

> Este documento describe únicamente las capacidades verificables en el código actual. No representa como implementadas las funcionalidades que existen solo como requisitos, especificaciones, prototipos o trabajo pendiente en otra rama.

## 1. Descripción general

MotoFleet es una aplicación web que permite:

- Administrar motocicletas, riders, contratos de renta, codeudores, pagos manuales y tarifas.
- Registrar usuarios que solicitan mandados.
- Permitir que los riders consulten y ejecuten mandados disponibles.
- Calcular tarifas usando distancia vial obtenida mediante Mapbox.
- Consultar estados, historial y métricas operativas.
- Enviar notificaciones dentro de la aplicación y, opcionalmente, por correo electrónico.

La entrega corresponde a un **MVP avanzado para piloto controlado**. El alcance actual está orientado a una operación inicial de una ciudad, con pagos manuales y sin rastreo GPS en tiempo real.

## 2. Elementos que se entregan

La entrega del código debe incluir, como mínimo:

### 2.1 Código fuente del backend

- Código TypeScript ubicado principalmente en `src/`.
- Aplicación Express y composición de rutas en `src/app.ts`.
- Punto de entrada del servidor en `src/index.ts`.
- Capas de rutas, moléculas de negocio, átomos de dominio, middleware e infraestructura.
- Validaciones de entrada mediante Zod.
- Autenticación mediante JWT y contraseñas protegidas con bcrypt.
- Migraciones SQL ubicadas en `src/migrations/`.
- Integración de base de datos SQLite mediante `better-sqlite3`.
- Integración de Mapbox Directions para cálculo de rutas.
- Sistema de logs estructurados y scheduler para tareas programadas.

### 2.2 Código fuente del frontend

- Aplicación React/Vite ubicada en `frontend/`.
- Código TypeScript y componentes reutilizables.
- Navegación protegida por rol.
- Interfaces responsive para administrador, usuario y rider.
- Integración con Mapbox para selección y visualización de ubicaciones.
- Servicios de comunicación con la API backend.
- Recursos visuales, iconos, estilos y configuración de compilación.

### 2.3 Pruebas y validaciones existentes

- Pruebas backend unitarias y basadas en propiedades ubicadas en `tests/`.
- Validaciones de entidades, reglas tarifarias, autorizaciones, fechas y transiciones de estados.
- Configuración de Vitest.
- Scripts de compilación y ejecución de pruebas.
- Guía de pruebas manuales en `docs/MANUAL_TESTING_GUIDE.md`.
- Colección de Postman en `docs/MotoFleet-API.postman_collection.json`.

### 2.4 Documentación técnica

- Descripción general del proyecto en `README.md`.
- Requisitos funcionales y fases propuestas en `docs/motofleet/REQUIREMENTS.md`.
- Modelo de dominio en `docs/motofleet/DOMAIN_MODEL.md`.
- Guía de pruebas manuales.
- Colección de endpoints para pruebas mediante Postman.
- Este documento de alcance de entrega.

### 2.5 Archivos de configuración y dependencias

- `package.json` y `package-lock.json` del backend.
- `frontend/package.json` y `frontend/package-lock.json` del frontend.
- Archivos `.env.example` para documentar variables de entorno.
- Configuración de TypeScript, Vite, Tailwind, PostCSS y Vitest.
- Scripts necesarios para instalar, compilar, probar y ejecutar la aplicación.

> Los archivos `.env` con secretos, contraseñas, tokens, credenciales SMTP o credenciales de terceros no hacen parte de una entrega segura del repositorio. Deben configurarse de manera independiente en el ambiente del receptor.

## 3. Funcionalidades incluidas

#### 3.1 Autenticación y roles

La aplicación incluye autenticación para los siguientes perfiles:

- **Administrador (`admin`)**
- **Usuario solicitante (`user`)**
- **Rider (`rider`)**

Las capacidades incluidas son:

- Inicio de sesión.
- Registro de usuarios.
- Registro de riders.
- Emisión y validación de tokens JWT.
- Protección de rutas por autenticación.
- Protección de rutas por rol.
- Validación de datos de entrada.
- Bloqueo temporal después de varios intentos de inicio de sesión fallidos.

El registro público de administradores no está habilitado; la creación inicial de un administrador debe hacerse mediante el mecanismo de administración o seed definido para el ambiente.

### 3.2 Administración de la flota

El administrador puede gestionar motocicletas con información como:

- Placa.
- Marca y modelo.
- Año.
- Color y cilindraje.
- Vencimiento del SOAT.
- Vencimiento de la revisión tecnomecánica.
- Estado operativo de la motocicleta.

Los estados disponibles contemplan, entre otros:

- Disponible.
- Rentada.
- En mantenimiento.
- Retirada.

La aplicación permite consultar y actualizar la información de las motocicletas según las reglas del backend.

### 3.3 Gestión de riders

El sistema contempla el registro y administración de riders con información como:

- Datos personales y de contacto.
- Documento o información de licencia.
- Vencimiento de la licencia.
- Información del seguro.
- Vencimiento del seguro.
- Fianza.
- Contacto de emergencia.
- Estado de la cuenta.
- Disponibilidad para recibir mandados.

El administrador puede consultar la información de los riders desde el espacio administrativo.

### 3.4 Contratos de renta, codeudores y pagos manuales

La aplicación incluye gestión administrativa de contratos de renta asociados a riders y motocicletas:

- Creación de contratos.
- Consulta de contratos.
- Edición de información contractual según las reglas existentes.
- Cancelación de contratos.
- Renovación de contratos.
- Control de fechas de inicio y vencimiento.
- Valor mensual de la renta.
- Día de pago configurado.
- Notas administrativas.
- Expiración programada de contratos vencidos.

También incluye:

- Registro de codeudores asociados a riders.
- Registro administrativo de pagos de renta.
- Métodos manuales de pago, como efectivo y transferencia.
- Consulta de información de pagos desde el módulo administrativo.

Los pagos no se procesan automáticamente dentro de la plataforma. El sistema registra el pago reportado por el administrador.

### 3.5 Gestión de tarifas

El administrador puede configurar reglas de tarifa para los tipos de mandado disponibles.

Las reglas consideran:

- Tipo de mandado.
- Tarifa base.
- Valor por distancia.
- Porcentaje de comisión de la plataforma.
- Estado activo o inactivo de la regla.

La tarifa final se calcula en el backend. El frontend no es la fuente autoritativa del precio.

### 3.6 Flujo de mandados para usuarios

Un usuario autenticado puede:

- Crear un mandado.
- Seleccionar origen y destino mediante el mapa.
- Buscar ubicaciones restringidas al contexto configurado para Colombia.
- Utilizar geolocalización cuando esté disponible.
- Mover los pines de origen y destino.
- Consultar una previsualización de la ruta.
- Ver distancia y duración estimadas.
- Indicar el tipo de mandado.
- Incluir una descripción.
- Seleccionar el método de pago manual disponible.
- Consultar sus propios mandados.
- Consultar el estado de cada mandado.
- Cancelar un mandado cuando las reglas de estado lo permiten.

Los tipos de mandado contemplados son:

- Transporte de objetos.
- Compras.
- Trámites.

La aplicación no contempla transporte de personas.

### 3.7 Flujo de ejecución para riders

Un rider autenticado puede:

- Activar o desactivar su disponibilidad.
- Consultar mandados disponibles.
- Ver información del mandado y su ruta.
- Aceptar un mandado disponible.
- Consultar sus mandados asignados.
- Ver la ruta del mandado activo.
- Marcar el mandado como recogido.
- Marcar el mandado como entregado.
- Cancelar un mandado cuando las reglas lo permiten.
- Consultar su historial de mandados.
- Utilizar enlaces externos de navegación a Google Maps o Waze.

El flujo de estados operativo del mandado es:

```text
requested → accepted → picked_up → delivered
```

También existen transiciones de cancelación según el estado y el rol que ejecuta la acción.

### 3.8 Rutas, mapas y cálculo de precios

El backend utiliza Mapbox Directions como proveedor autoritativo para:

- Obtener distancia vial.
- Obtener duración estimada.
- Calcular la ruta utilizada por la cotización.
- Guardar un snapshot de la información de ruta asociada al mandado.

El frontend utiliza Mapbox para:

- Visualizar el mapa.
- Buscar ubicaciones.
- Seleccionar coordenadas.
- Mostrar la ruta y los marcadores.

La creación productiva de un mandado requiere la configuración del proveedor de rutas. El fallback de distancia geométrica solo debe habilitarse explícitamente para escenarios controlados y no sustituye la ruta vial normal.

### 3.9 Notificaciones

La aplicación incluye:

- Notificaciones dentro de la aplicación.
- Consulta de notificaciones por usuario.
- Actualización del estado de lectura.
- Notificaciones relacionadas con cambios en el estado de los mandados.
- Cola de correo electrónico opcional.
- Reintentos de notificaciones de correo según la configuración existente.
- Integración SMTP opcional mediante Nodemailer.

El correo no está habilitado automáticamente si no se configuran las variables SMTP correspondientes.

### 3.10 Administración y métricas

El espacio administrativo incluye vistas para consultar y operar:

- Resumen de métricas.
- Motocicletas.
- Riders.
- Contratos.
- Codeudores.
- Pagos de renta.
- Reglas de tarifa.
- Mandados.
- Notificaciones y estados operativos relacionados.

Las métricas corresponden al alcance operativo implementado y no deben interpretarse como un sistema contable o financiero completo.

## 4. Arquitectura técnica entregada

### Backend

- Node.js 20 LTS como entorno validado.
- Express 4.
- TypeScript.
- Arquitectura modular con rutas, moléculas de negocio, átomos y adaptadores de infraestructura.
- SQLite con `better-sqlite3`.
- Migraciones SQL forward-only.
- JWT para autenticación.
- bcrypt para contraseñas.
- Zod para validaciones.
- Pino para logging.
- Nodemailer para correo opcional.
- Mapbox SDK para rutas.

### Frontend

- React 18.
- Vite.
- TypeScript.
- React Router.
- Tailwind CSS.
- Mapbox GL y `react-map-gl`.
- Interfaz responsive con experiencia orientada a móvil para usuario y rider.
- Panel administrativo orientado a escritorio.

### Persistencia

La persistencia actual utiliza SQLite y migraciones numeradas. La base de datos contiene, entre otros, registros de:

- Usuarios.
- Riders.
- Administradores.
- Motocicletas.
- Contratos.
- Codeudores.
- Pagos de renta.
- Reglas de tarifa.
- Mandados.
- Cotizaciones y snapshots de ruta.
- Notificaciones.
- Intentos de autenticación.

La base SQLite actual es adecuada para un piloto o una operación de bajo volumen. La entrega no implica alta disponibilidad, replicación ni operación multiinstancia.

## 5. API incluida

La API se expone bajo el prefijo `/api` y utiliza autorización Bearer JWT en las rutas protegidas.

Entre los grupos de endpoints incluidos se encuentran:

- `/api/auth`
- `/api/users`
- `/api/riders`
- `/api/motorcycles`
- `/api/contracts`
- `/api/pricing-rules`
- `/api/admin`
- `/api/errands`
- `/api/notifications`
- Rutas anidadas para codeudores y pagos de contratos

La documentación detallada de endpoints y ejemplos de solicitudes se entrega en la colección de Postman y en la guía manual del proyecto.

## 6. Requisitos para instalar y ejecutar

El receptor de la entrega debe disponer de:

- Node.js 20 LTS.
- npm.
- Git.
- Una cuenta y tokens de Mapbox.
- Configuración SMTP si requiere notificaciones por correo.
- Un ambiente donde el proceso pueda crear y escribir la base SQLite.

### Instalación base

Desde la raíz del proyecto:

```bash
npm install

cd frontend
npm install
cd ..
```

Crear los archivos de ambiente a partir de los ejemplos:

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```

Los tokens y secretos deben configurarse con valores propios del ambiente de destino.

### Comandos principales

Backend:

```bash
npm run build
npm test
npm run verify:migration:14.7
```

Frontend:

```bash
cd frontend
npm run build
```

Ejecución local:

```bash
npm run dev
```

El frontend debe ejecutarse con su comando de desarrollo desde la carpeta `frontend` cuando se requiera una sesión separada.

## 7. Variables de entorno principales

La configuración exacta se encuentra en los archivos `.env.example`. Entre las variables relevantes están:

- Ruta y puerto del backend.
- `JWT_SECRET`.
- Orígenes permitidos por CORS.
- `MAPBOX_SECRET_TOKEN` para el backend.
- `VITE_MAPBOX_PUBLIC_TOKEN` para el frontend.
- Configuración SMTP.
- Activación de notificaciones por correo.
- Ruta de base de datos.
- Ruta de migraciones.
- Activación explícita del fallback de ruteo, cuando aplique.

Los secretos deben ser únicos para cada ambiente y no se deben incluir en el repositorio ni en la documentación de entrega.

## 8. Condiciones y limitaciones actuales

La entrega actual tiene las siguientes condiciones:

- Está diseñada para una operación inicial en una ciudad.
- Los pagos son manuales; la plataforma no cobra con tarjeta, PSE, Nequi o Daviplata.
- No existe tracking GPS en tiempo real de riders.
- No existe aplicación móvil nativa para Android o iOS.
- La persistencia principal es SQLite.
- El scheduler funciona dentro del proceso de la aplicación.
- No se entrega una configuración completa de infraestructura productiva.
- No se entrega un pipeline de despliegue productivo listo para cualquier proveedor.
- No se incluyen datos reales, secretos, cuentas de terceros ni credenciales de producción.
- El frontend utiliza el token público de Mapbox configurado por el receptor.
- Los límites, respaldos y políticas de retención deben definirse para el ambiente final.

## 9. Funcionalidades no incluidas en el código operativo actual

Las siguientes capacidades no deben presentarse como parte de la funcionalidad actual:

### 9.1 Carga y firma de contratos

No se incluye como flujo operativo terminado:

- Carga de un PDF original por el administrador.
- Enlace único para el rider.
- Descarga y carga de un PDF firmado.
- Versionado documental.
- Auditoría documental completa.
- Bandeja de revisión y aprobación de documentos.
- Firma electrónica dentro de la plataforma.
- Integración con un proveedor de firma electrónica.
- Almacenamiento documental privado integrado a las rutas actuales.

Existe una especificación separada para este flujo, pero debe considerarse trabajo pendiente hasta integrar sus migraciones, servicios, rutas, interfaz, pruebas y despliegue.

### 9.2 Otras capacidades fuera del alcance actual

- Tracking en tiempo real y mapa de seguimiento para el usuario.
- Historial de recorridos GPS.
- Integración con Nequi, Daviplata, PSE, tarjetas u otras pasarelas.
- Liquidación financiera automática y conciliación bancaria.
- Aplicación móvil nativa.
- WhatsApp Business API.
- Instagram DM y Facebook Messenger.
- Sistema de calificaciones o reputación.
- Afiliación completa de motos de terceros y reportes para propietarios.
- Multiempresa o multi-tenant operativo.
- Sistema contable o ERP.
- Gestión completa de mantenimiento de vehículos.
- Sistema avanzado de soporte, chat o atención omnicanal.

## 10. Forma recomendada de entregar el repositorio

La entrega técnica debería realizarse mediante:

1. Un repositorio Git o un archivo comprimido con el código fuente.
2. Una rama o etiqueta identificable de la versión entregada.
3. Los archivos `package-lock.json` para conservar versiones reproducibles.
4. Los archivos `.env.example`, nunca los secretos reales.
5. Las migraciones de base de datos.
6. La documentación técnica y funcional.
7. La colección de Postman.
8. La guía de instalación y pruebas.
9. Un registro de la versión de Node.js utilizada.
10. Una lista de variables de entorno requeridas.
11. Un reporte de compilación y pruebas ejecutadas sobre la versión entregada.
12. Un inventario de funcionalidades incluidas y excluidas.

No se deben entregar como parte del código fuente:

- Contraseñas reales.
- Tokens Mapbox reales.
- Credenciales SMTP.
- Archivos `.env` de desarrollo o producción.
- Bases de datos con información personal real, salvo que exista autorización expresa.
- Carpetas `node_modules` como sustituto de los archivos de dependencias.
- Artefactos de compilación obsoletos como sustituto del código fuente.

## 11. Criterios de aceptación de la entrega

La entrega se considera técnicamente recibida cuando, en un ambiente configurado por el receptor:

- El backend instala correctamente sus dependencias.
- El frontend instala correctamente sus dependencias.
- Las migraciones se ejecutan sobre una base SQLite nueva.
- El backend compila con `npm run build`.
- Las pruebas existentes se ejecutan con `npm test`.
- El frontend compila con `npm run build` desde `frontend`.
- Se puede iniciar sesión con los roles soportados.
- El administrador puede consultar y gestionar los módulos administrativos incluidos.
- Un usuario puede crear y consultar un mandado.
- Un rider puede consultar, aceptar y actualizar el estado de un mandado.
- El cálculo de ruta funciona con tokens Mapbox válidos.
- Las rutas protegidas rechazan usuarios sin autenticación o con un rol no autorizado.
- La colección de Postman y la guía manual son suficientes para reproducir el flujo básico.

Cualquier requerimiento adicional debe documentarse como una ampliación de alcance y validarse por separado.

## 12. Responsabilidades posteriores a la entrega

Salvo que se acuerde expresamente lo contrario, la entrega del código no incluye automáticamente:

- Configuración de cuentas de hosting.
- Configuración de dominios y certificados.
- Configuración de Mapbox o SMTP del cliente.
- Migración de datos existentes.
- Administración continua de servidores.
- Soporte permanente.
- Correcciones sobre modificaciones realizadas por terceros.
- Desarrollo de funcionalidades no incluidas en este documento.
- Revisión o certificación legal de contratos, firmas o tratamiento de datos.

La operación productiva debe incluir una revisión independiente de seguridad, privacidad, backups, monitoreo y obligaciones legales aplicables al manejo de datos personales y documentos contractuales.
