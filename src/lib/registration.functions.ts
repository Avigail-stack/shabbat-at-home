import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie, deleteCookie, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PHONE_RE, OTP_RE } from "./validation";

const cookieName = "registration-phone";
export const preAccountPhone = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ phone: z.string().regex(PHONE_RE), method: z.enum(["sms", "voice"]), code: z.string().regex(OTP_RE).optional() }).parse(input))
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");
    const url = process.env['SUPABASE_URL'];
    const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
    if (!url || !key) throw new Error("Phone mock unavailable");
    const { registrationAdmin, proofHash } = await import("./registration.server");
    const admin = registrationAdmin(url, key);
    const { data: existing, error: lookupError } = await admin.from("persons").select("id").eq("phone", data.phone).maybeSingle();
    if (lookupError) throw new Error("Phone mock unavailable");
    if (existing) throw new Error("phone_taken");
    if (!data.code) {
      const { error } = await admin.from("notifications").insert({ recipient: data.phone, channel: data.method, template: "phone_verification_code", provider: "mock", status: "sent", sent_at: new Date().toISOString() });
      if (error) throw new Error("Phone mock unavailable");
      return { verified: false };
    }
    const token = crypto.randomUUID() + crypto.randomUUID();
    const { error } = await admin.from("registration_phone_proofs").insert({ phone: data.phone, token_hash: await proofHash(token) });
    if (error) throw new Error("Phone mock unavailable");
    setCookie(cookieName, token, { httpOnly: true, secure: process.env['NODE_ENV'] === "production", sameSite: "lax", path: "/", maxAge: 3600 });
    return { verified: true };
  });

export const phoneProofState = createServerFn({ method: "POST" }).handler(async () => {
  setResponseHeader("Cache-Control", "no-store");
  const token = getCookie(cookieName);
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!token || !url || !key) return false;
  const { registrationAdmin, proofHash } = await import("./registration.server");
  const { data } = await registrationAdmin(url, key).from("registration_phone_proofs").select("id").eq("token_hash", await proofHash(token)).is("consumed_by", null).gt("expires_at", new Date().toISOString()).maybeSingle();
  return !!data;
});

export const claimPhoneProof = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const token = getCookie(cookieName);
  if (!token) return false;
  const { proofHash } = await import("./registration.server");
  const { error } = await context.supabase.rpc("claim_registration_phone", { _token_hash: await proofHash(token) });
  if (error) throw new Error(error.message);
  deleteCookie(cookieName, { path: "/" });
  return true;
});