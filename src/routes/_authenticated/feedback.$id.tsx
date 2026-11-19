import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { engagementState, submitFeedback } from "@/lib/engagement.functions";
import { validFeedback } from "@/lib/validation";
import { friendlyDbError } from "@/lib/db-errors";
import { ProblemReport } from "@/components/areas/ProblemReport";
import { PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/i18n";
const options = queryOptions({ queryKey: ["engagement"], queryFn: () => engagementState(), staleTime: 0 });
export const Route = createFileRoute("/_authenticated/feedback/$id")({ loader: ({ context }) => context.queryClient.ensureQueryData(options), head: () => ({ meta: [{ title: `${t.feedback.title} – ${t.app.name}` }, { name: "description", content: t.feedback.description }, { property: "og:title", content: `${t.feedback.title} – ${t.app.name}` }, { property: "og:description", content: t.feedback.description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }), component: Feedback });
function Feedback() {
  const { id } = Route.useParams(); const { data } = useSuspenseQuery(options); const state = data.find((h) => h.id === id);
  const [took, setTook] = useState<"yes" | "partial" | "no" | "">(""); const [overall, setOverall] = useState(""); const [details, setDetails] = useState(""); const [busy, setBusy] = useState(false); const [saved, setSaved] = useState(false);
  const send = useServerFn(submitFeedback); const qc = useQueryClient();
  async function submit() { if (!took) return; setBusy(true); try { await send({ data: { id, took, overall, details } }); setSaved(true); await qc.invalidateQueries(); toast.success(t.feedback.saved); } catch (e) { toast.error(friendlyDbError((e as Error).message)); } finally { setBusy(false); } }
  return <PageShell narrow><h1 className="text-4xl font-bold text-primary">{t.feedback.title}</h1><p className="mt-3 font-semibold">{t.feedback.private}</p>{saved || state?.answered ? <p role="status" className="mt-6">{t.feedback.saved}</p> : !state?.due ? <p className="mt-6">{t.feedback.notOpen}</p> : <div className="mt-6 space-y-5"><fieldset><legend className="mb-3 font-bold">{t.feedback.took}</legend><div className="flex flex-wrap gap-2">{Object.entries(t.feedback.tookOptions).map(([key,label]) => <Button key={key} role="radio" aria-checked={took === key} variant={took === key ? "default" : "outline"} onClick={() => setTook(key as "yes" | "partial" | "no")}>{label}</Button>)}</div></fieldset>{took && took !== "no" && <><fieldset><legend className="mb-3 font-bold">{t.feedback.overall}</legend><div className="flex flex-col items-start gap-2">{Object.entries(t.feedback.options).map(([key,label]) => { const value = key === "nice" ? "נחמד" : label; return <Button key={key} className="h-auto min-h-11 whitespace-normal text-start" role="radio" aria-checked={overall === value} variant={overall === value ? "default" : "outline"} onClick={() => setOverall(value)}>{label}</Button>; })}</div></fieldset>{["לא טוב", "אחר"].includes(overall) && <div><Label htmlFor="feedback-details">{t.feedback.details}</Label><Textarea id="feedback-details" maxLength={2000} value={details} onChange={(e) => setDetails(e.target.value)} /></div>}</>}<Button disabled={busy || !validFeedback(took,overall,details)} onClick={submit}>{t.feedback.save}</Button></div>}<Button asChild variant="link" className="mt-6"><Link to="/home">{t.settings.back}</Link></Button><ProblemReport id={id} /></PageShell>;
}