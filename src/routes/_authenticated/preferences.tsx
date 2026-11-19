import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/site/PageShell";
import { GuestQuestionnaire } from "@/components/onboarding/GuestQuestionnaire";
import { HostQuestionnaire } from "@/components/onboarding/HostQuestionnaire";
import { Choice } from "@/components/onboarding/fields";
import { Button } from "@/components/ui/button";
import { meQuery } from "@/lib/me";
import { t } from "@/i18n";

export const Route = createFileRoute("/_authenticated/preferences")({
  loader: ({ context }) => context.queryClient.ensureQueryData(meQuery),
  head: () => ({ meta: [
    { title: `${t.preferences.title} – ${t.app.name}` },
    { name: "description", content: t.preferences.description },
    { property: "og:title", content: `${t.preferences.title} – ${t.app.name}` },
    { property: "og:description", content: t.preferences.description },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: Preferences,
});
function Preferences() {
  const { data } = useSuspenseQuery(meQuery);
  const qc = useQueryClient();
  const [side, setSide] = useState<"guest" | "host">("guest");
  const [revision, setRevision] = useState(0);
  const active = data?.guest && data?.host ? side : data?.host ? "host" : "guest";
  const done = async () => { await qc.invalidateQueries({ queryKey: ["me"] }); toast.success(t.preferences.saved); setRevision((v) => v + 1); };
  return <PageShell narrow>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-bold text-primary">{t.preferences.title}</h1><Button asChild variant="link"><Link to="/home">{t.settings.back}</Link></Button></div>
    {data?.guest && data.host && <div className="mb-5"><Choice label={t.home.chooseProfile} value={active} options={[{ value: "guest", label: t.home.asGuest }, { value: "host", label: t.home.asHost }]} onChange={setSide} /></div>}
    {data?.person && active === "guest" && data.guest && <GuestQuestionnaire key={`guest-${revision}`} editing person={data.person} profile={data.guest} onDone={done} />}
    {data?.person && active === "host" && data.host && <HostQuestionnaire key={`host-${revision}`} editing person={data.person} profile={data.host} onDone={done} />}
  </PageShell>;
}