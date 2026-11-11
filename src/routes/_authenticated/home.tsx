import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import { meQuery } from "@/lib/me";
import { t } from "@/i18n";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "האזור האישי – שבת בבית" },
      { name: "description", content: "ההיענויות, האירוחים וההגדרות שלך בשבת בבית." },
      { property: "og:title", content: "האזור האישי – שבת בבית" },
      { property: "og:description", content: "ההיענויות, האירוחים וההגדרות שלך." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Home,
});

type Side = "guest" | "host";

function Home() {
  const H = t.home;
  const navigate = useNavigate();
  const { data, isLoading } = useQuery(meQuery);
  const [side, setSide] = useState<Side | null>(null);

  useEffect(() => {
    if (isLoading || !data) return;
    if (!data.person) navigate({ to: "/admin", replace: true });
    else if (data.person.onboarding_step !== "done") navigate({ to: "/onboarding", replace: true });
  }, [data, isLoading, navigate]);

  useEffect(() => {
    const saved = sessionStorage.getItem("active-side");
    if (saved === "guest" || saved === "host") setSide(saved);
  }, []);

  if (isLoading || !data?.person || data.person.onboarding_step !== "done") {
    return <PageShell><p className="text-muted-foreground">…</p></PageShell>;
  }
  const hasGuest = !!data.guest && data.guest.status !== "partial";
  const hasHost = !!data.host && data.host.status !== "partial";
  const active: Side | null = hasGuest && hasHost ? side : hasHost ? "host" : hasGuest ? "guest" : null;
  const choose = (s: Side) => { sessionStorage.setItem("active-side", s); setSide(s); };
  const frozen = data.person.restriction_status !== "none";

  return (
    <PageShell>
      <h1 className="text-4xl font-bold text-primary">{H.hello(data.person.first_name ?? "")}</h1>
      {frozen && <p role="status" className="mt-4 rounded-xl bg-warning-bg p-4 font-semibold text-warning">{H.frozen}</p>}

      {hasGuest && hasHost && !side && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-2xl font-bold text-primary">{H.chooseProfile}</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => choose("guest")}>{H.asGuest}</Button>
            <Button size="lg" variant="gold" onClick={() => choose("host")}>{H.asHost}</Button>
          </div>
        </div>
      )}

      {active === "host" && data.host?.approval === "pending" && (
        <p role="status" className="mt-6 rounded-xl bg-warning-bg p-4 font-semibold text-warning">{H.pending}</p>
      )}
      {active === "host" && data.host?.approval === "rejected" && (
        <p role="status" className="mt-6 rounded-xl bg-danger-bg p-4 font-semibold text-danger">{H.rejected}</p>
      )}
      {active && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-2xl font-bold text-primary">{H.title} · {active === "host" ? H.asHost : H.asGuest}</h2>
          <p className="mt-2 text-muted-foreground">{H.comingSoon}</p>
        </div>
      )}
    </PageShell>
  );
}
