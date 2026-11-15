import { load, save } from "./store";
import { getProfileDataConsent, setProfileDataConsent } from "./profile";

export type AnalyticsEvent =
  | "app_opened"
  | "category_selected"
  | "formula_searched"
  | "search_no_results"
  | "formula_viewed"
  | "calculation_started"
  | "calculation_completed"
  | "interpretation_viewed"
  | "history_viewed"
  | "online_mode_entered"
  | "profile_opened"
  | "profile_saved"
  | "profile_details_shared"
  | "feedback_submitted"
  | "formula_suggestion_submitted"
  | "pwa_install_prompt_shown"
  | "pwa_installed"
  | "offline_mode_entered"
  | "offline_mode_used"
  | "update_available"
  | "update_applied"
  | "theme_changed";

export type AnalyticsMetadata = {
  formulaId?: string;
  category?: string;
  resultCount?: number;
  theme?: "light" | "dark";
};
type ProfileDetails = {
  username: string;
  institution: string;
  professionCourse: string;
  studentLevel: string;
};

type QueuedEvent = {
  id: string;
  event: AnalyticsEvent;
  properties: AnalyticsMetadata & {
    app_version: string;
    device_type: "mobile" | "desktop";
    online: boolean;
  };
  timestamp: string;
  queuedAt: number;
};

const CONSENT_KEY = "healthmaths:v1:analytics-consent";
const ID_KEY = "healthmaths:v1:analytics-id";
const QUEUE_KEY = "healthmaths:v1:analytics-queue";
const MAX_QUEUE = 100;
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
let flushing = false;

export function isAnalyticsConfigured() {
  return Boolean(
    (process.env.NEXT_PUBLIC_POSTHOG_KEY ||
      process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) &&
      process.env.NEXT_PUBLIC_POSTHOG_HOST,
  );
}

function projectToken() {
  return (
    process.env.NEXT_PUBLIC_POSTHOG_KEY ||
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
  );
}

function endpoint() {
  return `${process.env.NEXT_PUBLIC_POSTHOG_HOST!.replace(/\/+$/, "")}/i/v0/e/`;
}

function deviceType(): "mobile" | "desktop" {
  return typeof window !== "undefined" &&
    window.matchMedia("(max-width: 700px)").matches
    ? "mobile"
    : "desktop";
}

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function distinctId() {
  const saved = load<string>(ID_KEY, "");
  if (saved) return saved;
  const id = newId();
  save(ID_KEY, id);
  return id;
}

function pending() {
  const now = Date.now();
  const saved = load<unknown>(QUEUE_KEY, []);
  const events = Array.isArray(saved)
    ? saved.filter(
        (event): event is QueuedEvent =>
          typeof event === "object" &&
          event !== null &&
          "id" in event &&
          typeof event.id === "string" &&
          "event" in event &&
          typeof event.event === "string" &&
          "queuedAt" in event &&
          typeof event.queuedAt === "number" &&
          now - event.queuedAt < MAX_AGE,
      )
    : [];
  const recent = events.slice(-MAX_QUEUE);
  if (recent.length !== (Array.isArray(saved) ? saved.length : 0))
    save(QUEUE_KEY, recent);
  return recent;
}

export function getAnalyticsConsent(): boolean | null {
  try {
    const saved = localStorage.getItem(CONSENT_KEY);
    return saved === "yes" ? true : saved === "no" ? false : null;
  } catch {
    return null;
  }
}

export function initializeAnalyticsConsent(): boolean | null {
  const savedChoice = getAnalyticsConsent();
  if (savedChoice !== null) return savedChoice;
  return setAnalyticsConsent(true) ? true : null;
}

export function setAnalyticsConsent(enabled: boolean) {
  try {
    localStorage.setItem(CONSENT_KEY, enabled ? "yes" : "no");
  } catch {
    return false;
  }
  if (!enabled) {
    try {
      localStorage.removeItem(QUEUE_KEY);
      localStorage.removeItem(ID_KEY);
      setProfileDataConsent(false);
    } catch {
      return false;
    }
    return true;
  }
  void flushAnalytics();
  return true;
}

export async function sendProfileDetailsToPostHog(
  profile: ProfileDetails,
): Promise<"sent" | "offline" | "not-consented" | "not-configured" | "failed"> {
  if (!isAnalyticsConfigured()) return "not-configured";
  if (getAnalyticsConsent() !== true || !getProfileDataConsent())
    return "not-consented";
  if (typeof navigator === "undefined" || navigator.onLine === false)
    return "offline";

  const properties = {
    username: profile.username.trim().slice(0, 60),
    institution: profile.institution.trim().slice(0, 120),
    profession_course: profile.professionCourse.trim().slice(0, 120),
    student_level: profile.studentLevel.trim().slice(0, 80),
    app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0",
    device_type: deviceType(),
    online: true,
    $insert_id: newId(),
  };
  try {
    const response = await fetch(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: projectToken(),
        event: "profile_details_shared",
        distinct_id: distinctId(),
        properties,
        timestamp: new Date().toISOString(),
      }),
      keepalive: true,
    });
    return response.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}

function makeEvent(
  event: AnalyticsEvent,
  metadata: AnalyticsMetadata,
): QueuedEvent {
  const safeMetadata: AnalyticsMetadata = {};
  if (typeof metadata.formulaId === "string")
    safeMetadata.formulaId = metadata.formulaId;
  if (typeof metadata.category === "string")
    safeMetadata.category = metadata.category;
  if (
    typeof metadata.resultCount === "number" &&
    Number.isFinite(metadata.resultCount)
  )
    safeMetadata.resultCount = metadata.resultCount;
  if (metadata.theme === "light" || metadata.theme === "dark")
    safeMetadata.theme = metadata.theme;
  return {
    id: newId(),
    event,
    properties: {
      ...safeMetadata,
      app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0",
      device_type: deviceType(),
      online: typeof navigator === "undefined" || navigator.onLine !== false,
    },
    timestamp: new Date().toISOString(),
    queuedAt: Date.now(),
  };
}

function enqueue(event: QueuedEvent) {
  save(QUEUE_KEY, [...pending(), event].slice(-MAX_QUEUE));
}

export function track(
  event: AnalyticsEvent,
  metadata: AnalyticsMetadata = {},
) {
  if (getAnalyticsConsent() !== true || !isAnalyticsConfigured()) return;
  const events = [makeEvent(event, metadata)];
  if (
    !events[0].properties.online &&
    event !== "offline_mode_used" &&
    event !== "offline_mode_entered"
  )
    events.push(makeEvent("offline_mode_used", metadata));
  events.forEach(enqueue);
  void flushAnalytics();
}

export async function flushAnalytics(): Promise<number> {
  if (
    flushing ||
    getAnalyticsConsent() !== true ||
    !isAnalyticsConfigured() ||
    (typeof navigator !== "undefined" && navigator.onLine === false)
  )
    return 0;
  flushing = true;
  let sent = 0;
  try {
    for (const event of pending()) {
      let response: Response;
      try {
        response = await fetch(endpoint(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: projectToken(),
            event: event.event,
            distinct_id: distinctId(),
            properties: { ...event.properties, $insert_id: event.id },
            timestamp: event.timestamp,
          }),
          keepalive: true,
        });
      } catch {
        break;
      }
      if (!response.ok) break;
      save(
        QUEUE_KEY,
        pending().filter((queued) => queued.id !== event.id),
      );
      sent++;
    }
  } finally {
    flushing = false;
  }
  return sent;
}
