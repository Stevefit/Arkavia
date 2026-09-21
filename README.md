# ARKAVIA DJ FEST

A personalized thank-you microsite and staff dashboard built with Next.js, TypeScript, Tailwind CSS, Framer Motion, Neon Postgres, and optional Vercel Blob. The supplied ARKAVIA images are used directly in `public/brand`.

## Local preview

```bash
npm install
npm run dev
```

Open `http://localhost:3000/?name=rein` to preview a local sample DJ. Open `http://localhost:3000/admin/login` for the dashboard. Without `POSTGRES_URL`, development uses `data/local.json` and the brief's sample password `admin123@2003`. The file is created on first use and is ignored by Git.

## Production setup

1. Create a Neon Postgres database in Vercel Storage and connect it to the project. Confirm the integration supplies `POSTGRES_URL` or set `DATABASE_URL`.
2. Set `ADMIN_PASSWORD` to a unique strong value and `SESSION_SECRET` to a random string of at least 32 characters. Production refuses to log in without these values. The sample password is only available in local development.
3. If staff should upload audio files, connect a public Vercel Blob store so `BLOB_READ_WRITE_TOKEN` is available. Server uploads are limited to 4 MB; larger tracks can be hosted elsewhere and entered as a direct audio URL.
4. Run `npm run db:migrate` with the database URL in the environment. This creates the DJ, settings, comments, and cooldown tables and seeds the default message. The command is safe to run again.
5. Deploy the project to Vercel. Add the first real DJ through the admin panel, then copy the generated link.

The local sample DJ is never inserted into Postgres. DJ slugs are generated once and remain stable when the display name changes. Comments survive DJ deletion through a nullable foreign key. Music only starts after the guest opens the page, following browser autoplay rules.

## Routes

- `/` — personalized experience using `?name=<dj-slug>`
- `/admin/login` and `/admin` — staff access and dashboard
- `/api/djs`, `/api/djs/:id` — lookup and management
- `/api/settings` — message and music settings
- `/api/comments`, `/api/comments/all`, `/api/comments/:id` — guestbook and moderation
- `/api/music/upload` — optional Blob upload

Admin API routes check the signed, HTTP-only session cookie both in the Next.js proxy and in the route handler. The public comment endpoint validates input, uses a hidden honeypot, and enforces a 30-second per-IP cooldown stored in Postgres. Admin mutations require confirmation in the dashboard.

## Checks

```bash
npm run typecheck
npm run build
```
