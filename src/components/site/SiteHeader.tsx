import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";
import { useAuthUser } from "@/hooks/use-auth-user";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { t } from "@/i18n";
import { hostingSummaries } from "@/lib/hostings.functions";
import { inboxData } from "@/lib/engagement.functions";
import { HostingList } from "@/components/areas/HostingList";

export function SiteHeader() {
  const { user } = useAuthUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const summaries = useQuery({ queryKey: ["hostings"], queryFn: () => hostingSummaries(), enabled: !!user });
  const inbox = useQuery({ queryKey: ["inbox"], queryFn: () => inboxData(), enabled: !!user, refetchInterval: 15000 });
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
        <nav className="flex flex-wrap items-center gap-1">
          {summaries.data && <HostingList items={summaries.data} reminder />}
          <Button asChild variant="ghost" size="sm">
            <Link to="/help">{t.nav.help}</Link>
          </Button>
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/inbox">{t.messages.title} {inbox.data?.filter((n) => !n.read_at).length || ""}</Link></Button>
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
