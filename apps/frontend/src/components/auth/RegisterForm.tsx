import { useState } from "react";

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "../../hooks/useAuth";
import { useLanguage } from "../../hooks/useLanguage";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Select } from "../ui/select";

export const RegisterForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    language
  });

  return (
    <Card className="space-y-4">
      <h2 className="font-heading text-4xl">{t("auth.register")}</h2>
      <Input
        placeholder={t("auth.name")}
        value={form.name}
        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
      />
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
      <Select
        value={form.language}
        onChange={(event) =>
          setForm((current) => ({ ...current, language: event.target.value as "en" | "ar" }))
        }
      >
        <option value="en">English</option>
        <option value="ar">العربية</option>
      </Select>
      <Button
        type="button"
        disabled={loading}
        onClick={async () => {
          setLoading(true);

          try {
            await register(form);
            toast.success(t("toast.registerSuccess"));
            navigate("/dashboard");
          } catch (error) {
            const message = error instanceof Error ? error.message : t("errors.generic");
            toast.error(message);
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? t("common.loading") : t("auth.register")}
      </Button>
    </Card>
  );
};

