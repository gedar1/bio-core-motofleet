import React from "react";
import { Link } from "react-router-dom";
import { useMotorcycles } from "../../hooks";
import { Card, Button } from "../../components/ui";
import { t, translateStatus } from "../../i18n";

export const Motorcycles: React.FC = () => {
  const { motorcycles, loading } = useMotorcycles();

  if (loading)
    return <p className="caption text-center py-2xl">{t.common.loading}</p>;

  return (
    <div className="section px-2xl">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex justify-between items-center mb-2xl">
          <h2>{t.admin.motorcyclesTitle}</h2>
          <Link to="/admin/motorcycles/create">
            <Button>{t.adminForms.crear}</Button>
          </Link>
        </div>
        {motorcycles.length === 0 ? (
          <p className="text-muted font-body text-body-md">
            {t.admin.noMotorcycles}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
            {motorcycles.map((m) => (
              <Card key={m.id} className="p-xl">
                <h4 className="mb-sm">{m.plate}</h4>
                <p className="font-body text-body-sm text-slate">
                  {m.brand} {m.model} ({m.year}) — {m.color}
                </p>
                <p className="caption mt-sm">
                  {translateStatus(m.status)} · {m.engine_cc}CC
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
