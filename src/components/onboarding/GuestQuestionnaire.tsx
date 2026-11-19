import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StepFrame } from "./StepFrame";
import { Check, Chips, Choice, TextArea, TextInput } from "./fields";
import { CitySelect } from "./CitySelect";
import { HostingDefaults } from "./HostingDefaults";
import { CompanionFields } from "./CompanionFields";
import { interestOptions, languageOptions, regionOptions } from "./options";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { CharterText } from "@/components/site/HelpContent";
import { supabase } from "@/integrations/supabase/client";
import { friendlyDbError } from "@/lib/db-errors";
import { containsContactInfo, isAdult, validCompanions, type CompanionInput } from "@/lib/validation";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";
import { t } from "@/i18n";

type G = Tables<"guest_profiles">;
const O = t.onboarding;
const Q = t.guestQ;

export function GuestQuestionnaire({ person, profile, onDone, editing = false }: { person: Tables<"persons">; profile: G; onDone: () => void; editing?: boolean }) {
  const [step, setStep] = useState(editing ? 0 : Math.min(profile.onboarding_step, Q.steps.length - 1));
  const [g, setG] = useState<G>(profile);
  const [dob, setDob] = useState(person.date_of_birth ?? "");
  const [companions, setCompanions] = useState<CompanionInput[]>([]);
  const [minors, setMinors] = useState(profile.minor_children_count);
  const [companionsReady, setCompanionsReady] = useState(false);
  const [charter, setCharter] = useState(!!profile.charter_accepted_at);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof G>(k: K, v: G[K]) => setG((p) => ({ ...p, [k]: v }));
  const total = Q.steps.length;
  const last = step === total - 1;

  useEffect(() => {
    supabase.from("companions").select("id_number, relation").eq("guest_id", person.id).order("created_at").then(({ data, error }) => {
      if (error) return void toast.error(friendlyDbError(error.message));
      setCompanions(data ?? []); setCompanionsReady(true);
    });
  }, [person.id]);

  function check(): string | null {
    switch (step) {
      case 0:
        if (!dob || !g.gender || !g.marital_status) return O.required;
        if (!isAdult(dob)) return O.under18;
        return null;
      case 1:
        return validCompanions(companions, minors) ? null : Q.invalidCompanions;
      case 2:
        return g.languages.length === 0 || !g.shabbat_familiarity ? O.required : null;
      case 3:
        if (!g.city) return O.required;
        return !g.area_all_israel && g.regions.length === 0 ? O.required : null;
      case 4:
        return containsContactInfo(g.interests_other) ? O.contactBlocked : null;
      case 5:
        return containsContactInfo(g.food_preferences) || containsContactInfo(g.food_sensitivities) || containsContactInfo(g.accessibility_needs) ? O.contactBlocked : null;
      case 6:
        return containsContactInfo(g.about) ? O.contactBlocked : null;
      case 7:
        return charter ? null : O.required;
    }
    return null;
  }

  async function next() {
    const err = check();
    if (err) return void toast.error(err);
    setBusy(true);
    if (step === 1) {
      const { error } = await supabase.rpc("save_guest_companions", { _guest: person.id, _companions: companions, _minors: minors });
      if (error) { setBusy(false); return void toast.error(friendlyDbError(error.message)); }
    }
    if (!editing && step === 0 && dob !== person.date_of_birth) {
      const { error } = await supabase.from("persons").update({ date_of_birth: dob }).eq("id", person.id);
      if (error) { setBusy(false); return void toast.error(friendlyDbError(error.message)); }
    }
    const patch: TablesUpdate<"guest_profiles"> = {
      gender: g.gender, marital_status: g.marital_status, languages: g.languages,
      shabbat_familiarity: g.shabbat_familiarity, area_all_israel: g.area_all_israel,
      regions: g.area_all_israel ? [] : g.regions, city: g.city, interests: g.interests,
      interests_other: g.interests_other, food_sensitivities: g.food_sensitivities,
      accessibility_needs: g.accessibility_needs, about: g.about,
      food_preferences: g.food_preferences,
      ...(!editing ? { onboarding_step: last ? step : step + 1 } : {}),
      default_unit: g.default_unit, default_with_lodging: g.default_with_lodging,
    };
    if (last && !editing) {
      patch.charter_accepted_at = new Date().toISOString();
      patch.status = "pending";
    }
    const { error } = await supabase.from("guest_profiles").update(patch).eq("person_id", person.id);
    if (!error && last && !editing) await supabase.from("persons").update({ onboarding_step: "done" }).eq("id", person.id);
    setBusy(false);
    if (error) return void toast.error(friendlyDbError(error.message));
    if (last) onDone();
    else setStep(step + 1);
  }

  return (
    <StepFrame title={Q.steps[step] ?? ""} step={step} total={total} busy={busy}
      onBack={step > 0 ? () => setStep(step - 1) : undefined}
      onNext={next} nextLabel={last ? editing ? t.preferences.save : O.finish : undefined} nextDisabled={(last && !charter) || (step === 1 && !companionsReady)}>
      {step === 0 && (
        <>
          {!editing && (person.date_of_birth ? (
            <p className="text-muted-foreground">{Q.dob}: {person.date_of_birth}</p>
          ) : (
            <TextInput id="dob" label={Q.dob} type="date" dir="ltr" value={dob} onChange={setDob} />
          ))}
          <Choice label={Q.gender} value={g.gender} onChange={(v) => set("gender", v)}
            options={[{ value: "male", label: Q.genders.male }, { value: "female", label: Q.genders.female }]} />
          <Choice label={Q.marital} value={g.marital_status} onChange={(v) => set("marital_status", v)}
            options={Q.maritalOptions.map((m) => ({ value: m, label: m }))} />
        </>
      )}
      {step === 1 && (
        <CompanionFields companions={companions} minors={minors} onChange={setCompanions} onMinors={setMinors} />
      )}
      {step === 2 && (
        <>
          <HostingDefaults value={{ unit: g.default_unit, withLodging: g.default_with_lodging }} onChange={(v) => setG((p) => ({ ...p, default_unit: v.unit, default_with_lodging: v.withLodging }))} />
          <Chips label={Q.languages} values={g.languages} options={languageOptions} onChange={(v) => set("languages", v)} />
          <Choice label={Q.familiarity} value={g.shabbat_familiarity} onChange={(v) => set("shabbat_familiarity", v)}
            options={(["never", "little", "well"] as const).map((f) => ({ value: f, label: Q.familiarities[f] }))} />
        </>
      )}
      {step === 3 && (
        <>
          <CitySelect id="city" label={Q.city} value={g.city ?? ""} onChange={(v) => set("city", v)} />
          <Choice label={Q.area} value={g.area_all_israel ? "all" : "some"} onChange={(v) => set("area_all_israel", v === "all")}
            options={[{ value: "all", label: Q.allIsrael }, { value: "some", label: Q.chosenRegions }]} />
          {!g.area_all_israel && <Chips label={Q.chosenRegions} values={g.regions} options={regionOptions} onChange={(v) => set("regions", v)} />}
        </>
      )}
      {step === 4 && (
        <>
          <Chips label={Q.interests} values={g.interests} options={interestOptions} onChange={(v) => set("interests", v)} />
          <TextInput id="intOther" label={Q.interestsOther} value={g.interests_other ?? ""} onChange={(v) => set("interests_other", v)} />
        </>
      )}
      {step === 5 && (
        <>
          <TextArea id="food-preferences" label={t.weekly.food} value={g.food_preferences ?? ""} onChange={(v) => set("food_preferences", v)} />
          <TextArea id="food" label={Q.food} value={g.food_sensitivities ?? ""} onChange={(v) => set("food_sensitivities", v)} />
          <TextArea id="access" label={Q.access} value={g.accessibility_needs ?? ""} onChange={(v) => set("accessibility_needs", v)} />
        </>
      )}
      {step === 6 && <TextArea id="about" label={Q.about} hint={Q.aboutHint} value={g.about ?? ""} onChange={(v) => set("about", v)} />}
      {step === 7 && (
        <>
          <Collapsible className="rounded-xl border border-border p-4">
            <CollapsibleTrigger asChild><Button variant="link" className="px-0">{O.readMore}</Button></CollapsibleTrigger>
            <CollapsibleContent className="pt-2"><CharterText /></CollapsibleContent>
          </Collapsible>
          <Check id="charter" label={O.charterAccept} checked={charter} onChange={setCharter} />
        </>
      )}
    </StepFrame>
  );
}
