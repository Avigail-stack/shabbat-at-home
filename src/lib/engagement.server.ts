import { supabaseAdmin as db } from "@/integrations/supabase/client.server";
import { channelsFor, render, MockNotificationAdapter, type TemplateKey } from "@/services/notifications";
import { deferredUntil, havdalah, israelDate, FALLBACK_CITY } from "./sacred-time";
import { candleLighting, candleTimeLabel } from "./candle-lighting";
import { t } from "@/i18n";
import { demoAccounts } from "./demo-accounts";
import { fridayReminderDue } from "./validation";

function check(result: { error: { message: string } | null }) { if (result.error) throw new Error(result.error.message); }
async function demoParticipantIds() {
  const result = await db.from("demo_participants").select("person_id"); check(result);
  return (result.data ?? []).map(row => row.person_id);
}
export async function cityFor(uid: string) {
  const [host, guest] = await Promise.all([db.from("host_profiles").select("city").eq("person_id", uid).maybeSingle(), db.from("guest_profiles").select("city").eq("person_id", uid).maybeSingle()]);
  check(host); check(guest);
  const name = host.data?.city || guest.data?.city;
  if (!name) return FALLBACK_CITY;
  const result = await db.from("cities").select("name,lat,lng").eq("name", name).maybeSingle(); check(result);
  return result.data ?? FALLBACK_CITY;
}
export async function refreshHostingDeadlines(uid?: string, participants?: string[]) {
  let query = db.from("hostings").select("id,shabbat_date,host_id,feedback_opens_at").in("status", ["confirmed", "took_place", "did_not_take_place"]);
  if (uid) query = uid===demoAccounts.guest.id ? query.eq("host_id",demoAccounts.host.id).eq("guest_id",demoAccounts.guest.id) : query.or(`host_id.eq.${uid},guest_id.eq.${uid}`);
  if (participants) query = query.in("host_id", participants).in("guest_id", participants);
  const result = await query; check(result);
  for (const h of result.data ?? []) {
    if (h.feedback_opens_at) continue;
    const city = await cityFor(h.host_id);
    check(await db.from("hostings").update({ feedback_opens_at: havdalah(h.shabbat_date, city).toISOString() }).eq("id", h.id));
  }
}
async function variables(template: string, entity: string | null) {
  if (!entity) return {};
  let hostingId = entity;
  if (["new_response", "awaiting_you", "response_declined", "response_expired"].includes(template)) {
    const response = await db.from("responses").select("availability_id").eq("id", entity).maybeSingle(); check(response);
    if (!response.data) return {};
    const slot = await db.from("availability").select("shabbat_date").eq("id", response.data.availability_id).single(); check(slot);
    const shabbat = await db.from("shabbatot").select("parsha").eq("date", slot.data?.shabbat_date ?? "").single(); check(shabbat);
    if (template !== "awaiting_you") return { parsha: shabbat.data?.parsha ?? "" };
    const hosting = await db.from("hostings").select("id").eq("response_id", entity).single(); check(hosting);
    hostingId = hosting.data?.id ?? entity;
  }
  if (["awaiting_you", "hosting_cancelled", "pre_shabbat_reminder"].includes(template)) {
    const hosting = await db.from("hostings").select("host_id,shabbat_date,status,contact_method").eq("id", hostingId).maybeSingle(); check(hosting);
    if (!hosting.data) return {};
    const h = hosting.data;
    const [host, person, shabbat, city] = await Promise.all([db.from("host_profiles").select("family_name,street_address,neighborhood,city").eq("person_id", h.host_id).single(), db.from("persons").select("phone").eq("id", h.host_id).single(), db.from("shabbatot").select("parsha").eq("date", h.shabbat_date).single(), cityFor(h.host_id)]);
    check(host); check(person); check(shabbat);
    const confirmed = h.status === "confirmed";
    return { family: host.data?.family_name ?? "", parsha: shabbat.data?.parsha ?? "", phone: confirmed ? person.data?.phone ?? "" : "", address: confirmed ? [host.data?.street_address,host.data?.neighborhood,host.data?.city].filter(Boolean).join(", ") : "", method: t.hostQ.contacts[h.contact_method], city: city.name, time: candleTimeLabel(candleLighting(h.shabbat_date, city.name, city.lat, city.lng).toISOString()) };
  }
  return {};
}
export async function processNotifications(now = new Date(), demoOnly = false) {
  let pending = db.from("notification_events").select("*").is("processed_at", null).order("created_at").limit(1000);
  if (demoOnly) pending = pending.in("person_id", await demoParticipantIds());
  const events = await pending; check(events);
  for (const event of events.data ?? []) {
    const person = await db.from("persons").select("email,phone,notification_channel").eq("id", event.person_id).single(); check(person);
    if (!person.data) continue;
    const chosen = person.data.notification_channel ?? "sms";
    const city = await cityFor(event.person_id);
    const after = deferredUntil(now, city);
    const vars = await variables(event.template, event.entity_id);
    const template = event.template as TemplateKey;
    const body = render(template, vars);
    for (const channel of channelsFor(template, chosen)) {
      const adapter = new MockNotificationAdapter(channel, async (text) => {
        const queued = channel !== "inbox" && !!after;
        const receipt = await db.from("notifications").upsert({ person_id: event.person_id, channel, template, event_key: event.event_key, recipient: channel === "email" ? person.data?.email : person.data?.phone, body: text, variables: { ...vars, deferred_channel: chosen }, provider: "mock", status: queued ? "queued" : "sent", send_after: after?.toISOString() ?? now.toISOString(), sent_at: queued ? null : now.toISOString(), important: true }, { onConflict: "event_key,channel", ignoreDuplicates: true }); check(receipt);
      });
      await adapter.send("", body, template, vars);
    }
    check(await db.from("notification_events").update({ processed_at: now.toISOString() }).eq("id", event.id));
  }
}
export async function runJobs(now: Date, demoOnly = false) {
  const ids = demoOnly ? await demoParticipantIds() : [];
  if (demoOnly) await refreshHostingDeadlines(undefined, ids); else await refreshHostingDeadlines();
  let expiry = db.from("responses").update({ status: "expired", answered_at: now.toISOString() }).eq("status", "pending").lte("expires_at", now.toISOString());
  if (demoOnly) expiry = expiry.in("guest_id", ids).in("host_id", ids);
  check(await expiry);
  let bookings = db.from("hostings").select("id,host_id,guest_id,shabbat_date,feedback_opens_at").in("status", ["confirmed", "took_place", "did_not_take_place"]);
  if (demoOnly) bookings = bookings.in("guest_id", ids).in("host_id", ids);
  const hostings = await bookings; check(hostings);
  const today = israelDate(now);
  for (const h of hostings.data ?? []) {
    const hour = Number(new Intl.DateTimeFormat("en", { timeZone: "Asia/Jerusalem", hour: "2-digit", hourCycle: "h23" }).format(now));
    const targets = h.feedback_opens_at && new Date(h.feedback_opens_at) <= now ? [h.guest_id, h.host_id] : fridayReminderDue(h.shabbat_date, today, hour) ? [h.guest_id] : [];
    for (const uid of targets) {
      const template = h.feedback_opens_at && new Date(h.feedback_opens_at) <= now ? "feedback_form" : "pre_shabbat_reminder";
      if (template === "feedback_form") {
        const answered = await db.from("feedback").select("id").eq("hosting_id", h.id).eq("author_id", uid).maybeSingle(); check(answered); if (answered.data) continue;
      }
      check(await db.from("notification_events").upsert({ person_id: uid, template, entity_id: h.id, event_key: `${template}:${h.id}:${uid}` }, { onConflict: "event_key", ignoreDuplicates: true }));
    }
  }
  await processNotifications(now, demoOnly);
  let queue = db.from("notifications").select("id,person_id,template,variables,event_key").eq("status", "queued").lte("send_after", now.toISOString()).limit(1000);
  if (demoOnly) queue = queue.in("person_id", ids);
  const queued = await queue; check(queued);
  let released=0;
  for (const n of queued.data ?? []) {
    if (!n.person_id) continue;
    const after = deferredUntil(now, await cityFor(n.person_id));
    check(await db.from("notifications").update(after ? { send_after: after.toISOString() } : { status: "sent", sent_at: now.toISOString() }).eq("id", n.id).eq("status", "queued"));
    if(!after)released++;
  }
  return { processed: released };
}