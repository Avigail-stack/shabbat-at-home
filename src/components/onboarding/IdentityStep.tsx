import { useState } from "react";
import { toast } from "sonner";
import { StepFrame } from "./StepFrame";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { verificationProvider } from "@/services/verification";
import { IDENTITY_MAX_ATTEMPTS } from "@/lib/validation";
import { friendlyDbError } from "@/lib/db-errors";
import { t } from "@/i18n";

export function IdentityStep({ personId, attempts = 0, status, onDone }: { personId: string; attempts?: number; status?: string; onDone: () => void }) {
  const I = t.onboarding.identity;
  const [idPhoto, setIdPhoto] = useState(false);
  const [selfie, setSelfie] = useState(false);
  const [busy, setBusy] = useState(false);
  const waiting = status === "manual_review" || attempts >= IDENTITY_MAX_ATTEMPTS;
  async function verify(fail: boolean) {
    if (!idPhoto || !selfie) return void toast.error(I.photosRequired);
    setBusy(true);
    try {
      await verificationProvider.start(personId);
      const result = await verificationProvider.check(personId, { idPhoto, selfie, fail });
      if (!result.ok && result.status !== "manual_review") toast.error(I.retry);
      onDone();
    } catch (e) { toast.error(friendlyDbError((e as Error).message)); }
    finally { setBusy(false); }
  }
  if (waiting) return <StepFrame title={I.title}><p role="status">{I.waiting}</p><p className="text-muted-foreground">{I.waitingNote}</p></StepFrame>;
  return <StepFrame title={I.title} onNext={() => verify(false)} nextLabel={I.verify} nextDisabled={!idPhoto || !selfie} busy={busy}>
    <p>{I.attempts(attempts)}</p>
    <div className="space-y-2"><Label htmlFor="identity-photo">{I.idPhoto}</Label><Input id="identity-photo" type="file" accept="image/*" onChange={(e) => setIdPhoto(!!e.target.files?.length)} /></div>
    <div className="space-y-2"><Label htmlFor="identity-selfie">{I.selfie}</Label><Input id="identity-selfie" type="file" accept="image/*" capture="user" onChange={(e) => setSelfie(!!e.target.files?.length)} /></div>
    <Button variant="link" className="text-sm" disabled={busy || !idPhoto || !selfie} onClick={() => verify(true)}>{I.fail}</Button>
  </StepFrame>;
}