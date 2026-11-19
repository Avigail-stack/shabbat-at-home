import { describe, expect, it } from "vitest";
import { candleLighting, candleOffset } from "@/lib/candle-lighting";
import { canConfirmHosting, cancellationWindow, validCancellation, contactVisible, hostingSeatsAfterCancellation, responseHostingCancelled } from "@/lib/validation";

describe("hosting confirmation", () => {
  const now = new Date("2026-11-19T12:00:00Z");
  it("allows a pending unexpired response that exactly fills the slot", () => expect(canConfirmHosting(true, "2026-11-20T12:00:00Z", 4, 4, false, now)).toBe(true));
  it("prevents insufficient seats", () => expect(canConfirmHosting(true, "2026-11-20T12:00:00Z", 3, 4, false, now)).toBe(false));
  it("prevents double booking", () => expect(canConfirmHosting(true, "2026-11-20T12:00:00Z", 4, 4, true, now)).toBe(false));
  it("rejects expired responses", () => expect(canConfirmHosting(true, "2026-11-19T12:00:00Z", 4, 4, false, now)).toBe(false));
  it("rejects previously answered responses", () => expect(canConfirmHosting(false, "2026-11-20T12:00:00Z", 4, 4, false, now)).toBe(false));
});
describe("candle lighting", () => {
  it("uses Jerusalem's 40 minute custom", () => expect(candleOffset("ירושלים")).toBe(40));
  it("uses Haifa and Safed's 30 minute custom", () => { expect(candleOffset("חיפה")).toBe(30); expect(candleOffset("צפת")).toBe(30); });
  it("defaults other cities to 18 minutes", () => expect(candleOffset("בני ברק")).toBe(18));
  it("calculates the preceding Friday at the supplied coordinates", () => {
    const time = candleLighting("2026-11-28", "ירושלים", 31.7683, 35.2137);
    expect(time.toISOString().slice(0, 10)).toBe("2026-11-27");
    expect(time.getUTCHours()).toBe(13);
  });
  it("Jerusalem is 22 minutes earlier at identical coordinates", () => expect(candleLighting("2026-11-28", "בני ברק", 31.7683, 35.2137).getTime() - candleLighting("2026-11-28", "ירושלים", 31.7683, 35.2137).getTime()).toBe(22 * 60000));
});
describe("cancellation", () => {
  it("keeps a cancelled accepted response separate from a later confirmation", () => {
    const hostings = [{ response_id: "old", status: "cancelled_host" }, { response_id: "new", status: "confirmed" }];
    expect(responseHostingCancelled("old", hostings)).toBe(true);
    expect(responseHostingCancelled("new", hostings)).toBe(false);
  });
  const candle = "2026-11-27T14:00:00Z";
  it("exceptional means strictly less than 24 hours", () => { expect(cancellationWindow(candle, new Date("2026-11-26T14:00:00Z")).exceptional).toBe(false); expect(cancellationWindow(candle, new Date("2026-11-26T14:00:01Z")).exceptional).toBe(true); });
  it("late means strictly less than 72 hours", () => { expect(cancellationWindow(candle, new Date("2026-11-24T14:00:00Z")).late).toBe(false); expect(cancellationWindow(candle, new Date("2026-11-24T14:00:01Z")).late).toBe(true); });
  it("honors configured hours", () => expect(cancellationWindow(candle, new Date("2026-11-26T15:00:00Z"), 12).exceptional).toBe(false));
  it("requires an exceptional explanation", () => expect(validCancellation("illness", "  ", true)).toBe(false));
  it("allows illness, bereavement and other exceptional reasons", () => { for (const reason of ["illness", "bereavement", "other"]) expect(validCancellation(reason, "explanation", true)).toBe(true); });
  it("does not allow ordinary reasons for exceptional host cancellation", () => expect(validCancellation("plans_changed", "explanation", true)).toBe(false));
  it("ordinary cancellation still requires a reason", () => expect(validCancellation("", "", false)).toBe(false));
  it("returns the guest's four seats", () => expect(hostingSeatsAfterCancellation(6, 2, 4)).toBe(6));
  it("never exceeds total capacity", () => expect(hostingSeatsAfterCancellation(6, 4, 4)).toBe(6));
  it("reveals contacts only while confirmed", () => { expect(contactVisible("confirmed")).toBe(true); for (const status of ["cancelled_guest", "cancelled_host", "cancelled_staff", "under_review"]) expect(contactVisible(status)).toBe(false); });
});