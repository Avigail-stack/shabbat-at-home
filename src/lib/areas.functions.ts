import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ageOn } from "./validation";
import { rankInvitation, DEFAULT_WEIGHTS, type Invitation, type RankingWeights } from "./invitations";
import { z } from "zod";

export const guestAreaData = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = context.supabase;
  const { error: expiryError } = await db.rpc("expire_my_responses");
  if (expiryError) throw new Error(expiryError.message);
  const [list, guest, person, cities, settings, responses, dates] = await Promise.all([
    db.rpc("list_guest_invitations"), db.from("guest_profiles").select("*").eq("person_id", context.userId).single(),
    db.from("persons").select("date_of_birth").eq("id", context.userId).single(),
    db.from("cities").select("*"), db.from("app_settings").select("key,value"),
    db.from("responses").select("id,availability_id,message,status,availability(shabbat_date,unit)").eq("guest_id", context.userId).order("created_at", { ascending: false }),
    db.from("shabbatot").select("date,parsha").gte("date", new Date().toISOString().slice(0, 10)).order("date"),
  ]);
  for (const result of [list, guest, person, cities, settings, responses, dates]) if (result.error) throw new Error(result.error.message);
  if (!guest.data) throw new Error("registration_required");
  const g = guest.data;
  const city = cities.data?.find((c) => c.name === g.city);
  const rawWeights = settings.data?.find((s) => s.key === "ranking_weights")?.value;
  const weights = { ...DEFAULT_WEIGHTS, ...(typeof rawWeights === "object" && rawWeights !== null ? rawWeights : {}) } as RankingWeights;
  const invitations = (list.data as unknown as Invitation[]).map((i) => rankInvitation(i, { ...g, age: person.data?.date_of_birth ? ageOn(person.data.date_of_birth) : null, lat: city?.lat ?? null, lng: city?.lng ?? null }, weights)).sort((a, b) => b.score - a.score || a.date.localeCompare(b.date));
  return { invitations, responses: responses.data ?? [], dates: dates.data ?? [] };
});

export const hostAreaData = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = context.supabase;
  await db.rpc("expire_my_responses");
  const [calendar, responses, dates, history] = await Promise.all([
    db.from("availability").select("*").eq("host_id", context.userId).order("shabbat_date"), db.rpc("host_response_summaries"),
    db.from("shabbatot").select("date,parsha").gte("date", new Date().toISOString().slice(0, 10)).order("date"),
    db.from("hostings").select("id,shabbat_date,status,party_size").eq("host_id", context.userId).order("shabbat_date", { ascending: false }),
  ]);
  for (const result of [calendar, responses, dates, history]) if (result.error) throw new Error(result.error.message);
  return { calendar: calendar.data ?? [], responses: responses.data as unknown as { id: string; first_name: string; message: string; status: string; date: string; party_size: number }[], dates: dates.data ?? [], history: history.data ?? [] };
});

export const addHostShabbat = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ date: z.string(), unit: z.enum(["full_shabbat", "friday_dinner", "shabbat_lunch", "seudah_shlishit"]), lodging: z.boolean(), seats: z.number().int().min(1), beds: z.number().int().min(0) }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("add_host_shabbat", { _date: data.date, _unit: data.unit, _lodging: data.lodging, _seats: data.seats, _beds: data.beds });
    if (error) throw new Error(error.message);
  });
export const changeHostShabbat = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), action: z.enum(["cancel", "reopen", "delete"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("change_host_shabbat", { _id: data.id, _action: data.action });
    if (error) throw new Error(error.message);
  });
export const sendGuestResponse = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), message: z.string().max(1000) }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("respond_to_invitation", { _availability: data.id, _message: data.message });
    if (error) throw new Error(error.message);
  });