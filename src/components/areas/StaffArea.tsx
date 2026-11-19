import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableRow, TableCell, TableHead, TableHeader } from "@/components/ui/table";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { staffWorkspace, staffAction, type StaffPerson } from "@/lib/staff.functions";
import { validStaffReview } from "@/lib/validation";
import { t } from "@/i18n";
const A = t.admin;
type Section = keyof typeof A.menu;
type Action = {action: string; target: string; source?: "flag"|"hosting"|"blocked" | undefined};
function status(value: string) { return A.statuses[value as keyof typeof A.statuses] ?? t.hostings.cancelled; }
function name(p: StaffPerson) { return p.host?.family_name || [p.person.first_name,p.person.last_name].filter(Boolean).join(" ") || p.person.email || "—"; }
function date(value: string) { return new Date(value).toLocaleDateString("he-IL"); }
export function StaffArea() {
  const [section,setSection] = useState<Section>("urgent");
  const [person,setPerson] = useState<string>();
  const [tab,setTab] = useState("guest"); const [search,setSearch] = useState("");
  const [action,setAction] = useState<Action>(); const [note,setNote] = useState(""); const [until,setUntil] = useState("");
  const [idCheck,setIdCheck] = useState(false); const [contactCheck,setContactCheck] = useState(false); const [busy,setBusy] = useState(false);
  const fetch = useServerFn(staffWorkspace); const mutate = useServerFn(staffAction); const qc = useQueryClient();
  const query = useQuery({queryKey:["staff-workspace",person],queryFn:()=>fetch({data:{person}}),staleTime:0});
  const data = query.data;
  function choose(a: Action) { setAction(a); setNote(""); setUntil(""); setIdCheck(false); setContactCheck(false); }
  async function save() {
    if (!action) return;
    const iso = until ? new Date(`${until}T23:59:59+02:00`).toISOString() : undefined;
    if (!validStaffReview(action.action,note,iso,idCheck,contactCheck)) return void toast.error(A.invalid);
    setBusy(true);
    try { await mutate({data:{...action,note,until:iso,idCheck,contactCheck}}); setAction(undefined); await qc.invalidateQueries({queryKey:["staff-workspace"]}); toast.success(A.saved); }
    catch { toast.error(t.auth.errors.generic); } finally { setBusy(false); }
  }
  if (query.error) return <p role="alert" className="text-danger">{A.denied}</p>;
  if (!data) return <p aria-busy="true">…</p>;
  const hosts = data.people.filter(p=>p.host?.approval==="pending" && p.host.status!=="partial");
  const manual = data.people.filter(p=>p.identity?.status==="manual_review" && p.identity.attempts>=3);
  const counts: Record<Section,number> = {urgent:data.alerts.filter(a=>a.status!=="closed").length,hosts:hosts.length,manual:manual.length,hostings:data.hosting_count,attention:data.attention_count,users:data.people.length};
  const selected = data.people.find(p=>p.person.id===person);
  const shown = (section==="hosts"?hosts:section==="manual"?manual:data.people.filter(p=>tab==="host"?!!p.host:!!p.guest)).filter(p=>[name(p),p.person.phone,p.host?.city,p.guest?.city].join(" ").toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const labels: Record<string,string> = {approve:A.approve,reject_host:A.reject_host,more_info:A.more_info,verify:A.verify,reject_identity:A.reject_identity,freeze:A.freeze,unfreeze:A.unfreeze,suspend:A.suspend,close:A.close,claim:A.claim};
  function actions(p: StaffPerson) { const id=p.person.id; return <div className="flex flex-wrap gap-2">
    {section==="hosts" && ["approve","reject_host","more_info"].map(a=><Button key={a} size="sm" variant={a==="approve"?"default":"outline"} onClick={()=>choose({action:a,target:id})}>{labels[a]}</Button>)}
    {section==="manual" && ["verify","reject_identity"].map(a=><Button key={a} size="sm" variant="outline" onClick={()=>choose({action:a,target:id})}>{labels[a]}</Button>)}
    {section==="users" && p.person.restriction_status!=="blocked" && [p.person.restriction_status==="none"?"freeze":"unfreeze","suspend"].map(a=><Button key={a} variant="outline" size="sm" onClick={()=>choose({action:a,target:id})}>{labels[a]}</Button>)}
  </div>; }
  return <div className="mt-6 grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
    <nav aria-label={A.title} className="flex flex-col gap-1 border-b border-border pb-4 md:border-b-0 md:border-e md:pe-4">
      {(Object.keys(A.menu) as Section[]).map(key=><Button key={key} variant={section===key?"default":"ghost"} className="h-auto min-h-11 justify-between whitespace-normal text-start" onClick={()=>{setSection(key);setPerson(undefined);setSearch("");}}><span>{A.menu[key]}</span><span>{counts[key]}</span></Button>)}
    </nav>
    <section className="min-w-0 space-y-4"><h2 className="text-2xl font-bold text-primary">{selected?name(selected):A.menu[section]}</h2>
      {selected ? <>
        <Button variant="outline" onClick={()=>setPerson(undefined)}>{A.back}</Button>
        <Table><TableBody>{[
          [A.name,name(selected)],[t.auth.email,selected.person.email],[A.phone,selected.person.phone],[A.city,selected.host?.city||selected.guest?.city],[A.date,date(selected.person.created_at)],[A.status,status(selected.person.restriction_status)],[A.level,selected.level],
          [t.onboarding.details.idNumber,selected.person.id_number],[t.guestQ.dob,selected.person.date_of_birth],[t.hostQ.spouseName,selected.host?.spouse_first_name],[t.hostQ.spouseId,selected.host?.spouse_id_number],
          [t.hostings.address,[selected.host?.street,selected.host?.house_number,selected.host?.building_number,selected.host?.neighborhood].filter(Boolean).join(", ")],
          [t.hostQ.composition,selected.host?.family_composition],[t.guestQ.party,selected.guest?t.hostings.composition(selected.guest.party_adults,selected.guest.minor_children_count):null],
          [t.hostQ.languages,(selected.host?.languages||selected.guest?.languages)?.map(l=>t.languages[l as keyof typeof t.languages]||l).join(", ")],[t.hostQ.about,selected.host?.about||selected.guest?.about],
          [t.hostQ.character,selected.host?.house_character],[t.hostQ.kashrut,selected.host?.kashrut],[t.hostQ.food,selected.host?.food_offer||selected.guest?.food_preferences],[t.guestQ.food,selected.guest?.food_sensitivities],[t.guestQ.access,selected.guest?.accessibility_needs],
          [t.hostQ.cannotProvide,selected.host?.cannot_provide],[t.guestQ.interests,(selected.host?.interests||selected.guest?.interests)?.join(", ")],
        ].filter(([,v])=>v!==null&&v!==undefined).map(([key,value])=><TableRow key={String(key)}><TableCell className="font-semibold">{key}</TableCell><TableCell className="whitespace-pre-wrap break-words">{value}</TableCell></TableRow>)}</TableBody></Table>
        {selected.host && <div className="space-y-2 border-y border-border py-4">
          <h3 className="text-xl font-bold">{t.hostQ.recommendation}</h3>
          {selected.host.recommendation_mode==="staff_call" ? <><p>{t.hostQ.callMethods[selected.host.staff_call_method as keyof typeof t.hostQ.callMethods]}</p><p className="font-semibold">{A.ownerNote}</p></> : [[selected.host.recommender_name,selected.host.recommender_phone],[selected.host.recommender2_name,selected.host.recommender2_phone]].map(([n,phone],i)=><p key={i}>{n} · <a className="text-primary underline" href={`tel:${phone}`}>{phone}</a></p>)}
        </div>}
        {actions(selected)}
        <h3 className="text-xl font-bold">{A.verification}</h3>
        <Table><TableHeader><TableRow><TableHead className="text-start">{A.date}</TableHead><TableHead className="text-start">{A.status}</TableHead><TableHead className="text-start">{A.details}</TableHead></TableRow></TableHeader><TableBody>{data.verifications?.map(v=><TableRow key={v.id}><TableCell>{date(v.created_at)}</TableCell><TableCell>{status(v.status)}</TableCell><TableCell>{v.note||"—"}</TableCell></TableRow>)}</TableBody></Table>
        <h3 className="text-xl font-bold">{A.history}</h3>{data.history?.map(h=><p key={h.id}>{date(h.date)} · {status(h.status)}</p>)}
        <h3 className="text-xl font-bold">{A.messages}</h3>{data.messages?.map((m,i)=><p key={i} className="border-b border-border py-2">{date(m.created_at)} · {m.body}</p>)}
      </> : section==="urgent" ? <Table><TableHeader><TableRow>{[A.details,A.date,A.status,A.actions].map(x=><TableHead className="text-start" key={x}>{x}</TableHead>)}</TableRow></TableHeader><TableBody>
        {data.alerts.length===0 && <TableRow><TableCell colSpan={4}>{A.empty}</TableCell></TableRow>}
        {data.alerts.map(a=><TableRow key={`${a.source}:${a.source_id}`}><TableCell><p className="font-semibold">{A.alertKinds[a.kind as keyof typeof A.alertKinds]}</p>{a.sacred&&<span className="bg-warning-bg px-2 text-warning">{A.sacred}</span>}<p className="max-w-sm whitespace-pre-wrap break-words">{a.description}</p>{a.closing_note&&<p>{a.closing_note}</p>}<Button variant="link" onClick={()=>setPerson(a.person_id)}>{A.open}</Button></TableCell><TableCell>{date(a.created_at)}</TableCell><TableCell>{status(a.status)}{a.assigned_to&&<p>{A.assigned}</p>}</TableCell><TableCell>{a.status!=="closed"&&<div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={()=>choose({action:"claim",target:a.source_id,source:a.source as Action["source"]})}>{A.claim}</Button><Button size="sm" onClick={()=>choose({action:"close",target:a.source_id,source:a.source as Action["source"]})}>{A.close}</Button></div>}</TableCell></TableRow>)}
      </TableBody></Table> : section==="hostings"||section==="attention" ? <p className="text-muted-foreground">{A.next}</p> : <>
        {section==="users"&&<Tabs value={tab} onValueChange={setTab}><TabsList><TabsTrigger value="guest">{A.guests}</TabsTrigger><TabsTrigger value="host">{A.hosts}</TabsTrigger></TabsList></Tabs>}
        <Input aria-label={A.search} placeholder={A.search} value={search} onChange={e=>setSearch(e.target.value)}/>
        <Table><TableHeader><TableRow>{[A.name,A.phone,A.city,A.date,A.level,A.actions].map(x=><TableHead className="text-start" key={x}>{x}</TableHead>)}</TableRow></TableHeader><TableBody>
          {shown.length===0&&<TableRow><TableCell colSpan={6}>{A.empty}</TableCell></TableRow>}
          {shown.map(p=><TableRow key={p.person.id}><TableCell><Button variant="link" className="h-auto whitespace-normal text-start" onClick={()=>setPerson(p.person.id)}>{name(p)}</Button><p>{status(p.host?.approval||p.guest?.status||p.identity?.status||"pending")}</p></TableCell><TableCell><a href={`tel:${p.person.phone}`}>{p.person.phone}</a></TableCell><TableCell>{p.host?.city||p.guest?.city}</TableCell><TableCell>{date(p.person.created_at)}</TableCell><TableCell>{p.level}</TableCell><TableCell>{actions(p)}<Button size="sm" variant="link" onClick={()=>setPerson(p.person.id)}>{A.open}</Button></TableCell></TableRow>)}
        </TableBody></Table>
      </>}
    </section>
    <Dialog open={!!action} onOpenChange={open=>{if(!open)setAction(undefined)}}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogTitle>{action?labels[action.action]:A.actions}</DialogTitle><DialogDescription>{action?.action==="verify"?A.videoNote:A.note}</DialogDescription>
      {action?.action==="approve"&&<div className="space-y-3"><Label className="flex items-center gap-2"><Checkbox checked={idCheck} onCheckedChange={v=>setIdCheck(v===true)}/>{A.idCheck}</Label><Label className="flex items-center gap-2"><Checkbox checked={contactCheck} onCheckedChange={v=>setContactCheck(v===true)}/>{A.contactCheck}</Label></div>}
      {action?.action==="suspend"&&<><Label htmlFor="suspend-until">{A.until}</Label><Input id="suspend-until" type="date" value={until} onChange={e=>setUntil(e.target.value)}/></>}
      {action?.action!=="claim"&&<><Label htmlFor="staff-note">{A.note}</Label><Textarea id="staff-note" maxLength={2000} value={note} onChange={e=>setNote(e.target.value)}/></>}
      <Button disabled={busy||(!["claim","approve"].includes(action?.action||"")&&!note.trim())} onClick={save}>{A.save}</Button>
    </DialogContent></Dialog>
  </div>;
}