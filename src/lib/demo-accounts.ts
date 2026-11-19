export const demoAccounts = {
  guest: { id: "809f85d8-4640-4860-badc-45cba7b5fb4a", email: "guest@demo.shabbat-babayit.example", role: "guest" },
  host: { id: "ed5895e3-934e-4220-91a1-f70cc937103c", email: "host@demo.shabbat-babayit.example", role: "host" },
  staff: { id: "2f79a37c-468f-4bf5-90c4-c0adef2190cc", email: "staff@demo.shabbat-babayit.example", role: "demo_staff" },
} as const;
export type DemoSide = keyof typeof demoAccounts;