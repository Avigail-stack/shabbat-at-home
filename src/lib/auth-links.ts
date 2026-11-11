import type { EmailOtpType } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type LinkOutcome = { kind: "none" } | { kind: "error" } | { kind: "ok"; to: "/reset-password" | "/home" };

/** Parse an auth email link (implicit #access_token, PKCE ?code=, or ?token_hash=). Pure, for tests. */
export function parseAuthLink(search: string, hash: string) {
  const q = new URLSearchParams(search);
  const h = new URLSearchParams(hash.replace(/^#/, ""));
  const get = (k: string) => h.get(k) ?? q.get(k);
  return {
    error: get("error") ?? get("error_code"),
    type: get("type"),
    code: q.get("code"),
    tokenHash: q.get("token_hash"),
    accessToken: h.get("access_token"),
  };
}

const PASSWORD_TYPES = new Set(["recovery", "invite"]);

/** Completes the sign-in from an email link and says where to go. Cleans the URL. */
export async function handleAuthLink(): Promise<LinkOutcome> {
  const { pathname, search, hash } = window.location;
  const p = parseAuthLink(search, hash);
  if (!p.error && !p.code && !p.tokenHash && !p.accessToken) return { kind: "none" };
  const clean = () => window.history.replaceState(null, "", pathname);
  if (p.error) { clean(); return { kind: "error" }; }
  if (p.tokenHash && p.type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: p.tokenHash, type: p.type as EmailOtpType });
    clean();
    if (error) return { kind: "error" };
  } else if (p.code) {
    // The client exchanges the code on init; if it couldn't, try once explicitly.
    let { data } = await supabase.auth.getSession();
    if (!data.session) {
      await supabase.auth.exchangeCodeForSession(p.code).catch(() => null);
      ({ data } = await supabase.auth.getSession());
    }
    clean();
    if (!data.session) return { kind: "error" };
  } else {
    const { data } = await supabase.auth.getSession(); // client already read the hash
    clean();
    if (!data.session) return { kind: "error" };
  }
  const wantsPassword = (p.type && PASSWORD_TYPES.has(p.type)) || pathname === "/reset-password";
  return { kind: "ok", to: wantsPassword ? "/reset-password" : "/home" };
}
