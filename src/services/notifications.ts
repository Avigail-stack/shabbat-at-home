import { t } from "@/i18n";
/**
 * Every message goes to inbox + email + the chosen channel. All delivery adapters
 * remain mocks and persist receipts only; they never contact a messaging provider.
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
export const TEMPLATES: Record<TemplateKey, string> = t.messages.templates;

export function render(template: TemplateKey, vars: Record<string, string>): string {
  return TEMPLATES[template].replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "");
}

/** Which channels a message goes to, given the user's chosen channel. */
export function channelsFor(template: TemplateKey, chosen: "whatsapp" | "sms" | "voice"): Channel[] {
  const base: Channel[] = ["inbox", "email"];
  return [...base, template === "host_rejected" ? "sms" : chosen];
}

export interface NotificationAdapter {
  channel: Channel;
  send(to: string, body: string, template: TemplateKey, vars: Record<string, string>): Promise<void>;
}

export interface NotificationService { deliver(to: string, body: string, template: TemplateKey, vars: Record<string, string>): Promise<void> }
/** No networking: adapters only persist delivery receipts through the supplied writer. */
export class MockNotificationAdapter implements NotificationAdapter, NotificationService {
  constructor(public channel: Channel, private write: (body: string) => Promise<void>) {}
  async send(_to: string, body: string, _template: TemplateKey, _vars: Record<string, string>) { await this.write(body); }
  async deliver(to: string, body: string, template: TemplateKey, vars: Record<string, string>) { await this.send(to, body, template, vars); }
}
