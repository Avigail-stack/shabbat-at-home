import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { staffScopeAllowed, validStaffReview, OTP_RE } from "./validation";
import type { Database } from "@/integrations/supabase/types";
type Row<K extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][K]["Row"];
export type StaffPerson = { person: Row<"persons">; host: Row<"host_profiles"> | null; guest: Row<"guest_profiles"> | null; identity: Row<"identity_checks"> | null; level: number };
export type StaffAlert = { source: string; source_id: string; person_id: string; kind: string; description: string; sacred: boolean; created_at: string; status: string; assigned_to: string | null; closing_note: string | null };
export type Workspace = { demo: boolean; role: string; people: StaffPerson[]; alerts: StaffAlert[]; hosting_count: number; attention_count: number; verifications?: Row<"verifications">[]; history?: {id: string; date: string; status: string}[]; messages?: {body: string; created_at: string; status: string}[] };
async function roleFor(db: Parameters<typeof roleQuery>[0], uid: string) { return roleQuery(db, uid); }
async function roleQuery(db: import("@supabase/supabase-js").SupabaseClient<Database>, uid: string) {
  const result = await db.from("user_roles").select("role").eq("user_id", uid);
  if (result.error) throw new Error("Forbidden");
  const role = result.data.find((r) => r.role === "admin")?.role ?? result.data.find((r) => r.role === "rep")?.role ?? result.data.find((r) => r.role === "demo_staff")?.role;
  if (!role || !staffScopeAllowed(role, uid)) throw new Error("Forbidden"); return role;
}
export const staffStatus = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({context}) => {
  setResponseHeader("Cache-Control", "no-store");
  let role: string; try { role = await roleFor(context.supabase, context.userId); } catch { return { allowed: false, ready: false }; }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const access = await supabaseAdmin.rpc("staff_access", { _actor: context.userId });
  return { allowed: true, ready: !access.error, role };
});
export const staffCode = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => z.object({ code: z.string().regex(OTP_RE).optional() }).parse(input)).handler(async ({data,context}) => {
  await roleFor(context.supabase, context.userId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const invitation = await supabaseAdmin.from("staff_invitations").select("id").eq("user_id", context.userId).eq("status", "accepted").in("role", ["admin", "rep"]).maybeSingle();
  if (invitation.error || !invitation.data) throw new Error("Forbidden");
  if (!data.code) {
    const user = await context.supabase.auth.getUser();
    const receipt = await supabaseAdmin.from("notifications").insert({recipient: user.data.user?.email ?? null, channel: "email", template: "staff_login_code", provider: "mock", status: "sent", sent_at: new Date().toISOString()});
    if (receipt.error) throw new Error("Unavailable"); return;
  }
  const result = await supabaseAdmin.from("staff_sessions").upsert({user_id: context.userId, expires_at: new Date(Date.now()+8*3600000).toISOString()});
  if (result.error) throw new Error("Unavailable");
});
export const staffWorkspace = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => z.object({person: z.string().uuid().optional()}).parse(input)).handler(async ({data,context}) => {
  setResponseHeader("Cache-Control", "no-store");
  const role = await roleFor(context.supabase, context.userId);
  if (!staffScopeAllowed(role, context.userId, data.person)) throw new Error("Forbidden");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await supabaseAdmin.rpc("staff_workspace", {_actor: context.userId, ...(data.person ? {_person: data.person} : {})});
  if (result.error) throw new Error(result.error.message); return result.data as unknown as Workspace;
});
export const staffAction = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => z.object({action: z.string(), target: z.string().uuid(), note: z.string().max(2000), until: z.string().datetime().optional(), source: z.enum(["flag","hosting","blocked"]).optional(), idCheck: z.boolean().default(false), contactCheck: z.boolean().default(false)}).parse(input)).handler(async ({data,context}) => {
  const role = await roleFor(context.supabase, context.userId);
  if (!validStaffReview(data.action,data.note,data.until,data.idCheck,data.contactCheck)) throw new Error("reason_required");
  if (!data.source && !staffScopeAllowed(role,context.userId,data.target)) throw new Error("Forbidden");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await supabaseAdmin.rpc("staff_review_action", {_actor: context.userId, _action: data.action, _target: data.target, _note: data.note, ...(data.until ? {_until:data.until} : {}), ...(data.source ? {_source:data.source} : {}), _id_check: data.idCheck, _contact_check: data.contactCheck});
  if (result.error) throw new Error(result.error.message);
  const {processNotifications} = await import("./engagement.server"); await processNotifications(new Date(), role === "demo_staff");
});