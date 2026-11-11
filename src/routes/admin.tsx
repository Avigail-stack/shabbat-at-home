import { createFileRoute } from "@tanstack/react-router";
import { CandlesMark } from "@/components/site/Logo";
import { t } from "@/i18n";

// Staff area: built in pass 3 (invite-only login, server-checked roles).
export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "ניהול – שבת בבית" },
      { name: "description", content: "אזור הצוות של שבת בבית." },
      { property: "og:title", content: "ניהול – שבת בבית" },
      { property: "og:description", content: "אזור הצוות של שבת בבית." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <CandlesMark className="h-12 w-12" />
      <h1 className="text-3xl font-bold text-primary">{t.admin.title}</h1>
      <p className="text-muted-foreground">{t.admin.soon}</p>
    </main>
  ),
});
