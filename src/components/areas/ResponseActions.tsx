import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { confirmResponse, declineResponse } from "@/lib/hostings.functions";
import { friendlyDbError } from "@/lib/db-errors";
import { t } from "@/i18n";

export function ResponseActions({ id, preferred }: { id: string; preferred: "whatsapp" | "phone_call" }) {
  const [mode, setMode] = useState<"confirm" | "decline" | null>(null);
  const [contact, setContact] = useState(preferred); const [saveDefault, setSaveDefault] = useState(true);
  const [reason, setReason] = useState<keyof typeof t.hostings.declineReasons | "">(""); const [note, setNote] = useState(""); const [busy, setBusy] = useState(false);
  const confirm = useServerFn(confirmResponse); const decline = useServerFn(declineResponse); const qc = useQueryClient(); const navigate = useNavigate();
  async function submit() {
    if (mode === "decline" && !reason) return;
    setBusy(true);
    try {
      const hostingId = mode === "confirm" ? await confirm({ data: { id, contact, saveDefault } }) : reason ? await decline({ data: { id, reason, note } }) : null;
      await Promise.all([qc.invalidateQueries({ queryKey: ["host-area"] }), qc.invalidateQueries({ queryKey: ["hostings"] }), qc.invalidateQueries({ queryKey: ["me"] })]);
      setMode(null);
      if (hostingId) await navigate({ to: "/hostings/$id", params: { id: hostingId } });
      else toast.success(t.hostings.saved);
    } catch (e) { toast.error(friendlyDbError((e as Error).message)); } finally { setBusy(false); }
  }
  return <><div className="mt-4 flex gap-3"><Button onClick={() => { setContact(preferred); setSaveDefault(true); setMode("confirm"); }}>{t.hostings.confirm}</Button><Button variant="outline" onClick={() => setMode("decline")}>{t.hostings.decline}</Button></div>
    <Dialog open={mode !== null} onOpenChange={(open) => { if (!open && !busy) setMode(null); }}><DialogContent dir="rtl"><DialogHeader><DialogTitle>{mode === "confirm" ? t.hostings.contactTitle : t.hostings.declineTitle}</DialogTitle></DialogHeader>
      {mode === "confirm" ? <div className="space-y-4"><div className="flex gap-3" role="radiogroup" aria-label={t.hostings.contact}><Button role="radio" aria-checked={contact === "whatsapp"} variant={contact === "whatsapp" ? "default" : "outline"} onClick={() => setContact("whatsapp")}>{t.hostQ.contacts.whatsapp}</Button><Button role="radio" aria-checked={contact === "phone_call"} variant={contact === "phone_call" ? "default" : "outline"} onClick={() => setContact("phone_call")}>{t.hostQ.contacts.phone_call}</Button></div><label className="flex items-center gap-3"><Checkbox checked={saveDefault} onCheckedChange={(v) => setSaveDefault(v === true)} />{t.hostings.saveDefault}</label></div> : <div className="space-y-3"><Label htmlFor={`decline-${id}`}>{t.hostings.declineReason}</Label><Select value={reason} onValueChange={(v) => setReason(v as keyof typeof t.hostings.declineReasons)}><SelectTrigger id={`decline-${id}`}><SelectValue /></SelectTrigger><SelectContent>{Object.entries(t.hostings.declineReasons).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select><Label htmlFor={`note-${id}`}>{t.hostings.note}</Label><Textarea id={`note-${id}`} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} /></div>}
      <Button disabled={busy || (mode === "decline" && !reason)} onClick={submit}>{mode === "confirm" ? t.hostings.confirm : t.hostings.decline}</Button>
    </DialogContent></Dialog></>;
}