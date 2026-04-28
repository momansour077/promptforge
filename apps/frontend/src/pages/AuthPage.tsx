import { useState } from "react";

import { useTranslation } from "react-i18next";

import { Header } from "../components/layout/Header";
import { LoginForm } from "../components/auth/LoginForm";
import { RegisterForm } from "../components/auth/RegisterForm";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";

export const AuthPage = () => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <div className="app-shell mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
      <div className="liquid-orb one" />
      <Header />
      <section className="grid gap-6 py-10 lg:grid-cols-[0.92fr_1.08fr]">
        <Card className="space-y-5 p-8">
          <p className="eyebrow">Secure Access</p>
          <h1 className="font-heading text-6xl">{t("auth.title")}</h1>
          <p className="max-w-lg text-[var(--text-secondary)]">{t("auth.subtitle")}</p>
          <div className="flex gap-3">
            <Button
              type="button"
              variant={mode === "login" ? "primary" : "secondary"}
              onClick={() => setMode("login")}
            >
              {t("auth.login")}
            </Button>
            <Button
              type="button"
              variant={mode === "register" ? "primary" : "secondary"}
              onClick={() => setMode("register")}
            >
              {t("auth.register")}
            </Button>
          </div>
        </Card>
        {mode === "login" ? <LoginForm /> : <RegisterForm />}
      </section>
    </div>
  );
};
