import { t } from "@/i18n";

export const languageOptions = Object.entries(t.languages).map(([value, label]) => ({ value, label }));
export const interestOptions = t.interests.map((i) => ({ value: i, label: i }));
export const regionOptions = t.regions.map((r) => ({ value: r, label: r }));
