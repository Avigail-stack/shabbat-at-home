import { describe, expect, it } from "vitest";
import { invitationBeforeCutoff, validAvailability, responseExpired, canRespond, eligibleInvitation, type InvitationGate } from "@/lib/validation";
import { DEFAULT_WEIGHTS, feedbackFit, rankInvitation, type Invitation } from "@/lib/invitations";

const invitation: Invitation = { id: "demo", host_id: "host", date: "2026-11-28", parsha: "וישלח", unit: "full_shabbat", with_lodging: true, seats_left: 6, beds: 6, family_name: "דוגמה", city: "ירושלים", region: "ירושלים", neighborhood: null, about: null, food_offer: "צמחונות", cannot_provide: null, house_character: null, interests: ["מוזיקה"], languages: ["he", "en"], husband_age: 40, wife_age: 35, lat: 31.78, lng: 35.22, feedback_count: 3, feedback_excellent: 3 };
const guest = { languages: ["he", "en"], interests: ["מוזיקה"], food_preferences: "צמחונות", food_sensitivities: null, age: 35, lat: 31.78, lng: 35.22 };
describe("mandatory eligibility", () => {
  const gate: InvitationGate = { approved: true, seats: 4, beds: 4, adults: 2, minors: 2, genderPreference: "everyone", gender: "female", sharedLanguages: 1, areaAllowed: true, unit: "full_shabbat", guestUnit: "full_shabbat", lodging: true, guestLodging: true, separateRoom: true, lockableDoor: true };
  it("counts guest, adult companions and children", () => expect(eligibleInvitation(gate)).toBe(true));
  it("filters insufficient seats", () => expect(eligibleInvitation({ ...gate, seats: 3 })).toBe(false));
  it("filters insufficient beds with lodging", () => expect(eligibleInvitation({ ...gate, beds: 3 })).toBe(false));
  it("filters unapproved hosts", () => expect(eligibleInvitation({ ...gate, approved: false })).toBe(false));
  it("filters no shared language", () => expect(eligibleInvitation({ ...gate, sharedLanguages: 0 })).toBe(false));
  it("honors guest area restriction", () => expect(eligibleInvitation({ ...gate, areaAllowed: false })).toBe(false));
  it("matches hosting type", () => expect(eligibleInvitation({ ...gate, unit: "friday_dinner" })).toBe(false));
  it("matches lodging choice", () => expect(eligibleInvitation({ ...gate, guestLodging: false })).toBe(false));
  it("requires both room commitments for lodging", () => expect(eligibleInvitation({ ...gate, lockableDoor: false })).toBe(false));
  it("does not require beds or room commitments without lodging", () => expect(eligibleInvitation({ ...gate, unit: "friday_dinner", guestUnit: "friday_dinner", lodging: false, guestLodging: false, beds: 0, separateRoom: false, lockableDoor: false })).toBe(true));
  it("women-only admits an unaccompanied woman", () => expect(eligibleInvitation({ ...gate, genderPreference: "women_only", adults: 1, minors: 0 })).toBe(true));
  it("gender-restricted homes exclude companions with unknown gender", () => expect(eligibleInvitation({ ...gate, genderPreference: "women_only" })).toBe(false));
  it("families-couples excludes a solo guest", () => expect(eligibleInvitation({ ...gate, genderPreference: "families_couples", adults: 1, minors: 0 })).toBe(false));
});
describe("guest cutoff Israel time", () => {
  it("shows coming Shabbat before Thursday 20:00", () => expect(invitationBeforeCutoff("2026-11-21", new Date("2026-11-19T17:59:59Z"))).toBe(true));
  it("hides at Thursday 20:00 exactly", () => expect(invitationBeforeCutoff("2026-11-21", new Date("2026-11-19T18:00:00Z"))).toBe(false));
  it("keeps later Shabbatot visible", () => expect(invitationBeforeCutoff("2026-11-28", new Date("2026-11-19T18:00:00Z"))).toBe(true));
  it("uses configurable cutoff", () => expect(invitationBeforeCutoff("2026-11-21", new Date("2026-11-19T17:00:00Z"), 19)).toBe(false));
  it("handles daylight saving time", () => expect(invitationBeforeCutoff("2027-06-05", new Date("2027-06-03T17:00:00Z"))).toBe(false));
});
describe("responses", () => {
  it("allows a third pending response", () => expect(canRespond(2)).toBe(true));
  it("blocks a fourth pending response", () => expect(canRespond(3)).toBe(false));
  it("expires at 24 hours", () => expect(responseExpired("2026-11-18T12:00:00Z", new Date("2026-11-19T12:00:00Z"))).toBe(true));
  it("does not expire before 24 hours", () => expect(responseExpired("2026-11-18T12:00:00Z", new Date("2026-11-19T11:59:59Z"))).toBe(false));
});
describe("host calendar", () => {
  it("full Shabbat requires lodging", () => expect(validAvailability("full_shabbat", false, 4, 0)).toBe(false));
  it("meal can have no lodging or beds", () => expect(validAvailability("friday_dinner", false, 4, 0)).toBe(true));
  it("lodging requires beds", () => expect(validAvailability("full_shabbat", true, 4, 0)).toBe(false));
  it("new invitations require positive integer seats", () => { expect(validAvailability("full_shabbat", true, 0, 4)).toBe(false); expect(validAvailability("full_shabbat", true, 1.5, 4)).toBe(false); });
});
describe("ranking", () => {
  it("uses exact requested weights", () => expect(DEFAULT_WEIGHTS).toEqual({ distance: 25, food: 20, age: 15, interests: 10, familiarity: 10, house_character: 10, feedback: 5, extra_language: 5 }));
  it("weights sum to 100", () => expect(Object.values(DEFAULT_WEIGHTS).reduce((a,b) => a+b,0)).toBe(100));
  it("below three answers uses average", () => expect(feedbackFit(2, 2)).toBe(0.5));
  it("three answers uses excellent share", () => expect(feedbackFit(3, 2)).toBeCloseTo(2/3));
  it("maximum supported matches score 90 with neutral uncollected preferences", () => expect(rankInvitation(invitation, guest).score).toBe(90));
  it("reasons are capped at three", () => expect(rankInvitation(invitation, guest).reasons).toHaveLength(3));
  it("ranks a close family above a distant one", () => expect(rankInvitation(invitation, guest).score).toBeGreaterThan(rankInvitation({ ...invitation, lat: 33.5, lng: 35.5 }, guest).score));
  it("extra shared language contributes five points", () => expect(rankInvitation(invitation, guest).score - rankInvitation({ ...invitation, languages: ["he"] }, guest).score).toBe(5));
});