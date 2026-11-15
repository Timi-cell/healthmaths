import { afterEach, describe, expect, it, vi } from "vitest";
import {
  flushAnalytics,
  getAnalyticsConsent,
  initializeAnalyticsConsent,
  isAnalyticsConfigured,
  sendProfileDetailsToPostHog,
  setAnalyticsConsent,
  track,
} from "../lib/analytics";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("privacy-safe analytics queue", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("does not collect events before an analytics preference is initialized", () => {
    vi.stubGlobal("localStorage", memoryStorage());
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "test-project-key");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://example.test");

    track("formula_searched", { resultCount: 0 });

    expect(getAnalyticsConsent()).toBeNull();
    expect(localStorage.getItem("healthmaths:v1:analytics-queue")).toBeNull();
  });

  it("enables analytics for a fresh visit but preserves a saved opt-out", () => {
    const storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);

    expect(initializeAnalyticsConsent()).toBe(true);
    expect(getAnalyticsConsent()).toBe(true);

    expect(setAnalyticsConsent(false)).toBe(true);
    expect(initializeAnalyticsConsent()).toBe(false);
    expect(getAnalyticsConsent()).toBe(false);
  });

  it("recognizes the PostHog project token environment variable", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", "test-project-key");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://example.test");

    expect(isAnalyticsConfigured()).toBe(true);
  });

  it("uses the project token environment variable when sending events", async () => {
    vi.stubGlobal("localStorage", memoryStorage());
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", "test-project-key");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://example.test");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    setAnalyticsConsent(true);

    track("app_opened");

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.api_key).toBe("test-project-key");
  });

  it("does not share profile details without separate profile consent", async () => {
    vi.stubGlobal("localStorage", memoryStorage());
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "test-project-key");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://example.test");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    setAnalyticsConsent(true);

    const result = await sendProfileDetailsToPostHog({
      username: "Amina",
      institution: "Test University",
      professionCourse: "Nursing",
      studentLevel: "Year 2",
    });

    expect(result).toBe("not-consented");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shares only the disclosed profile fields after separate consent", async () => {
    const storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "test-project-key");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://example.test");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    setAnalyticsConsent(true);
    storage.setItem("healthmaths:v1:profile-data-consent", "yes");

    const result = await sendProfileDetailsToPostHog({
      username: "Amina",
      institution: "Test University",
      professionCourse: "Nursing",
      studentLevel: "Year 2",
    });

    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(result).toBe("sent");
    expect(payload.event).toBe("profile_details_shared");
    expect(payload.properties).toMatchObject({
      username: "Amina",
      institution: "Test University",
      profession_course: "Nursing",
      student_level: "Year 2",
    });
    expect(payload.properties.email).toBeUndefined();
  });

  it("never queues personal profile details while offline", async () => {
    const storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("navigator", { onLine: false });
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "test-project-key");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://example.test");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    setAnalyticsConsent(true);
    storage.setItem("healthmaths:v1:profile-data-consent", "yes");

    const result = await sendProfileDetailsToPostHog({
      username: "Amina",
      institution: "",
      professionCourse: "",
      studentLevel: "",
    });

    expect(result).toBe("offline");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      storage.getItem("healthmaths:v1:analytics-queue"),
    ).toBeNull();
  });

  it("keeps the queued payload limited to approved, non-sensitive metadata", () => {
    vi.stubGlobal("localStorage", memoryStorage());
    vi.stubGlobal("navigator", { onLine: false });
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "test-project-key");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://example.test");
    setAnalyticsConsent(true);

    const unsafeMetadata = {
      resultCount: 0,
      category: "Renal",
      formulaId: "egfr",
      query: "patient name",
    };
    track("formula_searched", unsafeMetadata);

    const queued = JSON.parse(
      localStorage.getItem("healthmaths:v1:analytics-queue") ?? "[]",
    );
    const searchEvent = queued.find(
      (event: { event: string }) => event.event === "formula_searched",
    );
    expect(queued).toHaveLength(2);
    expect(searchEvent.properties).toMatchObject({
      resultCount: 0,
      category: "Renal",
      formulaId: "egfr",
    });
    expect(JSON.stringify(queued)).not.toContain("patient name");
  });

  it("removes submitted events from the local queue", async () => {
    vi.stubGlobal("localStorage", memoryStorage());
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "test-project-key");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://example.test");
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    setAnalyticsConsent(true);
    track("history_viewed");
    await vi.waitFor(async () => {
      await flushAnalytics();
      expect(localStorage.getItem("healthmaths:v1:analytics-queue")).toBe("[]");
    });

    expect(localStorage.getItem("healthmaths:v1:analytics-queue")).toBe("[]");
  });
});

it("removes queued events and the random browser ID when consent is withdrawn", () => {
  const storage = memoryStorage();
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("navigator", { onLine: false });
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "test-project-key");
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://example.test");
  setAnalyticsConsent(true);
  track("history_viewed");
  storage.setItem("healthmaths:v1:analytics-id", "random-browser-id");
  storage.setItem("healthmaths:v1:profile-data-consent", "yes");
  expect(storage.getItem("healthmaths:v1:analytics-id")).not.toBeNull();

  expect(setAnalyticsConsent(false)).toBe(true);

  expect(storage.getItem("healthmaths:v1:analytics-queue")).toBeNull();
  expect(storage.getItem("healthmaths:v1:analytics-id")).toBeNull();
  expect(storage.getItem("healthmaths:v1:profile-data-consent")).toBe("no");
  expect(getAnalyticsConsent()).toBe(false);
});
