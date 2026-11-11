import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export function Field({ id, label, hint, children }: { id?: string; label: string; hint?: string | undefined; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-base font-semibold">{label}</Label>
      {children}
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function TextInput(props: { id: string; label: string; hint?: string | undefined; value: string; onChange: (v: string) => void; type?: string; dir?: "ltr" | "rtl"; inputMode?: "numeric" | "tel" | "text" }) {
  return (
    <Field id={props.id} label={props.label} hint={props.hint}>
      <Input id={props.id} type={props.type ?? "text"} dir={props.dir} inputMode={props.inputMode} className="h-11 text-base" value={props.value} onChange={(e) => props.onChange(e.target.value)} />
    </Field>
  );
}

export function TextArea(props: { id: string; label: string; hint?: string | undefined; value: string; onChange: (v: string) => void }) {
  return (
    <Field id={props.id} label={props.label} hint={props.hint}>
      <Textarea id={props.id} rows={4} maxLength={1000} className="text-base" value={props.value} onChange={(e) => props.onChange(e.target.value)} />
    </Field>
  );
}

/** Single choice as large pill buttons (radio group). */
export function Choice<T extends string>({ label, value, options, onChange, hint }: { label: string; value: T | null; options: { value: T; label: string; hint?: string }[]; onChange: (v: T) => void; hint?: string }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-base font-semibold">{label}</legend>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      <div role="radiogroup" className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "min-h-11 rounded-full border px-4 py-2 text-base transition-colors",
              value === o.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-secondary",
            )}
          >
            {o.label}
            {o.hint && <span className="block text-xs opacity-80">{o.hint}</span>}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function Chips({ label, values, options, onChange }: { label: string; values: string[]; options: { value: string; label: string }[]; onChange: (v: string[]) => void }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-base font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = values.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? values.filter((v) => v !== o.value) : [...values, o.value])}
              className={cn(
                "min-h-11 rounded-full border px-4 py-2 text-base transition-colors",
                on ? "border-primary bg-secondary font-semibold text-primary" : "border-border bg-card hover:bg-secondary",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function Check({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-3">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} className="mt-1 h-5 w-5" />
      <span>{label}</span>
    </label>
  );
}
