/**
 * NotificationService contract. Every message goes to the inbox + email, and important ones
 * also to the user's chosen channel. Adapters are mocks in Phase 1 (they write to the
 * notifications table as the message log). Server-side wiring comes in pass 2.
 */
export type Channel = "whatsapp" | "sms" | "voice" | "email" | "inbox";

export type TemplateKey =
  | "new_response"
  | "awaiting_you"
  | "hosting_cancelled"
  | "answer_reminder"
  | "host_approved"
  | "host_rejected"
  | "host_more_info"
  | "response_declined"
  | "response_expired"
  | "pre_shabbat_reminder"
  | "feedback_form";

export const IMPORTANT_TEMPLATES: TemplateKey[] = [
  "new_response",
  "awaiting_you",
  "hosting_cancelled",
  "answer_reminder",
  "host_approved",
];

/** WhatsApp needs pre-approved templates, so every text is a template with variables. */
export const TEMPLATES: Record<TemplateKey, string> = {
  new_response: "התקבלה היענות חדשה לשבת פרשת {parsha}. כל הפרטים באתר.",
  awaiting_you: "משפחת {family} מחכה לך לשבת פרשת {parsha}! הם מעדיפים שתפנה/י אליהם ב{method}: {phone}.",
  hosting_cancelled: "האירוח לשבת פרשת {parsha} בוטל. כל הפרטים באתר ובמייל.",
  answer_reminder: "נשארו 6 שעות לענות להיענות לשבת פרשת {parsha}.",
  host_approved: "ברוכים הבאים! הפרופיל שלכם אושר, וההזמנות שלכם גלויות עכשיו לאורחים.",
  host_rejected: "תודה על ההרשמה. לצערנו לא נוכל לאשר את הפרופיל כרגע. אפשר לפנות לארגון לפרטים.",
  host_more_info: "צוות הארגון צריך עוד כמה פרטים. כל הפרטים באתר.",
  response_declined: "המשפחה לא יכולה לארח הפעם.",
  response_expired: "ההיענות לשבת פרשת {parsha} פגה. יש עוד משפחות שמחכות – כדאי להציץ.",
  pre_shabbat_reminder: "תזכורת: שבת פרשת {parsha} בפתח.",
  feedback_form: "איך הייתה השבת? נשמח למשוב לארגון.",
};

export function render(template: TemplateKey, vars: Record<string, string>): string {
  return TEMPLATES[template].replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "");
}

/** Which channels a message goes to, given the user's chosen channel. */
export function channelsFor(template: TemplateKey, chosen: "whatsapp" | "sms" | "voice"): Channel[] {
  const base: Channel[] = ["inbox", "email"];
  return IMPORTANT_TEMPLATES.includes(template) ? [...base, chosen] : base;
}

export interface NotificationAdapter {
  channel: Channel;
  send(to: string, body: string, template: TemplateKey, vars: Record<string, string>): Promise<void>;
}
