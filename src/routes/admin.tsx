import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthUser } from "@/hooks/use-auth-user";
import { supabase } from "@/integrations/supabase/client";
import { staffStatus, staffCode } from "@/lib/staff.functions";
import { StaffArea } from "@/components/areas/StaffArea";
import { t } from "@/i18n";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "ניהול – שבת בבית" },
      { name: "description", content: "אזור הצוות של שבת בבית." },
      { property: "og:title", content: "ניהול – שבת בבית" },
      { property: "og:description", content: "אזור הצוות של שבת בבית." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const {user,ready} = useAuthUser(); const qc = useQueryClient();
  const getStatus = useServerFn(staffStatus); const codeFn = useServerFn(staffCode);
  const query = useQuery({queryKey:["staff-status",user?.id],queryFn:()=>getStatus(),enabled:!!user,staleTime:0});
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [code,setCode]=useState(""); const [sent,setSent]=useState(false); const [busy,setBusy]=useState(false);
  async function login() {setBusy(true);try {const r=await supabase.auth.signInWithPassword({email,password});if(r.error)throw r.error;await qc.invalidateQueries({queryKey:["staff-status"]});}catch{toast.error(t.auth.errors.invalid)}finally{setBusy(false)}}
  async function send(verify=false) {setBusy(true);try{await codeFn({data:verify?{code}:{}});setSent(true);await qc.invalidateQueries({queryKey:["staff-status"]});}catch{toast.error(t.admin.denied)}finally{setBusy(false)}}
  return <PageShell><h1 className="text-3xl font-bold text-primary">{t.admin.title}</h1>
    {!ready|| (!!user&&query.isLoading) ? <p>…</p> : !user ? <form className="mt-6 max-w-md space-y-3" onSubmit={e=>{e.preventDefault();void login()}}><h2 className="text-2xl">{t.admin.login}</h2><Label htmlFor="staff-email">{t.auth.email}</Label><Input id="staff-email" type="email" autoComplete="email" dir="ltr" required value={email} onChange={e=>setEmail(e.target.value)}/><Label htmlFor="staff-password">{t.auth.password}</Label><Input id="staff-password" type="password" autoComplete="current-password" required dir="ltr" value={password} onChange={e=>setPassword(e.target.value)}/><Button disabled={busy} type="submit">{t.auth.login}</Button></form> : !query.data?.allowed ? <p role="alert" className="mt-5 text-danger">{t.admin.denied}</p> : !query.data.ready ? <form className="mt-6 max-w-md space-y-3" onSubmit={e=>{e.preventDefault();void send(true)}}><Button type="button" variant="outline" disabled={busy} onClick={()=>send()}>{t.admin.sendCode}</Button>{sent&&<><Label htmlFor="staff-code">{t.admin.code}</Label><Input id="staff-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required dir="ltr" value={code} onChange={e=>setCode(e.target.value)}/><p className="text-muted-foreground">{t.admin.mockCode}</p><Button type="submit" disabled={busy}>{t.admin.verifyCode}</Button></>}</form> : <StaffArea/>}
  </PageShell>;
}
