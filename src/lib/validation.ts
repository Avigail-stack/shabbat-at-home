// Client-side mirrors of the database rules. The database enforces the same rules again.

export const PHONE_RE = /^05\d{8}$/;
export const OTP_RE = /^\d{6}$/;

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
