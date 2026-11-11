import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import { PhoneStep, DetailsStep, RoleStep } from "@/components/onboarding/AccountSteps";
import { GuestQuestionnaire } from "@/components/onboarding/GuestQuestionnaire";
import { HostQuestionnaire } from "@/components/onboarding/HostQuestionnaire";
import { StepFrame } from "@/components/onboarding/StepFrame";
import { meQuery } from "@/lib/me";
import { t } from "@/i18n";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "הרשמה – שבת בבית" },
      { name: "description", content: "השלמת ההרשמה לשבת בבית." },
      { property: "og:title", content: "הרשמה – שבת בבית" },
      { property: "og:description", content: "השלמת ההרשמה לשבת בבית." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery(meQuery);
  const [finished, setFinished] = useState<null | "guest" | "host">(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["me"] });

  const step = data?.person?.onboarding_step;
  useEffect(() => {
    if (isLoading || finished) return;
    if (data && !data.person) navigate({ to: "/admin", replace: true }); // staff have no person record
    else if (step === "done") navigate({ to: "/home", replace: true }); // questionnaire shown only once
  }, [data, isLoading, step, finished, navigate]);

  if (isLoading || !data?.person) return <PageShell narrow><p className="text-muted-foreground">…</p></PageShell>;
  const p = data.person;

  if (finished) {
    return (
      <PageShell narrow>
        <StepFrame title={t.app.name}>
          <p className="text-lg">{finished === "host" ? t.onboarding.hostDone : t.onboarding.guestDone}</p>
          <Button asChild size="lg"><Link to="/home">{t.onboarding.toPersonal}</Link></Button>
        </StepFrame>
      </PageShell>
    );
  }

  return (
    <PageShell narrow>
      {p.onboarding_step === "phone" && <PhoneStep onDone={refresh} />}
      {p.onboarding_step === "details" && <DetailsStep person={p} onDone={refresh} />}
      {p.onboarding_step === "role" && <RoleStep person={p} onDone={refresh} />}
      {p.onboarding_step === "guest" && data.guest && (
        <GuestQuestionnaire person={p} profile={data.guest} onDone={() => { setFinished("guest"); refresh(); }} />
      )}
      {p.onboarding_step === "host" && data.host && (
        <HostQuestionnaire person={p} profile={data.host} onDone={() => { setFinished("host"); refresh(); }} />
      )}
    </PageShell>
  );
}
