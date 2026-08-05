import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button, Input } from "../../components/ui";
import { t } from "../../i18n";

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
            label={t.auth.name.toUpperCase()}
            value={form.name}
            onChange={handleChange("name")}
            required
          />
          <Input
            label={t.auth.email.toUpperCase()}
            type="email"
            value={form.email}
            onChange={handleChange("email")}
            required
          />
          <Input
            label={t.auth.phone.toUpperCase()}
            value={form.phone}
            onChange={handleChange("phone")}
            required
          />
          <Input
            label={t.auth.address.toUpperCase()}
            value={form.address}
            onChange={handleChange("address")}
            required
          />
          <Input
            label={t.auth.password.toUpperCase()}
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
          {t.auth.hasAccount}{" "}
          <a href="/login" className="text-link">
            {t.auth.signIn}
          </a>
        </p>
      </div>
    </div>
  );
};
