import { describe, expect, it } from "vitest";
import { demoAccounts } from "@/lib/demo-accounts";
describe("public demo accounts", () => {
  it("only permits three fixed fictional accounts", () => expect(Object.keys(demoAccounts)).toEqual(["guest", "host", "staff"]));
  it("does not give public demo staff representative or admin privileges", () => expect(demoAccounts.staff.role).toBe("demo_staff"));
  it("guest and host remain separate accounts", () => expect(demoAccounts.guest.id).not.toBe(demoAccounts.host.id));
});