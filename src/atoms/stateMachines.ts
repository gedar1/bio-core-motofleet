/**
 * State machines for MotoFleet MVP.
 * Defines valid state transitions for motorcycles, contracts, and errands.
 * All functions are pure — no side effects or I/O.
 */

export type MotorcycleState =
  | "available"
  | "rented"
  | "maintenance"
  | "retired";
export type ContractState = "active" | "expired" | "renewed" | "cancelled";
export type ErrandState =
  | "requested"
  | "accepted"
  | "picked_up"
  | "delivered"
  | "cancelled";

/**
 * Valid motorcycle state transitions map.
 * "retired" is terminal — no outgoing transitions.
 */
const motorcycleTransitions: Record<MotorcycleState, MotorcycleState[]> = {
  available: ["rented", "maintenance", "retired"],
  rented: ["available", "retired"],
  maintenance: ["available", "retired"],
  retired: [],
};

/**
 * Valid contract state transitions map.
 * "renewed" and "cancelled" are terminal states.
 */
const contractTransitions: Record<ContractState, ContractState[]> = {
  active: ["expired", "renewed", "cancelled"],
  expired: ["renewed"],
  renewed: [],
  cancelled: [],
};

/**
 * Valid errand state transitions map.
 * "delivered" and "cancelled" are terminal states.
 */
const errandTransitions: Record<ErrandState, ErrandState[]> = {
  requested: ["accepted", "cancelled"],
  accepted: ["picked_up", "cancelled"],
  picked_up: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

/**
 * Validates if a motorcycle state transition is allowed.
 * "retired" is terminal — all transitions from it return false.
 * If context.hasActiveContract is true, blocks rented → retired.
 */
export function isValidMotorcycleTransition(
  from: MotorcycleState,
  to: MotorcycleState,
  context?: { hasActiveContract?: boolean },
): boolean {
  const validTargets = motorcycleTransitions[from];
  if (!validTargets.includes(to)) {
    return false;
  }

  // Block rented → retired when there's an active contract
  if (from === "rented" && to === "retired" && context?.hasActiveContract) {
    return false;
  }

  return true;
}

/**
 * Validates if a contract state transition is allowed.
 * "renewed" and "cancelled" are terminal — no outgoing transitions.
 */
export function isValidContractTransition(
  from: ContractState,
  to: ContractState,
): boolean {
  return contractTransitions[from].includes(to);
}

/**
 * Validates if an errand state transition is allowed.
 * "delivered" and "cancelled" are terminal — no outgoing transitions.
 */
export function isValidErrandTransition(
  from: ErrandState,
  to: ErrandState,
): boolean {
  return errandTransitions[from].includes(to);
}

/**
 * Returns all valid target states from a given motorcycle state,
 * considering context constraints.
 */
export function getValidMotorcycleTransitions(
  from: MotorcycleState,
  context?: { hasActiveContract?: boolean },
): MotorcycleState[] {
  const validTargets = motorcycleTransitions[from];

  // Filter out retired when transitioning from rented with active contract
  if (from === "rented" && context?.hasActiveContract) {
    return validTargets.filter((target) => target !== "retired");
  }

  return [...validTargets];
}

/**
 * Returns all valid target states from a given errand state.
 */
export function getValidErrandTransitions(from: ErrandState): ErrandState[] {
  return [...errandTransitions[from]];
}
