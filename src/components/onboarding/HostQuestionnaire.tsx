import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StepFrame } from "./StepFrame";
import { Check, Chips, Choice, TextArea, TextInput } from "./fields";
import { CitySelect } from "./CitySelect";
import { interestOptions, languageOptions } from "./options";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CharterText, HostRulesText } from "@/components/site/HelpContent";
import { supabase } from "@/integrations/supabase/client";
import { friendlyDbError } from "@/lib/db-errors";
import { canSubmitHost, containsContactInfo, isValidIsraeliId, parseAges } from "@/lib/validation";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";
import { t } from "@/i18n";

type H = Tables<"host_profiles">;
type Room = { name: string; beds: number };
const O = t.onboarding;
const Q = t.hostQ;
const num = (v: string, max = 120) => (v === "" ? null : Math.max(0, Math.min(max, Number(v) || 0)));

export function HostQuestionnaire({ person, profile, onDone }: { person: Tables<"persons">; profile: H; onDone: () => void }) {
  const [step, setStep] = useState(Math.min(profile.onboarding_step, Q.steps.length - 1));
  const [h, setH] = useState<H>({ ...profile, family_name: profile.family_name ?? person.last_name });
  const [children, setChildren] = useState(profile.children_ages.join(", "));
  const [rooms, setRooms] = useState<Room[]>([]);
  const [charter, setCharter] = useState(!!profile.charter_accepted_at);
  const [behavior, setBehavior] = useState(!!profile.behavior_rules_accepted_at);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof H>(k: K, v: H[K]) => setH((p) => ({ ...p, [k]: v }));
  const total = Q.steps.length;
  const last = step === total - 1;

  useEffect(() => {
    supabase.from("host_rooms").select("name, beds").eq("host_id", person.id).order("created_at")
      .then(({ data }) => setRooms(data && data.length ? data : [{ name: "", beds: 1 }]));
  }, [person.id]);

  function check(): string | null {
    const blocked = (...xs: (string | null)[]) => xs.some((x) => containsContactInfo(x));
    switch (step) {
      case 0: return h.family_name?.trim() ? null : O.required;
      case 1:
        if (!h.spouse_first_name?.trim()) return O.required;
        return isValidIsraeliId(h.spouse_id_number ?? "") ? null : O.details.invalidId;
      case 2: return h.street_address?.trim() && h.city && h.neighborhood?.trim() ? null : O.required;
      case 3:
        if (!h.family_composition?.trim() || !h.husband_age || !h.wife_age) return O.required;
        return blocked(h.family_composition) ? O.contactBlocked : null;
      case 4:
        if (!h.lodging_description?.trim() || rooms.some((r) => !r.name.trim())) return O.required;
        return blocked(h.lodging_description) ? O.contactBlocked : null;
      case 5: return h.rule_separate_room && h.rule_lockable_door && h.rule_description_visible && h.rule_no_shared_room ? null : O.required;
      case 6: return h.languages.length ? null : O.required;
      case 7: return h.recommender_name?.trim() && h.recommender_role?.trim() && h.recommender_phone?.trim() ? null : O.required;
      case 8:
        if (!h.cannot_provide?.trim()) return O.required;
        return blocked(h.about, h.house_character, h.food_offer, h.cannot_provide, h.kashrut) ? O.contactBlocked : null;
      case 9: return null;
      case 10:
        return canSubmitHost({
          charterAccepted: charter, behaviorAccepted: behavior,
          lodgingRules: [h.rule_separate_room, h.rule_lockable_door, h.rule_description_visible, h.rule_no_shared_room],
          spouseName: h.spouse_first_name ?? "", spouseId: h.spouse_id_number ?? "",
        }) ? null : O.required;
    }
    return null;
  }

  async function next() {
    const err = check();
    if (err) return toast.error(err);
    setBusy(true);
    if (step === 4) {
      await supabase.from("host_rooms").delete().eq("host_id", person.id);
      const { error } = await supabase.from("host_rooms").insert(rooms.map((r) => ({ host_id: person.id, name: r.name.trim().slice(0, 60), beds: r.beds })));
      if (error) { setBusy(false); return toast.error(friendlyDbError(error.message)); }
    }
    const patch: TablesUpdate<"host_profiles"> = {
      family_name: h.family_name, spouse_first_name: h.spouse_first_name, spouse_id_number: h.spouse_id_number,
      street_address: h.street_address, city: h.city, neighborhood: h.neighborhood,
      family_composition: h.family_composition, husband_age: h.husband_age, wife_age: h.wife_age,
      children_ages: parseAges(children), lodging_description: h.lodging_description,
      default_seats: h.default_seats, default_beds: h.default_beds,
      rule_separate_room: h.rule_separate_room, rule_lockable_door: h.rule_lockable_door,
      rule_description_visible: h.rule_description_visible, rule_no_shared_room: h.rule_no_shared_room,
      languages: h.languages, guest_gender_pref: h.guest_gender_pref,
      recommender_name: h.recommender_name, recommender_role: h.recommender_role, recommender_phone: h.recommender_phone,
      interests: h.interests, about: h.about, house_character: h.house_character, kashrut: h.kashrut,
      food_offer: h.food_offer, cannot_provide: h.cannot_provide, preferred_contact: h.preferred_contact,
      onboarding_step: last ? step : step + 1,
    };
    if (last) {
      const now = new Date().toISOString();
      patch.charter_accepted_at = now;
      patch.behavior_rules_accepted_at = now;
      patch.status = "pending";
    }
    const { error } = await supabase.from("host_profiles").update(patch).eq("person_id", person.id);
    if (!error && last) await supabase.from("persons").update({ onboarding_step: "done" }).eq("id", person.id);
    setBusy(false);
    if (error) return toast.error(friendlyDbError(error.message));
    if (last) onDone();
    else setStep(step + 1);
  }

  const L = t.help.lodging;
  return (
    <StepFrame title={Q.steps[step]} step={step} total={total} busy={busy}
      onBack={step > 0 ? () => setStep(step - 1) : undefined}
      onNext={next} nextLabel={last ? O.finish : undefined} nextDisabled={last && !(charter && behavior)}>
      {step === 0 && <TextInput id="fam" label={Q.familyName} value={h.family_name ?? ""} onChange={(v) => set("family_name", v)} />}
      {step === 1 && (
        <>
          <TextInput id="spouse" label={Q.spouseName} value={h.spouse_first_name ?? ""} onChange={(v) => set("spouse_first_name", v)} />
          <TextInput id="spouseId" label={Q.spouseId} dir="ltr" inputMode="numeric" value={h.spouse_id_number ?? ""} onChange={(v) => set("spouse_id_number", v.trim())} />
        </>
      )}
      {step === 2 && (
        <>
          <TextInput id="addr" label={Q.address} hint={Q.addressHint} value={h.street_address ?? ""} onChange={(v) => set("street_address", v)} />
          <CitySelect id="hcity" label={Q.city} value={h.city ?? ""} onChange={(v) => set("city", v)} />
          <TextInput id="nb" label={Q.neighborhood} value={h.neighborhood ?? ""} onChange={(v) => set("neighborhood", v)} />
        </>
      )}
      {step === 3 && (
        <>
          <TextInput id="comp" label={Q.composition} hint={Q.compositionHint} value={h.family_composition ?? ""} onChange={(v) => set("family_composition", v)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput id="ha" label={Q.husbandAge} type="number" dir="ltr" value={h.husband_age?.toString() ?? ""} onChange={(v) => set("husband_age", num(v))} />
            <TextInput id="wa" label={Q.wifeAge} type="number" dir="ltr" value={h.wife_age?.toString() ?? ""} onChange={(v) => set("wife_age", num(v))} />
          </div>
          <TextInput id="kids" label={Q.childrenAges} dir="ltr" value={children} onChange={setChildren} />
        </>
      )}
      {step === 4 && (
        <>
          <p className="text-base font-semibold">{Q.rooms}</p>
          {rooms.map((r, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="flex-1"><TextInput id={`room${i}`} label={Q.roomName} value={r.name} onChange={(v) => setRooms(rooms.map((x, j) => (j === i ? { ...x, name: v } : x)))} /></div>
              <div className="w-24"><TextInput id={`beds${i}`} label={Q.beds} type="number" dir="ltr" value={String(r.beds)} onChange={(v) => setRooms(rooms.map((x, j) => (j === i ? { ...x, beds: num(v, 20) ?? 1 } : x)))} /></div>
              {rooms.length > 1 && <Button variant="ghost" onClick={() => setRooms(rooms.filter((_, j) => j !== i))}>{Q.removeRoom}</Button>}
            </div>
          ))}
          <Button variant="outline" onClick={() => setRooms([...rooms, { name: "", beds: 1 }])}>{Q.addRoom}</Button>
          <TextArea id="lodging" label={Q.lodgingDesc} value={h.lodging_description ?? ""} onChange={(v) => set("lodging_description", v)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput id="seats" label={Q.seats} type="number" dir="ltr" value={String(h.default_seats)} onChange={(v) => set("default_seats", num(v, 30) ?? 0)} />
            <TextInput id="dbeds" label={Q.defaultBeds} type="number" dir="ltr" value={String(h.default_beds)} onChange={(v) => set("default_beds", num(v, 30) ?? 0)} />
          </div>
        </>
      )}
      {step === 5 && (
        <>
          <p>{Q.lodgingRulesIntro}</p>
          <Check id="r1" label={L[0]} checked={h.rule_separate_room} onChange={(v) => set("rule_separate_room", v)} />
          <Check id="r2" label={L[1]} checked={h.rule_lockable_door} onChange={(v) => set("rule_lockable_door", v)} />
          <Check id="r3" label={L[2]} checked={h.rule_description_visible} onChange={(v) => set("rule_description_visible", v)} />
          <Check id="r4" label={L[3]} checked={h.rule_no_shared_room} onChange={(v) => set("rule_no_shared_room", v)} />
        </>
      )}
      {step === 6 && (
        <>
          <Chips label={Q.languages} values={h.languages} options={languageOptions} onChange={(v) => set("languages", v)} />
          <Choice label={Q.genderPref} value={h.guest_gender_pref} onChange={(v) => set("guest_gender_pref", v)}
            options={(["everyone", "families_couples", "women_only", "men_only"] as const).map((p) => ({ value: p, label: Q.genderPrefs[p] }))} />
        </>
      )}
      {step === 7 && (
        <>
          <TextInput id="rn" label={Q.recName} value={h.recommender_name ?? ""} onChange={(v) => set("recommender_name", v)} />
          <TextInput id="rr" label={Q.recRole} value={h.recommender_role ?? ""} onChange={(v) => set("recommender_role", v)} />
          <TextInput id="rp" label={Q.recPhone} type="tel" dir="ltr" value={h.recommender_phone ?? ""} onChange={(v) => set("recommender_phone", v)} />
        </>
      )}
      {step === 8 && (
        <>
          <TextInput id="cp" label={Q.cannotProvide} hint={Q.cannotProvideHint} value={h.cannot_provide ?? ""} onChange={(v) => set("cannot_provide", v)} />
          <Chips label={Q.interests} values={h.interests} options={interestOptions} onChange={(v) => set("interests", v)} />
          <TextArea id="habout" label={Q.about} value={h.about ?? ""} onChange={(v) => set("about", v)} />
          <TextInput id="char" label={Q.character} value={h.house_character ?? ""} onChange={(v) => set("house_character", v)} />
          <TextInput id="kash" label={Q.kashrut} value={h.kashrut ?? ""} onChange={(v) => set("kashrut", v)} />
          <TextInput id="foodo" label={Q.food} value={h.food_offer ?? ""} onChange={(v) => set("food_offer", v)} />
        </>
      )}
      {step === 9 && (
        <Choice label={Q.contact} hint={Q.contactHint} value={h.preferred_contact} onChange={(v) => set("preferred_contact", v)}
          options={[{ value: "whatsapp", label: Q.contacts.whatsapp }, { value: "phone_call", label: Q.contacts.phone_call }]} />
      )}
      {step === 10 && (
        <>
          <Collapsible className="rounded-xl border border-border p-4">
            <CollapsibleTrigger asChild><Button variant="link" className="px-0">{O.readMore}</Button></CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <h3 className="font-bold">{t.help.charterTitle}</h3><CharterText />
              <h3 className="font-bold">{t.help.hostRulesTitle}</h3><HostRulesText />
            </CollapsibleContent>
          </Collapsible>
          <Check id="charter" label={O.charterAccept} checked={charter} onChange={setCharter} />
          <Check id="behavior" label={O.hostRulesAccept} checked={behavior} onChange={setBehavior} />
        </>
      )}
    </StepFrame>
  );
}
