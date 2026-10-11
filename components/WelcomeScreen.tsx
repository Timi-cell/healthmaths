"use client";
import { useEffect } from "react";

export default function WelcomeScreen() {
  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.showIntro !== "true") return;

    const startedAt = Number(root.dataset.introStart);
    const elapsed = Number.isFinite(startedAt) ? Date.now() - startedAt : 0;
    const timeout = window.setTimeout(() => {
      delete root.dataset.showIntro;
      delete root.dataset.introStart;
    }, Math.max(0, 2600 - elapsed));
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <div className="welcome" role="status" aria-live="polite">
      <img src="/icon-192.png" width="96" height="96" alt="HealthMaths" />
      <span className="sr-only">Loading HealthMaths</span>
      <div className="welcome-track" aria-hidden="true">
        <span />
      </div>
      <p>Maths in Healthcare, made easier.</p>
    </div>
  );
}
