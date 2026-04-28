import { History, Home, LayoutGrid, Settings2, Sparkles } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { cn } from "../../utils/cn";

const items = [
  { to: "/dashboard", icon: Sparkles, key: "nav.dashboard" },
  { to: "/history", icon: History, key: "nav.history" },
  { to: "/collections", icon: LayoutGrid, key: "nav.collections" },
  { to: "/settings", icon: Settings2, key: "nav.settings" },
  { to: "/", icon: Home, key: "nav.home" }
];

export const Sidebar = () => {
  const { t } = useTranslation();

  return (
    <aside className="glass h-fit rounded-[30px] p-4 lg:sticky lg:top-4">
      <p className="mb-4 px-3 text-xs uppercase tracking-[0.22em] text-[var(--text-secondary)]">
        PromptForge
      </p>
      <div className="shell-rule mb-4" />
      <nav className="space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-[20px] px-3 py-3 text-sm transition",
                isActive
                  ? "bg-[linear-gradient(135deg,rgba(106,124,255,0.95),rgba(81,165,255,0.88))] text-white shadow-glow"
                  : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]"
              )
            }
          >
            <item.icon className="size-4" />
            {t(item.key)}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
