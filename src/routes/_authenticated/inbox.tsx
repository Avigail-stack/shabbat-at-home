import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { inboxData, markMessageRead } from "@/lib/engagement.functions";
import { PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";
const options = queryOptions({ queryKey: ["inbox"], queryFn: () => inboxData(), staleTime: 0, refetchInterval: 15000 });
export const Route = createFileRoute("/_authenticated/inbox")({ loader: ({ context }) => context.queryClient.ensureQueryData(options), head: () => ({ meta: [{ title: `${t.messages.title} – ${t.app.name}` }, { name: "description", content: t.messages.description }, { property: "og:title", content: `${t.messages.title} – ${t.app.name}` }, { property: "og:description", content: t.messages.description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }), component: Inbox });
function Inbox() {
  const { data } = useSuspenseQuery(options); const mark = useServerFn(markMessageRead); const qc = useQueryClient();
  return <PageShell narrow><h1 className="text-4xl font-bold text-primary">{t.messages.title}</h1>{!data.length && <p className="mt-6">{t.messages.empty}</p>}{data.map((n) => {
    const vars = n.variables as Record<string, string>;
    return <article key={n.id} className="border-b border-border py-5"><p className={n.read_at ? "text-muted-foreground" : "font-semibold"}>{n.body}</p>{n.send_after && new Date(n.send_after) > new Date() && <p className="mt-2 text-sm text-muted-foreground">{t.messages.deferred(t.settings.channels[vars["deferred_channel"] as keyof typeof t.settings.channels] ?? "SMS")}</p>}{!n.read_at && <Button variant="link" onClick={async () => { await mark({ data: { id: n.id } }); await qc.invalidateQueries({ queryKey: ["inbox"] }); }}>{t.messages.read}</Button>}</article>;
  })}</PageShell>;
}