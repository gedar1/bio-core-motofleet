import React from "react";
import { useMyErrands } from "../../hooks";
import { t } from "../../i18n";
import { AvailableErrands } from "./AvailableErrands";
import { RiderErrandsContent } from "./components/RiderErrandsContent";

/**
 * Operational rider landing page. An active assignment takes priority; without
 * one, the rider lands on available work and its first route preview.
 */
export const RiderHome: React.FC = () => {
  const { errands, loading, refresh } = useMyErrands();

  if (loading) {
    return <p className="caption py-2xl text-center">{t.common.loading}</p>;
  }

  const hasActiveErrand = errands.some(
    (errand) => errand.status === "accepted" || errand.status === "picked_up",
  );

  return hasActiveErrand ? (
    <RiderErrandsContent
      errands={errands}
      refresh={refresh}
      showHistory={false}
    />
  ) : (
    <AvailableErrands />
  );
};
