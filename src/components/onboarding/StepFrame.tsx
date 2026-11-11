import type { ReactNode } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";

export function StepFrame({ title, step, total, children, onBack, onNext, nextLabel, nextDisabled, busy }: {
  title: string; step?: number; total?: number; children: ReactNode;
  onBack?: () => void; onNext?: () => void; nextLabel?: string; nextDisabled?: boolean; busy?: boolean;
}) {
  const O = t.onboarding;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-7">
      {step !== undefined && total !== undefined && (
        <div className="mb-5 space-y-1.5">
          <p className="text-sm text-muted-foreground">{O.stepOf(step + 1, total)}</p>
          <Progress value={((step + 1) / total) * 100} className="h-2" aria-label={O.stepOf(step + 1, total)} />
        </div>
      )}
      <h1 className="mb-5 text-3xl font-bold text-primary">{title}</h1>
      <div className="space-y-5">{children}</div>
      {(onBack || onNext) && (
        <div className="mt-7 flex justify-between gap-3">
          {onBack ? <Button variant="outline" onClick={onBack} disabled={busy}>{O.back}</Button> : <span />}
          {onNext && (
            <Button onClick={onNext} disabled={nextDisabled || busy}>{busy ? O.saving : nextLabel ?? O.next}</Button>
          )}
        </div>
      )}
    </div>
  );
}
