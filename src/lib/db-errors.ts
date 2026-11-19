import { t } from "@/i18n";

/** Maps database rule codes to friendly Hebrew messages. */
export function friendlyDbError(message: string | undefined): string {
  const m = message ?? "";
  const O = t.onboarding;
  if (m.includes("feedback_required")) return t.feedback.banner;
  if (m.includes("feedback_not_open")) return t.feedback.notOpen;
  if (m.includes("feedback_invalid")) return t.feedback.invalid;
  if (m.includes("profile_frozen")) return t.home.frozen;
  if (m.includes("flag_invalid")) return t.flag.invalid;
  if (m.includes("double_booking")) return t.hostings.booked;
  if (m.includes("not_enough_seats")) return t.hostings.capacity;
  if (m.includes("reason_required")) return t.hostings.required;
  if (m.includes("response_unavailable") || m.includes("hosting_unavailable")) return t.hostings.unavailable;
  if (m.includes("response_limit")) return t.invitations.limit;
  if (m.includes("already_responded")) return t.invitations.duplicate;
  if (m.includes("invitation_unavailable")) return t.invitations.unavailable;
  if (m.includes("responses_exist")) return t.hostArea.hasResponses;
  if (m.includes("hosting_exists")) return t.hostArea.hasHosting;
  if (m.includes("invalid_capacity") || m.includes("invalid_shabbat")) return t.hostArea.invalid;
  if (m.includes("contact_info_not_allowed")) return O.contactBlocked;
  if (m.includes("guest_must_be_18")) return O.under18;
  if (m.includes("invalid_id_number") || m.includes("invalid_spouse_id")) return O.details.invalidId;
  if (m.includes("persons_id_number_key")) return O.details.idTaken;
  if (m.includes("phone_taken")) return O.phone.taken;
  if (m.includes("phone_proof_expired")) return O.phone.expired;
  if (m.includes("identity_photos_required")) return O.identity.photosRequired;
  if (m.includes("invalid_phone")) return O.phone.invalidPhone;
  if (m.includes("invalid_code")) return O.phone.invalidCode;
  if (m.includes("charter_required") || m.includes("lodging_rules_required")) return O.required;
  return t.auth.errors.generic;
}
