"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { NIGERIAN_HEALTH_INSTITUTIONS, type LocalProfile } from "@/lib/profile";
import Icon from "./Icon";

type Props = {
  open: boolean;
  profile: LocalProfile | null;
  storageError: string | null;
  shareProfileData: boolean;
  analyticsEnabled: boolean;
  onClose: () => void;
  onSave: (
    profile: LocalProfile,
    shareDetails: boolean,
  ) => Promise<ProfileShareResult>;
  onClear: () => void;
};

export type ProfileShareResult =
  | "sent"
  | "offline"
  | "not-consented"
  | "not-configured"
  | "failed";

const emptyProfile: LocalProfile = {
  username: "",
  email: "",
  institution: "",
  professionCourse: "",
  studentLevel: "",
};

export default function ProfileDialog({
  open,
  profile,
  storageError,
  shareProfileData,
  analyticsEnabled,
  onClose,
  onSave,
  onClear,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<LocalProfile>(emptyProfile);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [otherInstitution, setOtherInstitution] = useState("");
  const [shareDetails, setShareDetails] = useState(false);
  const wasOpen = useRef(false);

  const hasDraftInstitution =
    !!draft.institution &&
    NIGERIAN_HEALTH_INSTITUTIONS.includes(draft.institution);
  const institutionChoice = hasDraftInstitution
    ? draft.institution
    : draft.institution
      ? "Other"
      : "";

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (open && !wasOpen.current) {
      const savedInstitution = profile?.institution ?? "";
      const isListedInstitution =
        NIGERIAN_HEALTH_INSTITUTIONS.includes(savedInstitution);
      setDraft(
        profile
          ? {
              ...profile,
              institution:
                savedInstitution && !isListedInstitution
                  ? "Other"
                  : savedInstitution,
            }
          : emptyProfile,
      );
      setOtherInstitution(
        savedInstitution && !isListedInstitution ? savedInstitution : "",
      );
      setError(storageError);
      setStatus(null);
      setShareDetails(shareProfileData);
    }
    wasOpen.current = open;
  }, [open, profile, shareProfileData, storageError]);

  const update = (key: keyof LocalProfile, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setError(null);
    setStatus(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const institution =
      draft.institution === "Other"
        ? otherInstitution.trim()
        : draft.institution;
    const next = {
      username: draft.username.trim(),
      email: draft.email.trim(),
      institution,
      professionCourse: draft.professionCourse.trim(),
      studentLevel: draft.studentLevel.trim(),
    };

    try {
      const shareResult = await onSave(next, shareDetails);
      setDraft(next);
      setError(null);
      setStatus(
        shareDetails
          ? {
              sent: "Profile saved. The selected details were sent to PostHog; email was not shared.",
              offline:
                "Profile saved on this device. Details were not sent while offline and were not queued; save again when online to share them.",
              "not-consented":
                "Profile saved on this device. Analytics is off, so profile details were not sent.",
              "not-configured":
                "Profile saved on this device. PostHog is not configured in this build, so profile details were not sent.",
              failed:
                "Profile saved on this device, but PostHog could not receive the profile details. Please try again.",
            }[shareResult]
          : "Profile saved on this device.",
      );
    } catch {
      setError(
        "We couldn't save your profile in this browser. Check storage settings and try again.",
      );
      setStatus(null);
    }
  };

  const clear = () => {
    try {
      onClear();
      setDraft(emptyProfile);
      setOtherInstitution("");
      setShareDetails(false);
      setStatus("Your local profile has been cleared.");
      setError(null);
    } catch {
      setError(
        "We couldn't clear your profile in this browser. Check storage settings and try again.",
      );
      setStatus(null);
    }
  };

  return (
    <dialog
      ref={ref}
      className="profile-dialog"
      aria-labelledby="profile-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="profile-heading">
        <div className="privacy-mark" aria-hidden="true">
          <Icon name="profile" />
        </div>
        <button
          className="dialog-close"
          type="button"
          aria-label="Close profile"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      {/* <span className="eyebrow">On this device only</span> */}
      <h2 id="profile-title">Your profile</h2>
      {/* <p className="profile-intro">
        Save a local profile for your reference. Your username labels the
        Profile button; these details do not change calculator behavior. There
        is no account, and this profile is not sent to HealthMaths or included
        in analytics.
      </p>
      <p className="profile-privacy">
        Your details are stored in this browser&apos;s local storage, which is
        not encrypted. Anyone with access to this browser or device may be able
        to see them. Email is optional.
      </p> */}
      {/* <p className="profile-privacy">
        Profile details stay in this browser unless you separately choose to
        share them below. Browser storage is not encrypted. Email is never sent
        to PostHog.
      </p> */}
      <form className="profile-form" onSubmit={submit}>
        <div className="row">
          <label htmlFor="profile-username">Username</label>
          <input
            id="profile-username"
            autoComplete="nickname"
            maxLength={60}
            required
            placeholder="Enter your username here..."
            value={draft.username}
            onChange={(event) => update("username", event.target.value)}
          />
        </div>
        <div className="row">
          <label htmlFor="profile-email">Email</label>
          <input
            id="profile-email"
            type="email"
            autoComplete="email"
            maxLength={254}
            placeholder="Enter your email here..."
            value={draft.email}
            onChange={(event) => update("email", event.target.value)}
          />
        </div>
        <div className="row">
          <label htmlFor="profile-institution">Institution</label>
          <select
            id="profile-institution"
            value={institutionChoice}
            onChange={(event) => {
              update("institution", event.target.value);
              if (event.target.value !== "Other") setOtherInstitution("");
            }}
          >
            <option value="">Select an institution</option>
            {NIGERIAN_HEALTH_INSTITUTIONS.map((institution) => (
              <option key={institution} value={institution}>
                {institution}
              </option>
            ))}
            <option value="Other">Other</option>
          </select>
        </div>
        {institutionChoice === "Other" && (
          <div className="row">
            <label htmlFor="profile-other-institution">Other institution</label>
            <input
              id="profile-other-institution"
              maxLength={120}
              placeholder="Enter other institution here..."
              required
              value={otherInstitution}
              onChange={(event) => {
                setOtherInstitution(event.target.value);
                setError(null);
                setStatus(null);
              }}
            />
          </div>
        )}
        <div className="row">
          <label htmlFor="profile-profession">
            Profession/Course of study
          </label>
          <input
            id="profile-profession"
            maxLength={120}
            placeholder="Enter your profession/course of study..."
            value={draft.professionCourse}
            onChange={(event) => update("professionCourse", event.target.value)}
          />
        </div>
        <div className="row">
          <label htmlFor="profile-level">Student level</label>
          <input
            id="profile-level"
            maxLength={80}
            placeholder="Enter your student level here..."
            value={draft.studentLevel}
            onChange={(event) => update("studentLevel", event.target.value)}
          />
        </div>
        <div className="profile-share">
          <label>
            <input
              type="checkbox"
              checked={shareDetails}
              disabled={!analyticsEnabled}
              onChange={(event) => {
                setShareDetails(event.target.checked);
                setError(null);
                setStatus(null);
              }}
            />
            <span>Share my profile details with HealthMaths</span>
          </label>
          <p>
            If selected, each save sends your information (except your email) to HealthMaths.
          </p>
          {!analyticsEnabled && (
            <p className="profile-share-note">
              Turn on usage analytics in Privacy choices before sharing profile
              details.
            </p>
          )}
        </div>
        {error && (
          <p className="profile-message error" role="alert">
            {error}
          </p>
        )}
        {status && (
          <p className="profile-message" role="status">
            {status}
          </p>
        )}
        <div className="profile-actions">
          <button className="btn primary" type="submit">
            Save profile
          </button>
          <button
            className="btn danger-outline"
            type="button"
            disabled={!profile && !storageError}
            onClick={clear}
          >
            Clear profile
          </button>
        </div>
      </form>
    </dialog>
  );
}
