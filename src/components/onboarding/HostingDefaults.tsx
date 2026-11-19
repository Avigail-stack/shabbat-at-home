import { Choice } from "./fields";
import { t } from "@/i18n";
import type { Enums } from "@/integrations/supabase/types";

export type HostingDefault = { unit: Enums<"hosting_unit">; withLodging: boolean };
export function HostingDefaults({ value, onChange }: { value: HostingDefault; onChange: (value: HostingDefault) => void }) {
  const H = t.hostingDefaults;
  const full = value.unit === "full_shabbat";
  return <div className="space-y-4">
    <Choice label={H.title} value={full ? "full" : "meal"} options={[{ value: "full", label: H.full }, { value: "meal", label: H.meal }]}
      onChange={(kind) => onChange({ unit: kind === "full" ? "full_shabbat" : "friday_dinner", withLodging: kind === "full" ? true : value.withLodging })} />
    {!full && <>
      <Choice label={H.mealChoice} value={value.unit} options={(["friday_dinner", "shabbat_lunch", "seudah_shlishit"] as const).map((unit) => ({ value: unit, label: H.meals[unit] }))}
        onChange={(unit) => onChange({ ...value, unit })} />
      <Choice label={H.lodgingChoice} value={value.withLodging ? "yes" : "no"} options={[{ value: "yes", label: H.lodging }, { value: "no", label: H.noLodging }]}
        onChange={(v) => onChange({ ...value, withLodging: v === "yes" })} />
    </>}
  </div>;
}