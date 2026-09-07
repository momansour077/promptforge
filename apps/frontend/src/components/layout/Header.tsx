import { MoonStar, SunMedium } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../hooks/useAuth";
import { uiAction } from "../../utils/uiAction";
import { useLanguage } from "../../hooks/useLanguage";
import { useUIStore } from "../../store/uiStore";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

export const Header = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const theme = useUIStore((state) => state.theme);
  const toggleTheme = useUIStore((state) => state.toggleTheme);

  const handleLogout = async () => {
    await logout();
    await navigate("/");
  };

  return (
    <header className="glass sticky top-4 z-20 mb-6 flex items-center justify-between gap-4 rounded-[28px] px-5 py-4">
      <Link to="/" className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#6a7cff_0%,#51a5ff_100%)] text-white shadow-glow">
          PF
        </div>
        <div>
          <p className="font-heading text-2xl tracking-[0.02em]">{t("appName")}</p>
          <p className="text-xs text-[var(--text-secondary)]">{t("hero.kicker")}</p>
        </div>
      </Link>

      <div className="flex items-center gap-2">
        {user ? <Badge>{user.plan}</Badge> : null}
        <Button
          type="button"
          variant="ghost"
          onClick={() => setLanguage(language === "en" ? "ar" : "en")}
        >
          {language === "en" ? "AR" : "EN"}
        </Button>
        <Button type="button" variant="ghost" onClick={toggleTheme}>
          {theme === "dark" ? <SunMedium className="size-4" /> : <MoonStar className="size-4" />}
        </Button>
        {user ? (
          <Button type="button" variant="secondary" onClick={uiAction(handleLogout, t("errors.generic"))}>
            {t("nav.signOut")}
          </Button>
        ) : (
          <Button asChild variant="secondary">
            <Link to="/auth">{t("nav.signIn")}</Link>
          </Button>
        )}
      </div>
    </header>
  );
};
