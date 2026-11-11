import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { t } from "@/i18n";

// Used for "forgot password" and for staff invitation links (setting a first password).
export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "בחירת סיסמה – שבת בבית" },
      { name: "description", content: "בחירת סיסמה חדשה לחשבון בשבת בבית." },
      { property: "og:title", content: "בחירת סיסמה – שבת בבית" },
      { property: "og:description", content: "בחירת סיסמה חדשה לחשבון בשבת בבית." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const A = t.auth;
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return void toast.error(A.errors.short);
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return void toast.error(A.errors.generic);
    toast.success(A.passwordSaved);
    navigate({ to: "/home" });
  }
  return (
    <PageShell narrow>
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <h1 className="text-3xl font-bold text-primary">{A.setPasswordTitle}</h1>
        <div className="space-y-1.5">
          <Label htmlFor="pw">{A.newPassword}</Label>
          <Input id="pw" type="password" dir="ltr" className="h-11" value={pw} onChange={(e) => setPw(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>{A.savePassword}</Button>
      </form>
    </PageShell>
  );
}
