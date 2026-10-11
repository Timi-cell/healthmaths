"use client";
import { useEffect, useRef, useState } from "react";

export default function WelcomeScreen() {
  const [message, setMessage] = useState("Maths in Healthcare, made easier.");
  const timeout = useRef<number | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const finishIntro = (updated: boolean) => {
      delete root.dataset.showIntro;
      delete root.dataset.introStart;
      delete root.dataset.updating;
      timeout.current = null;
      if (updated) window.dispatchEvent(new Event("healthmaths:update-complete"));
    };
    const updatingAfterReload = root.dataset.updating === "true";
    if (updatingAfterReload) setMessage("Updating your app...");
    if (root.dataset.showIntro === "true") {
      const startedAt = Number(root.dataset.introStart);
      const elapsed = Number.isFinite(startedAt) ? Date.now() - startedAt : 0;
      timeout.current = window.setTimeout(
        () => finishIntro(updatingAfterReload),
        Math.max(0, 2000 - elapsed),
      );
    }

    const onUpdating = () => {
      if (timeout.current !== null) window.clearTimeout(timeout.current);
      timeout.current = null;
      root.dataset.showIntro = "true";
      root.dataset.updating = "true";
      root.dataset.introStart = String(Date.now());
      setMessage("Updating your app...");
    };
    window.addEventListener("healthmaths:updating", onUpdating);
    return () => {
      window.removeEventListener("healthmaths:updating", onUpdating);
      if (timeout.current !== null) window.clearTimeout(timeout.current);
    };
  }, []);

  return (
    <div className="welcome" role="status" aria-live="polite">
      <img src="/icon-192.png" width="96" height="96" alt="HealthMaths" />
      <span className="sr-only">Loading HealthMaths</span>
      <div className="welcome-track" aria-hidden="true">
        <span />
      </div>
      <p>{message}</p>
    </div>
  );
}
