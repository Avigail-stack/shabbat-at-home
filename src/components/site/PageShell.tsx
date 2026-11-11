import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

export function PageShell({ children, narrow = false }: { children: ReactNode; narrow?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className={`mx-auto w-full flex-1 px-4 py-8 ${narrow ? "max-w-xl" : "max-w-5xl"}`}>{children}</main>
      <SiteFooter />
    </div>
  );
}
