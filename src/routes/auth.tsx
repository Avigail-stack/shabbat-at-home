import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { t } from "@/i18n";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { demoLogin } from "@/lib/demo-login.functions";
import type { DemoSide } from "@/lib/demo-accounts";
import { PhoneStep } from "@/components/onboarding/AccountSteps";
import { parseRole, preferredRoleKey } from "@/lib/stack-reveal";
import { preAccountPhone, phoneProofState, claimPhoneProof } from "@/lib/registration.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "כניסה והרשמה – שבת בבית" },
      { name: "description", content: "נכנסים או נרשמים לשבת בבית עם Google או אימייל וסיסמה." },
      { property: "og:title", content: "כניסה והרשמה – שבת בבית" },
      { property: "og:description", content: "נכנסים או נרשמים לשבת בבית." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { role?: "guest" | "host" } => {
    const role = parseRole(s["role"]);
    return role ? { role } : {};
  },
  component: AuthPage,
});

const A = t.auth;
const creds = z.object({
  email: z.string().trim().email(A.errors.email).max(255),
  password: z.string().min(8, A.errors.short).max(72),
});

function AuthPage() {
  const loginDemo = useServerFn(demoLogin);
  const phoneMock = useServerFn(preAccountPhone);
  const proofState = useServerFn(phoneProofState);
  const claim = useServerFn(claimPhoneProof);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"tabs" | "forgot" | "checkEmail">("tabs");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { role: wantedRole } = Route.useSearch();
  const [tab, setTab] = useState(wantedRole ? "signup" : "login");
  useEffect(() => { if (wantedRole) sessionStorage.setItem(preferredRoleKey(), wantedRole); }, [wantedRole]);
  const [phoneReady, setPhoneReady] = useState(false);

  async function goHome() {
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", auth.user.id);
      if (roles?.some(r => ["rep", "admin", "demo_staff"].includes(r.role))) { navigate({ to: "/admin", replace: true }); return; }
    }
    try { await claim(); } catch { toast.error(t.onboarding.phone.expired); }
    navigate({ to: "/home", replace: true });
  }

  async function demo(side: DemoSide) {
    setBusy(true);
    try {
      const tokens = await loginDemo({ data: side });
      await qc.cancelQueries(); qc.clear();
      sessionStorage.removeItem("active-side");
      const { error } = await supabase.auth.setSession(tokens);
      if (error) throw error;
      navigate({ to: side === "staff" ? "/admin" : "/home", replace: true });
    } catch (error) { console.error(error instanceof Error ? error.message : "Demo login failed"); toast.error(t.demo.error); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    proofState().then(setPhoneReady);
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) void goHome();
    });
    const { data } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === "SIGNED_IN" && s) void goHome();
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function google() {
    if (!(await proofState())) { setPhoneReady(false); setTab("signup"); return; }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth` },
    });
    if (error) toast.error(A.googleNotReady);
  }

  async function submit(e: FormEvent, kind: "login" | "signup") {
    e.preventDefault();
    if (kind === "signup" && !(await proofState())) { setPhoneReady(false); return void toast.error(t.onboarding.phone.expired); }
    const parsed = creds.safeParse({ email, password });
    if (!parsed.success) return void toast.error(parsed.error.issues[0]?.message ?? A.errors.generic);
    setBusy(true);
    try {
      if (kind === "login") {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) toast.error(/confirm/i.test(error.message) ? A.errors.notConfirmed : A.errors.invalid);
      } else {
        const { data, error } = await supabase.auth.signUp({
          ...parsed.data,
           options: { emailRedirectTo: `${window.location.origin}/auth` },
        });
        if (error) toast.error(A.errors.generic);
        else if (!data.session) setMode("checkEmail");
      }
    } finally {
      setBusy(false);
    }
  }

  async function forgot(e: FormEvent) {
    e.preventDefault();
    const ok = z.string().email().safeParse(email.trim());
    if (!ok.success) return void toast.error(A.errors.email);
    setBusy(true);
    await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    toast.success(A.resetSent);
    setMode("tabs");
  }

  const fields = (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="email">{A.email}</Label>
        <Input id="email" type="email" dir="ltr" autoComplete="email" className="h-11" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">{A.password}</Label>
        <Input id="password" type="password" dir="ltr" className="h-11" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
    </>
  );

  return (
    <PageShell narrow>
      <div className="rounded-2xl border border-border bg-card p-6">
        <h1 className="mb-5 text-3xl font-bold text-primary">{A.title}</h1>
        {mode === "checkEmail" ? (
          <div className="space-y-4">
            <p className="rounded-xl bg-success-bg p-4 text-success">{A.checkEmail}</p>
            <Button variant="outline" onClick={() => setMode("tabs")}>{A.backToLogin}</Button>
          </div>
        ) : mode === "forgot" ? (
          <form onSubmit={forgot} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="femail">{A.email}</Label>
              <Input id="femail" type="email" dir="ltr" className="h-11" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>{A.sendReset}</Button>
            <Button type="button" variant="link" onClick={() => setMode("tabs")}>{A.backToLogin}</Button>
          </form>
        ) : (
          <>
            <div className="mb-5 grid gap-2">
              {(["guest", "host", "staff"] as const).map((side) => <Button key={side} variant="outline" disabled={busy} onClick={() => demo(side)}>{t.demo[side]}</Button>)}
            </div>
            {(tab !== "signup" || phoneReady) && <Button type="button" variant="outline" className="w-full" onClick={google}>{A.google}</Button>}
            <div className="my-4 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="h-px flex-1 bg-border" />{A.or}<span className="h-px flex-1 bg-border" />
            </div>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid h-11 w-full grid-cols-2">
                <TabsTrigger value="login" className="min-h-9">{A.loginTab}</TabsTrigger>
                <TabsTrigger value="signup" className="min-h-9">{A.signupTab}</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <form onSubmit={(e) => submit(e, "login")} className="space-y-4 pt-3">
                  {fields}
                  <Button type="submit" className="w-full" disabled={busy}>{A.login}</Button>
                  <Button type="button" variant="link" onClick={() => setMode("forgot")}>{A.forgot}</Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                {!phoneReady ? <PhoneStep provider={{
                  send: async (phone, method) => { await phoneMock({ data: { phone, method } }); },
                  verify: async (phone, code) => { await phoneMock({ data: { phone, method: "sms", code } }); },
                }} onDone={() => setPhoneReady(true)} /> : <form onSubmit={(e) => submit(e, "signup")} className="space-y-4 pt-3">
                  {fields}
                  <Button type="submit" className="w-full" disabled={busy}>{A.signup}</Button>
                </form>}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </PageShell>
  );
}
