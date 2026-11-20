import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/site/PageShell";
import { t } from "@/i18n";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [
    { title: t.about.metaTitle },
    { name: "description", content: t.about.description },
    { property: "og:title", content: t.about.metaTitle },
    { property: "og:description", content: t.about.description },
    { property: "og:type", content: "article" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AboutPage,
});

function AboutPage() {
  const a = t.about;
  return <PageShell>
    <article className="mx-auto max-w-3xl">
      <h1 className="text-4xl font-bold text-primary">{a.title}</h1>
      <p className="mt-3 text-2xl font-heading text-primary">{t.app.name}</p>
      {a.sections.map(section => <section key={section.title} className="mt-8 border-t border-border pt-6">
        <h2 className="text-2xl font-bold text-primary">{section.title}</h2>
        {"text" in section && <p className="mt-3 leading-relaxed">{section.text}</p>}
        {"items" in section && <ul className="mt-3 list-disc space-y-3 ps-6">{section.items.map(item => <li key={item}>{item}</li>)}</ul>}
      </section>)}
      <section className="mt-8 border-t border-border pt-6">
        <h2 className="text-2xl font-bold text-primary">{a.scenario}</h2>
        <ol className="mt-4 list-decimal space-y-4 ps-6">
          <li><Link to="/auth" className="text-primary underline underline-offset-4">{a.steps[0]}</Link></li>
          <li><Link to="/auth" className="text-primary underline underline-offset-4">{a.steps[1]}</Link></li>
          <li><Link to="/home" className="text-primary underline underline-offset-4">{a.steps[2]}</Link></li>
          <li><Link to="/home" className="text-primary underline underline-offset-4">{a.steps[3]}</Link></li>
          <li><Link to="/auth" className="text-primary underline underline-offset-4">{a.steps[4]}</Link></li>
        </ol>
      </section>
      <section className="mt-8 border-t border-border pt-6">
        <h2 className="text-2xl font-bold text-primary">{a.technology}</h2>
        <p className="mt-3 leading-relaxed">{a.stack}</p>
        <a
          href="https://github.com/Avigail-stack/shabbat-at-home"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-block text-primary underline underline-offset-4"
        >
          {a.github}
        </a>
      </section>
    </article>
  </PageShell>;
}