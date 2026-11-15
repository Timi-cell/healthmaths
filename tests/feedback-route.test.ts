import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/feedback/route";

const request = (email: string) =>
  new Request("http://localhost/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "General feedback",
      message: "Thanks for the app.",
      email,
    }),
  });

describe("feedback API email validation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("rejects malformed email addresses without sending them", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("FEEDBACK_TO_EMAIL", "feedback@example.test");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    const response = await POST(request("not-an-email"));

    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("accepts an RFC-style address", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("FEEDBACK_TO_EMAIL", "feedback@example.test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 200 })),
    );

    const response = await POST(request("first.last+tag@example.co.uk"));

    expect(response.status).toBe(200);
  });
});
