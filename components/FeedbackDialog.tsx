"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ENDPOINT, enqueue, post } from "@/lib/outbox";

// Posts to our own /api/feedback route, which emails you through Resend.
// If the phone is offline, the message is saved on the device and sent later (see lib/outbox.ts).
const TYPES = ["Request a formula", "Report a mistake", "General feedback"];

export default function FeedbackDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [type, setType] = useState(TYPES[0]);
  const [msg, setMsg] = useState("");
  const [email, setEmail] = useState("");
  const [trap, setTrap] = useState(""); // honeypot: real users never fill this
  const [status, setStatus] = useState<
    "idle" | "sending" | "done" | "queued" | "error"
  >("idle");

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const placeholderMsg = (type: string) => {
    if (type === "Request a formula") {
      return "Which formula, and where is it used?";
    } else if (type === "Report a mistake") {
      return "What is the mistake, and where did you see it?";
    } else {
      return "Your feedback is valuable. Please share your thoughts.";
    }
  };

  // async function submit(e: FormEvent) {
  //   e.preventDefault();
  //   if (trap) return; // bot
  //   if (!ENDPOINT) {
  //     location.href = `mailto:${EMAIL}?subject=${encodeURIComponent("HealthMaths: " + type)}&body=${encodeURIComponent(msg)}`;
  //     return;
  //   }
  //   const payload = { type, message: msg, email };
  //   if (!navigator.onLine) {
  //     enqueue(payload);
  //     setStatus("queued");
  //     setMsg("");
  //     return;
  //   }
  //   setStatus("sending");
  //   try {
  //     const res = await post(ENDPOINT, payload);
  //     if (!res.ok) throw new Error("http");
  //     setStatus("done");
  //     setMsg("");
  //   } catch (err) {
  //     if (err instanceof TypeError) {
  //       enqueue(payload);
  //       setStatus("queued");
  //       setMsg("");
  //     } // network failure
  //     else setStatus("error");
  //   }
  // }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (trap) return; // bot
    const payload = { type, message: msg, email };
    if (!navigator.onLine) {
      enqueue(payload);
      setStatus("queued");
      setMsg("");
      return;
    }
    setStatus("sending");
    try {
      const res = await post(ENDPOINT, payload);
      if (!res.ok) throw new Error("http");
      setStatus("done");
      setMsg("");
    } catch (err) {
      if (err instanceof TypeError) {
        enqueue(payload);
        setStatus("queued");
        setMsg("");
      } // network failure
      else setStatus("error");
    }
  }
  return (
    <dialog
      id="feedback-dialog"
      ref={ref}
      onClose={() => {
        setStatus("idle");
        onClose();
      }}
    >
      {status === "queued" ? (
        <>
          <h3>Saved on your phone</h3>
          <p className="desc">
            You seem to be offline. Your message will send automatically when
            you are back online.
          </p>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </>
      ) : status === "done" ? (
        <>
          <h3>Thank you!</h3>
          <p className="desc">
            We got your message. Every feedback/request from you helps to decide
            what gets built next.
          </p>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </>
      ) : (
        <form onSubmit={submit}>
          <h3>Help shape HealthMaths</h3>
          <p className="desc">
            Can't find a formula? Spotted a mistake? Something else? <br/> Tell us
            about it. It takes less than a minute.
          </p>
          <div className="row">
            <select
              className="sel"
              aria-label="Type of message"
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{ padding: 14 }}
            >
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="row">
            <textarea
              required
              aria-label="Your message"
              placeholder={placeholderMsg(type)}
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
            />
          </div>
          <div className="row">
            <input
              type="email"
              aria-label="Email (optional)"
              placeholder="Email (optional, if you want a reply)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <input
            className="hp"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            value={trap}
            onChange={(e) => setTrap(e.target.value)}
          />
          {status === "error" && (
            <p className="err">Could not send. Please try again.</p>
          )}
          <div className="actions">
            <button
              className="btn"
              type="submit"
              disabled={status === "sending"}
            >
              {status === "sending" ? "Sending…" : "Send"}
            </button>
            <button className="btn" type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
