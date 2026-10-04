import React, { useEffect, useState } from "react";
import { useMyErrands } from "../../hooks";
import { t } from "../../i18n";
import { RiderErrandsContent } from "./components/RiderErrandsContent";

/**
 * Standalone route container for /rider/errands.
 * RiderHome reuses RiderErrandsContent with its existing subscription instead.
 */
export const RiderErrands: React.FC = () => {
  const { errands, loading, refreshing, error, refresh } = useMyErrands();
  const [hasResolvedMyErrands, setHasResolvedMyErrands] = useState(false);

  useEffect(() => {
    if (!loading && !error) setHasResolvedMyErrands(true);
  }, [loading, error]);

  const hasKnownSnapshot = hasResolvedMyErrands || (!loading && !error);
  const retry = () => {
    if (loading || refreshing) return;
    void refresh(true);
  };

  if (error && !hasKnownSnapshot) {
    return (
      <div className="section-mobile md:section px-2xl">
        <div className="mx-auto max-w-[1280px]">
          <h2 className="mb-2xl">{t.nav.riderHistory}</h2>
          <div className="flex flex-col gap-sm" role="alert">
            <p className="font-body text-body-md text-error">
              {t.common.failedLoad}
            </p>
            <button
              type="button"
              className="self-start font-body text-body-sm underline"
              onClick={retry}
              disabled={loading || refreshing}
            >
              {t.common.retry}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !hasKnownSnapshot) {
    return (
      <div className="section-mobile md:section px-2xl">
        <div className="mx-auto max-w-[1280px]">
          <h2 className="mb-2xl">{t.nav.riderHistory}</h2>
          <div
            className="rounded-md border border-hairline p-xl"
            aria-busy="true"
            aria-live="polite"
            role="status"
          >
            <p className="text-muted font-body text-body-md">
              {t.rider.loadingHistory}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RiderErrandsContent
      errands={errands}
      refresh={refresh}
      refreshing={loading || refreshing}
      error={error}
      onRetry={retry}
    />
  );
};
