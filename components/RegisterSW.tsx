"use client";
import { useEffect, useState } from "react";

const APP_UPDATED_KEY = "healthmaths:app-updated";
const APP_UPDATED_TIMEOUT_MS = 2500;

export default function RegisterSW() {
  const [toast, setToast] = useState("");
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  // Small messages from anywhere in the app: window.dispatchEvent(new CustomEvent('healthmaths:toast', { detail: '...' }))
  useEffect(() => {
    const on = (e: Event) => {
      const detail = String((e as CustomEvent).detail);
      setToast(detail);
      const timeoutId = window.setTimeout(() => setToast(""), 4000);
      return () => window.clearTimeout(timeoutId);
    };
    addEventListener("healthmaths:toast", on);
    return () => removeEventListener("healthmaths:toast", on);
  }, []);

  useEffect(() => {
    const updated = sessionStorage.getItem(APP_UPDATED_KEY);
    if (updated !== "1") return;
    sessionStorage.removeItem(APP_UPDATED_KEY);
    setToast("App Updated!");
    const timeoutId = window.setTimeout(() => setToast(""), APP_UPDATED_TIMEOUT_MS);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    )
      return;
    let reloading = false;
    let wantsUpdate = false;
    let disposed = false;
    let cleanupRegistrationListeners = () => {};
    const sw = navigator.serviceWorker;
    const onControllerChange = () => {
      if (wantsUpdate && !reloading) {
        reloading = true;
        location.reload();
      }
    };
    const applyUpdate = () => {
      wantsUpdate = true;
      sessionStorage.setItem(APP_UPDATED_KEY, "1");
    };
    const appWindow = window as Window & { __applyUpdate?: () => void };

    sw.register("/sw.js")
      .then((reg) => {
        if (disposed) return;
        const checkForUpdate = () => {
          if (navigator.onLine) reg.update().catch(() => {});
        };

        // A new version has downloaded and is waiting for the user's go-ahead.
        if (reg.waiting && sw.controller) setWaiting(reg.waiting);
        const onUpdateFound = () => {
          const w = reg.installing;
          w?.addEventListener("statechange", () => {
            if (w.state === "installed" && sw.controller) setWaiting(w);
          });
        };
        reg.addEventListener("updatefound", onUpdateFound);
        // Check at startup, when connectivity returns, and when the app resumes.
        checkForUpdate();
        const onOnline = () => checkForUpdate();
        const onVisibility = () => {
          if (document.visibilityState === "visible") checkForUpdate();
        };
        addEventListener("online", onOnline);
        document.addEventListener("visibilitychange", onVisibility);
        cleanupRegistrationListeners = () => {
          reg.removeEventListener("updatefound", onUpdateFound);
          removeEventListener("online", onOnline);
          document.removeEventListener("visibilitychange", onVisibility);
        };
      })
      .catch(() => {});

    sw.addEventListener("controllerchange", onControllerChange);
    appWindow.__applyUpdate = applyUpdate;

    // Ask the browser not to evict our saved data and cached app when storage is tight.
    navigator.storage?.persist?.().catch(() => {});
    sw.ready
      .then(() => {
        if (localStorage.getItem("healthmaths:offline-ready")) return;
        localStorage.setItem("healthmaths:offline-ready", "1");
        window.dispatchEvent(
          new CustomEvent("healthmaths:toast", {
            detail: "Ready to use offline.",
          }),
        );
      })
      .catch(() => {});

    return () => {
      disposed = true;
      cleanupRegistrationListeners();
      sw.removeEventListener("controllerchange", onControllerChange);
      if (appWindow.__applyUpdate === applyUpdate)
        delete appWindow.__applyUpdate;
    };
  }, []);

  const update = () => {
    sessionStorage.setItem(APP_UPDATED_KEY, "1");
    (window as Window & { __applyUpdate?: () => void }).__applyUpdate?.();
    waiting?.postMessage({ type: "SKIP_WAITING" });
  };

  if (waiting)
    return (
      <div className="toast" role="status">
        <span>We've added some updates!</span>
        <button onClick={update}>Update HealthMaths App</button>
      </div>
    );
  return toast ? (
    <div className="toast" role="status">
      {toast}
    </div>
  ) : null;
}
