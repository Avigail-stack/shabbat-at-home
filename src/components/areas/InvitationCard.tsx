import { Link } from "@tanstack/react-router";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
import { shabbatLabel, unitLabel, type RankedInvitation } from "@/lib/invitations";

export function InvitationCard({ invitation: i }: { invitation: RankedInvitation }) {
  const I = t.invitations;
  return <article className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
    <div className="flex items-start justify-between gap-3"><h2 className="text-2xl font-bold text-primary">{I.family(i.family_name)}</h2><span className="shrink-0 text-sm font-semibold text-success">{I.score(i.score)}</span></div>
    <div className="space-y-2 text-sm"><p className="flex items-center gap-2"><CalendarDays className="size-4" />{shabbatLabel(i.date, i.parsha)}</p><p className="flex items-center gap-2"><MapPin className="size-4" />{i.city} · {i.neighborhood}</p><p className="flex items-center gap-2"><Users className="size-4" />{unitLabel(i.unit)} · {I.seats(i.seats_left)}</p></div>
    {i.with_lodging && <p className="rounded-md bg-success-bg p-2 text-sm text-success">{t.hostingDefaults.commitment}</p>}
    <ul className="space-y-1 text-sm text-muted-foreground">{i.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
    <Button asChild variant="outline" className="mt-auto"><Link to="/invitations/$id" params={{ id: i.id }}>{I.open}</Link></Button>
  </article>;
}