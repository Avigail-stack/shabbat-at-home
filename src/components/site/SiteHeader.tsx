import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";
import { useAuthUser } from "@/hooks/use-auth-user";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { t } from "@/i18n";

export function SiteHeader() {
  const { user } = useAuthUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Logo />
        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link to="/help">{t.nav.help}</Link>
          </Button>
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/home">{t.nav.personal}</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={signOut}>
                {t.nav.logout}
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">{t.nav.login}</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
