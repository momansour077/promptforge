import { Suspense, lazy, useEffect } from "react";

import { Toaster } from "sonner";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";

import { Footer } from "./components/layout/Footer";
import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { useAuth } from "./hooks/useAuth";
import { useLanguage } from "./hooks/useLanguage";
import { useUIStore } from "./store/uiStore";
const HomePage = lazy(async () => import("./pages/HomePage").then((module) => ({ default: module.HomePage })));
const AuthPage = lazy(async () => import("./pages/AuthPage").then((module) => ({ default: module.AuthPage })));
const DashboardPage = lazy(async () => import("./pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const HistoryPage = lazy(async () => import("./pages/HistoryPage").then((module) => ({ default: module.HistoryPage })));
const CollectionsPage = lazy(async () => import("./pages/CollectionsPage").then((module) => ({ default: module.CollectionsPage })));
const SettingsPage = lazy(async () => import("./pages/SettingsPage").then((module) => ({ default: module.SettingsPage })));

const warmProtectedRoutes = async (): Promise<void> => {
  await Promise.all([
    import("./pages/DashboardPage"),
    import("./pages/HistoryPage"),
    import("./pages/CollectionsPage"),
    import("./pages/SettingsPage")
  ]);
};

const RouteFallback = () => (
  <div className="flex min-h-[280px] items-center justify-center">
    <div className="glass rounded-[28px] px-6 py-4">Loading workspace...</div>
  </div>
);

const ProtectedLayout = () => {
  const { status } = useAuth();

  if (status === "loading" || status === "idle") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="glass rounded-[28px] px-6 py-4">Loading workspace...</div>
      </div>
    );
  }

  if (status === "guest") {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="app-shell mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
      <div className="liquid-orb one" />
      <div className="liquid-orb two" />
      <Header />
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <Sidebar />
        <div>
          <Outlet />
          <Footer />
        </div>
      </div>
    </div>
  );
};

const AppRoot = () => {
  const theme = useUIStore((state) => state.theme);
  const { loadUser, status } = useAuth();
  const { language } = useLanguage();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (status === "authenticated") {
      void warmProtectedRoutes();
    }
  }, [status]);

  return (
    <>
      <Toaster
        richColors
        position={language === "ar" ? "top-left" : "top-right"}
        theme={theme === "dark" ? "dark" : "light"}
      />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/collections" element={<CollectionsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
};

const App = () => (
  <BrowserRouter>
    <AppRoot />
  </BrowserRouter>
);

export default App;
