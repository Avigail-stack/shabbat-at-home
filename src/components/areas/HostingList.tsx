import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { shabbatLabel } from "@/lib/invitations";
import type { HostingSummary } from "@/lib/hostings.functions";
import { t } from "@/i18n";

export function HostingList({ items, reminder = false }: { items: HostingSummary[]; reminder?: boolean }) {
  const now = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const upcoming = items.filter((h) => h.status === "confirmed" && h.date >= now).sort((a, b) => a.date.localeCompare(b.date));
  const list = reminder ? upcoming.filter((h) => h.date === upcoming[0]?.date && h.side === "host") : items;
  if (!list.length) return null;
  return <section className={reminder ? "border-b border-border bg-secondary py-3" : "mt-6 space-y-2 border-t border-border pt-5"}>
    {!reminder && <h2 className="text-2xl font-bold text-primary">{t.hostings.list}</h2>}
    {list.map((h) => <div key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
      <p>{reminder ? t.hostArea.reminder(h.first_name, h.party_size - 1) : `${shabbatLabel(h.date)} · ${h.side === "host" ? h.first_name : t.invitations.family(h.family_name)} · ${h.status === "confirmed" ? t.hostings.accepted : h.status.startsWith("cancelled") ? t.hostings.cancelled : t.hostArea.history}`}</p>
      <Button asChild variant="link"><Link to="/hostings/$id" params={{ id: h.id }}>{t.hostings.open}</Link></Button>
    </div>)}
  </section>;
}