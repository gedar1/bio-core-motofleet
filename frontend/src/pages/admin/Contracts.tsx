import React from "react";
import { Link } from "react-router-dom";
import { useContracts } from "../../hooks";
import { Card, Button } from "../../components/ui";
import { t, translateStatus } from "../../i18n";

export const Contracts: React.FC = () => {
  const { contracts, loading } = useContracts();

  if (loading)
    return <p className="caption text-center py-2xl">{t.common.loading}</p>;

  return (
    <div className="section px-2xl">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex justify-between items-center mb-2xl">
          <h2>{t.admin.contractsTitle}</h2>
          <Link to="/admin/contracts/create">
            <Button>{t.adminForms.crear}</Button>
          </Link>
        </div>
        {contracts.length === 0 ? (
          <p className="text-muted font-body text-body-md">
            {t.admin.noContracts}
          </p>
        ) : (
          <div className="flex flex-col gap-lg">
            {contracts.map((c) => (
              <Card key={c.id} className="p-xl">
                <p className="caption">{translateStatus(c.status)}</p>
                <p className="font-body text-body-md text-ink mt-xs">
                  ${c.monthly_amount?.toLocaleString()}
                  {t.admin.perMonth} — {t.admin.day} {c.payment_day}
                </p>
                {(c as any).rider_name && (
                  <p className="font-body text-body-sm text-ink mt-xs">
                    👤 {(c as any).rider_name}{" "}
                    {(c as any).motorcycle_plate
                      ? `· 🏍️ ${(c as any).motorcycle_plate}`
                      : ""}
                  </p>
                )}
                <p className="font-body text-body-sm text-slate mt-xs">
                  {c.start_date} → {c.end_date}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
