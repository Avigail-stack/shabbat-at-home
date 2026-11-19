# Roadmap — שבת בבית

## Pass 2d
- [x] Transactional confirmation, seat lock, double-booking prevention and private contact reveal
- [x] Guest/host hosting pages, candle-lighting, contact links and host reminders
- [x] Decline with staff-only reason; cancellation, returned seats, reopened request and urgent/late records
- [x] Unit tests and final demo-account browser check (confirmation, both contact methods, decline and both cancellation sides)

## Pass 2c
- [x] Host tabs/calendar, add/cancel/reopen/delete, last-used type, no countdown, reminder slot
- [x] Guest filters, safe invitation detail, response message/three limit/24h expiry
- [x] Mandatory eligibility and weighted ranking; Thursday Israel-time cutoff (uncollected soft preferences neutral)
- [x] Extend Shabbat dates and seed four demo invitations
- [x] Unit tests and one final demo browser check

## Pass 2b
- [x] Phone before account, short-lived verified-phone proof, email/Google account linking
- [x] Identity photo + selfie mock, three attempts and persistent manual-review waiting state
- [x] Enforce phone → identity → details → role → questionnaire/charter; preserve demo access
- [x] Unit tests; browser verified phone-first registration
- [ ] Complete guest sign-up browser verification — blocked by Supabase email send rate limit; Google provider not configured

## Pass 2a — small, self-contained steps
- [x] Fixed demo warning on every page
- [x] Meals enabled; saved hosting-unit/lodging defaults in both questionnaires; conditional lodging commitments
- [x] Guest companions (adult ID + spouse/child relation; minor count; owner/staff access); remove groups from UI
- [x] Host split address; two recommenders or staff video/phone call; remove lodging description
- [x] Lodging badge only on guest invitation surfaces
- [x] Remove feedback follow-up consent usage (no feedback screen yet; compatibility column forced false)
- [x] Three fictional demo accounts and quick sign-in buttons (demo staff isolated from rep/admin powers)
- [x] Editable questionnaire preferences (exclude personal ID/date of birth)
- [x] Guest-only weekly dialog with saved defaults and food preferences

- [x] Pass 1: foundations, full database, public pages, sign-up + onboarding
- [x] Pass 1: staff invitation for 6799027@gmail.com (admin) — email sent; staff login screen comes in pass 3
- [ ] Pass 2: host and guest flows, notifications
  - [x] Email links (recovery/confirm/invite, hash + PKCE + token_hash, Hebrew expired-link error)
  - [x] Settings: channel, password, host contact method
  - [x] "ההעדפות שלי" (edit questionnaire answers)
  - [x] Host area tabs, guest area, confirmation/decline/cancellation
  - [ ] Notifications/inbox, feedback + flag — deferred to next pass
- [ ] Pass 3: admin area (staff login, queues, users, hostings, report, logs)
- [ ] Pass 4: seed families/guests, tests, polish
