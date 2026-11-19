import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { guestAreaData, sendGuestResponse } from "@/lib/areas.functions";
import { PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { canRespond, containsContactInfo } from "@/lib/validation";
import { shabbatLabel, unitLabel } from "@/lib/invitations";
import { friendlyDbError } from "@/lib/db-errors";
import { t } from "@/i18n";

const options = queryOptions({ queryKey: ["guest-area"], queryFn: () => guestAreaData() });
export const Route = createFileRoute("/_authenticated/invitations/$id")({
  loader: ({ context }) => context.queryClient.ensureQueryData(options),
  head: () => ({ meta: [{ title: `${t.invitations.detailTitle} – ${t.app.name}` }, { name: "description", content: t.invitations.description }, { property: "og:title", content: `${t.invitations.detailTitle} – ${t.app.name}` }, { property: "og:description", content: t.invitations.description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: InvitationPage,
});
function InvitationPage() {
  const { id } = Route.useParams(); const { data } = useSuspenseQuery(options); const send = useServerFn(sendGuestResponse); const qc = useQueryClient();
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false); const I = t.invitations;
  const i = data.invitations.find((invitation) => invitation.id === id);
  const existing = data.responses.some((r) => r.availability_id === id && r.status === "pending") || data.hostings.some((h) => h.availability_id === id && (h.status === "confirmed" || h.status === "under_review"));
  const count = data.responses.filter((r) => r.status === "pending").length;
  async function respond() {
    if (containsContactInfo(message)) return void toast.error(t.onboarding.contactBlocked);
    if (!canRespond(count)) return void toast.error(I.limit);
    setBusy(true); try { await send({ data: { id, message } }); await qc.invalidateQueries({ queryKey: ["guest-area"] }); toast.success(I.sent); } catch (e) { toast.error(friendlyDbError((e as Error).message)); } finally { setBusy(false); }
  }
  if (!i) return <PageShell narrow><p>{I.unavailable}</p><Button asChild variant="link"><Link to="/home">{I.back}</Link></Button></PageShell>;
  return <PageShell narrow><Button asChild variant="link" className="px-0"><Link to="/home">{I.back}</Link></Button><h1 className="mt-4 text-4xl font-bold text-primary">{I.family(i.family_name)}</h1><p className="mt-3">{shabbatLabel(i.date, i.parsha)} · {unitLabel(i.unit)}</p><p className="mt-2 text-muted-foreground">{i.city} · {i.neighborhood} · {I.seats(i.seats_left)}</p>{i.with_lodging && <p className="mt-5 rounded-md bg-success-bg p-3 text-success">{t.hostingDefaults.commitment}</p>}<div className="mt-6 space-y-5">{[{ label: I.about, value: i.about }, { label: I.food, value: i.food_offer }, { label: I.character, value: i.house_character }, { label: I.cannot, value: i.cannot_provide }].filter((f) => f.value).map((f) => <section key={f.label}><h2 className="text-xl font-bold text-primary">{f.label}</h2><p className="mt-1 whitespace-pre-wrap">{f.value}</p></section>)}<p>{I.languages}: {i.languages.map((l) => t.languages[l as keyof typeof t.languages] ?? l).join(" · ")}</p></div><div className="mt-8 border-t border-border pt-6"><p className="mb-4 font-semibold">{I.tracking(count)}</p>{existing ? <p role="status">{I.waiting}</p> : <div className="space-y-3"><Label htmlFor="guest-message">{I.message}</Label><Textarea id="guest-message" maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} /><Button className="w-full" disabled={busy || !canRespond(count)} onClick={respond}>{I.send}</Button></div>}</div></PageShell>;
}