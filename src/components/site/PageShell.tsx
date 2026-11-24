import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

export function PageShell({ children, narrow = false, hero }: { children: ReactNode; narrow?: boolean; hero?: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      {hero}
      <main id="main-content" tabIndex={-1} className={`mx-auto w-full flex-1 px-4 focus:outline-none py-8 ${narrow ? "max-w-xl" : "max-w-5xl"}`}>{children}</main>
      <SiteFooter />
    </div>
  );
}
