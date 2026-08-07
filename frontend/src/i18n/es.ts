export const es = {
  // Nav
  nav: {
    dashboard: "Dashboard",
    login: "Login",
    logout: "Logout",
    signup: "Registrarse",
  },

  // Home
  home: {
    hero: "Mueve lo que importa.",
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
    originAddress: "Dirección de Origen",
    originLat: "Latitud Origen",
    originLng: "Longitud Origen",
    destAddress: "Dirección de Destino",
    destLat: "Latitud Destino",
    destLng: "Longitud Destino",
    paymentMethod: "Método de Pago",
    cash: "Efectivo",
    transfer: "Transferencia",
    createBtn: "Crear Favor",
    creatingBtn: "Creando...",
    myErrandsTitle: "Mis Favores",
    noErrands: "Aún no tienes favoress. ¡Crea uno!",
    cancel: "Cancelar",
  },

  // Rider pages
  rider: {
    availableTitle: "Favoress Disponibles",
    myErrandsTitle: "Mis Favoress",
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
    copyright: "© 2026 MotoFleet. Todos los derechos reservados.",
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
