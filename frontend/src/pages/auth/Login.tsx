import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button, Input } from "../../components/ui";
import { t } from "../../i18n";
import { getRoleHomePath } from "../../navigation";
import { inputRules } from "../../validation/inputRules";

export const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, error, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const role = await login(email, password);
      navigate(getRoleHomePath(role));
    } catch {
      // error is handled by context
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-xl">
      <div className="w-full max-w-[400px]">
        <h1 className="text-center mb-2xl">
          {t.auth.loginTitle.toUpperCase()}
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
          <Input
            {...inputRules.email}
            label={t.auth.email.toUpperCase()}
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            required
          />
          <Input
            {...inputRules.password}
            label={t.auth.password.toUpperCase()}
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          {error && (
            <p className="font-mono text-caption text-warning">{error}</p>
          )}
          <Button type="submit" className="mt-lg w-full" disabled={loading}>
            {loading
              ? t.auth.loading.toUpperCase()
              : t.auth.signInBtn.toUpperCase()}
          </Button>
        </form>
        <p className="mt-xl text-center font-body text-body-sm text-muted">
          {t.auth.noAccount}{" "}
          <a href="/register" className="text-link">
            {t.auth.register}
          </a>
        </p>
      </div>
    </div>
  );
};
