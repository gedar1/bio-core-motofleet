import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button, Input } from "../../components/ui";
import { t } from "../../i18n";
import { inputRules } from "../../validation/inputRules";

export const Register: React.FC = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    password: "",
  });
  const { register, error, loading } = useAuth();
  const navigate = useNavigate();

  const handleChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(form);
      navigate("/login");
    } catch {
      // error handled by context
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-xl py-2xl">
      <div className="w-full max-w-[400px]">
        <h1 className="text-center mb-2xl">
          {t.auth.registerTitle.toUpperCase()}
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
          <Input
            {...inputRules.name}
            label={t.auth.name.toUpperCase()}
            name="name"
            value={form.name}
            onChange={handleChange("name")}
            required
          />
          <Input
            {...inputRules.email}
            label={t.auth.email.toUpperCase()}
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange("email")}
            required
          />
          <Input
            {...inputRules.phone}
            label={t.auth.phone.toUpperCase()}
            name="phone"
            value={form.phone}
            onChange={handleChange("phone")}
            required
          />
          <Input
            {...inputRules.address}
            label={t.auth.address.toUpperCase()}
            name="address"
            value={form.address}
            onChange={handleChange("address")}
            required
          />
          <Input
            {...inputRules.password}
            label={t.auth.password.toUpperCase()}
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange("password")}
            required
          />
          {error && (
            <p className="font-mono text-caption text-warning">{error}</p>
          )}
          <Button type="submit" className="mt-lg w-full" disabled={loading}>
            {loading
              ? t.auth.creating.toUpperCase()
              : t.auth.createAccount.toUpperCase()}
          </Button>
        </form>
        <p className="mt-xl text-center font-body text-body-sm text-muted">
          ¿Quieres trabajar como rider?{" "}
          <Link to="/register/rider" className="text-link">
            Regístrate como rider
          </Link>
        </p>
        <p className="mt-md text-center font-body text-body-sm text-muted">
          {t.auth.hasAccount}{" "}
          <Link to="/login" className="text-link">
            {t.auth.signIn}
          </Link>
        </p>
      </div>
    </div>
  );
};
