import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { RiderRegistrationForm } from "../../components/shared/RiderRegistrationForm";

export const RegisterRider: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <RiderRegistrationForm
        title="Regístrate como rider"
        submitLabel="Crear cuenta de rider"
        onSuccess={() => navigate("/login")}
      />
      <p className="pb-2xl text-center font-body text-body-sm text-muted">
        ¿Ya tienes una cuenta? <Link to="/login" className="text-link">Inicia sesión</Link>
      </p>
    </>
  );
};
