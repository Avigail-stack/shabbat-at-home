import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/site/PageShell";
import { HelpContent } from "@/components/site/HelpContent";
import { t } from "@/i18n";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "חומרי עזרה – שבת בבית" },
      { name: "description", content: "האמנה ההדדית, כללי הלינה, ייחוד, הזכות לעזוב ואיך אנחנו מתאימים בין אורחים למשפחות." },
      { property: "og:title", content: "חומרי עזרה – שבת בבית" },
      { property: "og:description", content: "האמנה ההדדית, כללי הלינה, ייחוד, הזכות לעזוב ואיך אנחנו מתאימים." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HelpPage,
});

function HelpPage() {
  return (
    <PageShell>
      <h1 className="text-4xl font-bold text-primary">{t.help.title}</h1>
      <p className="mt-2 mb-6 text-lg text-muted-foreground">{t.help.intro}</p>
      <HelpContent />
    </PageShell>
  );
}
