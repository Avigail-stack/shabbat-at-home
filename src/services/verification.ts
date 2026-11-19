import { supabase } from "@/integrations/supabase/client";
export type VerificationResult = { ok: boolean; providerRef: string; attempts: number; status: string };

export interface VerificationProvider {
  start(personId: string): Promise<{ sessionUrl: string | null }>;
  check(personId: string, input: { idPhoto: boolean; selfie: boolean; fail: boolean }): Promise<VerificationResult>;
}

export const mockVerificationProvider: VerificationProvider = {
  async start() {
    return { sessionUrl: null };
  },
  async check(personId, input) {
    const { data, error } = await supabase.rpc("submit_mock_identity", { _fail: input.fail, _has_id_photo: input.idPhoto, _has_selfie: input.selfie });
    if (error) throw new Error(error.message);
    return { ok: data.status === "passed", providerRef: `mock-${personId.slice(0, 8)}`, attempts: data.attempts, status: data.status };
  },
};
export const verificationProvider: VerificationProvider = mockVerificationProvider;
