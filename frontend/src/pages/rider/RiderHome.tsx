import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMyErrands } from "../../hooks";
import { Button } from "../../components/ui";
import type { Errand } from "../../types/errand";
import { t } from "../../i18n";
import { RiderErrandsContent } from "./components/RiderErrandsContent";
import { mergeErrands, isActiveRiderErrand } from "./utils/riderErrandState";

type RiderNavigationState = {
  readonly acceptedErrand?: Errand;
};

const getAcceptedErrand = (state: unknown): Errand | null => {
  if (!state || typeof state !== "object") return null;
  const acceptedErrand = (state as RiderNavigationState).acceptedErrand;
  return acceptedErrand?.id && isActiveRiderErrand(acceptedErrand)
    ? acceptedErrand
    : null;
};

/**
 * Operational rider landing page. Only an accepted assignment belongs here;
 * available work has its own dedicated route.
 */
export const RiderHome: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { errands, loading, refreshing, error, refresh } = useMyErrands();
  const [confirmedErrand, setConfirmedErrand] = useState<Errand | null>(() =>
    getAcceptedErrand(location.state),
  );
  const [hasResolvedMyErrands, setHasResolvedMyErrands] = useState(false);

  useEffect(() => {
    const acceptedErrand = getAcceptedErrand(location.state);
    if (!acceptedErrand) return;

    setConfirmedErrand(acceptedErrand);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!confirmedErrand || loading || error) return;

    // Once /my has answered, its server snapshot is authoritative. The
    // navigation payload only bridges the acceptance-to-render transition.
    setConfirmedErrand(null);
  }, [confirmedErrand, errands, error, loading]);

  useEffect(() => {
    if (!loading && !error) setHasResolvedMyErrands(true);
  }, [loading, error]);

  const visibleErrands = useMemo(
    () =>
      confirmedErrand ? mergeErrands([confirmedErrand], errands) : errands,
    [confirmedErrand, errands],
  );
  const hasActiveErrand = visibleErrands.some(isActiveRiderErrand);

  const hasKnownSnapshot = hasResolvedMyErrands || (!loading && !error);
  const isUpdating = refreshing || (loading && hasResolvedMyErrands);
  const retry = () => void refresh(true);

  let content: React.ReactNode;

  if (hasActiveErrand) {
    content = (
      <RiderErrandsContent
        errands={visibleErrands}
        refresh={refresh}
        refreshing={loading || refreshing}
        error={error}
        onRetry={retry}
        showHistory={false}
      />
    );
  } else if (error && !hasKnownSnapshot) {
    content = (
      <div className="section-mobile md:section px-2xl">
        <div className="mx-auto max-w-[1280px]">
          <h2 className="mb-2xl">{t.nav.activeRoute}</h2>
          <div className="flex flex-col gap-sm" role="alert">
            <p className="font-body text-body-md text-error">
              {t.common.failedLoad}
            </p>
            <button
              type="button"
              className="self-start font-body text-body-sm underline"
              onClick={retry}
            >
              {t.rider.retry}
            </button>
          </div>
          <Link to="/rider/available" className="mt-lg inline-block">
            <Button>{t.rider.viewAvailable}</Button>
          </Link>
        </div>
      </div>
    );
  } else if (loading && !hasKnownSnapshot) {
    content = (
      <div className="section-mobile md:section px-2xl">
        <div className="mx-auto max-w-[1280px]">
          <h2 className="mb-2xl">{t.nav.activeRoute}</h2>
          <div
            className="rounded-md border border-hairline p-xl"
            aria-busy="true"
            aria-live="polite"
            role="status"
          >
            <p className="text-muted font-body text-body-md">
              {t.rider.loadingActive}
            </p>
          </div>
        </div>
      </div>
    );
  } else {
    content = (
      <div className="section-mobile md:section px-2xl">
        <div className="mx-auto max-w-[1280px]">
          <h2 className="mb-2xl">{t.nav.activeRoute}</h2>
          {isUpdating && (
            <p
              className="mb-lg text-muted font-body text-body-sm"
              aria-live="polite"
              role="status"
            >
              {t.rider.refreshingActive}
            </p>
          )}
          {error && (
            <div className="mb-lg flex flex-col gap-sm" role="alert">
              <p className="font-body text-body-md text-error">
                {t.common.failedLoad}
              </p>
              <button
                type="button"
                className="self-start font-body text-body-sm underline"
                onClick={retry}
              >
                {t.rider.retry}
              </button>
            </div>
          )}
          <p className="text-muted font-body text-body-md">
            {t.rider.noActive}
          </p>
          <Link to="/rider/available" className="mt-lg inline-block">
            <Button>{t.rider.viewAvailable}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return <>{content}</>;
};
