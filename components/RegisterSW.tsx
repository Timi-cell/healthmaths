"use client";
import { useEffect, useRef, useState } from "react";

export default function RegisterSW() {
  const [toast, setToast] = useState("");
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const toastTimeout = useRef<number | null>(null);

  // Small messages from anywhere in the app: window.dispatchEvent(new CustomEvent('healthmaths:toast', { detail: '...' }))
  useEffect(() => {
    const showUpdatedToast = () => {
      setToast("App Updated");
      if (toastTimeout.current !== null)
        window.clearTimeout(toastTimeout.current);
      toastTimeout.current = window.setTimeout(() => {
        setToast("");
        toastTimeout.current = null;
      }, 4000);
      delete document.documentElement.dataset.updateComplete;
    };
    addEventListener("healthmaths:update-complete", showUpdatedToast);
    if (document.documentElement.dataset.updateComplete === "true")
      showUpdatedToast();
    const on = (e: Event) => {
      const detail = String((e as CustomEvent).detail);
      setToast(detail);
      if (toastTimeout.current !== null)
        window.clearTimeout(toastTimeout.current);
      toastTimeout.current = window.setTimeout(() => {
        setToast("");
        toastTimeout.current = null;
      }, 4000);
    };
    addEventListener("healthmaths:toast", on);
    return () => {
      removeEventListener("healthmaths:update-complete", showUpdatedToast);
      removeEventListener("healthmaths:toast", on);
      if (toastTimeout.current !== null)
        window.clearTimeout(toastTimeout.current);
    };
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
        try {
          sessionStorage.setItem("healthmaths:update-reload-pending", "true");
        } catch {
          // Reload even when storage is unavailable; the app remains usable.
        }
        location.reload();
      }
    };
    const applyUpdate = () => {
      wantsUpdate = true;
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
    (window as Window & { __applyUpdate?: () => void }).__applyUpdate?.();
    document.documentElement.dataset.showIntro = "true";
    document.documentElement.dataset.introStart = String(Date.now());
    document.documentElement.dataset.updating = "true";
    window.dispatchEvent(new Event("healthmaths:updating"));
    waiting?.postMessage({ type: "SKIP_WAITING" });
  };

  if (waiting && toast !== "App Updated")
    return (
      <div className="toast" role="status">
        <span>We've added some updates!</span>
        <button onClick={update}>Update HealthMaths</button>
      </div>
    );
  return toast ? (
    <div className="toast" role="status">
      {toast}
    </div>
  ) : null;
}
