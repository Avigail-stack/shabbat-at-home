import type { Enums } from "@/integrations/supabase/types";
import { t } from "@/i18n";

export type Invitation = {
  id: string; host_id: string; date: string; parsha: string; unit: Enums<"hosting_unit">;
  with_lodging: boolean; seats_left: number; beds: number; family_name: string;
  city: string; region: string | null; neighborhood: string | null; about: string | null;
  food_offer: string | null; cannot_provide: string | null; house_character: string | null;
  interests: string[]; languages: string[]; husband_age: number | null; wife_age: number | null;
  lat: number | null; lng: number | null; feedback_count: number; feedback_excellent: number;
};
export type RankingWeights = { distance: number; food: number; age: number; interests: number; familiarity: number; house_character: number; feedback: number; extra_language: number };
export const DEFAULT_WEIGHTS: RankingWeights = { distance: 25, food: 20, age: 15, interests: 10, familiarity: 10, house_character: 10, feedback: 5, extra_language: 5 };
export type RankingGuest = { languages: string[]; interests: string[]; food_preferences: string | null; food_sensitivities: string | null; age: number | null; lat: number | null; lng: number | null };
export function feedbackFit(count: number, excellent: number): number { return count < 3 ? 0.5 : Math.min(1, Math.max(0, excellent / count)); }
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (v: number) => v * Math.PI / 180;
  const d = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(d), Math.sqrt(1 - d));
}
export function rankInvitation(invitation: Invitation, guest: RankingGuest, weights = DEFAULT_WEIGHTS) {
  const shared = guest.languages.filter((l) => invitation.languages.includes(l));
  const interestCount = guest.interests.filter((i) => invitation.interests.includes(i)).length;
  const km = invitation.lat !== null && invitation.lng !== null && guest.lat !== null && guest.lng !== null ? distanceKm({ lat: guest.lat, lng: guest.lng }, { lat: invitation.lat, lng: invitation.lng }) : null;
  const foodTokens = [guest.food_preferences, guest.food_sensitivities].filter(Boolean).join(" ").split(/[\s,]+/).filter((s) => s.length > 2);
  const food = foodTokens.length ? foodTokens.some((token) => invitation.food_offer?.includes(token)) ? 1 : 0.5 : 0.5;
  const hostAges = [invitation.husband_age, invitation.wife_age].filter((n): n is number => n !== null);
  const ageDifference = guest.age !== null && hostAges.length ? Math.min(...hostAges.map((n) => Math.abs(n - (guest.age ?? n)))) : null;
  const fits: RankingWeights = {
    distance: km === null ? 0.5 : Math.max(0, 1 - km / 200), food,
    age: ageDifference === null ? 0.5 : Math.max(0, 1 - ageDifference / 40),
    interests: guest.interests.length ? Math.min(1, interestCount / guest.interests.length) : 0.5,
    familiarity: 0.5, house_character: 0.5,
    feedback: feedbackFit(invitation.feedback_count, invitation.feedback_excellent), extra_language: shared.length >= 2 ? 1 : 0,
  };
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const score = Math.round(Object.entries(fits).reduce((sum, [key, value]) => sum + value * weights[key as keyof RankingWeights], 0) * 100 / (total || 100));
  const reasons = [
    ...(km !== null && km <= 50 ? [{ key: "distance", label: t.invitations.reasons.near }] : []),
    ...(food === 1 ? [{ key: "food", label: t.invitations.reasons.food }] : []),
    ...(ageDifference !== null && ageDifference <= 10 ? [{ key: "age", label: t.invitations.reasons.age }] : []),
    ...(interestCount ? [{ key: "interests", label: t.invitations.reasons.interests }] : []),
    ...(invitation.feedback_count >= 3 && fits.feedback >= 0.75 ? [{ key: "feedback", label: t.invitations.reasons.feedback }] : []),
    { key: "extra_language", label: shared.length > 1 ? t.invitations.reasons.languages : t.invitations.reasons.language },
  ].sort((a, b) => weights[b.key as keyof RankingWeights] - weights[a.key as keyof RankingWeights]).slice(0, 3).map((r) => r.label);
  return { ...invitation, score, reasons };
}
export type RankedInvitation = ReturnType<typeof rankInvitation>;
export function unitLabel(unit: Enums<"hosting_unit">) { return unit === "full_shabbat" ? t.hostingDefaults.full : t.hostingDefaults.meals[unit]; }
export function shabbatLabel(date: string, parsha?: string) { return `${new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`))}${parsha ? ` · ${parsha}` : ""}`; }