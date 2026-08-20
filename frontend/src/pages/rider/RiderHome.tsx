import React from "react";
import { useMyErrands } from "../../hooks";
import { t } from "../../i18n";
import { AvailableErrands } from "./AvailableErrands";
import { RiderErrands } from "./RiderErrands";

/**
 * Operational rider landing page. An active assignment takes priority; without
 * one, the rider lands on available work and its first route preview.
 */
export const RiderHome: React.FC = () => {
  const { errands, loading } = useMyErrands();

  if (loading) {
    return <p className="caption py-2xl text-center">{t.common.loading}</p>;
  }

  const hasActiveErrand = errands.some(
    (errand) =>
      errand.status === "accepted" || errand.status === "picked_up",
  );

  return hasActiveErrand ? <RiderErrands /> : <AvailableErrands />;
};
