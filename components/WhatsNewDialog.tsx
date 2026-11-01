"use client";
import { useEffect, useRef } from "react";
import type { WhatsNewEntry } from "@/lib/whats-new";
import Icon from "./Icon";

type Props = {
  open: boolean;
  onClose: () => void;
  entries: WhatsNewEntry[];
  unreadCount: number;
  onReadAll: () => void;
  onClearAll: () => void;
};

export default function WhatsNewDialog({
  open,
  onClose,
  entries,
  unreadCount,
  onReadAll,
  onClearAll,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="whats-new-dialog"
      aria-labelledby="whats-new-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="whats-new-heading">
        <div>
          <span className="eyebrow">HealthMaths updates</span>
          <h3 id="whats-new-title">What&apos;s New</h3>
        </div>
        <button
          className="dialog-close"
          type="button"
          onClick={onClose}
          aria-label="Close What's New"
        >
          <Icon name="close" />
        </button>
      </div>
      {entries.length ? (
        <div className="update-list">
          {entries.map((entry) => (
            <article className="update-card" key={entry.id}>
              <div className="update-card-heading">
                <h4>{entry.title}</h4>
                {entry.date && <time>{entry.date}</time>}
              </div>
              {entry.body.map((paragraph, index) => (
                <p key={`${entry.id}-${index}`}>{paragraph}</p>
              ))}
            </article>
          ))}
        </div>
      ) : (
        <div className="updates-empty">
          <span className="updates-empty-icon" aria-hidden="true">✦</span>
          <h4>No new updates yet</h4>
          <p>
            New formulas, improvements and fixes will appear here when they are
            released.
          </p>
        </div>
      )}
      <section className="update-prompt" aria-label="Keep HealthMaths updated">
        <b>Keep HealthMaths up to date</b>
        <p>
          Connect to the internet and reopen the app to get the latest
          HealthMaths updates.
        </p>
      </section>
      <div className="whats-new-actions">
        <button
          className="btn"
          type="button"
          onClick={onReadAll}
          disabled={!unreadCount}
        >
          Read all
        </button>
        <button
          className="btn danger-outline"
          type="button"
          onClick={onClearAll}
          disabled={!entries.length}
        >
          Clear all
        </button>
      </div>
    </dialog>
  );
}
