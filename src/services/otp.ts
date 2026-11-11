import { supabase } from "@/integrations/supabase/client";

export type OtpMethod = "sms" | "voice";

/** Phone verification provider. Swap the mock for a real SMS/voice provider later. */
export interface PhoneOtpProvider {
  send(phone: string, method: OtpMethod): Promise<void>;
  verify(phone: string, code: string): Promise<void>;
}

/** Phase 1 mock: logs the "sent" code to the message log and accepts any 6 digits. */
export const mockOtpProvider: PhoneOtpProvider = {
  async send(phone, method) {
    const { error } = await supabase.rpc("request_phone_code", { _phone: phone, _method: method });
    if (error) throw new Error(error.message);
  },
  async verify(phone, code) {
    const { error } = await supabase.rpc("verify_phone_code", { _phone: phone, _code: code });
    if (error) throw new Error(error.message);
  },
};

export const otpProvider: PhoneOtpProvider = mockOtpProvider;
