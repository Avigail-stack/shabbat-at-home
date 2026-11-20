import { describe, expect, it } from "vitest";
import { staffScopeAllowed, validFeedback, cancellationWindow } from "@/lib/validation";
import { demoAccounts } from "@/lib/demo-accounts";
import { feedbackFit } from "@/lib/invitations";
import { candleLighting } from "@/lib/candle-lighting";
import { havdalah, simulatedHavdalah } from "@/lib/sacred-time";

describe("expanded fictional story scope", () => {
  const fictional = "a4000000-0000-4000-8000-000000000001";
  it("staff can reach a registered fictional family", () => expect(staffScopeAllowed("demo_staff", demoAccounts.staff.id, fictional, [fictional])).toBe(true));
  it("staff cannot reach an unregistered person", () => expect(staffScopeAllowed("demo_staff", demoAccounts.staff.id, "outside", [fictional])).toBe(false));
  it("registry membership does not grant staff access to another actor", () => expect(staffScopeAllowed("demo_staff", demoAccounts.guest.id, fictional, [fictional])).toBe(false));
  it("an empty registry fails closed", () => expect(staffScopeAllowed("demo_staff", demoAccounts.staff.id, fictional, [])).toBe(false));
});

describe("story feedback and timing", () => {
  it("three excellent past visits yield full feedback fit", () => expect(feedbackFit(3, 3)).toBe(1));
  it("different style is stored as nice with explanatory detail", () => expect(validFeedback("yes", "נחמד", "סגנון אחר")).toBe(true));
  it("bad feedback requires an explanation", () => { expect(validFeedback("yes", "לא טוב", "")).toBe(false); expect(validFeedback("yes", "לא טוב", "פער בציפיות")).toBe(true); });
  it("partial story feedback is valid with details", () => expect(validFeedback("partial", "אחר", "אי הבנה")).toBe(true));
  it("quick-login pair this coming Shabbat has Bnei Brak candle time", () => expect(candleLighting("2026-11-21", "בני ברק", 32.0833, 34.8333).toISOString()).toBe("2026-11-20T14:20:00.000Z"));
  it("exceptional story cancellation is within 24 hours of candles", () => expect(cancellationWindow("2026-11-20T14:20:00Z", new Date("2026-11-20T08:00:00Z")).exceptional).toBe(true));
  it("havdalah simulation opens the coming demo visit feedback", () => expect(simulatedHavdalah(new Date("2026-11-20T09:18:00Z")) > havdalah("2026-11-21", {name:"בני ברק",lat:32.0833,lng:34.8333})).toBe(true));
});