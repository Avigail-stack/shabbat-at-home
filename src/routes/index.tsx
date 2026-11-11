import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/site/PageShell";
import { CandlesMark } from "@/components/site/Logo";
import { t } from "@/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "שבת בבית – שבת אחת. בית אחד. בלי מסכים." },
      { name: "description", content: "משפחות חרדיות מזמינות אתכם לשבת אמיתית בביתן. חינם, בלי כפייה, בכל הארץ." },
      { property: "og:title", content: "שבת בבית – שבת אחת. בית אחד. בלי מסכים." },
      { property: "og:description", content: "משפחות חרדיות מזמינות אתכם לשבת אמיתית בביתן. חינם, בלי כפייה, בכל הארץ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const L = t.landing;
  return (
    <PageShell>
      <section className="flex flex-col items-center py-10 text-center md:py-16">
        <CandlesMark className="h-16 w-16" />
        <h1 className="mt-4 text-4xl font-bold leading-tight text-primary md:text-6xl">{t.app.tagline}</h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{L.lead}</p>
        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button asChild size="lg">
            <Link to="/auth">{L.ctaGuest}</Link>
          </Button>
          <Button asChild size="lg" variant="gold">
            <Link to="/auth">{L.ctaHost}</Link>
          </Button>
        </div>
      </section>

      <section className="py-8">
        <h2 className="text-center text-3xl font-bold text-primary">{L.howTitle}</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {L.steps.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-border bg-card p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold font-heading text-lg font-bold text-gold-foreground">
                {i + 1}
              </span>
              <h3 className="mt-3 text-xl font-bold text-primary">{s.title}</h3>
              <p className="mt-2 text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-2xl font-bold text-primary">{L.principlesTitle}</h2>
        <ul className="mt-4 space-y-2">
          {L.principles.map((p) => (
            <li key={p} className="flex gap-2">
              <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
        <Link to="/help" className="mt-4 inline-block font-semibold text-primary underline-offset-4 hover:underline">
          {t.nav.help}
        </Link>
      </section>
    </PageShell>
  );
}
