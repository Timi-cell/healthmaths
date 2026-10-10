// Feedback written while offline waits here (on the device) and is sent when the connection returns.
import { load, save } from "./store";

export const ENDPOINT = "/api/feedback";
const KEY = "healthmaths:v1:outbox";

export type Msg = {
  id: string;
  type: string;
  message: string;
  email: string;
  at: number;
};

export const pending = () => load<Msg[]>(KEY, []);

export function enqueue(m: Omit<Msg, "id" | "at">) {
  const at = Date.now();
  save(KEY, [
    ...pending(),
    { ...m, at, id: `${at}-${Math.random().toString(36).slice(2, 6)}` },
  ]);
}

export const post = (
  endpoint: string,
  m: Pick<Msg, "type" | "message" | "email">,
) =>
  fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ type: m.type, message: m.message, email: m.email }),
  });

let busy = false;
/** Send queued messages in order. Stops at the first network/server failure and keeps the rest. Returns how many were sent. */
export async function flush(endpoint: string): Promise<number> {
  if (busy) return 0;
  busy = true;
  let sent = 0;
  try {
    for (const m of pending()) {
      let res: Response;
      try {
        res = await post(endpoint, m);
      } catch {
        break;
      } // still offline
      if (res.status >= 500) break; // server trouble: try again later
      save(
        KEY,
        pending().filter((x) => x.id !== m.id),
      ); // sent, or rejected for good (4xx)
      if (res.ok) sent++;
    }
  } finally {
    busy = false;
  }
  return sent;
}
