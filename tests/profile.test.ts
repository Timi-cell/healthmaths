import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearLocalProfile,
  loadLocalProfile,
  getProfileDataConsent,
  PROFILE_STORAGE_KEY,
  setProfileDataConsent,
  saveLocalProfile,
  type LocalProfile,
} from "../lib/profile";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

const profile: LocalProfile = {
  username: "Amina",
  email: "amina@example.test",
  institution: "Other College of Health Sciences",
  professionCourse: "Nursing",
  studentLevel: "Year 3",
};

describe("local profile storage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saves and reloads profile details only from local storage", () => {
    const storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);

    saveLocalProfile(profile);

    expect(storage.getItem(PROFILE_STORAGE_KEY)).toBe(JSON.stringify(profile));
    expect(loadLocalProfile()).toEqual(profile);
  });

  it("clears the saved profile", () => {
    const storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);
    saveLocalProfile(profile);

    clearLocalProfile();

    expect(loadLocalProfile()).toBeNull();
  });

  it("persists separate profile-sharing consent and clears it with the profile", () => {
    const storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);
    setProfileDataConsent(true);
    expect(getProfileDataConsent()).toBe(true);

    clearLocalProfile();

    expect(getProfileDataConsent()).toBe(false);
  });

  it("reports invalid stored profile data instead of treating it as an empty profile", () => {
    const storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);
    storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ username: "Amina" }));

    expect(() => loadLocalProfile()).toThrow(
      "Saved profile data has an unexpected format.",
    );
  });

  it("does not save a profile with an invalid email address", () => {
    const storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);

    expect(() => saveLocalProfile({ ...profile, email: "not-an-email" })).toThrow(
      "Profile email must be a valid email address.",
    );
    expect(storage.getItem(PROFILE_STORAGE_KEY)).toBeNull();
  });
});
