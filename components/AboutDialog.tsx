"use client";

import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function AboutDialog({ open, onClose }: Props) {
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
      className="about-dialog"
      aria-labelledby="about-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="about-mark" aria-hidden="true">
        +
      </div>
      <p className="about-eyebrow">ABOUT HEALTHMATHS</p>
      <h3 id="about-title">Clear calculations. More confident care.</h3>
      <p className="about-lead">
        For doctors, nurses, physiotherapists and other care teams, HealthMaths
        makes commonly used healthcare formulas easier to find, understand and
        work through. All accessible OFFLINE.
      </p>
      {/* <div className="about-grid">
        <section>
          <strong>Explore</strong>
          <p>Browse practical calculators by body system or department.</p>
        </section>
        <section>
          <strong>Understand</strong>
          <p>See the equation, units and each step behind the result.</p>
        </section>
        <section>
          <strong>Use anywhere</strong>
          <p>Keep your recent calculations on this device, including offline.</p>
        </section>
      </div> */}
      {/* <p className="about-footnote">
        A learning and decision-support aid—not a substitute for clinical
        judgement, local protocols or professional assessment.
      </p> */}
      <button className="btn about-close" onClick={onClose} type="button">
        Back to the library
      </button>
    </dialog>
  );
}
