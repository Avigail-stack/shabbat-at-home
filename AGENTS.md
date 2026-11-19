<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Invitation reads use authenticated safe-projection database functions, never direct guest reads of host profiles; eligibility and response limits are checked transactionally in the database.
- Ranking uses a pure shared scoring module and settings weights; absent host familiarity/life-stage/character preference data is neutral rather than invented, with feedback counted from guest overall answers after hosted visits.
- Availability mutations use owner-checked database functions; confirmed hosting changes must go through hosting cancellation so seats and guest requests stay consistent.
- Pre-account phone verification uses a one-hour HttpOnly cookie backed by a hashed, single-use Supabase proof; authenticated claiming avoids exposing phone proof tokens to browser scripts.
- Identity verification is account-wide before role selection; an owner-locked database action caps the portfolio mock at three attempts and persists manual-review state without storing photos.
- All UI strings live in `src/i18n/he.ts` (accessed via `t` from `@/i18n`); more languages are added as sibling files.
- External providers (OTP, notifications, identity verification) sit behind interfaces in `src/services/`; Phase 1 uses mocks so real providers plug in without touching screens.
- Shared hosting-default controls are reused by questionnaires and weekly preferences so full-Shabbat lodging behavior stays consistent.
- Legacy lodging-description and feedback-follow-up columns are compatibility-only and not used by the application; database triggers clear them on writes.
- Every business rule is enforced twice: client mirror in `src/lib/validation.ts` and database triggers/functions (the database is authoritative).
- Guest companions are saved atomically through an invoker database function; triggers validate relations/IDs and derive adult totals from companion rows while minors use a count.
- Roles live only in `public.user_roles`; staff (rep/admin) have no `persons` row and get their role only after confirming an invited email (`staff_invitations`).
- Public demo sign-in is restricted to fixed seeded user IDs/emails and exactly their expected roles; demo_staff is isolated from rep/admin privileges to protect existing accounts.
- Demo session issuance uses fresh per-request privileged and token-verification clients so no shared client can inherit a demo session.
- Preferences reuse questionnaire editing mode without identity/date-of-birth writes or status changes; weekly guest acknowledgements persist Sunday week-start dates in Israel time through an owner-only invoker function.
- Guests never read `host_profiles` directly; staged reveal of address/phone goes through dedicated SECURITY DEFINER functions.
- Requests/responses/hostings are written only through database functions (seat locking in one transaction), so users have read-only grants on them.
- The connected Supabase project does not auto-expose tables: every new table needs explicit, minimal GRANTs plus RLS policies.
- Hosting confirmation serializes on the guest then availability then response; a partial unique guest/date index prevents concurrent double bookings.
- Contact projections are participant-scoped and confirmed-only; decline reasons and cancellation attention fields have no ordinary-user column grants.
- Cancellation candle times come from bundled Hebcal using city coordinates; only an authenticated, participant-authorized server handler may invoke the service-role-only timing write.
- Response retries create separate historical requests; cancelled acceptances are joined by response ID so later bookings never overwrite their history.
