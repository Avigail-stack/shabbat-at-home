# שבת בבית — Phase 1 plan

## 0. Blocking decision first
Earlier you said: do not enable Lovable Cloud; you will connect your own Supabase later. Phase 1 needs a database, sign-in and storage. I need one of these before I start:
- **A.** You connect your own Supabase (Settings → General → External Supabase) before Phase 1. I write migrations and policies against it. (Recommended, since it matches your plan.)
- **B.** I build all screens against a typed data layer with in-memory mock data, and add SQL migration files you apply later. Nothing saves for real until then.
- **C.** Enable Lovable Cloud after all. (This goes against your earlier instruction, so I won't do it unless you ask.)

The plan below assumes **A**.

## 1. Build steps (Phase 1)
1. **Foundations:** design tokens (navy, gold, success/warning/danger, card border, 17px base, 12–16px radius), a candles logo mark, one Hebrew strings file (`src/i18n/he.ts`), a shared layout and footer with "כניסת צוות". Keep the placeholder fonts and colors.
2. **Database:** one migration for the whole data model (section 2 below), with RLS, grants, enums, security-definer helpers and a seat-locking confirm function.
3. **Provider interfaces:** `NotificationService` (whatsapp/sms/voice/email/inbox adapters), `PhoneOtpProvider` (sms/voice), `VerificationProvider`. All are mocks that write to `notifications` / the mock log.
4. **Public pages:** landing (`/`), help (`/help`, sections 8–9), `/auth` (Google + email/password, forgot and reset password).
5. **Onboarding wizard** (`/onboarding/*`): phone + method choice → code (any 6 digits) → basic details and channel → role → step-by-step questionnaire with progress bar, saved after every step → charter → finish screen. A guest goes to matching invitations; a host sees the "תודה" screen.
6. **Personal area:** profile switcher, inbox, "ההעדפות שלי", settings.
7. **Host area:** tabs היענויות / לוח השבתות / היסטוריה; add a Shabbat (3-month list); cancel, reopen or delete it; accept with the contact-method dialog; decline with a reason; seat counter and "מלאה"; pending-approval banner.
8. **Guest area:** filters, a ranked list with match reasons, host page, personal message (contact info blocked), "אשמח להגיע" → mock ID+selfie check (one retry, then the staff queue), "x מתוך 3" with hours left, confirmed page (wa.me / tel), cancellation, feedback form, flag button.
9. **Admin area** (`/admin`): login with email + password + mock one-time code, server-checked role gate, dashboard with counts, host approval queue, guest verification queue, all users plus user page plus restriction actions, hostings plus attention tags, hostings report plus CSV export, partial registrations, message log, staff invitations (admin only).
10. **Seed data** in a migration (families, guests, staff, Shabbatot from 7.11.2026).
11. **Tests:** charter gate, 3-response cap, double-booking lock, contact-info blocker, under-18 block, `/admin` denied to non-staff.

## 2. Database
**Roles:** enum `app_role` = `guest`, `host`, `rep`, `admin` in `user_roles` (user_id, role). Helpers: `has_role()`, `is_staff()`. Guest and host are also kept in `user_roles`, so both profiles can coexist.

**Tables:** `persons` (linked to the login account, with unique ID number and unique phone), `guest_profiles`, `host_profiles`, `host_rooms`, `verifications`, `availability`, `requests`, `responses`, `hostings`, `feedback`, `flags`, `restrictions`, `appeals`, `notifications`, `audit_log`, `staff_invitations`, `invite_links` (empty until Phase 2), `community_events` (empty), `app_settings` (feature flags and weights), `shabbatot` (date, parsha, start and end times), `onboarding_progress`, `blocked_identity_attempts`. Plus a private storage bucket `id-documents` (staff only; every view is logged through a server function).

**Privacy:** the address and phone are never readable directly by the other side. Server functions or a view return them only when a confirmed hosting exists.

**Confirm:** "מחכים לך" runs as one database function. It locks the availability row, checks seats and the minimum verification level, creates the hosting, withdraws the guest's other responses, and closes the request.

## 3. Assumptions and unclear points
1. **Backend:** contradiction with your earlier "no Cloud" instruction (section 0). The spec also says "edge functions", but this stack uses server functions instead. I assume server functions.
2. **Person vs. account:** I assume one login account = one person.
3. **Staff accounts:** they have no person record, but they do log in.
4. **Admin one-time code:** I assume the code goes by email (mock in Phase 1). Built-in authenticator-app codes are an alternative.
5. **Parshiot:** I'll use a hardcoded table (seeded up to about 3 months ahead), not a calendar library. Holidays and double parshiot will be entered by hand. Please confirm the dates.
6. **24-hour timer:** The scheduled timer is Phase 2. In Phase 1, I compute "hours left" and expire responses when the page loads, without the Shabbat pause. Should the Shabbat pause be computed already?
7. **Host on the browse page:** the spec says "family name" on the browse card but "first names" on the host page. I assume the family name is OK before confirmation.
8. **Distance:** computed from a fixed city → coordinates table (no maps service).
9. **Ranking:** a simple weighted score. Feedback weight goes in `app_settings`.
10. **Age range:** shown to hosts in 5-year bands.
11. **Groups:** "group" party size and the minors rule. I'll store the escort but not enforce verification of each member in Phase 1.
12. **Spouse ID required:** this assumes every host is a married couple. What about single or widowed hosts?
13. **Google sign-in:** needs setup in your Supabase project. Will you provide it?
14. **Approval / request more details:** only email + inbox (mock) messages.
15. **Right of reply and appeals:** Phase 2 per section 13, but the "permanent block" action is Phase 1. I assume the block is applied immediately and the appeal UI comes later.
16. **Audit-log viewer:** Phase 2, but Phase 1 already writes the entries.
17. **Placeholder staff emails:** what are the real addresses for invites? Seeded staff can't log in without a real password-set flow.
18. **Meals:** the feature flag is off, so the UI shows only "full Shabbat with lodging".

## 4. Risks / too big for one pass
- Phase 1 is roughly 40+ screens. I propose building it in 4 passes, each one usable:
  1. foundations + database + public pages + sign-up and onboarding
  2. host and guest flows + notifications
  3. admin area
  4. seed data, reports, tests and polish
- **The confirm transaction and seat locking:** the highest-risk logic. I'll cover it with a test.
- **Privacy:** staged reveal through RLS, where one wrong policy leaks addresses. I'll use dedicated functions instead of broad SELECT policies.
- **Contact-info blocker:** this blocks phones, emails, links and street addresses. Street addresses in Hebrew can't be detected reliably. I'll use a best-effort pattern list.
- **Admin isolation:** the role is checked in every admin server function, not just in the page guard.
- **Seed users:** creating real login accounts through a migration is fragile. I may seed persons and profiles linked to placeholder accounts that can't log in.
