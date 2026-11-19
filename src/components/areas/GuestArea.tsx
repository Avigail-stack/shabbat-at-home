import { useState } from "react";
import { InvitationCard } from "./InvitationCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { t } from "@/i18n";
import { shabbatLabel } from "@/lib/invitations";
import type { guestAreaData } from "@/lib/areas.functions";

export function GuestArea({ data }: { data: Awaited<ReturnType<typeof guestAreaData>> }) {
  const I = t.invitations;
  const [date, setDate] = useState("all"); const [type, setType] = useState("all"); const [region, setRegion] = useState("all");
  const list = data.invitations.filter((i) => (date === "all" || i.date === date) && (type === "all" || (type === "full" ? i.unit === "full_shabbat" : i.unit !== "full_shabbat")) && (region === "all" || i.region === region));
  const filters = [
    { id: "filter-shabbat", label: I.shabbat, value: date, set: setDate, options: data.dates.map((d) => ({ value: d.date, label: shabbatLabel(d.date, d.parsha) })) },
    { id: "filter-type", label: I.type, value: type, set: setType, options: [{ value: "full", label: t.hostingDefaults.full }, { value: "meal", label: t.hostingDefaults.meal }] },
    { id: "filter-region", label: I.area, value: region, set: setRegion, options: t.regions.map((r) => ({ value: r, label: r })) },
  ];
  return <section className="mt-8 space-y-6">
    <h2 className="text-3xl font-bold text-primary">{I.title}</h2>
    <div className="grid gap-4 sm:grid-cols-3">{filters.map((f) => <div key={f.id} className="space-y-2"><Label htmlFor={f.id}>{f.label}</Label><Select value={f.value} onValueChange={f.set}><SelectTrigger id={f.id} className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{I.all}</SelectItem>{f.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>)}</div>
    {list.length ? <div className="grid gap-4 md:grid-cols-2">{list.map((i) => <InvitationCard key={i.id} invitation={i} />)}</div> : <p className="py-8 text-muted-foreground">{I.empty}</p>}
    <div className="border-t border-border pt-6"><h2 className="text-2xl font-bold text-primary">{I.responses} · {I.tracking(data.responses.filter((r) => r.status === "pending").length)}</h2>
      {!data.responses.length && <p className="mt-3 text-muted-foreground">{I.noResponses}</p>}
      {data.responses.map((r) => <div key={r.id} className="flex flex-wrap justify-between gap-2 border-b border-border py-4"><span>{r.availability && shabbatLabel(r.availability.shabbat_date)}</span><span className="text-muted-foreground">{r.status === "expired" ? I.expired : I.waiting}</span></div>)}
    </div>
  </section>;
}