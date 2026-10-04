import type { Errand } from "../../../types/errand";

export const isPendingRiderErrand = (errand: Errand): boolean =>
  errand.status === "requested" && !errand.rider_id;

export const isActiveRiderErrand = (errand: Errand): boolean =>
  errand.status === "accepted" || errand.status === "picked_up";

const getTimestamp = (errand: Errand): number => {
  const timestamp = errand.updated_at || errand.accepted_at || errand.created_at;
  return timestamp ? Date.parse(timestamp) : 0;
};

/** Merge server snapshots without allowing an older response to roll back state. */
export const mergeErrands = (...lists: readonly Errand[][]): Errand[] => {
  const byId = new Map<string, Errand>();

  lists.flat().forEach((candidate) => {
    const current = byId.get(candidate.id);
    if (!current || getTimestamp(candidate) > getTimestamp(current)) {
      byId.set(candidate.id, candidate);
    }
  });

  return Array.from(byId.values());
};

export const getPendingRiderErrands = (errands: readonly Errand[]): Errand[] =>
  mergeErrands(errands.filter(isPendingRiderErrand));

export const getActiveRiderErrands = (errands: readonly Errand[]): Errand[] =>
  mergeErrands(errands.filter(isActiveRiderErrand));
