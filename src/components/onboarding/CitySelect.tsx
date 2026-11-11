import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "./fields";
import { supabase } from "@/integrations/supabase/client";

export function CitySelect({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  const { data } = useQuery({
    queryKey: ["cities"],
    queryFn: async () => (await supabase.from("cities").select("name").order("name")).data ?? [],
  });
  return (
    <Field id={id} label={label}>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-11 text-base"><SelectValue placeholder="—" /></SelectTrigger>
        <SelectContent>
          {(data ?? []).map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </Field>
  );
}
