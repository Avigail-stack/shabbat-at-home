import type { ReactNode } from "react";
import { t } from "@/i18n";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-2xl font-bold text-primary">{title}</h2>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}
function List({ items }: { items: readonly string[] }) {
  return (
    <ul className="list-disc space-y-1 ps-5">
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );
}

export function CharterText() {
  return <List items={t.help.charter} />;
}
export function HostRulesText() {
  const H = t.help;
  return (
    <>
      <p>{H.hostAllowed}</p>
      <p className="font-semibold">{H.hostNotAllowedLabel}</p>
      <List items={H.hostNotAllowed} />
    </>
  );
}
export function LodgingRulesText() {
  return <List items={t.help.lodging} />;
}

export function HelpContent() {
  const H = t.help;
  return (
    <div className="space-y-5">
      <Section title={H.charterTitle}><CharterText /></Section>
      <Section title={H.hostRulesTitle}><HostRulesText /></Section>
      <Section title={H.privateTitle}><List items={H.private} /></Section>
      <Section title={H.lodgingTitle}><LodgingRulesText /></Section>
      <Section title={H.yichudTitle}><List items={H.yichud} /></Section>
      <Section title={H.leaveTitle}><p>{H.leave}</p></Section>
      <Section title={H.minorsTitle}><List items={H.minors} /></Section>
      <section className="rounded-2xl border border-danger/30 bg-danger-bg p-5 text-danger">
        <h2 className="text-2xl font-bold">{H.emergencyTitle}</h2>
        <p className="mt-2 text-lg font-semibold">{H.emergency}</p>
      </section>
      <Section title={H.matchingTitle}>
        <p>{H.matchingIntro}</p>
        <h3 className="pt-2 text-lg font-bold">{H.mustTitle}</h3>
        <List items={H.must} />
        <h3 className="pt-2 text-lg font-bold">{H.boostTitle}</h3>
        <List items={H.boost} />
        <p className="pt-2 text-muted-foreground">{H.matchingNote}</p>
      </Section>
    </div>
  );
}
