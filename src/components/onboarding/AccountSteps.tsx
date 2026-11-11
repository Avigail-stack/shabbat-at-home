import { useState } from "react";
import { toast } from "sonner";
import { StepFrame } from "./StepFrame";
import { Choice, TextInput } from "./fields";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { otpProvider, type OtpMethod } from "@/services/otp";
import { supabase } from "@/integrations/supabase/client";
import { friendlyDbError } from "@/lib/db-errors";
import { PHONE_RE, OTP_RE, isValidIsraeliId, containsContactInfo } from "@/lib/validation";
import type { Tables } from "@/integrations/supabase/types";
import { t } from "@/i18n";

type Person = Tables<"persons">;
const O = t.onboarding;

export function PhoneStep({ onDone }: { onDone: () => void }) {
  const P = O.phone;
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<OtpMethod | null>(null);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const clean = phone.replace(/\D/g, "");

  async function send(m: OtpMethod) {
    if (!PHONE_RE.test(clean)) return void toast.error(P.invalidPhone);
    setBusy(true);
    try {
      await otpProvider.send(clean, m);
      setMethod(m);
      setSent(true);
      setCode("");
    } catch (e) {
      toast.error(friendlyDbError((e as Error).message));
    } finally {
      setBusy(false);
    }
  }
  async function verify() {
    if (!OTP_RE.test(code)) return void toast.error(P.invalidCode);
    setBusy(true);
    try {
      await otpProvider.verify(clean, code);
      onDone();
    } catch (e) {
      toast.error(friendlyDbError((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  if (sent && method) {
    const other: OtpMethod = method === "sms" ? "voice" : "sms";
    return (
      <StepFrame title={P.codeTitle} onBack={() => setSent(false)} onNext={verify} nextLabel={P.verify} busy={busy} nextDisabled={code.length !== 6}>
        <p>{method === "sms" ? P.codeSentSms(clean) : P.codeSentVoice(clean)}</p>
        <div dir="ltr" className="flex justify-center">
          <InputOTP maxLength={6} value={code} onChange={setCode} inputMode="numeric" aria-label={P.codeTitle}>
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} className="h-12 w-11 text-lg" />)}
            </InputOTPGroup>
          </InputOTP>
        </div>
        <p className="rounded-xl bg-warning-bg p-3 text-sm text-warning">{P.mockNote}</p>
        <Button variant="link" onClick={() => send(other)} disabled={busy}>
          {P.switch} ({other === "sms" ? P.sms : P.voice})
        </Button>
      </StepFrame>
    );
  }
  return (
    <StepFrame title={P.title}>
      <p className="text-muted-foreground">{P.text}</p>
      <TextInput id="phone" label={P.label} value={phone} onChange={setPhone} type="tel" dir="ltr" inputMode="tel" />
      <p className="font-semibold">{P.howTitle}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button size="lg" variant="outline" onClick={() => send("sms")} disabled={busy}>{P.sms}</Button>
        <Button size="lg" variant="outline" onClick={() => send("voice")} disabled={busy}>{P.voice}</Button>
      </div>
      <p className="text-sm text-muted-foreground">{P.voiceHint}</p>
    </StepFrame>
  );
}

export function DetailsStep({ person, onDone }: { person: Person; onDone: () => void }) {
  const D = O.details;
  const [first, setFirst] = useState(person.first_name ?? "");
  const [last, setLast] = useState(person.last_name ?? "");
  const [email, setEmail] = useState(person.email ?? "");
  const [idNum, setIdNum] = useState(person.id_number ?? "");
  const [channel, setChannel] = useState<Person["notification_channel"]>(person.notification_channel);
  const [busy, setBusy] = useState(false);
  const idLocked = !!person.id_number;

  async function save() {
    if (!first.trim() || !last.trim() || !email.trim() || !channel) return void toast.error(O.required);
    if (containsContactInfo(first) || containsContactInfo(last)) return void toast.error(O.contactBlocked);
    if (!idLocked && !isValidIsraeliId(idNum.trim())) return void toast.error(D.invalidId);
    setBusy(true);
    const patch: Partial<Person> = {
      first_name: first.trim().slice(0, 50),
      last_name: last.trim().slice(0, 50),
      email: email.trim().slice(0, 255),
      notification_channel: channel,
      onboarding_step: "role",
    };
    if (!idLocked) patch.id_number = idNum.trim();
    const { error } = await supabase.from("persons").update(patch).eq("id", person.id);
    setBusy(false);
    if (error) return void toast.error(friendlyDbError(error.message));
    onDone();
  }

  return (
    <StepFrame title={D.title} onNext={save} busy={busy}>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput id="first" label={D.firstName} value={first} onChange={setFirst} />
        <TextInput id="last" label={D.lastName} value={last} onChange={setLast} />
      </div>
      <TextInput id="email" label={D.email} value={email} onChange={setEmail} type="email" dir="ltr" />
      {idLocked ? (
        <p className="text-muted-foreground">{D.idNumber}: {person.id_number}</p>
      ) : (
        <TextInput id="idnum" label={D.idNumber} hint={D.idHint} value={idNum} onChange={setIdNum} dir="ltr" inputMode="numeric" />
      )}
      <Choice
        label={D.channelTitle}
        hint={D.channelHint}
        value={channel}
        onChange={setChannel}
        options={[
          { value: "whatsapp", label: O.channels.whatsapp },
          { value: "sms", label: O.channels.sms },
          { value: "voice", label: O.channels.voice },
        ]}
      />
    </StepFrame>
  );
}

export function RoleStep({ person, onDone }: { person: Person; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  async function pick(role: "guest" | "host") {
    setBusy(true);
    const r1 = await supabase.from("user_roles").upsert({ user_id: person.id, role }, { onConflict: "user_id,role", ignoreDuplicates: true });
    const table = role === "guest" ? "guest_profiles" : "host_profiles";
    const r2 = await supabase.from(table).upsert({ person_id: person.id }, { onConflict: "person_id", ignoreDuplicates: true });
    const r3 = await supabase.from("persons").update({ onboarding_step: role }).eq("id", person.id);
    setBusy(false);
    const err = r1.error ?? r2.error ?? r3.error;
    if (err) return void toast.error(friendlyDbError(err.message));
    onDone();
  }
  return (
    <StepFrame title={O.role.title}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Button size="lg" className="min-h-28 text-xl" onClick={() => pick("guest")} disabled={busy}>{O.role.guest}</Button>
        <Button size="lg" variant="gold" className="min-h-28 text-xl" onClick={() => pick("host")} disabled={busy}>{O.role.host}</Button>
      </div>
    </StepFrame>
  );
}
