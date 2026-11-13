# Email sign-in through Resend

The game already uses Supabase `signInWithOtp` for email links. Supabase verifies
the link and issues the session; the server maps that verified user to a managed
in-game wallet. Resend is the SMTP delivery provider, not a second authentication
system. No Resend SDK or API key belongs in the browser or Render runtime.

**Status — November 13:** `aftmarket.xyz` was verified for sending through the
Resend API before SMTP was applied to Supabase project `ytfioiujcitikvgbfxwg`.
The hosted email form sent one authorized test; Resend reported `delivered`.
Opening that actual email's Supabase verification link returned to the game,
created/loaded the managed identity and retained it after reload. A fresh guest
still entered successfully. [Redacted verification](EMAIL_VERIFICATION.json).
Physical inbox placement and a second physical device remain unverified. Google
was disabled before and after setup; no OAuth provider settings were changed.

## Set up the sending domain

1. Add `aftmarket.xyz` in Resend Domains and install its supplied DNS records at
   the domain's DNS provider. Use the actual records Resend generates. Wait for
   verified sending status; pointing the web domain to Render does not verify email.
2. Use **Aftermarket <play@aftmarket.xyz>** as the sender. Disable click tracking
   for authentication emails so link scanners/tracking do not rewrite sign-in URLs.
3. Create the Resend API key privately. The automatic setup checks domain status
   using the Resend domains API, so it needs a full-access local key. With a
   sending-only key, use the dashboard setup below instead.

## Automatic setup

Add these to the ignored local `.env`, never Git or chat:

```dotenv
RESEND_API_KEY=
SUPABASE_ACCESS_TOKEN=
AUTH_EMAIL_FROM=play@aftmarket.xyz
```

`SUPABASE_ACCESS_TOKEN` is a personal management token with permission to configure
this project, not its publishable, service-role or database key. The project is
derived from the existing `SUPABASE_URL`.

```sh
npm run email:configure
npm run email:configure:apply
```

The first command checks the project and verified domain without writes. Applying requires a verified sender
domain, configures Resend SMTP, enables email links, keeps email confirmation on,
sets `https://aftmarket.xyz` as Site URL and adds its exact root callbacks while
preserving existing redirect entries. Unrelated OAuth providers, templates and
rate limits are preserved. Settings are read back; this is not proof of delivery.
The script prints neither keys nor full provider responses. Remove the management
token from the environment after setup if it is no longer needed.

### Windows PowerShell argument forwarding

The installed PowerShell `npm.ps1` wrapper was observed dropping `--apply` from
`npm run email:configure -- --apply`, leaving Node in its safe preview default.
`npm.cmd` forwarded the same argument correctly. The dedicated apply command
puts `--apply` inside `package.json`, so it does not depend on forwarding flags.
If PowerShell blocks `npm.ps1` under its execution policy, use:

```powershell
npm.cmd run email:configure
npm.cmd run email:configure:apply
```

Direct equivalents are `node scripts/configure-email.cjs` and
`node scripts/configure-email.cjs --apply`. The local `.env` is resolved from the
script directory, not the caller's working directory. Existing shell variables
take precedence, and the script refuses a project other than Aftermarket's.

## Dashboard alternative

In the Supabase project, **Authentication → Email → SMTP Settings**, enable custom
SMTP and set:

| Setting | Value |
|---|---|
| Sender email / name | `play@aftmarket.xyz` / `Aftermarket` |
| Host / port | `smtp.resend.com` / `465` |
| Username | `resend` |
| Password | Private Resend API key |

Under **Authentication → URL Configuration**, set Site URL to
`https://aftmarket.xyz` and allow `https://aftmarket.xyz` and
`https://aftmarket.xyz/`. Preserve required local/staging URLs; avoid production
wildcards. Enable Email, keep Confirm email enabled and keep magic links enabled.
Review Auth rate limits for expected judging traffic rather than disabling limits.

## Verify actual delivery and login

1. Open the hosted game in a fresh browser, enter an inbox you control and choose
   **Email me a sign-in link** once. A successful API response means accepted for
   delivery, not received.
2. Check Resend delivery logs and the inbox/spam folder. Open the latest link in
   the same browser. It should return to `aftmarket.xyz` and open a saved island.
3. Reload, verify progress persists, then request a link on a second device and
   verify the same player identity. Do not screenshot or log the link or tokens.
4. If rejected, inspect Supabase Auth/Resend delivery logs privately: DNS/domain,
   SMTP credentials, recipient suppression and rate limits are separate causes.

One authorized test email was sent and its single-use verification link consumed
by the browser check. The recipient, link and session tokens are excluded from
public evidence. Request a fresh link for another personal sign-in. Existing
guest islands are not automatically merged into a new email account.

Email alone satisfies the Track 9 example's **social or email** option. Finish
inbox/callback verification before adding Google. X sign-in adds another OAuth
setup without improving the economic demonstration and is not required.

Sources checked November 13, 2026: [Resend Supabase SMTP guide](https://resend.com/docs/send-with-supabase-smtp),
[Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp),
[redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls),
[Management API schema](https://api.supabase.com/api/v1-json),
[Track 9 example](https://github.com/nearai/near-hackathon-prompt-examples/blob/main/tracks/09-games.md).
