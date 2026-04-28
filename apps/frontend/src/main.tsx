import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./index.css";
import "./i18n";

const setupServiceWorker = async (): Promise<void> => {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  if (import.meta.env.PROD) {
    await navigator.serviceWorker.register("/service-worker.js");
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map(async (registration) => registration.unregister()));

  if ("caches" in window) {
    const cacheKeys = await window.caches.keys();
    await Promise.all(cacheKeys.map(async (key) => window.caches.delete(key)));
  }
};

void window.addEventListener("load", () => {
  void setupServiceWorker();
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
