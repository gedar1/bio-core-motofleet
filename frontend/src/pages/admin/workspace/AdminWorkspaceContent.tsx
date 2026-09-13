import { Contracts } from "../contracts/Contracts";
import { CreateContract } from "../contracts/CreateContract";
import { EditContract } from "../contracts/EditContract";
import { AdminErrands } from "../errands/AdminErrands";
import { Metrics } from "../metrics/Metrics";
import { CreateMotorcycle } from "../motorcycles/CreateMotorcycle";
import { EditMotorcycle } from "../motorcycles/EditMotorcycle";
import { Motorcycles } from "../motorcycles/Motorcycles";
import { CreateRider } from "../riders/CreateRider";
import { EditRider } from "../riders/EditRider";
import { Riders } from "../riders/Riders";
import { CreatePricingRule } from "../rules/CreatePricingRule";
import { EditPricingRule } from "../rules/EditPricingRule";
import { PricingRules } from "../rules/PricingRules";
import { WorkspaceBackButton } from "./WorkspaceBackButton";

type AdminWorkspaceContentProps = {
  readonly activeTab: string;
  readonly mode: string | null;
  readonly editId: string | null;
  readonly onBack: () => void;
};

export const AdminWorkspaceContent = ({
  activeTab,
  mode,
  editId,
  onBack,
}: AdminWorkspaceContentProps) => {
  if (mode === "edit") {
    if (!editId) {
      return (
        <p className="section px-md text-error">
          No se especificó el registro que se desea editar.
        </p>
      );
    }

    switch (activeTab) {
      case "motorcycles":
        return (
          <div>
            <WorkspaceBackButton label="Motocicletas" onBack={onBack} />
            <EditMotorcycle motorcycleId={editId} />
          </div>
        );
      case "riders":
        return (
          <div>
            <WorkspaceBackButton label="Riders" onBack={onBack} />
            <EditRider riderId={editId} />
          </div>
        );
      case "contracts":
        return (
          <div>
            <WorkspaceBackButton label="Contratos" onBack={onBack} />
            <EditContract contractId={editId} />
          </div>
        );
      case "pricing":
        return (
          <div>
            <WorkspaceBackButton label="Tarifas" onBack={onBack} />
            <EditPricingRule ruleId={editId} />
          </div>
        );
      default:
        return <Metrics />;
    }
  }

  if (mode === "create") {
    switch (activeTab) {
      case "motorcycles":
        return (
          <div>
            <WorkspaceBackButton label="Motocicletas" onBack={onBack} />
            <CreateMotorcycle />
          </div>
        );
      case "riders":
        return (
          <div>
            <WorkspaceBackButton label="Riders" onBack={onBack} />
            <CreateRider />
          </div>
        );
      case "contracts":
        return (
          <div>
            <WorkspaceBackButton label="Contratos" onBack={onBack} />
            <CreateContract />
          </div>
        );
      case "pricing":
        return (
          <div>
            <WorkspaceBackButton label="Tarifas" onBack={onBack} />
            <CreatePricingRule />
          </div>
        );
      case "overview":
        return <Metrics />;
      default:
        return <Metrics />;
    }
  }

  switch (activeTab) {
    case "overview":
      return <Metrics />;
    case "motorcycles":
      return (
        <div>
          <Motorcycles />
        </div>
      );
    case "riders":
      return (
        <div>
          <Riders />
        </div>
      );
    case "contracts":
      return (
        <div>
          <Contracts />
        </div>
      );
    case "pricing":
      return (
        <div>
          <PricingRules />
        </div>
      );
    case "errands":
      return <AdminErrands />;
    default:
      return <Metrics />;
  }
};
