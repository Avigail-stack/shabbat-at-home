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
- All UI strings live in `src/i18n/he.ts` (accessed via `t` from `@/i18n`); more languages are added as sibling files.
- External providers (OTP, notifications, identity verification) sit behind interfaces in `src/services/`; Phase 1 uses mocks so real providers plug in without touching screens.
- Every business rule is enforced twice: client mirror in `src/lib/validation.ts` and database triggers/functions (the database is authoritative).
- Roles live only in `public.user_roles`; staff (rep/admin) have no `persons` row and get their role only after confirming an invited email (`staff_invitations`).
- Guests never read `host_profiles` directly; staged reveal of address/phone goes through dedicated SECURITY DEFINER functions.
- Requests/responses/hostings are written only through database functions (seat locking in one transaction), so users have read-only grants on them.
- The connected Supabase project does not auto-expose tables: every new table needs explicit, minimal GRANTs plus RLS policies.
