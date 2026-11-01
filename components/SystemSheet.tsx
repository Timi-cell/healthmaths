"use client";
import { useEffect, useRef } from "react";
import { IC } from "@/lib/formulas";
import Icon from "./Icon";

export type CategoryMode = "systems" | "departments";
const MODES: [CategoryMode, string][] = [
  ["systems", "Body systems"],
  ["departments", "Departments"],
];

type Props = {
  open: boolean;
  onClose: () => void;
  mode: CategoryMode;
  category: string;
  categories: string[];
  onPickMode: (mode: CategoryMode) => void;
  onPickCategory: (category: string) => void;
};

export default function SystemSheet({
  open,
  onClose,
  mode,
  category,
  categories,
  onPickMode,
  onPickCategory,
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
      className="sheet"
      aria-labelledby="library-dialog-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <h3 id="library-dialog-title">Browse the library</h3>
      <div className="category-modes" role="tablist" aria-label="Browse by">
        {MODES.map(([value, label]) => (
          <button
            key={value}
            className="category-mode"
            role="tab"
            aria-selected={mode === value}
            onClick={() => onPickMode(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="sgrid" role="group" aria-label={MODES.find(([value]) => value === mode)?.[1]}>
        {categories.map((item) => (
          <button
            key={item}
            className="stile"
            aria-pressed={item === category}
            onClick={() => onPickCategory(item)}
          >
            <Icon name={item === "All" ? "all" : IC[item] ?? "scale"} />
            {item === "All"
              ? `All ${mode === "systems" ? "body systems" : "departments"}`
              : item}
          </button>
        ))}
      </div>
      <button
        className="btn"
        style={{ width: "100%", marginTop: 12, minHeight: 48 }}
        onClick={onClose}
        type="button"
      >
        Close
      </button>
    </dialog>
  );
}
