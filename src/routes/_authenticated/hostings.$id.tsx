import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Phone, MessageCircle } from "lucide-react";
import { hostingDetail, cancelHosting } from "@/lib/hostings.functions";
import { candleTimeLabel } from "@/lib/candle-lighting";
import { cancellationWindow, validCancellation, contactVisible } from "@/lib/validation";
import { friendlyDbError } from "@/lib/db-errors";
import { shabbatLabel } from "@/lib/invitations";
import { PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/i18n";

const options = (id: string) => queryOptions({ queryKey: ["hosting", id], queryFn: () => hostingDetail({ data: { id } }), staleTime: 0, refetchOnMount: "always", refetchInterval: 15000 });
export const Route = createFileRoute("/_authenticated/hostings/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData({ ...options(params.id), revalidateIfStale: true }),
  head: () => ({ meta: [{ title: `${t.hostings.title} – ${t.app.name}` }, { name: "description", content: t.hostings.description }, { property: "og:title", content: `${t.hostings.title} – ${t.app.name}` }, { property: "og:description", content: t.hostings.description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  errorComponent: () => <PageShell narrow><p role="alert">{t.hostings.unavailable}</p><Button asChild variant="link"><Link to="/home">{t.settings.back}</Link></Button></PageShell>,
  component: HostingPage,
});
function HostingPage() {
  const { id } = Route.useParams(); const { data: h } = useSuspenseQuery(options(id)); const cancel = useServerFn(cancelHosting); const qc = useQueryClient();
  const [open, setOpen] = useState(false); const [reason, setReason] = useState<keyof typeof t.hostings.cancelReasons | "">(""); const [note, setNote] = useState(""); const [busy, setBusy] = useState(false);
  const exceptional = h.side === "host" && !!h.candle && cancellationWindow(h.candle, new Date(), h.exceptionalHours).exceptional;
  const phone = h.side === "guest" ? h.host_phone : h.guest_phone;
  const internationalPhone = phone?.replace(/^0/, "972").replace(/\D/g, "");
  const contactLink = h.contact_method === "whatsapp" ? `https://wa.me/${internationalPhone}?text=${encodeURIComponent(t.hostings.greeting(h.first_name, h.parsha))}` : `tel:${phone}`;
  async function submit() {
    if (!validCancellation(reason, note, exceptional) || !reason) return void toast.error(t.hostings.required);
    setBusy(true);
    try {
      await cancel({ data: { id, reason, note } });
      // Drop all previous contact projections before reading the cancelled state.
      qc.setQueryData(options(id).queryKey, { ...h, status: h.side === "host" ? "cancelled_host" : "cancelled_guest", guest_phone: null, host_phone: null, address: null });
      await Promise.all([qc.invalidateQueries({ queryKey: ["hosting", id] }), qc.invalidateQueries({ queryKey: ["hostings"] }), qc.invalidateQueries({ queryKey: ["host-area"] }), qc.invalidateQueries({ queryKey: ["guest-area"] })]);
      setOpen(false); toast.success(t.hostings.cancelled);
    } catch (e) { toast.error(friendlyDbError((e as Error).message)); } finally { setBusy(false); }
  }
  return <PageShell narrow><Button asChild variant="link" className="px-0"><Link to="/home">{t.settings.back}</Link></Button>
    <h1 className="mt-4 text-3xl font-bold text-primary">{contactVisible(h.status) ? h.side === "guest" ? t.hostings.welcome(h.family_name) : t.hostArea.reminder(h.first_name, h.party_size - 1) : t.hostings.cancelled}</h1>
    <p className="mt-3">{shabbatLabel(h.date, h.parsha)}</p>
    {contactVisible(h.status) ? <><p className="mt-3 font-semibold">{h.candle ? t.hostings.candles(h.city, candleTimeLabel(h.candle)) : t.hostings.noTime}</p>
      <dl className="mt-6 space-y-4"><div><dt className="font-bold">{t.hostings.address}</dt><dd>{h.address}</dd></div><div><dt className="font-bold">{t.hostings.phone}</dt><dd dir="ltr" className="text-start">{phone}</dd></div><div><dt className="font-bold">{t.hostings.coming}</dt><dd>{h.first_name} · {t.hostings.composition(h.adults, h.minors)}</dd></div><div><dt className="font-bold">{t.hostings.contact}</dt><dd>{t.hostQ.contacts[h.contact_method]}</dd></div></dl>
      {phone && <Button asChild size="lg" className="mt-6 w-full"><a href={contactLink} target={h.contact_method === "whatsapp" ? "_blank" : undefined} rel="noopener noreferrer">{h.contact_method === "whatsapp" ? <MessageCircle className="size-5" /> : <Phone className="size-5" />}{h.contact_method === "whatsapp" ? t.hostings.whatsapp : t.hostings.call}</a></Button>}
      {h.side === "guest" && h.contact_method === "phone_call" && <p className="mt-2 text-muted-foreground">{t.hostings.prefersCall}</p>}
      <p className="mt-6 border-t border-border pt-5 text-muted-foreground">{t.hostings.boundaries}</p><Button variant="outline" className="mt-6" disabled={!h.candle} onClick={() => setOpen(true)}>{t.hostings.cancel}</Button>
    </> : <p role="status" className="mt-6">{h.side === "guest" && h.status === "cancelled_host" ? h.cancelled_on_friday ? t.hostings.fridayCancelled : t.hostings.hostCancelled : t.hostings.cancelled}</p>}
    <Dialog open={open} onOpenChange={(value) => { if (!busy) setOpen(value); }}><DialogContent dir="rtl"><DialogHeader><DialogTitle>{t.hostings.cancel}</DialogTitle></DialogHeader>{exceptional && <p role="alert" className="bg-warning-bg p-3 text-warning">{t.hostings.lateWarning}</p>}<Label htmlFor="cancel-reason">{t.hostings.reason}</Label><Select value={reason} onValueChange={(value) => setReason(value as keyof typeof t.hostings.cancelReasons)}><SelectTrigger id="cancel-reason"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(t.hostings.cancelReasons).filter(([key]) => !exceptional || ["illness", "bereavement", "other"].includes(key)).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select><Label htmlFor="cancel-note">{t.hostings.note}{exceptional ? ` · ${t.onboarding.required}` : ""}</Label><Textarea id="cancel-note" maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} /><Button disabled={busy || !validCancellation(reason, note, exceptional)} onClick={submit}>{t.hostings.cancel}</Button></DialogContent></Dialog>
  </PageShell>;
}