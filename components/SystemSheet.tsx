"use client";
import { useEffect, useRef, useState } from "react";
import { IC } from "@/lib/formulas";
import Icon from "./Icon";

type Props = {
  open: boolean;
  onClose: () => void;
  systems: string[];
  sys: string;
  subsystems: string[];
  subsystem: string;
  onPick: (s: string) => void;
  onPickSubsystem: (s: string) => void;
  onBack: () => void;
};

export default function SystemSheet({
  open,
  onClose,
  systems,
  sys,
  subsystems,
  subsystem,
  onPick,
  onPickSubsystem,
  onBack,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [section, setSection] = useState<"systems" | "cardiovascular">(
    "systems",
  );
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
    if (open) setSection(sys === "Cardiovascular" ? "cardiovascular" : "systems");
  }, [open, sys]);

  const selectSystem = (system: string) => {
    if (system === "Cardiovascular") {
      setSection("cardiovascular");
      onPick(system);
      return;
    }
    onPick(system);
  };

  const returnToSystems = () => {
    setSection("systems");
    onBack();
  };

  return (
    <dialog ref={ref} className="sheet" onClose={onClose}>
      {section === "systems" ? (
        <>
          <h3>Body Systems</h3>
          <div className="sgrid">
            {systems.map((s) => (
              <button
                key={s}
                className="stile"
                aria-pressed={s === sys}
                onClick={() => selectSystem(s)}
              >
                <Icon name={s === "All" ? "all" : IC[s]} />
                {s === "All" ? "All systems" : s}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="sheet-heading">
            <button
              className="sheet-back"
              aria-label="Back to body systems"
              title="Back to body systems"
              onClick={returnToSystems}
            >
              <Icon name="back" />
            </button>
            <h3>Cardiovascular</h3>
          </div>
          <div
            className="ssubgrid"
            role="group"
            aria-label="Cardiovascular categories"
          >
            <button
              className="stile"
              aria-pressed={subsystem === "All"}
              onClick={() => onPickSubsystem("All")}
            >
              <Icon name="heart" />
              All cardiovascular
            </button>
            {subsystems.map((s) => (
              <button
                key={s}
                className="stile"
                aria-pressed={subsystem === s}
                onClick={() => onPickSubsystem(s)}
              >
                <Icon name={IC[s]} />
                {s}
              </button>
            ))}
          </div>
        </>
      )}
      <button
        className="btn"
        style={{ width: "100%", marginTop: 12, minHeight: 48 }}
        onClick={onClose}
      >
        Close
      </button>
    </dialog>
  );
}
