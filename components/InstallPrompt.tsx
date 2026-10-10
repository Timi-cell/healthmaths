"use client";
import { useEffect, useState } from "react";

type BIP = Event & { prompt: () => Promise<void> };
type Snooze = { calculationsAtDismissal: number; activeMs: number };
const KEY = "healthmaths:install-dismissed";
const PERMANENTLY_DISMISSED = "installed";
const REMINDER_DELAY = 10 * 60 * 1000;
const CALCULATIONS_BEFORE_REMINDER = 5;

function readSnooze(calculationCount: number): Snooze | null {
  try {
    const saved = localStorage.getItem(KEY);
    if (!saved || saved === PERMANENTLY_DISMISSED) return null;
    if (saved === "1") {
      return { calculationsAtDismissal: calculationCount, activeMs: 0 };
    }
    const value = JSON.parse(saved) as Partial<Snooze>;
    if (
      typeof value.calculationsAtDismissal === "number" &&
      typeof value.activeMs === "number"
    ) {
      return {
        calculationsAtDismissal: value.calculationsAtDismissal,
        activeMs: value.activeMs,
      };
    }
  } catch {
    return null;
  }
  return null;
}

function saveSnooze(snooze: Snooze) {
  try {
    localStorage.setItem(KEY, JSON.stringify(snooze));
  } catch {
    // The reminder still works for this session if storage is unavailable.
  }
}

// Android/Chrome gives us an install event. iPhone has no such event, so we explain "Add to Home Screen".
export default function InstallPrompt({
  show,
  calculationCount,
}: {
  show: boolean;
  calculationCount: number;
}) {
  const [evt, setEvt] = useState<BIP | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [permanentlyDismissed, setPermanentlyDismissed] = useState(false);
  const [snooze, setSnooze] = useState<Snooze | null>(null);

  useEffect(() => {
    const standalone =
      matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    try {
      setPermanentlyDismissed(
        localStorage.getItem(KEY) === PERMANENTLY_DISMISSED,
      );
    } catch {
      setPermanentlyDismissed(false);
    }
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIP);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPermanentlyDismissed(true);
      try {
        localStorage.setItem(KEY, PERMANENTLY_DISMISSED);
      } catch {
        // The installed state still hides this prompt for the current session.
      }
    };
    addEventListener("beforeinstallprompt", onPrompt);
    addEventListener("appinstalled", onInstalled);
    return () => {
      removeEventListener("beforeinstallprompt", onPrompt);
      removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    setSnooze(readSnooze(calculationCount));
  }, [calculationCount]);

  useEffect(() => {
    if (!snooze || snooze.activeMs >= REMINDER_DELAY) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setSnooze((current) => {
        if (!current) return current;
        const next = {
          ...current,
          activeMs: Math.min(current.activeMs + 30_000, REMINDER_DELAY),
        };
        saveSnooze(next);
        return next;
      });
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [snooze]);

  const remindAgain =
    snooze !== null &&
    (calculationCount - snooze.calculationsAtDismissal >=
      CALCULATIONS_BEFORE_REMINDER ||
      snooze.activeMs >= REMINDER_DELAY);

  useEffect(() => {
    if (!remindAgain) return;
    try {
      localStorage.removeItem(KEY);
    } catch {
      // The prompt can still be shown in this session.
    }
    setSnooze(null);
  }, [remindAgain]);

  if (
    !show ||
    installed ||
    permanentlyDismissed ||
    (snooze && !remindAgain) ||
    (!evt && !ios)
  )
    return null;
  const dismiss = () => {
    const next = { calculationsAtDismissal: calculationCount, activeMs: 0 };
    saveSnooze(next);
    setSnooze(next);
  };
  const acknowledge = () => {
    setPermanentlyDismissed(true);
    try {
      localStorage.setItem(KEY, PERMANENTLY_DISMISSED);
    } catch {
      // The prompt still stays dismissed for this session.
    }
  };

  return (
    <div className="install">
      <b>Install HealthMaths</b>
      <p>
        {evt
          ? "It opens like an app, works offline, and keeps your history safe on this phone."
          : "Tap the Share button in your browser, then “Add to Home Screen”. Installing keeps your history safe."}
      </p>
      <div className="actions">
        {evt && (
          <button
            className="btn"
            onClick={async () => {
              await evt.prompt();
              setEvt(null);
            }}
          >
            Install
          </button>
        )}
        <button className="btn" onClick={dismiss}>
          Not now
        </button>
        <button className="btn" onClick={acknowledge}>
          Okay
        </button>
      </div>
    </div>
  );
}
