export type LocalProfile = {
  username: string;
  email: string;
  institution: string;
  professionCourse: string;
  studentLevel: string;
};

export const PROFILE_STORAGE_KEY = "healthmaths:v1:profile";
export const PROFILE_DATA_CONSENT_KEY = "healthmaths:v1:profile-data-consent";

export const NIGERIAN_HEALTH_INSTITUTIONS = [
  "Abia State University",
  "Ahmadu Bello University",
  "Ambrose Alli University",
  "Babcock University",
  "Bayero University Kano",
  "Benue State University",
  "Bowen University",
  "Delta State University",
  "Ebonyi State University",
  "Ekiti State University",
  "Enugu State University of Science and Technology",
  "Imo State University",
  "Kaduna State University",
  "Lagos State University",
  "Niger Delta University",
  "Nnamdi Azikiwe University",
  "Obafemi Awolowo University",
  "Osun State University",
  "University of Abuja",
  "University of Benin",
  "University of Calabar",
  "University of Ibadan",
  "University of Ilorin",
  "University of Jos",
  "University of Lagos",
  "University of Maiduguri",
  "University of Nigeria",
  "University of Port Harcourt",
  "University of Uyo",
  "Usmanu Danfodiyo University",
  "University of Medical Sciences, Ondo",
  "Federal University of Health Sciences, Azare",
  "Federal University of Health Sciences, Ila-Orangun",
  "Federal University of Health Sciences, Otukpo",
];

const isLocalProfile = (value: unknown): value is LocalProfile =>
  typeof value === "object" &&
  value !== null &&
  "username" in value &&
  typeof value.username === "string" &&
  "email" in value &&
  typeof value.email === "string" &&
  "institution" in value &&
  typeof value.institution === "string" &&
  "professionCourse" in value &&
  typeof value.professionCourse === "string" &&
  "studentLevel" in value &&
  typeof value.studentLevel === "string";

export function loadLocalProfile(): LocalProfile | null {
  const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
  if (!saved) return null;

  const parsed: unknown = JSON.parse(saved);
  if (!isLocalProfile(parsed)) {
    throw new Error("Saved profile data has an unexpected format.");
  }
  return parsed;
}

export function saveLocalProfile(profile: LocalProfile): void {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

export function clearLocalProfile(): void {
  localStorage.removeItem(PROFILE_STORAGE_KEY);
  localStorage.removeItem(PROFILE_DATA_CONSENT_KEY);
}

export function getProfileDataConsent(): boolean {
  try {
    return localStorage.getItem(PROFILE_DATA_CONSENT_KEY) === "yes";
  } catch {
    return false;
  }
}

export function setProfileDataConsent(enabled: boolean): void {
  localStorage.setItem(PROFILE_DATA_CONSENT_KEY, enabled ? "yes" : "no");
}
