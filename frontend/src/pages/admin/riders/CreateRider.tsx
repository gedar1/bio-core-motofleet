import React from "react";
import { useNavigate } from "react-router-dom";
import { RiderRegistrationForm } from "../../../components/shared/RiderRegistrationForm";

export const CreateRider: React.FC = () => {
  const navigate = useNavigate();

  return (
    <RiderRegistrationForm
      title="Registrar motociclista"
      submitLabel="Registrar motociclista"
      onSuccess={() => navigate("/admin?tab=riders")}
    />
  );
};
