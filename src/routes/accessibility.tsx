import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/site/PageShell";
import { t } from "@/i18n";

export const Route = createFileRoute("/accessibility")({
  head: () => ({ meta: [
    { title: t.accessibility.metaTitle },
    { name: "description", content: t.accessibility.description },
    { property: "og:title", content: t.accessibility.metaTitle },
    { property: "og:description", content: t.accessibility.description },
    { property: "og:type", content: "article" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AccessibilityPage,
});

function AccessibilityPage() {
  const a = t.accessibility;
  return <PageShell>
    <article className="mx-auto max-w-3xl">
      <h1 className="text-4xl font-bold text-primary">{a.title}</h1>
      <p className="mt-4 leading-relaxed">{a.intro}</p>
      <section className="mt-8 border-t border-border pt-6">
        <h2 className="text-2xl font-bold text-primary">{a.doneTitle}</h2>
        <ul className="mt-3 list-disc space-y-2 ps-6">{a.done.map(item => <li key={item}>{item}</li>)}</ul>
      </section>
      <section className="mt-8 border-t border-border pt-6">
        <h2 className="text-2xl font-bold text-primary">{a.limitsTitle}</h2>
        <p className="mt-3">{a.limits}</p>
      </section>
      <section className="mt-8 border-t border-border pt-6">
        <h2 className="text-2xl font-bold text-primary">{a.reportTitle}</h2>
        <p className="mt-3">{a.report}{" "}
          <a href="https://github.com/Avigail-stack/shabbat-at-home/issues" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">{a.reportLink}</a>
        </p>
      </section>
      <p className="mt-8 border-t border-border pt-6 text-muted-foreground">{a.updated}</p>
    </article>
  </PageShell>;
}
