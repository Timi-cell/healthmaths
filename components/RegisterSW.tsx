"use client";
import { useEffect, useState } from "react";

export default function RegisterSW() {
  const [toast, setToast] = useState("");
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  // Small messages from anywhere in the app: window.dispatchEvent(new CustomEvent('healthmaths:toast', { detail: '...' }))
  useEffect(() => {
    const on = (e: Event) => {
      setToast(String((e as CustomEvent).detail));
      setTimeout(() => setToast(""), 4000);
    };
    addEventListener("healthmaths:toast", on);
    return () => removeEventListener("healthmaths:toast", on);
  }, []);

  useEffect(() => {
    if (
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    )
      return;
    let reloading = false;
    let wantsUpdate = false;
    const sw = navigator.serviceWorker;

    sw.register("/sw.js")
      .then((reg) => {
        // A new version has downloaded and is waiting for the user's go-ahead.
        if (reg.waiting && sw.controller) setWaiting(reg.waiting);
        reg.addEventListener("updatefound", () => {
          const w = reg.installing;
          w?.addEventListener("statechange", () => {
            if (w.state === "installed" && sw.controller) setWaiting(w);
          });
        });
        // Look for updates whenever the app comes back to the foreground.
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible")
            reg.update().catch(() => {});
        });
      })
      .catch(() => {});

    sw.addEventListener("controllerchange", () => {
      if (wantsUpdate && !reloading) {
        reloading = true;
        location.reload();
      }
    });
    (window as unknown as { __applyUpdate?: () => void }).__applyUpdate =
      () => {
        wantsUpdate = true;
      };

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
  }, []);

  const update = () => {
    (window as unknown as { __applyUpdate?: () => void }).__applyUpdate?.();
    waiting?.postMessage({ type: "SKIP_WAITING" });
  };

  if (waiting)
    return (
      <div className="toast" role="status">
        <span>New version ready</span>
        <button onClick={update}>Update</button>
      </div>
    );
  return toast ? (
    <div className="toast" role="status">
      {toast}
    </div>
  ) : null;
}
