import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HostingDefaults } from "./HostingDefaults";
import { TextArea } from "./fields";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { containsContactInfo, guestWeekStart } from "@/lib/validation";
import { friendlyDbError } from "@/lib/db-errors";
import { t } from "@/i18n";

export function WeeklyGuestDialog({ profile }: { profile: Tables<"guest_profiles"> }) {
  const qc = useQueryClient();
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [changeFood, setChangeFood] = useState(false);
  const [value, setValue] = useState({ unit: profile.default_unit, withLodging: profile.default_with_lodging });
  const [food, setFood] = useState(profile.food_preferences ?? "");
  const [sensitivities, setSensitivities] = useState(profile.food_sensitivities ?? "");
  async function save(same: boolean) {
    const nextFood = same ? profile.food_preferences : food;
    const nextSensitivities = same ? profile.food_sensitivities : sensitivities;
    if (containsContactInfo(nextFood) || containsContactInfo(nextSensitivities)) return void toast.error(t.onboarding.contactBlocked);
    setBusy(true);
    const { error } = await supabase.rpc("acknowledge_guest_week", { _unit: same ? profile.default_unit : value.unit, _lodging: same ? profile.default_with_lodging : value.withLodging, _food: nextFood ?? "", _sensitivities: nextSensitivities ?? "" });
    setBusy(false);
    if (error) return void toast.error(friendlyDbError(error.message));
    setDismissed(true); await qc.invalidateQueries({ queryKey: ["me"] });
  }
  return <Dialog open={!dismissed && profile.weekly_prompt_week !== guestWeekStart()} onOpenChange={(open) => { if (!open && !busy) void save(true); }}>
    <DialogContent className="max-h-[85vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{t.weekly.title}</DialogTitle></DialogHeader>
      <HostingDefaults value={value} onChange={setValue} />
      {changeFood ? <><TextArea id="weekly-food" label={t.weekly.food} value={food} onChange={setFood} /><TextArea id="weekly-sensitivities" label={t.weekly.sensitivities} value={sensitivities} onChange={setSensitivities} /></> : <div className="space-y-2"><p>{t.weekly.food}: {food || "—"}</p><p>{t.weekly.sensitivities}: {sensitivities || "—"}</p><Button variant="link" onClick={() => setChangeFood(true)}>{t.weekly.change}</Button></div>}
      <Button size="lg" disabled={busy} onClick={() => save(true)}>{t.weekly.same}</Button>
      <Button variant="outline" disabled={busy} onClick={() => save(false)}>{t.weekly.save}</Button>
    </DialogContent>
  </Dialog>;
}