import {describe,it,expect} from "vitest";
import {attentionThresholdReached,attentionThresholds,attentionDue,validAttentionAction,validStaffHostingAction} from "@/lib/validation";
import {filterHostings,csvCell,hostingCsv,type ReportHosting} from "@/lib/staff-report";
import {simulatedHavdalah,deferredUntil} from "@/lib/sacred-time";
describe("staff attention rules",()=>{
 it("two late cancellations reach threshold",()=>{expect(attentionThresholdReached("late",1)).toBe(false);expect(attentionThresholdReached("late",2)).toBe(true);});
 it("late means below 72 hours over three months",()=>{expect(attentionThresholds.late_hours).toBe(72);expect(attentionThresholds.late_months).toBe(3);});
 it("three guest declines reach threshold",()=>{expect(attentionThresholdReached("declined",2)).toBe(false);expect(attentionThresholdReached("declined",3)).toBe(true);});
 it("four unanswered host responses reach threshold",()=>{expect(attentionThresholdReached("unanswered",3)).toBe(false);expect(attentionThresholdReached("unanswered",4)).toBe(true);});
 it("response counts use two months",()=>expect(attentionThresholds.response_months).toBe(2));
 it("target is Tuesday end after Shabbat",()=>expect(attentionDue("2026-11-21").toISOString()).toBe("2026-11-24T21:59:59.999Z"));
 it("Tuesday target follows Israel summer time",()=>expect(attentionDue("2027-06-05").toISOString()).toBe("2027-06-08T20:59:59.999Z"));
 it("closing requires note",()=>expect(validAttentionAction("close"," ")).toBe(false));
 it("partial needs result and action",()=>{expect(validAttentionAction("close","note",true)).toBe(false);expect(validAttentionAction("close","note",true,"charter","warning")).toBe(true);});
 it("phone contact can be recorded without closing",()=>expect(validAttentionAction("called","")).toBe(true));
 it("staff cancellation requires reason",()=>{expect(validStaffHostingAction("cancel","")).toBe(false);expect(validStaffHostingAction("cancel","reason")).toBe(true);});
 it("simulation lands after havdalah",()=>{const d=simulatedHavdalah(new Date("2026-11-19T12:00:00Z"));expect(d.toISOString().slice(0,10)).toBe("2026-11-21");expect(deferredUntil(d)).toBeNull();});
});
describe("staff report",()=>{
 const row:ReportHosting={id:"1",guest_id:"g",host_id:"h",guest_name:"Test guest",host_name:"Test host",shabbat_date:"2026-11-21",parsha:"test",party_size:2,guest_city:"A",host_city:"B",status:"confirmed",cancel_reason:null,cancel_note:null,staff_notes:null,tags:[]};
 const filters={from:"2026-11-20",to:"2026-11-22",city:"B",status:"confirmed",name:"guest"};
 it("filters the same rows for display and export",()=>{expect(filterHostings([row],filters)).toHaveLength(1);expect(filterHostings([row],{...filters,city:"C"})).toHaveLength(0);expect(filterHostings([row],{...filters,from:"2026-11-22"})).toHaveLength(0);expect(filterHostings([row],{...filters,status:"cancelled_staff"})).toHaveLength(0);});
 it("escapes quotes and commas",()=>expect(csvCell('a,"b')).toBe('"a,""b"'));
 it("neutralizes spreadsheet formulas",()=>expect(csvCell("=HYPERLINK(x)")).toBe('"\'=HYPERLINK(x)"'));
 it("includes UTF-8 BOM and rows",()=>expect(hostingCsv(["name"],[["guest"]])).toBe('\uFEFF"name"\r\n"guest"'));
});