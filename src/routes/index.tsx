import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/site/PageShell";
import { HowItWorksStack } from "@/components/site/HowItWorksStack";
import { HomeHero } from "@/components/site/HomeHero";

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
  return (
    <PageShell hero={<HomeHero nextId="home-content" />}>
      <HowItWorksStack id="home-content" />
    </PageShell>
  );
}
