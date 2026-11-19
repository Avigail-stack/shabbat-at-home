import { describe, expect, it } from "vitest";
import { canSubmitGuest, canSubmitHost, containsContactInfo, isAdult, isValidIsraeliId, ageBand, validHostingDefault } from "@/lib/validation";

const today = new Date("2026-11-11");

describe("guest age rule (18+)", () => {
  it("blocks a guest who is 17", () => expect(isAdult("2009-11-12", today)).toBe(false));
  it("allows a guest on their 18th birthday", () => expect(isAdult("2008-11-11", today)).toBe(true));
});

describe("charter gate", () => {
  it("guest cannot finish without the charter", () =>
    expect(canSubmitGuest({ charterAccepted: false, dob: "1990-01-01" }, today)).toBe(false));
  it("guest with charter and 18+ can finish", () =>
    expect(canSubmitGuest({ charterAccepted: true, dob: "1990-01-01" }, today)).toBe(true));
  const host = { charterAccepted: true, behaviorAccepted: true, lodgingRules: [true, true, true, true] as [boolean, boolean, boolean, boolean], spouseName: "רחל", spouseId: "000000018" };
  it("host with everything approved can finish", () => expect(canSubmitHost(host)).toBe(true));
  it("host cannot finish without behavior rules", () => expect(canSubmitHost({ ...host, behaviorAccepted: false })).toBe(false));
  it("host cannot finish with one lodging rule unchecked", () =>
    expect(canSubmitHost({ ...host, lodgingRules: [true, false, true, true] })).toBe(false));
  it("meal without lodging does not require room commitments", () => expect(canSubmitHost({ ...host, withLodging: false, lodgingRules: [false, false, false, false] })).toBe(true));
  it("lodging requires a separate room", () => expect(canSubmitHost({ ...host, withLodging: true, lodgingRules: [false, true, false, false] })).toBe(false));
  it("obsolete description commitment is not required", () => expect(canSubmitHost({ ...host, withLodging: true, lodgingRules: [true, true, false, false] })).toBe(true));
  it("host cannot finish without a valid spouse ID", () => expect(canSubmitHost({ ...host, spouseId: "123456789" })).toBe(false));
});

describe("Israeli ID number", () => {
  it("accepts a valid checksum", () => expect(isValidIsraeliId("000000018")).toBe(true));
  it("rejects a wrong checksum", () => expect(isValidIsraeliId("123456789")).toBe(false));
});

describe("hosting unit defaults", () => {
  it("full Shabbat requires lodging", () => expect(validHostingDefault("full_shabbat", false)).toBe(false));
  it("full Shabbat with lodging is valid", () => expect(validHostingDefault("full_shabbat", true)).toBe(true));
  for (const meal of ["friday_dinner", "shabbat_lunch", "seudah_shlishit"]) {
    it(`${meal} allows with or without lodging`, () => { expect(validHostingDefault(meal, true)).toBe(true); expect(validHostingDefault(meal, false)).toBe(true); });
  }
});

describe("contact info blocker", () => {
  it("blocks a phone number", () => expect(containsContactInfo("תתקשרו 050-1234567")).toBe(true));
  it("blocks an email", () => expect(containsContactInfo("noa@example.com")).toBe(true));
  it("blocks a WhatsApp link", () => expect(containsContactInfo("wa.me/972501234567")).toBe(true));
  it("blocks a street address", () => expect(containsContactInfo("גרים ברחוב הרצל 12")).toBe(true));
  it("allows ordinary text", () => expect(containsContactInfo("אוהבת היסטוריה ומוזיקה, בת 28")).toBe(false));
});

describe("age bands for hosts", () => {
  it("shows 5-year bands", () => expect(ageBand(28)).toBe("25–29"));
});
