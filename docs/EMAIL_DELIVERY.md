# Email sign-in through Resend

The game already uses Supabase `signInWithOtp` for email links. Supabase verifies
the link and issues the session; the server maps that verified user to a managed
in-game wallet. Resend is the SMTP delivery provider, not a second authentication
system. No Resend SDK or API key belongs in the browser or Render runtime.

**Status:** setup tooling is implemented; production SMTP, inbox delivery and the
return-to-game callback remain unverified. Guest entry does not send email and
does not depend on SMTP. Google remains optional and disabled unless configured.

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
npm run email:configure -- --apply
```

The first command previews without writes. Applying requires a verified sender
domain, configures Resend SMTP, enables email links, keeps email confirmation on,
sets `https://aftmarket.xyz` as Site URL and adds its exact root callbacks while
preserving existing redirect entries. Unrelated OAuth providers, templates and
rate limits are preserved. Settings are read back; this is not proof of delivery.
The script prints neither keys nor full provider responses. Remove the management
token from the environment after setup if it is no longer needed.

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

The owner authorized one test to a private inbox; its address is intentionally
excluded from public documentation. No test message has been sent by this setup.
Existing guest islands are not automatically merged into a new email account.

Email alone satisfies the Track 9 example's **social or email** option. Finish
inbox/callback verification before adding Google. X sign-in adds another OAuth
setup without improving the economic demonstration and is not required.

Sources checked November 13, 2026: [Resend Supabase SMTP guide](https://resend.com/docs/send-with-supabase-smtp),
[Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp),
[redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls),
[Management API schema](https://api.supabase.com/api/v1-json),
[Track 9 example](https://github.com/nearai/near-hackathon-prompt-examples/blob/main/tracks/09-games.md).
