import { useState } from "react";
import { toast } from "sonner";
import { StepFrame } from "./StepFrame";
import { Check, Chips, Choice, TextArea, TextInput } from "./fields";
import { CitySelect } from "./CitySelect";
import { interestOptions, languageOptions, regionOptions } from "./options";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { CharterText } from "@/components/site/HelpContent";
import { supabase } from "@/integrations/supabase/client";
import { friendlyDbError } from "@/lib/db-errors";
import { containsContactInfo, isAdult, parseAges } from "@/lib/validation";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";
import { t } from "@/i18n";

type G = Tables<"guest_profiles">;
const O = t.onboarding;
const Q = t.guestQ;

export function GuestQuestionnaire({ person, profile, onDone }: { person: Tables<"persons">; profile: G; onDone: () => void }) {
  const [step, setStep] = useState(Math.min(profile.onboarding_step, Q.steps.length - 1));
  const [g, setG] = useState<G>(profile);
  const [dob, setDob] = useState(person.date_of_birth ?? "");
  const [children, setChildren] = useState(profile.party_children_ages.join(", "));
  const [charter, setCharter] = useState(!!profile.charter_accepted_at);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof G>(k: K, v: G[K]) => setG((p) => ({ ...p, [k]: v }));
  const total = Q.steps.length;
  const last = step === total - 1;

  function check(): string | null {
    switch (step) {
      case 0:
        if (!dob || !g.gender || !g.marital_status) return O.required;
        if (!isAdult(dob)) return O.under18;
        return null;
      case 1:
        if (g.party_type === "group" && parseAges(children).length > 0 && !g.escort_name?.trim()) return O.required;
        return null;
      case 2:
        return g.languages.length === 0 || !g.shabbat_familiarity ? O.required : null;
      case 3:
        if (!g.city) return O.required;
        return !g.area_all_israel && g.regions.length === 0 ? O.required : null;
      case 4:
        return containsContactInfo(g.interests_other) ? O.contactBlocked : null;
      case 5:
        return containsContactInfo(g.food_sensitivities) || containsContactInfo(g.accessibility_needs) ? O.contactBlocked : null;
      case 6:
        return containsContactInfo(g.about) ? O.contactBlocked : null;
      case 7:
        return charter ? null : O.required;
    }
    return null;
  }

  async function next() {
    const err = check();
    if (err) return toast.error(err);
    setBusy(true);
    if (step === 0 && dob !== person.date_of_birth) {
      const { error } = await supabase.from("persons").update({ date_of_birth: dob }).eq("id", person.id);
      if (error) { setBusy(false); return toast.error(friendlyDbError(error.message)); }
    }
    const patch: TablesUpdate<"guest_profiles"> = {
      gender: g.gender, marital_status: g.marital_status, party_type: g.party_type,
      party_adults: g.party_adults, party_children_ages: parseAges(children),
      escort_name: g.escort_name, escort_phone: g.escort_phone, languages: g.languages,
      shabbat_familiarity: g.shabbat_familiarity, area_all_israel: g.area_all_israel,
      regions: g.area_all_israel ? [] : g.regions, city: g.city, interests: g.interests,
      interests_other: g.interests_other, food_sensitivities: g.food_sensitivities,
      accessibility_needs: g.accessibility_needs, about: g.about,
      onboarding_step: last ? step : step + 1,
    };
    if (last) {
      patch.charter_accepted_at = new Date().toISOString();
      patch.status = "pending";
    }
    const { error } = await supabase.from("guest_profiles").update(patch).eq("person_id", person.id);
    if (!error && last) await supabase.from("persons").update({ onboarding_step: "done" }).eq("id", person.id);
    setBusy(false);
    if (error) return toast.error(friendlyDbError(error.message));
    if (last) onDone();
    else setStep(step + 1);
  }

  const showEscort = g.party_type === "group";
  return (
    <StepFrame title={Q.steps[step]} step={step} total={total} busy={busy}
      onBack={step > 0 ? () => setStep(step - 1) : undefined}
      onNext={next} nextLabel={last ? O.finish : undefined} nextDisabled={last && !charter}>
      {step === 0 && (
        <>
          {person.date_of_birth ? (
            <p className="text-muted-foreground">{Q.dob}: {person.date_of_birth}</p>
          ) : (
            <TextInput id="dob" label={Q.dob} type="date" dir="ltr" value={dob} onChange={setDob} />
          )}
          <Choice label={Q.gender} value={g.gender} onChange={(v) => set("gender", v)}
            options={[{ value: "male", label: Q.genders.male }, { value: "female", label: Q.genders.female }]} />
          <Choice label={Q.marital} value={g.marital_status} onChange={(v) => set("marital_status", v)}
            options={Q.maritalOptions.map((m) => ({ value: m, label: m }))} />
        </>
      )}
      {step === 1 && (
        <>
          <Choice label={Q.party} value={g.party_type} onChange={(v) => set("party_type", v)}
            options={(["alone", "couple", "family", "group"] as const).map((p) => ({ value: p, label: Q.parties[p] }))} />
          {(g.party_type === "family" || g.party_type === "group") && (
            <>
              <TextInput id="adults" label={Q.adults} type="number" dir="ltr" value={String(g.party_adults)}
                onChange={(v) => set("party_adults", Math.max(1, Math.min(30, Number(v) || 1)))} />
              <TextInput id="kids" label={Q.childrenAges} dir="ltr" value={children} onChange={setChildren} />
            </>
          )}
          {showEscort && (
            <>
              <TextInput id="escort" label={Q.escortName} value={g.escort_name ?? ""} onChange={(v) => set("escort_name", v)} />
              <TextInput id="escortPhone" label={Q.escortPhone} type="tel" dir="ltr" value={g.escort_phone ?? ""} onChange={(v) => set("escort_phone", v)} />
            </>
          )}
        </>
      )}
      {step === 2 && (
        <>
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
