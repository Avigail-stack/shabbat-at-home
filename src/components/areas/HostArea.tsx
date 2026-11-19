import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { HostingDefaults, type HostingDefault } from "@/components/onboarding/HostingDefaults";
import { addHostShabbat, changeHostShabbat, type hostAreaData } from "@/lib/areas.functions";
import { validAvailability } from "@/lib/validation";
import { shabbatLabel, unitLabel } from "@/lib/invitations";
import { friendlyDbError } from "@/lib/db-errors";
import type { Tables } from "@/integrations/supabase/types";
import { t } from "@/i18n";
import { ResponseActions } from "./ResponseActions";

export function HostArea({ data, profile, publishingBlocked = false }: { data: Awaited<ReturnType<typeof hostAreaData>>; profile: Tables<"host_profiles">; publishingBlocked?: boolean }) {
  const H = t.hostArea;
  const qc = useQueryClient(); const add = useServerFn(addHostShabbat); const change = useServerFn(changeHostShabbat);
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false);
  const [date, setDate] = useState(""); const [choice, setChoice] = useState<HostingDefault>({ unit: profile.default_unit, withLodging: profile.default_with_lodging });
  const [seats, setSeats] = useState(profile.default_seats); const [beds, setBeds] = useState(profile.default_beds);
  const refresh = async () => { await qc.invalidateQueries({ queryKey: ["host-area"] }); await qc.invalidateQueries({ queryKey: ["me"] }); };
  async function save() {
    if (!date || !validAvailability(choice.unit, choice.withLodging, seats, beds)) return void toast.error(H.invalid);
    setBusy(true);
    try { await add({ data: { date, unit: choice.unit, lodging: choice.withLodging, seats, beds } }); await refresh(); setOpen(false); toast.success(H.saved); }
    catch (e) { toast.error(friendlyDbError((e as Error).message)); } finally { setBusy(false); }
  }
  async function act(id: string, action: "cancel" | "reopen" | "delete") {
    setBusy(true); try { await change({ data: { id, action } }); await refresh(); toast.success(H.changed); } catch (e) { toast.error(friendlyDbError((e as Error).message)); } finally { setBusy(false); }
  }
  const end = new Date(); end.setMonth(end.getMonth() + 3);
  return <section className="mt-8">
    <div data-confirmed-reminder-slot="top" />
    <Tabs defaultValue="responses"><TabsList className="grid h-12 w-full grid-cols-3"><TabsTrigger value="responses">{H.responses}</TabsTrigger><TabsTrigger value="calendar">{H.calendar}</TabsTrigger><TabsTrigger value="history">{H.history}</TabsTrigger></TabsList>
      <TabsContent value="responses" className="py-4">{!data.responses.filter((r) => r.status === "pending").length && <p className="py-6 text-muted-foreground">{H.noResponses}</p>}{data.responses.filter((r) => r.status === "pending").map((r) => <article key={r.id} className="border-b border-border py-5"><h3 className="text-xl font-semibold">{r.first_name} + {r.party_size - 1}</h3><p className="text-sm text-muted-foreground">{shabbatLabel(r.date)}</p><p className="mt-2 whitespace-pre-wrap">{r.message}</p><ResponseActions id={r.id} preferred={profile.preferred_contact} /></article>)}</TabsContent>
      <TabsContent value="calendar" className="space-y-4 py-4"><Button disabled={publishingBlocked} onClick={() => { setChoice({ unit: profile.default_unit, withLodging: profile.default_with_lodging }); setOpen(true); }}><Plus className="size-4" />{H.add}</Button>
        {!data.calendar.length && <p className="py-6 text-muted-foreground">{H.empty}</p>}
        {data.calendar.map((a) => <article key={a.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-border py-4"><div className="space-y-1"><h3 className="text-xl font-bold text-primary">{shabbatLabel(a.shabbat_date)}</h3><p>{unitLabel(a.unit)} · {a.with_lodging ? t.hostingDefaults.lodging : t.hostingDefaults.noLodging}</p><p className="text-sm text-muted-foreground">{H.counter(a.seats_left, a.seats)} · {a.status === "cancelled" ? H.cancelled : a.seats_left === 0 ? H.full : H.open}</p></div><div className="flex gap-2"><Button variant="outline" disabled={busy} onClick={() => act(a.id, a.status === "cancelled" ? "reopen" : "cancel")}><span title={a.status === "cancelled" ? H.reopen : H.cancel}>{a.status === "cancelled" ? <RotateCcw className="size-4" /> : <X className="size-4" />}</span>{a.status === "cancelled" ? H.reopen : H.cancel}</Button><Button variant="ghost" size="icon" title={H.remove} aria-label={H.remove} disabled={busy} onClick={() => act(a.id, "delete")}><Trash2 className="size-4" /></Button></div></article>)}
      </TabsContent>
      <TabsContent value="history" className="py-4">{!data.history.length && <p className="py-6 text-muted-foreground">{H.noHistory}</p>}{data.history.map((h) => <p key={h.id} className="border-b border-border py-4">{shabbatLabel(h.shabbat_date)} · {h.party_size}</p>)}</TabsContent>
    </Tabs>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto" dir="rtl"><DialogHeader><DialogTitle>{H.add}</DialogTitle></DialogHeader><div className="space-y-5"><div className="space-y-2"><Label htmlFor="host-date">{t.invitations.shabbat}</Label><Select value={date} onValueChange={setDate}><SelectTrigger id="host-date"><SelectValue /></SelectTrigger><SelectContent>{data.dates.filter((d) => d.date <= end.toISOString().slice(0, 10)).map((d) => <SelectItem key={d.date} value={d.date}>{shabbatLabel(d.date, d.parsha)}</SelectItem>)}</SelectContent></Select></div><HostingDefaults value={choice} onChange={setChoice} /><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="host-seats">{H.seats}</Label><Input id="host-seats" type="number" min={1} value={seats} onChange={(e) => setSeats(Number(e.target.value))} /></div>{choice.withLodging && <div className="space-y-2"><Label htmlFor="host-beds">{H.beds}</Label><Input id="host-beds" type="number" min={1} value={beds} onChange={(e) => setBeds(Number(e.target.value))} /></div>}</div><Button className="w-full" disabled={busy} onClick={save}>{H.save}</Button></div></DialogContent></Dialog>
  </section>;
}