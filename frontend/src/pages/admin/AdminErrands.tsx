import React from "react";
import { useAdminErrands } from "../../hooks";
import { Card } from "../../components/ui";
import { t, translateStatus } from "../../i18n";

export const AdminErrands: React.FC = () => {
  const { errands, loading } = useAdminErrands();

  if (loading)
    return <p className="caption text-center py-2xl">{t.common.loading}</p>;

  return (
    <div className="section px-2xl">
      <div className="max-w-[1280px] mx-auto">
        <h2 className="mb-2xl">{t.admin.errandsTitle}</h2>
        {errands.length === 0 ? (
          <p className="text-muted font-body text-body-md">
            {t.admin.noErrands}
          </p>
        ) : (
          <div className="flex flex-col gap-lg">
            {errands.map((e) => (
              <Card key={e.id} className="p-xl">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="caption">
                      {translateStatus(e.type)} · {translateStatus(e.status)}
                    </p>
                    <p className="font-body text-body-md text-ink mt-xs">
                      {e.description}
                    </p>
                    <p className="font-body text-body-sm text-slate mt-xs">
                      {e.origin_address} → {e.destination_address}
                    </p>
                  </div>
                  <p className="font-display text-heading-5 text-ink">
                    ${e.fare}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
