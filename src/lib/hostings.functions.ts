import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { candleLighting } from "./candle-lighting";

export type HostingSummary = { id: string; date: string; status: string; side: "host" | "guest"; party_size: number; first_name: string; family_name: string; cancelled_on_friday: boolean };
export type HostingDetail = HostingSummary & { city: string; lat: number | null; lng: number | null; parsha: string; adults: number; minors: number; contact_method: "whatsapp" | "phone_call"; guest_phone: string | null; host_phone: string | null; address: string | null };
export const hostingSummaries = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc("my_hosting_summaries");
  if (error) throw new Error(error.message);
  return data as unknown as HostingSummary[];
});
export const hostingDetail = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const detail = await context.supabase.rpc("hosting_details", { _id: data.id });
    if (detail.error) throw new Error(detail.error.message);
    const h = detail.data as unknown as HostingDetail;
    const settings = await context.supabase.from("app_settings").select("key,value").eq("key", "exceptional_cancellation_hours").single();
    if (settings.error) throw new Error(settings.error.message);
    const candle = h.lat !== null && h.lng !== null ? candleLighting(h.date, h.city, h.lat, h.lng).toISOString() : null;
    return { ...h, candle, exceptionalHours: Number(settings.data.value) || 24 };
  });
export const confirmResponse = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), contact: z.enum(["whatsapp", "phone_call"]), saveDefault: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const result = await context.supabase.rpc("confirm_host_response", { _response: data.id, _contact: data.contact, _save_default: data.saveDefault });
    if (result.error) throw new Error(result.error.message);
    const { refreshHostingDeadlines, processNotifications } = await import("./engagement.server"); await refreshHostingDeadlines(context.userId); await processNotifications();
    return result.data;
  });
export const declineResponse = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), reason: z.enum(["no_space", "composition", "sensitivity", "other"]), note: z.string().max(2000) }).parse(input))
  .handler(async ({ data, context }) => {
    const result = await context.supabase.rpc("decline_host_response", { _response: data.id, _reason: data.reason, _note: data.note });
    if (result.error) throw new Error(result.error.message);
    const { processNotifications } = await import("./engagement.server"); await processNotifications();
  });
export const cancelHosting = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), reason: z.enum(["illness", "bereavement", "plans_changed", "cannot_arrive", "other"]), note: z.string().max(2000) }).parse(input))
  .handler(async ({ data, context }) => {
    // This participant-scoped read must succeed before privileged timing writes.
    const result = await context.supabase.rpc("hosting_details", { _id: data.id });
    if (result.error) throw new Error(result.error.message);
    const h = result.data as unknown as HostingDetail;
    if (h.status !== "confirmed" || h.lat === null || h.lng === null) throw new Error("hosting_unavailable");
    const candle = candleLighting(h.date, h.city, h.lat, h.lng).toISOString();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cancelled = await supabaseAdmin.rpc("cancel_confirmed_hosting", { _id: data.id, _actor: context.userId, _reason: data.reason, _note: data.note, _candle: candle });
    if (cancelled.error) throw new Error(cancelled.error.message);
    const { processNotifications } = await import("./engagement.server"); await processNotifications();
  });