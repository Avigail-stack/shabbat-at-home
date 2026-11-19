import { describe, expect, it } from "vitest";
import { deferredUntil, havdalah, FALLBACK_CITY } from "@/lib/sacred-time";
import { validFeedback, validFlag, engagementActionsAllowed, fridayReminderDue } from "@/lib/validation";
import { channelsFor, MockNotificationAdapter } from "@/services/notifications";
describe("mock delivery channels", () => {
  for (const channel of ["whatsapp", "sms", "voice"] as const) it(`always includes inbox, email and ${channel}`, () => expect(channelsFor("response_declined", channel)).toEqual(["inbox", "email", channel]));
  it("rejection uses SMS instead of WhatsApp or voice", () => expect(channelsFor("host_rejected", "voice")).toEqual(["inbox", "email", "sms"]));
  it("mock adapter only writes its receipt", async () => { const receipts: string[] = []; await new MockNotificationAdapter("sms", async (body) => { receipts.push(body); }).send("", "test", "new_response", {}); expect(receipts).toEqual(["test"]); });
});
describe("Shabbat and holiday delivery", () => {
  it("defers Friday after candle lighting to Saturday havdalah", () => expect(deferredUntil(new Date("2026-11-20T14:00:00Z"))?.getTime()).toBe(havdalah("2026-11-21").getTime()));
  it("defers Saturday daytime", () => expect(deferredUntil(new Date("2026-11-21T10:00:00Z"))).not.toBeNull());
  it("releases exactly at havdalah", () => expect(deferredUntil(havdalah("2026-11-21"))).toBeNull());
  it("does not defer ordinary Thursday", () => expect(deferredUntil(new Date("2026-11-19T10:00:00Z"))).toBeNull());
  it("defers an Israeli first day of Pesach", () => expect(deferredUntil(new Date("2027-04-22T10:00:00Z"))?.toISOString().slice(0,10)).toBe("2027-04-22"));
  it("uses recipient coordinates", () => expect(havdalah("2026-11-21", { name: "חיפה", lat: 32.794, lng: 34.989 }).getTime()).not.toBe(havdalah("2026-11-21", FALLBACK_CITY).getTime()));
});
describe("mandatory private feedback", () => {
  it("unanswered due feedback blocks publishing and responding", () => expect(engagementActionsAllowed(false, [{ due: true, answered: false }])).toBe(false));
  it("answered feedback restores actions", () => expect(engagementActionsAllowed(false, [{ due: true, answered: true }])).toBe(true));
  it("not-yet-open feedback does not block", () => expect(engagementActionsAllowed(false, [{ due: false, answered: false }])).toBe(true));
  it("a frozen profile stays blocked after feedback", () => expect(engagementActionsAllowed(true, [{ due: true, answered: true }])).toBe(false));
  it("Friday reminder starts at 09:00", () => { expect(fridayReminderDue("2026-11-28", "2026-11-27", 8)).toBe(false); expect(fridayReminderDue("2026-11-28", "2026-11-27", 9)).toBe(true); expect(fridayReminderDue("2026-11-28", "2026-11-26", 9)).toBe(false); });
  it("no ends the form without an overall answer", () => expect(validFeedback("no", "", "")).toBe(true));
  it("partial requires the second question", () => expect(validFeedback("partial", "", "")).toBe(false));
  it("excellent needs no details", () => expect(validFeedback("yes", "מעולה", "")).toBe(true));
  it("bad requires details", () => expect(validFeedback("yes", "לא טוב", "  ")).toBe(false));
  it("other requires details", () => expect(validFeedback("yes", "אחר", "  ")).toBe(false));
  it("bad with details is accepted", () => expect(validFeedback("partial", "לא טוב", "בעיה באירוח")).toBe(true));
  it("requires Q1", () => expect(validFeedback("", "מעולה", "")).toBe(false));
  it("requires a serious report description", () => expect(validFlag(" ")).toBe(false));
  it("accepts a report description", () => expect(validFlag("בעיה חמורה")).toBe(true));
});