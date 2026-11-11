import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { friendlyDbError } from "@/lib/db-errors";
import { meQuery } from "@/lib/me";
import { t } from "@/i18n";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "הגדרות – שבת בבית" },
      { name: "description", content: "ערוץ ההודעות, הסיסמה ודרך יצירת הקשר שלך." },
      { property: "og:title", content: "הגדרות – שבת בבית" },
      { property: "og:description", content: "הגדרות החשבון בשבת בבית." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Settings,
});

const S = t.settings;
type Ch = "whatsapp" | "sms" | "voice";
type Cm = "whatsapp" | "phone_call";

function Settings() {
  const qc = useQueryClient();
  const { data } = useQuery(meQuery);
  const [pw, setPw] = useState("");
  if (!data?.person) return <PageShell narrow><p className="text-muted-foreground">…</p></PageShell>;
  const refresh = () => qc.invalidateQueries({ queryKey: ["me"] });

  async function setChannel(c: Ch) {
    const { error } = await supabase.from("persons").update({ notification_channel: c }).eq("id", data!.uid);
    if (error) return void toast.error(friendlyDbError(error.message));
    toast.success(S.saved); refresh();
  }
  async function setContact(c: Cm) {
    const { error } = await supabase.from("host_profiles").update({ preferred_contact: c }).eq("person_id", data!.uid);
    if (error) return void toast.error(friendlyDbError(error.message));
    toast.success(S.saved); refresh();
  }
  async function savePw(e: FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return void toast.error(t.auth.errors.short);
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return void toast.error(t.auth.errors.generic);
    setPw(""); toast.success(t.auth.passwordSaved);
  }
  const pill = (on: boolean) => (on ? "default" : "outline") as "default" | "outline";

  return (
    <PageShell narrow>
      <h1 className="text-4xl font-bold text-primary">{S.title}</h1>
      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-2xl font-bold text-primary">{S.channel}</h2>
        <p className="mt-1 text-muted-foreground">{S.channelHint}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["whatsapp", "sms", "voice"] as Ch[]).map((c) => (
            <Button key={c} variant={pill(data.person!.notification_channel === c)} onClick={() => setChannel(c)} aria-pressed={data.person!.notification_channel === c}>{S.channels[c]}</Button>
          ))}
        </div>
      </section>
      {data.host && (
        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-2xl font-bold text-primary">{S.contact}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["whatsapp", "phone_call"] as Cm[]).map((c) => (
              <Button key={c} variant={pill(data.host!.preferred_contact === c)} onClick={() => setContact(c)} aria-pressed={data.host!.preferred_contact === c}>{S.contacts[c]}</Button>
            ))}
          </div>
        </section>
      )}
      <form onSubmit={savePw} className="mt-6 space-y-3 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-2xl font-bold text-primary">{S.password}</h2>
        <Label htmlFor="npw">{t.auth.newPassword}</Label>
        <Input id="npw" type="password" dir="ltr" className="h-11" value={pw} onChange={(e) => setPw(e.target.value)} />
        <Button type="submit">{t.auth.savePassword}</Button>
      </form>
      <Button asChild variant="link" className="mt-4"><Link to="/home">{S.back}</Link></Button>
    </PageShell>
  );
}
