import { describe, it, expect } from "vitest";
import { revealedCount, buttonVisible, parseRole } from "./stack-reveal";
describe("stack reveal", () => {
  it("shows card 1 on entry and all 4 at the end", () => {
    expect(revealedCount(0, 4)).toBe(1);
    expect(revealedCount(0.3, 4)).toBe(2);
    expect(revealedCount(1, 4)).toBe(4);
  });
  it("button appears only after the last card", () => {
    expect(buttonVisible(0.76, 4)).toBe(false);
    expect(buttonVisible(0.9, 4)).toBe(true);
  });
  it("accepts only guest/host roles", () => {
    expect(parseRole("host")).toBe("host");
    expect(parseRole("admin")).toBeUndefined();
  });
});
