import { describe, expect, it } from "vitest";
import { isValidEmail } from "../lib/email";

describe("email validation", () => {
  it.each([
    "amina@example.test",
    "first.last+tag@example.co.uk",
    "o'hara@example.test",
    '"first last"@example.test',
    "user@[192.0.2.1]",
  ])("accepts valid RFC-style address %s", (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each([
    "plain-address",
    "missing-domain@",
    ".starts-with-dot@example.test",
    "two..dots@example.test",
    "user@-invalid.example",
    "user@example..test",
    "user@example.test ",
    `${"a".repeat(243)}@example.test`,
  ])("rejects invalid address %s", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });

  it("allows an address up to the RFC mailbox length limit", () => {
    const email = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(61)}`;
    expect(email.length).toBe(254);
    expect(isValidEmail(email)).toBe(true);
  });
});
