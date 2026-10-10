// Runs on the server only, so the secret key never reaches the browser.
const TYPES = ["Request a formula", "Report a mistake", "General feedback"];
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.FEEDBACK_TO_EMAIL;
  if (!key || !to)
    return Response.json(
      { error: "Feedback email is not configured" },
      { status: 500 },
    );

  let body: { type?: unknown; message?: unknown; email?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }

  // Never trust the browser: check every field again here.
  const type =
    typeof body.type === "string" && TYPES.includes(body.type)
      ? body.type
      : null;
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (
    !type ||
    message.length < 1 ||
    message.length > 2000 ||
    (email && (email.length > 200 || !EMAIL_OK.test(email)))
  ) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "HealthMaths <onboarding@resend.dev>",
      to: [to],
      ...(email && { reply_to: email }), // hit Reply in your inbox to answer the user
      subject: `HealthMaths: ${type}`,
      text: `Type: ${type}\nFrom: ${email || "(no email given)"}\n\n${message}`, // plain text, so nothing can inject HTML
    }),
  }).catch(() => null);

  if (!res || !res.ok)
    return Response.json({ error: "Could not send email" }, { status: 502 });
  return Response.json({ ok: true });
}
