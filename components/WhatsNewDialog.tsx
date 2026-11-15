"use client";
import { useEffect, useRef, useState } from "react";
import type { WhatsNewEntry } from "@/lib/whats-new";
import Icon from "./Icon";

type Props = {
  open: boolean;
  onClose: () => void;
  entries: WhatsNewEntry[];
  unreadIds: string[];
  openedIds: string[];
  unreadCount: number;
  onRead: (id: string) => void;
  onReadAll: () => void;
  onClearAll: () => void;
  onExplore: (formulaId: string) => void;
};

export default function WhatsNewDialog({
  open,
  onClose,
  entries,
  unreadIds,
  openedIds,
  unreadCount,
  onRead,
  onReadAll,
  onClearAll,
  onExplore,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

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
          <h3 id="whats-new-title">What&apos;s New?</h3>
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
          {entries.map((entry) => {
            const expanded = expandedIds.includes(entry.id);
            const unread = unreadIds.includes(entry.id);
            const opened = openedIds.includes(entry.id);
            const contentId = `whats-new-content-${entry.id}`;

            return (
              <article
                className={`update-card ${unread ? "is-unread" : "is-read"}${expanded ? " is-open" : ""}`}
                key={entry.id}
              >
                <button
                  className="update-accordion-toggle"
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={contentId}
                  onClick={() => {
                    if (expanded) {
                      setExpandedIds((current) =>
                        current.filter((id) => id !== entry.id),
                      );
                    } else {
                      setExpandedIds((current) =>
                        current.includes(entry.id)
                          ? current
                          : [...current, entry.id],
                      );
                      onRead(entry.id);
                    }
                  }}
                >
                  <span className="update-accordion-title">
                    <strong>{entry.title}</strong>
                    <span className="update-status">
                      {opened ? "Opened" : unread ? "New update" : "Read"}
                    </span>
                  </span>
                  {entry.date && <time>{entry.date}</time>}
                  <span className="update-chevron" aria-hidden="true" />
                </button>
                <div id={contentId} className="update-content" hidden={!expanded}>
                  {entry.body.map((paragraph, index) => (
                    <p key={`${entry.id}-${index}`}>{paragraph}</p>
                  ))}
                  {entry.action && (
                    <button
                      className="btn update-card-action"
                      type="button"
                      onClick={() => onExplore(entry.action!.formulaId)}
                    >
                      {entry.action.label}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="updates-empty">
          <span className="updates-empty-icon" aria-hidden="true">✦</span>
          <h4>No new updates yet</h4>
          <p>
            New formulas and features will appear here when they are
            released.
          </p>
        </div>
      )}
      {entries.length > 0 && (
        <p className="updates-persistence">
          Updates remain here until you "Clear all".
        </p>
      )}
      {/* <section className="update-prompt" aria-label="Keep HealthMaths updated">
        <b>Keep HealthMaths up to date</b>
        <p>
          Connect to the internet and reopen the app to get the latest
          HealthMaths updates.
        </p>
      </section> */}
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
