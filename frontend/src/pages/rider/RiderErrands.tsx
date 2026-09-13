import React from "react";
import { useMyErrands } from "../../hooks";
import { t } from "../../i18n";
import { RiderErrandsContent } from "./components/RiderErrandsContent";

/**
 * Standalone route container for /rider/errands.
 * RiderHome reuses RiderErrandsContent with its existing subscription instead.
 */
export const RiderErrands: React.FC = () => {
  const { errands, loading, refresh } = useMyErrands();

  if (loading) {
    return <p className="caption text-center py-2xl">{t.common.loading}</p>;
  }

  return <RiderErrandsContent errands={errands} refresh={refresh} />;
};
