import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { reportProblem } from "@/lib/engagement.functions";
import { validFlag } from "@/lib/validation";
import { friendlyDbError } from "@/lib/db-errors";
import { t } from "@/i18n";

export function ProblemReport({ id }: { id: string }) {
  const [open, setOpen] = useState(false); const [description, setDescription] = useState(""); const [busy, setBusy] = useState(false);
  const report = useServerFn(reportProblem); const qc = useQueryClient();
  async function send() { setBusy(true); try { await report({ data: { id, description } }); await qc.invalidateQueries(); setOpen(false); toast.success(t.flag.saved); } catch (e) { toast.error(friendlyDbError((e as Error).message)); } finally { setBusy(false); } }
  return <div className="mt-6 border-t border-border pt-4"><Button variant="outline" onClick={() => setOpen(true)}>{t.flag.title}</Button><p className="mt-2 text-sm text-muted-foreground">{t.flag.note}</p><Dialog open={open} onOpenChange={setOpen}><DialogContent dir="rtl"><DialogHeader><DialogTitle>{t.flag.title}</DialogTitle></DialogHeader><Label htmlFor="problem-description">{t.flag.description}</Label><Textarea id="problem-description" maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} /><Button disabled={busy || !validFlag(description)} onClick={send}>{t.flag.send}</Button></DialogContent></Dialog></div>;
}