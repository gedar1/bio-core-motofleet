export const es = {
  // Nav
  nav: {
    dashboard: "Dashboard",
    home: "Inicio",
    requestErrand: "Solicitar",
    myErrands: "Mis favores",
    activeRoute: "En ruta",
    availableErrands: "Disponibles",
    riderHistory: "Historial",
    login: "Login",
    logout: "Logout",
    signup: "Registrarse",
  },

  // Home
  home: {
    hero: "Más que un favor, una solución",
    subtitle:
      "Solicita favores, renta motocicletas y entrega por toda la ciudad — todo desde una plataforma.",
    getStarted: "Comenzar",
    signIn: "Iniciar Sesión",
    howItWorks: "CÓMO FUNCIONA",
    threeSteps: "Tres pasos simples",
    request: "Solicitar",
    requestDesc:
      "Crea un favor con punto de recogida y entrega. Calculamos la tarifa al instante.",
    accept: "Aceptar",
    acceptDesc:
      "Los motociclistas disponibles ven tu solicitud y la aceptan. Sigue el progreso en tiempo real.",
    deliver: "Entregar",
    deliverDesc:
      "Tu paquete llega. Paga en efectivo o por transferencia. Simple.",
    fleetManagement: "Gestión de Flota",
    fleetDesc:
      "Los administradores gestionan motocicletas, contratos y motociclistas desde un solo panel.",
    adminPanel: "Panel Admin",
  },

  // Dashboard
  dashboard: {
    title: "Dashboard",
    motorcycles: "Motocicletas",
    contracts: "Contratos",
    pricingRules: "Reglas de Tarifa",
    errands: "Favores",
    metrics: "Métricas",
    createErrand: "Crear Favor",
    myErrands: "Mis Favor",
    availableErrands: "Favores Disponibles",
    open: "Abrir →",
  },

  // Auth
  auth: {
    loginTitle: "Iniciar Sesión",
    email: "Correo electrónico",
    password: "Contraseña",
    signInBtn: "Ingresar",
    loading: "Cargando...",
    noAccount: "¿No tienes cuenta?",
    register: "Regístrate",
    registerTitle: "Registro",
    name: "Nombre",
    phone: "Teléfono",
    address: "Dirección",
    createAccount: "Crear Cuenta",
    creating: "Creando...",
    hasAccount: "¿Ya tienes cuenta?",
    signIn: "Inicia sesión",
  },

  // Admin pages
  admin: {
    motorcyclesTitle: "Motocicletas",
    contractsTitle: "Contratos",
    pricingTitle: "Reglas de Tarifa",
    errandsTitle: "Todos los Favores",
    metricsTitle: "Métricas",
    noMotorcycles: "No se encontraron motocicletas.",
    noContracts: "No se encontraron contratos.",
    noPricing: "No hay reglas de tarifa configuradas.",
    noErrands: "No se encontraron favores.",
    commissionRevenue: "Ingresos por Comisión",
    rentalPayments: "Pagos de Renta",
    errandsByStatus: "Favores por Estado",
    motorcyclesByStatus: "Motocicletas por Estado",
    contractsByStatus: "Contratos por Estado",
    perMonth: "/mes",
    day: "Día",
    active: "ACTIVO",
    inactive: "INACTIVO",
    base: "Base",
    perKm: "Por km",
    commission: "Comisión",
    contract: "CONTRATO",
  },

  // User pages
  user: {
    createErrandTitle: "Crear Favor",
    type: "Tipo",
    objectTransport: "Envío de Objetos",
    purchase: "Compra",
    errand: "Trámite",
    description: "Descripción",
    descPlaceholder: "Describe lo que necesitas (mín. 10 caracteres)",
    originAddress: "Punto de Recogida",
    destAddress: "Punto de Entrega",
    paymentMethod: "Método de Pago",
    cash: "Efectivo",
    transfer: "Transferencia",
    createBtn: "Crear Favor",
    creatingBtn: "Creando...",
    myErrandsTitle: "Mis Favores",
    noErrands: "Aún no tienes favores. ¡Crea uno!",
    cancel: "Cancelar",
  },

  // Rider pages
  rider: {
    availableTitle: "Favores Disponibles",
    myErrandsTitle: "Mis Favores",
    noAvailable: "No hay favores disponibles en este momento.",
    noAssigned: "Aún no tienes favores asignados.",
    accept: "Aceptar",
    pickup: "Recoger",
    deliver: "Entregar",
    cancel: "Cancelar",
    earn: "Ganancia",
    fare: "Tarifa",
  },

  // Footer
  footer: {
    tagline: "Alquiler de flotas de motocicletas y marketplace de favores",
    copyright: "© 2026 Gedar. Todos los derechos reservados.",
  },

  // Admin Forms
  adminForms: {
    // Motorcycle
    createMotorcycleTitle: "Crear Motocicleta",
    plate: "Placa",
    brand: "Marca",
    model: "Modelo",
    year: "Año",
    color: "Color",
    engineCc: "Cilindraje (CC)",
    soatExpiry: "Vencimiento SOAT",
    inspectionExpiry: "Vencimiento Revisión Técnica",
    // Contract
    createContractTitle: "Crear Contrato",
    riderId: "ID del Motociclista",
    motorcycleId: "ID de la Motocicleta",
    startDate: "Fecha de Inicio",
    endDate: "Fecha de Fin",
    monthlyAmount: "Monto Mensual",
    paymentDay: "Día de Pago",
    notes: "Notas (opcional)",
    // Cosigner
    createCosignerTitle: "Crear Codeudor",
    name: "Nombre",
    address: "Dirección",
    phone: "Teléfono",
    relationship: "Parentesco",
    identityDocument: "Documento de Identidad",
    // Pricing Rule
    createPricingRuleTitle: "Crear Regla de Tarifa",
    errandType: "Tipo de Favor",
    objectTransport: "Envío de Objetos",
    purchase: "Compra",
    errand: "Trámite",
    baseRate: "Tarifa Base",
    ratePerKm: "Tarifa por Km",
    commissionPercentage: "Porcentaje de Comisión",
    // Payment
    createPaymentTitle: "Registrar Pago",
    contractId: "ID del Contrato",
    amount: "Monto",
    paymentDate: "Fecha de Pago",
    paymentMethod: "Método de Pago",
    cash: "Efectivo",
    transfer: "Transferencia",
    period: "Período (YYYY-MM)",
    // Common form
    submitBtn: "Guardar",
    submittingBtn: "Guardando...",
    crear: "Crear",
  },

  // Error and validation messages
  errors: {
    api: {
      unauthorized:
        "No pudimos validar tus credenciales. Revisa tu correo y contraseña.",
      forbidden: "No tienes permisos para realizar esta acción.",
      notFound: "No encontramos la información solicitada.",
      validation: "Revisa los datos ingresados.",
      businessRule:
        "No se puede completar la operación con los datos actuales.",
      invalidState: "Esta acción no está disponible en el estado actual.",
      conflict: "No se pudo guardar porque la información ya existe.",
      internal: "Ocurrió un error inesperado. Intenta nuevamente.",
      unknown: "No pudimos completar la solicitud. Intenta nuevamente.",
    },
    business: {
      emailInUse: "Este correo electrónico ya está registrado.",
      phoneInUse: "Este teléfono ya está registrado.",
      identityDocumentInUse: "Este documento de identidad ya está registrado.",
      plateInUse: "Esta placa ya está registrada.",
      licenseExpired: "La licencia está vencida o vence hoy.",
      insuranceExpired: "El seguro está vencido o vence hoy.",
      quoteNotFound: "No encontramos la cotización solicitada.",
      quoteUsed: "La cotización ya fue utilizada.",
      quoteExpired: "La cotización ya venció.",
      routingUnavailable:
        "No pudimos calcular la ruta. Intenta nuevamente más tarde.",
    },
    validation: {
      email: "Ingresa un correo electrónico válido.",
      passwordLength: "La contraseña debe tener entre 8 y 72 caracteres.",
      passwordUppercase:
        "La contraseña debe incluir al menos una letra mayúscula.",
      passwordLowercase:
        "La contraseña debe incluir al menos una letra minúscula.",
      passwordDigit: "La contraseña debe incluir al menos un número.",
      passwordPattern:
        "La contraseña debe incluir mayúscula, minúscula y número.",
      plate:
        "La placa debe tener 3 letras, 2 números y una letra opcional al final (ej. ABC12 o EDF26U).",
      phone: "El teléfono debe tener entre 7 y 15 dígitos.",
      documentNumber:
        "El documento debe tener entre 5 y 30 caracteres alfanuméricos.",
      period: "El período debe tener el formato AAAA-MM.",
      futureDate: "La fecha debe ser posterior a hoy.",
      uuid: "Selecciona una opción válida.",
      invalid: "La información de {field} no es válida.",
      amountPositive: "El monto debe ser mayor que cero.",
      paymentDate: "Ingresa una fecha de pago válida.",
      paymentDatePast: "La fecha de pago no puede ser futura.",
      paymentMethod: "Selecciona efectivo o transferencia como método de pago.",
      baseRate: "La tarifa base debe ser un valor entero entre $1 y $999.999.",
      ratePerKm:
        "La tarifa por kilómetro debe ser un valor entero entre $0 y $9.999.",
      commission: "La comisión debe ser un porcentaje entero entre 1% y 50%.",
      errandType: "Selecciona un tipo de favor válido.",
      available: "La disponibilidad debe ser válida.",
    },
    input: {
      required: "El campo {field} es obligatorio.",
      email: "Ingresa un correo electrónico válido.",
      number: "Ingresa un número válido.",
      minLength: "{field} debe tener al menos {value} caracteres.",
      maxLength: "{field} debe tener máximo {value} caracteres.",
      min: "{field} debe ser mayor o igual a {value}.",
      max: "{field} debe ser menor o igual a {value}.",
      pattern: "El formato de {field} no es válido.",
      invalid: "Ingresa un valor válido.",
    },
  },

  // Common
  common: {
    loading: "CARGANDO...",
    failedLoad: "Error al cargar datos.",
    start: "Inicio",
    end: "Fin",
  },
} as const;

export type Translations = typeof es;

/**
 * Maps backend enum values to Spanish labels.
 * Use: translateStatus("delivered") → "Entregado"
 */
export const statusLabels: Record<string, string> = {
  // Errand status
  requested: "Solicitado",
  accepted: "Aceptado",
  picked_up: "Recogido",
  delivered: "Entregado",
  cancelled: "Cancelado",
  // Motorcycle status
  available: "Disponible",
  rented: "Rentada",
  maintenance: "Mantenimiento",
  retired: "Retirada",
  // Contract status
  active: "Activo",
  expired: "Vencido",
  renewed: "Renovado",
  // Errand types
  object_transport: "Envío de Objetos",
  purchase: "Compra",
  errand: "Trámite",
  // Payment methods
  cash: "Efectivo",
  transfer: "Transferencia",
};

export function translateStatus(value: string): string {
  return statusLabels[value] || value;
}
