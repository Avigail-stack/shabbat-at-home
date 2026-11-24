/** Pure scroll → reveal mapping for the home "how it works" card stack. */
export function revealedCount(progress: number, total: number): number {
  if (total <= 0) return 0;
  const p = Math.min(1, Math.max(0, progress));
  // Card 1 shows as soon as the section is entered; the rest split the remaining scroll.
  return Math.min(total, 1 + Math.floor(p * total));
}
export function buttonVisible(progress: number, total: number): boolean {
  return revealedCount(progress, total) >= total && progress >= (total - 1) / total + 0.5 / total;
}
export function preferredRoleKey() { return "shabbat.preferredRole"; }
export function parseRole(v: unknown): "guest" | "host" | undefined {
  return v === "guest" || v === "host" ? v : undefined;
}
