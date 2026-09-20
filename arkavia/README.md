# ARKAVIA DJ FEST

Personalized Indonesian DJ appreciation pages and a password-protected admin dashboard. Built with Next.js App Router, TypeScript, Tailwind CSS, Framer Motion, and Neon Postgres. Deploy to Vercel.

## Local setup

Requires Node.js 22 or newer and a Neon Postgres database.

```bash
npm ci
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Value |
| --- | --- |
| `POSTGRES_URL` | Neon connection string, including `sslmode=require` |
| `ADMIN_PASSWORD` | A strong password of at least 12 characters |
| `SESSION_SECRET` | A random secret of at least 32 characters |

Generate a session secret locally:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Never commit `.env.local` or share these secrets in chat.

```bash
npm run db:migrate
npm run dev
```

Open `http://localhost:3000/admin/login`, log in, and add your DJs. The migration creates the tables and seeds the supplied Indonesian template. It is repeatable and does not overwrite existing DJs or template edits. No demo DJ is inserted automatically.

## Vercel deployment

1. Create a GitHub repository containing this project, including `package-lock.json`. Exclude `.env.local`, `node_modules`, and `.next`.
2. Import it into Vercel. Use the Next.js preset and a supported Node.js version of 22 or newer.
3. Connect a Neon database through the Vercel Marketplace, or use an existing Neon project.
4. Set `POSTGRES_URL`, `ADMIN_PASSWORD`, and `SESSION_SECRET` in Vercel's production environment. If the integration supplies `DATABASE_URL`, copy its connection string into `POSTGRES_URL` as well. The application explicitly reads `POSTGRES_URL`.
5. Run `npm run db:migrate` locally with the production database connection in `.env.local` before opening the deployed dashboard. This is an explicit administrative script; there is no public setup endpoint.
6. Deploy. If you changed environment variables after deploying, redeploy to apply them.
7. Open `/admin/login`, add a DJ, then use Copy or Preview to check the public link in a separate browser session.

Use a separate database for preview deployments if you enable admin editing there. The Neon HTTP driver used here is intended for Neon; it is not a generic TCP Postgres client.

A Vercel Hobby deployment is appropriate only for eligible personal, non-commercial use and remains subject to its quotas. Database billing is separate. Custom domains are optional.

## Features and behavior

- One public page at `/?name=rein`; matches a DJ name or slug case-insensitively after trimming.
- Friendly missing-invitation and service-error states.
- Every literal `{name}` in the template is substituted as text. HTML in a name or message is not executed.
- Add, edit, delete, copy links, copy all links, and open actual guest previews.
- Editing a DJ's name preserves the slug so previously copied slug links remain valid. Old links that used a display name instead of the slug may stop matching after a rename.
- Template changes are read on the next page load without redeploying. Already-open guest pages need to refresh; this is not a live push system.
- Template editor includes a local preview, unsaved-change warning, and explicit save.
- Mobile layouts, keyboard focus indicators, reduced-motion support, self-hosted fonts, and a custom favicon.

## Routes

| Route | Access |
| --- | --- |
| `/` | Public personalized page |
| `/admin/login` | Public login form |
| `/admin` | Valid signed admin session required |
| `GET /api/djs?name=...` | Public single DJ lookup |
| `GET /api/djs` | Admin list |
| `POST /api/djs` | Admin create |
| `PUT /api/djs/:id` | Admin update |
| `DELETE /api/djs/:id` | Admin delete |
| `GET /api/template` | Public message template |
| `PUT /api/template` | Admin template update |
| `POST /api/admin/login` | Password login |
| `POST /api/admin/logout` | Admin logout |

Next.js 16 calls middleware `proxy.ts`. It verifies signed sessions before protected routes. API handlers and the admin page also check authorization independently.

## Security and operational notes

Sessions are signed HS256 JWTs, expire after eight hours, and use HttpOnly, SameSite=Strict cookies with Secure enabled in production. Mutating requests check Origin. Passwords are compared using constant-time digests. SQL values are parameterized. Public names and message content are not private; a personalized link is not an access token.

Login attempts use a shared Postgres counter: at most 20 attempts per five-minute window across all users. This intentionally simple limit works across serverless instances, but an attacker can temporarily exhaust the shared allowance. For a larger deployment, add provider firewall limits or a dedicated distributed per-client limiter. No IP address is stored by this application.

Logout removes the browser cookie; a copied token remains valid until expiry. Rotate `SESSION_SECRET` and redeploy to invalidate all sessions immediately. Changing only `ADMIN_PASSWORD` does not revoke existing sessions.

DJ writes use a database transaction and an advisory lock to prevent concurrent name/slug lookup collisions. The database also enforces unique normalized names and unique slugs. Back up your production data through the database provider.

## Validation

```bash
npm test
npm run typecheck
npm run build
```

The production build and TypeScript checks passed in the preparation environment. Automated tests cover valid, forged, missing, expired, and wrong-audience sessions, literal placeholder replacement, and forged-session rejection on protected routes. Browser visual checks were not completed because the browser download was unavailable.

No production database credentials or Vercel account were supplied. Therefore the app has not been deployed, and live database migration, login, and CRUD operations have not been validated against Neon. Complete the following smoke test after configuring it:

1. Run the migration twice; verify that the second run preserves data.
2. Log in with a wrong and then correct password.
3. Add `Rein`; verify trimmed and case-insensitive public lookup.
4. Add a duplicate name and confirm it is rejected; add two names that generate the same slug and confirm both get usable distinct links.
5. Edit a DJ name; verify its copied slug link still works.
6. Edit the message with repeated `{name}` tokens; reload the guest page and check all replacements.
7. Delete a DJ and confirm their link shows the fallback.
8. Log out; verify the dashboard redirects and write APIs reject the request.
