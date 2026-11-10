import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "שבת בבית" },
      { name: "description", content: "שבת בבית — בקרוב" },
      { property: "og:title", content: "שבת בבית" },
      { property: "og:description", content: "שבת בבית — בקרוב" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <h1 className="font-heading text-5xl font-bold text-primary md:text-7xl">שבת בבית</h1>
      <p className="mt-4 text-xl text-muted-foreground">בקרוב</p>
    </main>
  );
}
