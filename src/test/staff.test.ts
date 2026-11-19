import {describe,expect,it} from "vitest";
import {staffScopeAllowed,validStaffReview} from "@/lib/validation";
import {demoAccounts} from "@/lib/demo-accounts";
describe("staff scope",()=>{
  it("demo staff operates as a limited representative",()=>expect(staffScopeAllowed("demo_staff",demoAccounts.staff.id,demoAccounts.host.id)).toBe(true));
  it("demo staff cannot reach other people",()=>expect(staffScopeAllowed("demo_staff",demoAccounts.staff.id,"cb1c9dd3-2c07-4d55-96b1-6b6cca38b73a")).toBe(false));
  it("a forged demo role on another account cannot enter",()=>expect(staffScopeAllowed("demo_staff",demoAccounts.guest.id)).toBe(false));
  it("representatives have staff scope",()=>expect(staffScopeAllowed("rep","staff","person")).toBe(true));
});
describe("staff decisions",()=>{
  for(const action of ["close","reject_host","more_info","verify","reject_identity","freeze","unfreeze","suspend"]) it(`${action} requires a reason`,()=>expect(validStaffReview(action," ")).toBe(false));
  it("claim needs no closing note",()=>expect(validStaffReview("claim","")).toBe(true));
  it("approval requires both checks",()=>{expect(validStaffReview("approve","",undefined,true,false)).toBe(false);expect(validStaffReview("approve","",undefined,true,true)).toBe(true)});
  it("suspension requires a future date",()=>{expect(validStaffReview("suspend","reason","2026-11-18T00:00:00Z",false,false,new Date("2026-11-19"))).toBe(false);expect(validStaffReview("suspend","reason","2026-12-01T00:00:00Z",false,false,new Date("2026-11-19"))).toBe(true)});
  for(const action of ["block","manage_staff","settings"]) it(`this pass exposes no ${action}`,()=>expect(validStaffReview(action,"reason")).toBe(false));
});