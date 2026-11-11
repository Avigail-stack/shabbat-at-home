/** Guest identity check (ID + selfie) through an external provider. Wired into the response flow in pass 2. */
export type VerificationResult = { ok: boolean; providerRef: string };

export interface VerificationProvider {
  start(personId: string): Promise<{ sessionUrl: string | null }>;
  check(personId: string): Promise<VerificationResult>;
}

export const mockVerificationProvider: VerificationProvider = {
  async start() {
    return { sessionUrl: null };
  },
  async check(personId) {
    return { ok: true, providerRef: `mock-${personId.slice(0, 8)}` };
  },
};
