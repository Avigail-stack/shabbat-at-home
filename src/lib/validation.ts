// Client-side mirrors of the database rules. The database enforces the same rules again.
export const attentionThresholds = { late_hours: 72, late_count: 2, late_months: 3, decline_count: 3, unanswered_count: 4, response_months: 2, due_weekday: 2 };
export function attentionThresholdReached(kind: "late" | "declined" | "unanswered", count: number, cfg = attentionThresholds) { return count >= (kind === "late" ? cfg.late_count : kind === "declined" ? cfg.decline_count : cfg.unanswered_count); }
export function attentionDue(date: string) {
  const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate()+3);
  const end = new Date(`${d.toISOString().slice(0,10)}T23:59:59.999Z`);
  const hour = Number(new Intl.DateTimeFormat("en",{timeZone:"Asia/Jerusalem",hour:"numeric",hourCycle:"h23"}).format(d));
  return new Date(end.getTime()-(hour-12)*3600000);
}
export function validAttentionAction(action: string, note: string, partial = false, result?: string, taken?: string) { return ["claim","called","note","close"].includes(action) && note.length <= 2000 && (!["note","close"].includes(action) || !!note.trim()) && (action !== "close" || !partial || (!!result && ["misunderstanding","charter","host_problem","other"].includes(result) && !!taken && ["none","remark","warning","suspension"].includes(taken))); }
export function validStaffHostingAction(action: string, note: string) { return ["cancel","note"].includes(action) && !!note.trim() && note.length <= 2000; }
export function staffScopeAllowed(role: string, actor: string, target?: string, participants: readonly string[] = ["809f85d8-4640-4860-badc-45cba7b5fb4a", "ed5895e3-934e-4220-91a1-f70cc937103c"]) {
  if (role === "rep" || role === "admin") return true;
  return role === "demo_staff" && actor === "2f79a37c-468f-4bf5-90c4-c0adef2190cc" && (!target || participants.includes(target));
}
export function validStaffReview(action: string, note: string, until?: string, idCheck = false, contactCheck = false, now = new Date()) {
  if (!["claim", "close", "approve", "reject_host", "more_info", "verify", "reject_identity", "freeze", "unfreeze", "suspend"].includes(action)) return false;
  return note.length <= 2000 && (["claim", "approve"].includes(action) || note.trim().length > 0) && (action !== "approve" || (idCheck && contactCheck)) && (action !== "suspend" || (!!until && new Date(until) > now));
}
export function validFeedback(took: string, overall: string, details: string) { return ["yes", "partial", "no"].includes(took) && details.length <= 2000 && (took === "no" || (["מעולה", "נחמד", "לא טוב", "אחר"].includes(overall) && (!["לא טוב", "אחר"].includes(overall) || details.trim().length > 0))); }
export function validFlag(description: string) { return description.trim().length > 0 && description.length <= 2000; }
export function engagementActionsAllowed(frozen: boolean, feedback: { due: boolean; answered: boolean }[]) { return !frozen && !feedback.some((h) => h.due && !h.answered); }
export function fridayReminderDue(shabbatDate: string, today: string, hour: number) { const friday = new Date(`${shabbatDate}T12:00:00Z`); friday.setUTCDate(friday.getUTCDate() - 1); return friday.toISOString().slice(0,10) === today && hour >= 9; }

export function canConfirmHosting(pending: boolean, expires: string, seats: number, party: number, alreadyBooked: boolean, now = new Date()) {
  return pending && new Date(expires) > now && seats >= party && !alreadyBooked;
}
export function cancellationWindow(candle: string, now = new Date(), exceptionalHours = 24, lateHours = 72) {
  const hours = (new Date(candle).getTime() - now.getTime()) / 3600000;
  return { exceptional: hours < exceptionalHours, late: hours < lateHours };
}
export function validCancellation(reason: string, note: string, exceptional: boolean) {
  return (exceptional ? ["illness", "bereavement", "other"] : ["illness", "bereavement", "plans_changed", "cannot_arrive", "other"]).includes(reason) && (!exceptional || note.trim().length > 0) && note.length <= 2000;
}
export function contactVisible(status: string) { return status === "confirmed"; }
export function responseHostingCancelled(responseId: string, hostings: { response_id: string; status: string }[]) { return hostings.some((h) => h.response_id === responseId && h.status.startsWith("cancelled")); }
export function hostingSeatsAfterCancellation(seats: number, left: number, party: number) { return Math.min(seats, left + party); }

export const PHONE_RE = /^05\d{8}$/;
export const OTP_RE = /^\d{6}$/;

export function invitationBeforeCutoff(date: string, now = new Date(), hour = 20): boolean {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (key: string) => parts.find((p) => p.type === key)?.value ?? "";
  const today = `${get("year")}-${get("month")}-${get("day")}`;
  const cutoff = new Date(`${date}T12:00:00Z`); cutoff.setUTCDate(cutoff.getUTCDate() - 2);
  const day = cutoff.toISOString().slice(0, 10);
  return date > today && (today < day || (today === day && Number(get("hour")) < hour));
}
export function validAvailability(unit: string, lodging: boolean, seats: number, beds: number) {
  return validHostingDefault(unit, lodging) && Number.isInteger(seats) && seats >= 1 && Number.isInteger(beds) && beds >= 0 && (!lodging || beds >= 1);
}
export function responseExpired(created: string, now = new Date()) { return now.getTime() - new Date(created).getTime() >= 24 * 60 * 60 * 1000; }
export function canRespond(count: number) { return count < 3; }
export type InvitationGate = {
  approved: boolean; seats: number; beds: number; adults: number; minors: number;
  genderPreference: string; gender: string; sharedLanguages: number;
  areaAllowed: boolean; unit: string; guestUnit: string; lodging: boolean; guestLodging: boolean;
  separateRoom: boolean; lockableDoor: boolean;
};
export function eligibleInvitation(g: InvitationGate) {
  const size = g.adults + g.minors;
  const gender = g.genderPreference === "everyone" || (g.genderPreference === "families_couples" && size > 1) ||
    (g.adults === 1 && g.minors === 0 && ((g.genderPreference === "women_only" && g.gender === "female") || (g.genderPreference === "men_only" && g.gender === "male")));
  return g.approved && size <= g.seats && (!g.lodging || size <= g.beds) && gender && g.sharedLanguages > 0 && g.areaAllowed && g.unit === g.guestUnit && g.lodging === g.guestLodging && (!g.lodging || (g.separateRoom && g.lockableDoor));
}

export const IDENTITY_MAX_ATTEMPTS = 3;
export function identityAttempt(attempts: number, failed: boolean) {
  if (attempts >= IDENTITY_MAX_ATTEMPTS) return { attempts: 3, status: "manual_review" } as const;
  const next = Math.min(IDENTITY_MAX_ATTEMPTS, attempts + 1);
  return { attempts: next, status: failed ? next >= 3 ? "manual_review" : "pending" : "passed" } as const;
}
export function canViewInvitations(step: string, identityStatus: string | undefined) {
  return step === "done" && identityStatus === "passed";
}

export type CompanionInput = { id_number: string; relation: string };
export function validCompanions(companions: CompanionInput[], minors: number): boolean {
  return Number.isInteger(minors) && minors >= 0 && companions.every((c) =>
    (c.relation === "spouse" || c.relation === "child") && isValidIsraeliId(c.id_number)) &&
    new Set(companions.map((c) => c.id_number.padStart(9, "0"))).size === companions.length;
}

export function validHostAddress(street: string | null, house: string | null, neighborhood: string | null, city: string | null): boolean {
  return [street, house, neighborhood, city].every((v) => !!v?.trim());
}
export function validHostRecommendation(mode: string, method: string | null, names: (string | null)[], phones: (string | null)[]): boolean {
  return mode === "staff_call" ? method === "video" || method === "phone" : mode === "recommenders" && names.length === 2 && phones.length === 2 && names.every((v) => !!v?.trim()) && phones.every((v) => PHONE_RE.test(v ?? ""));
}

export function guestWeekStart(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (key: string) => parts.find((p) => p.type === key)?.value ?? "";
  const day = new Date(`${get("year")}-${get("month")}-${get("day")}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() - day.getUTCDay());
  return day.toISOString().slice(0,10);
}

export function isValidIsraeliId(id: string): boolean {
  if (!/^\d{5,9}$/.test(id)) return false;
  const p = id.padStart(9, "0");
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let d = Number(p[i]) * (i % 2 === 0 ? 1 : 2);
    if (d > 9) d -= 9;
    sum += d;
  }
  return sum % 10 === 0;
}

const CONTACT_PATTERNS: RegExp[] = [
  /\d[\d\s\-.]{7,}\d/,
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
  /(https?:\/\/|www\.|wa\.me|whatsapp|t\.me\/)/i,
  /(רחוב|רח'|שדרות|שד'|סמטת|דרך)\s*[א-ת"'\-\s]{2,30}\s+\d{1,4}/,
];

/** Best-effort: blocks phones, emails, links/WhatsApp and street addresses in free text. */
export function containsContactInfo(text: string | null | undefined): boolean {
  if (!text) return false;
  return CONTACT_PATTERNS.some((re) => re.test(text));
}

export function ageOn(dob: string, today = new Date()): number {
  const b = new Date(dob);
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age;
}

export function isAdult(dob: string, today = new Date()): boolean {
  return ageOn(dob, today) >= 18;
}

export function ageBand(age: number): string {
  const lo = Math.floor(age / 5) * 5;
  return `${lo}–${lo + 4}`;
}

export function parseAges(s: string): number[] {
  return s
    .split(/[,،\s]+/)
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n >= 0 && n < 120);
}

export type GuestGate = { charterAccepted: boolean; dob: string | null };
export function canSubmitGuest(g: GuestGate, today = new Date()): boolean {
  return g.charterAccepted && !!g.dob && isAdult(g.dob, today);
}

export type HostGate = {
  charterAccepted: boolean;
  behaviorAccepted: boolean;
  lodgingRules: [boolean, boolean, boolean, boolean];
  spouseName: string;
  spouseId: string;
  withLodging?: boolean;
};
export function validHostingDefault(unit: string, withLodging: boolean): boolean {
  return ["full_shabbat", "friday_dinner", "shabbat_lunch", "seudah_shlishit"].includes(unit) && (unit !== "full_shabbat" || withLodging);
}
export function canSubmitHost(h: HostGate): boolean {
  return (
    h.charterAccepted &&
    h.behaviorAccepted &&
    (h.withLodging === false || (h.lodgingRules[0] && h.lodgingRules[1])) &&
    h.spouseName.trim().length > 0 &&
    isValidIsraeliId(h.spouseId)
  );
}
