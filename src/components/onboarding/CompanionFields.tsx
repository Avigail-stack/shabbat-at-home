import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Choice, TextInput } from "./fields";
import { t } from "@/i18n";
import type { CompanionInput } from "@/lib/validation";

export function CompanionFields({ companions, minors, onChange, onMinors }: { companions: CompanionInput[]; minors: number; onChange: (v: CompanionInput[]) => void; onMinors: (v: number) => void }) {
  const Q = t.guestQ;
  return <div className="space-y-5">
    <h2 className="font-semibold">{Q.companionTitle}</h2>
    {companions.map((c, i) => <div key={i} className="space-y-3 border-b border-border pb-4">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1"><TextInput id={`companion-id-${i}`} label={Q.companionId} dir="ltr" inputMode="numeric" value={c.id_number} onChange={(id_number) => onChange(companions.map((x,j) => j === i ? { ...x, id_number: id_number.trim() } : x))} /></div>
        <Button variant="ghost" size="icon" aria-label={Q.removeCompanion} title={Q.removeCompanion} onClick={() => onChange(companions.filter((_,j) => i !== j))}><Trash2 /></Button>
      </div>
      <Choice label={Q.relation} value={c.relation} options={Object.entries(Q.relations).map(([value,label]) => ({ value,label }))} onChange={(relation) => onChange(companions.map((x,j) => j === i ? { ...x, relation } : x))} />
    </div>)}
    <Button variant="outline" onClick={() => onChange([...companions, { id_number: "", relation: "spouse" }])}><Plus />{Q.addCompanion}</Button>
    <TextInput id="minor-count" label={Q.minorCount} dir="ltr" type="number" value={String(minors)} onChange={(v) => onMinors(Number(v))} />
  </div>;
}