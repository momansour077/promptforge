import { useEffect, useState } from "react";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { useAuth } from "../hooks/useAuth";
import { userService } from "../services/userService";
import type { StatsPayload } from "../types";

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return fallback;
};

export const SettingsPage = () => {
  const { t } = useTranslation();
  const { user, updateProfile, changePassword } = useAuth();
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [quota, setQuota] = useState<{ limit: number | null; used: number; remaining: number | null; resetAt: number } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name ?? "",
    language: user?.language ?? "en"
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [usageStats, quotaState] = await Promise.all([userService.stats(), userService.quota()]);
        setStats(usageStats);
        setQuota(quotaState);
      } catch {
        toast.error(t("errors.generic"));
      }
    };

    void load();
  }, [t]);

  useEffect(() => {
    setProfileForm({
      name: user?.name ?? "",
      language: user?.language ?? "en"
    });
  }, [user]);

  const usageRatio =
    quota && quota.limit ? Math.min((quota.used / quota.limit) * 100, 100) : 0;

  return (
    <section className="space-y-6">
      <div>
        <p className="eyebrow">Control</p>
        <h1 className="mt-2 font-heading text-6xl">{t("settings.title")}</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="font-heading text-4xl">{t("settings.profile")}</h2>
          <Input
            placeholder={t("auth.name")}
            value={profileForm.name}
            onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))}
          />
          <Input disabled value={user?.email ?? ""} aria-label={t("settings.readOnlyEmail")} />
          <Select
            value={profileForm.language}
            onChange={(event) =>
              setProfileForm((current) => ({
                ...current,
                language: event.target.value as "en" | "ar"
              }))
            }
          >
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </Select>
          <Button
            type="button"
            disabled={savingProfile}
            onClick={async () => {
              setSavingProfile(true);

              try {
                await updateProfile(profileForm);
                toast.success(t("toast.profileSaved"));
              } catch (error) {
                toast.error(getErrorMessage(error, t("errors.generic")));
              } finally {
                setSavingProfile(false);
              }
            }}
          >
            {t("common.update")}
          </Button>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-heading text-4xl">{t("settings.security")}</h2>
          <Input
            type="password"
            placeholder={t("settings.currentPassword")}
            value={passwordForm.currentPassword}
            onChange={(event) =>
              setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))
            }
          />
          <Input
            type="password"
            placeholder={t("settings.newPassword")}
            value={passwordForm.newPassword}
            onChange={(event) =>
              setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))
            }
          />
          <Input
            type="password"
            placeholder={t("auth.confirmPassword")}
            value={passwordForm.confirmPassword}
            onChange={(event) =>
              setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))
            }
          />
          <Button
            type="button"
            disabled={savingPassword}
            onClick={async () => {
              setSavingPassword(true);

              try {
                await changePassword(passwordForm);
                toast.success(t("toast.passwordSaved"));
                setPasswordForm({
                  currentPassword: "",
                  newPassword: "",
                  confirmPassword: ""
                });
              } catch (error) {
                toast.error(getErrorMessage(error, t("errors.generic")));
              } finally {
                setSavingPassword(false);
              }
            }}
          >
            {t("common.update")}
          </Button>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4">
          <h2 className="font-heading text-4xl">{t("settings.usage")}</h2>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.dailyUsage ?? []}>
                <XAxis dataKey="date" stroke="var(--text-secondary)" tick={{ fontSize: 10 }} />
                <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366F1" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-heading text-4xl">{t("settings.plan")}</h2>
          <p className="text-sm text-[var(--text-secondary)]">{user?.plan ?? "FREE"}</p>
          <div className="rounded-full bg-white/10">
            <div
              className="h-3 rounded-full bg-accent transition-all"
              style={{ width: `${usageRatio}%` }}
            />
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            {t("settings.planUsage")}: {quota?.used ?? 0}/{quota?.limit ?? "∞"}
          </p>
          <Button type="button" variant="secondary">
            {t("settings.upgrade")}
          </Button>
        </Card>
      </div>
    </section>
  );
};
