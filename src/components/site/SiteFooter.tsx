import { Link } from "@tanstack/react-router";
import { t } from "@/i18n";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-card">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p className="font-semibold text-foreground">{t.footer.emergency}</p>
        <p>{t.footer.free}</p>
        <Link to="/admin" className="text-xs underline-offset-4 hover:underline">
          {t.nav.staff}
        </Link>
      </div>
    </footer>
  );
}
