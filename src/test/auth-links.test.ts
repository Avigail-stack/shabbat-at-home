import { describe, it, expect } from "vitest";
import { parseAuthLink } from "@/lib/auth-links";

describe("parseAuthLink", () => {
  it("reads implicit recovery hash", () => {
    const p = parseAuthLink("", "#access_token=x&type=recovery");
    expect(p.accessToken).toBe("x");
    expect(p.type).toBe("recovery");
  });
  it("reads PKCE code", () => expect(parseAuthLink("?code=abc", "").code).toBe("abc"));
  it("reads expired-link error", () => expect(parseAuthLink("", "#error=access_denied&error_code=otp_expired").error).toBe("access_denied"));
});
