import { describe, expect, it } from "vitest";
import { OTP_RE, identityAttempt, canViewInvitations } from "@/lib/validation";

describe("registration", () => {
  it("mock accepts any six digits", () => { expect(OTP_RE.test("000000")).toBe(true); expect(OTP_RE.test("987654")).toBe(true); expect(OTP_RE.test("12345")).toBe(false); });
  it("first failure allows retry", () => expect(identityAttempt(0, true)).toEqual({ attempts: 1, status: "pending" }));
  it("second failure allows a third attempt", () => expect(identityAttempt(1, true)).toEqual({ attempts: 2, status: "pending" }));
  it("third failure waits for staff", () => expect(identityAttempt(2, true)).toEqual({ attempts: 3, status: "manual_review" }));
  it("successful third attempt passes", () => expect(identityAttempt(2, false)).toEqual({ attempts: 3, status: "passed" }));
  it("cannot pass on a fourth attempt", () => expect(identityAttempt(3, false)).toEqual({ attempts: 3, status: "manual_review" }));
  it("incomplete registration cannot browse", () => expect(canViewInvitations("guest", "passed")).toBe(false));
  it("unverified identity cannot browse", () => expect(canViewInvitations("done", "manual_review")).toBe(false));
  it("verified completed demo can browse", () => expect(canViewInvitations("done", "passed")).toBe(true));
});