import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { validFeedback, validFlag, staffScopeAllowed } from "./validation";
import { deferredUntil, simulatedHavdalah } from "./sacred-time";

export type FeedbackState = { id: string; date: string; side: "guest" | "host"; due: boolean; answered: boolean };
export const engagementState = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { refreshHostingDeadlines, processNotifications } = await import("./engagement.server");
  await refreshHostingDeadlines(context.userId); await processNotifications();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await supabaseAdmin.rpc("feedback_state", { _actor: context.userId });
  if (result.error) throw new Error(result.error.message);
  return result.data as unknown as FeedbackState[];
});
export const inboxData = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { processNotifications } = await import("./engagement.server"); await processNotifications();
  const result = await context.supabase.from("notifications").select("id,body,template,read_at,created_at,send_after,variables").eq("person_id", context.userId).eq("channel", "inbox").order("created_at", { ascending: false }).limit(200);
  if (result.error) throw new Error(result.error.message); return result.data;
});
export const markMessageRead = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input)).handler(async ({ data, context }) => {
  const result = await context.supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", data.id).eq("person_id", context.userId).eq("channel", "inbox"); if (result.error) throw new Error(result.error.message);
});
export const submitFeedback = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => z.object({ id: z.string().uuid(), took: z.enum(["yes", "partial", "no"]), overall: z.string(), details: z.string().max(2000) }).parse(input)).handler(async ({ data, context }) => {
  if (!validFeedback(data.took, data.overall, data.details)) throw new Error("feedback_invalid");
  const access = await context.supabase.rpc("hosting_details", { _id: data.id }); if (access.error) throw new Error(access.error.message);
  const { refreshHostingDeadlines } = await import("./engagement.server"); await refreshHostingDeadlines(context.userId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await supabaseAdmin.rpc("submit_hosting_feedback", { _id: data.id, _actor: context.userId, _took: data.took, _overall: data.overall, _details: data.details }); if (result.error) throw new Error(result.error.message);
});
export const reportProblem = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => z.object({ id: z.string().uuid(), description: z.string().max(2000) }).parse(input)).handler(async ({ data, context }) => {
  if (!validFlag(data.description)) throw new Error("flag_invalid");
  const access = await context.supabase.rpc("hosting_details", { _id: data.id }); if (access.error) throw new Error(access.error.message);
  const { cityFor } = await import("./engagement.server");
  const city = await cityFor(context.userId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await supabaseAdmin.rpc("report_hosting_problem", { _id: data.id, _actor: context.userId, _description: data.description, _shabbat: !!deferredUntil(new Date(), city) }); if (result.error) throw new Error(result.error.message);
});
export const runScheduledJobs = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => z.object({ now: z.string().datetime().optional(), simulate:z.boolean().default(false) }).parse(input)).handler(async ({ data, context }) => {
  const roles = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId); if (roles.error) throw new Error(roles.error.message);
  const demo = roles.data.some((r) => r.role === "demo_staff") && staffScopeAllowed("demo_staff",context.userId);
  const staff = roles.data.some((r) => r.role === "admin" || r.role === "rep");
  if (!staff && !demo) throw new Error("Forbidden");
  // A demo operator can release mock messages, but cannot advance time for real accounts.
  if (data.now && demo) throw new Error("Forbidden");
  if(data.simulate && !demo)throw new Error("demo_only");
  const {supabaseAdmin} = await import("@/integrations/supabase/client.server");
  const access = await supabaseAdmin.rpc("staff_access",{_actor:context.userId}); if(access.error)throw new Error("Forbidden");
  const now = data.simulate ? simulatedHavdalah(new Date()) : data.now ? new Date(data.now) : new Date();
  const { runJobs } = await import("./engagement.server"); const result = await runJobs(now,demo && !staff);
  const timed = await supabaseAdmin.rpc("staff_timed_rules",{_actor:context.userId,_now:now.toISOString(),_simulate:data.simulate}); if(timed.error)throw new Error(timed.error.message);
  return {...result,opened:timed.data};
});