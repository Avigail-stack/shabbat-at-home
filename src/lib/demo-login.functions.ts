import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { demoAccounts } from "./demo-accounts";

// Intentionally public: only these fixed, fictional accounts may receive a session.
export const demoLogin = createServerFn({ method: "POST" })
  .inputValidator((input) => z.enum(["guest", "host", "staff"]).parse(input))
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");
    const account = demoAccounts[data];
    // A fresh privileged client must never inherit a previous demo user's session.
    const url = process.env['SUPABASE_URL'];
    const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
    const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
    if (!url || !serviceKey || !key) throw new Error("Demo unavailable");
    const supabaseAdmin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (serviceKey.startsWith('sb_') && headers.get('Authorization') === `Bearer ${serviceKey}`) headers.delete('Authorization');
        headers.set('apikey', serviceKey);
        return fetch(input, { ...init, headers });
      } },
    });
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(account.id);
    if (userError || user.user?.email !== account.email) throw new Error("Demo account unavailable");
    const { data: roles, error: roleError } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", account.id);
    if (roleError || !roles?.length || roles.some((r) => r.role !== account.role)) throw new Error("Demo role unavailable");
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email: account.email });
    if (error || !link.properties?.hashed_token) throw new Error("Demo link unavailable");
    const verifier = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: session, error: verifyError } = await verifier.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "magiclink" });
    if (verifyError || !session.session || session.user?.id !== account.id) throw new Error("Demo session unavailable");
    return { access_token: session.session.access_token, refresh_token: session.session.refresh_token };
  });