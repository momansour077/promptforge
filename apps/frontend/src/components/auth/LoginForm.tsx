import { useState } from "react";

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "../../hooks/useAuth";
import { uiAction } from "../../utils/uiAction";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";

export const LoginForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);

  return (
    <Card className="space-y-4">
      <h2 className="font-heading text-4xl">{t("auth.login")}</h2>
      <Input
        type="email"
        placeholder={t("auth.email")}
        value={form.email}
        onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
      />
      <Input
        type="password"
        placeholder={t("auth.password")}
        value={form.password}
        onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
      />
      <Button
        type="button"
        disabled={loading}
        onClick={uiAction(async () => {
          setLoading(true);

          try {
            await login(form);
            toast.success(t("toast.loginSuccess"));
            await navigate("/dashboard");
          } catch (error) {
            const message = error instanceof Error ? error.message : t("errors.generic");
            toast.error(message);
          } finally {
            setLoading(false);
          }
        }, t("errors.generic"))}
      >
        {loading ? t("common.loading") : t("auth.login")}
      </Button>
    </Card>
  );
};
