# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

Tarékah is a personal job application tracker (multi-user, each user sees only their own data). The schema, route list and phase plan live in `PLAN.md` — read it before starting a phase and keep it current when the design changes.

## Commands

```bash
npm run dev           # dev server (Turbopack) at http://localhost:3000
npm run build         # production build
npm run start         # serve the production build
npm run lint          # ESLint (flat config, eslint-config-next + eslint-config-prettier)
npm run typecheck     # next typegen && tsc --noEmit
npm run format        # Prettier, write
npm run format:check  # Prettier, check only
```

No test runner is configured yet (Vitest is planned, see `PLAN.md`).

Before calling work done: `npm run lint && npm run typecheck && npm run format:check && npm run build`.

### Running locally

1. `npm install`
2. `cp .env.example .env.local` and fill in the Neon connection strings, `AUTH_SECRET` (`npx auth secret`) and the GitHub/Google OAuth credentials. The OAuth callback URLs are `http://localhost:3000/api/auth/callback/{github,google}`.
3. `npm run db:migrate`
4. `npm run dev`

`npm run start` (production mode outside Vercel) also needs `AUTH_TRUST_HOST=true`, otherwise Auth.js rejects requests with `UntrustedHost`.

### Migrations

```bash
npm run db:generate   # diff src/db/schema against drizzle/ and write a new SQL migration
npm run db:migrate    # apply pending migrations to DATABASE_URL_UNPOOLED
npm run db:studio     # Drizzle Studio
npm run db:seed -- <email> [--reset]   # demo data for one existing user
```

- Workflow: edit `src/db/schema/*` → `db:generate` → review the generated SQL → `db:migrate` → commit schema and `drizzle/` together.
- Never use `drizzle-kit push`, and never edit a migration that has already been applied; add a new one.
- `scripts/seed.ts` fills an account that already signed in once. It refuses to run when that user has data unless `--reset` is passed, which deletes that user's companies, documents, applications and contacts first. It writes straight to the database, so cached pages do not see it: restart the server afterwards.
- `drizzle.config.ts` loads `.env.local` itself (drizzle-kit runs outside Next.js) and uses the direct, unpooled connection string. The app at runtime uses the pooled `DATABASE_URL`.

## Git workflow

Follow this without being asked, at the end of every task or phase.

- Never commit on `main`. Create a branch first: `<type>/<short-kebab-description>`, for example `feat/applications-crud` or `chore/project-setup`.
- Commit once the checks above pass. Split the work into one commit per context (dependencies, config, schema, a feature, docs, formatting) rather than one large commit; stage files explicitly, not `git add -A`.
- Messages are Conventional Commits, subject line only, short and lowercase: `feat: add application form`, `chore: configure prettier`. Add a body only when the reason is not obvious from the diff.
- Committing must not change code. If something needs fixing, fix it and re-run the checks before committing.
- Do not push, open a pull request, merge, or rewrite history unless asked.

## Stack

Next.js 16.4 (App Router, `src/` layout) · React 19.3 · TypeScript strict · Tailwind CSS v4 · shadcn/ui on Base UI · PostgreSQL on Neon through `pg` (node-postgres) · Drizzle ORM + drizzle-kit · Auth.js v5 (`next-auth@beta`, GitHub + Google, database sessions through `@auth/drizzle-adapter`) · Zod 4 · Prettier · deployed on Vercel.

`next-auth@latest` is still v4 and does not support this Next.js version; stay on the `beta` tag.

The database driver is `pg` with `attachDatabasePool` from `@vercel/functions`, which is what Neon recommends on Vercel Fluid compute. The pool lives in `src/db/index.ts`; do not create another one. The one exception is `scripts/seed.ts`, which runs outside Next.js and opens its own short-lived connection.

## Folder structure

```
drizzle/                      generated SQL migrations (committed)
drizzle.config.ts
scripts/seed.ts               demo data; the only code outside src/ that talks to the database
src/
  app/
    (marketing)/              public landing page
    (auth)/login/             sign-in page
    (app)/                    authenticated routes (dashboard, applications, …)
    api/auth/[...nextauth]/   Auth.js route handler
  auth.ts                     Auth.js config (providers, adapter)
  proxy.ts                    optimistic redirect for signed-out visitors
  db/
    index.ts                  Drizzle client
    schema/<domain>.ts        tables, enums, relations; re-exported from schema/index.ts
  features/<domain>/
    queries.ts                reads (server-only)
    actions.ts                Server Actions ("use server")
    schemas.ts                Zod schemas shared by forms and actions
    components/               components specific to the domain
  components/ui/              shadcn/ui components
  lib/
    auth.ts                   getCurrentUser() / requireUser()
    env.ts                    Zod-validated environment variables
    utils.ts
```

Route files in `src/app` stay thin: they compose components and call functions from `src/features`. Feature folders are created in the phase that needs them.

## Rules

These three are not negotiable.

1. **Server Components by default.** Add `"use client"` only when a component needs state, effects, event handlers or browser APIs, and put the boundary as low in the tree as possible. Fetch data in Server Components and pass it down; do not fetch in Client Components.
2. **Mutations go through Server Actions with Zod validation.** Every action lives in `src/features/<domain>/actions.ts` and follows the same order: `requireUser()` → `schema.safeParse(input)` → query scoped to the user → `updateTag(...)`. Treat every argument as untrusted, including ids. Return validation failures as data rather than throwing, using `ActionResult` from `src/lib/action-result.ts` (`{ ok: true, data }` or `{ ok: false, message, fieldErrors? }`). No Route Handlers for mutations.
3. **Every query is filtered by `userId`.** Data is isolated per user.
   - The user id comes only from `requireUser()` (the session). Never accept it from form data, params, search params or a client component.
   - Only `queries.ts` and `actions.ts` under `src/features` (plus `src/auth.ts`) import `db`. Both start with `import "server-only"` or `"use server"`. Components and route files never import `db`.
   - Reads, updates and deletes by id always combine both conditions: `and(eq(table.id, id), eq(table.userId, user.id))`. A row that belongs to someone else is treated as not found.
   - When inserting a row that references another row (company, document, application, contact), verify the referenced row belongs to the same user first.

## Auth and caching

`cacheComponents` is on, so session reads are request-time work. Read `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md` before touching auth or cached queries.

- A component that reads the session must sit inside a `<Suspense>` boundary. Do not `await` the session at the top level of a layout; push it into a child component.
- To cache per-user data, the exported query resolves the user and passes `user.id` into an unexported `"use cache"` function. Never export a cached function that takes a `userId` argument.
- Cache tags are `<domain>:<userId>` (`applications:<userId>`, `companies:<userId>`, `settings:<userId>`, `documents:<userId>`, `interviews:<userId>`, `contacts:<userId>`). A cached query that joins another domain carries that domain's tag too, and an action that changes what another domain displays updates that tag as well. Actions call `updateTag` with the same tag. Keep emails and other personal data out of cache keys and tags.
- Anything that depends on the clock (days in status, follow-up and ghosted flags) is computed in the exported query, after the cached read, never inside a `"use cache"` function. The rules live in `src/features/applications/follow-up.ts`.
- Reading the clock outside a cached function still needs `await connection()` first when the value feeds a render (see `resolveCurrentRange` in `src/features/dashboard/range.ts`); otherwise Next.js rejects `Date.now()` while prerendering.
- `src/proxy.ts` only does an optimistic cookie check for redirects. Authorization happens in `queries.ts` / `actions.ts`.
- The `(app)` layout redirects signed-out visitors, but it does not protect page content: Next.js renders page segments independently of their layouts. A page is only protected because its queries call `requireUser()`.
- When adding a route under `(app)`, add its path to the `matcher` in `src/proxy.ts` and its link to `NAV_ITEMS` in `src/app/(app)/layout.tsx`.
- `session.user.id` exists only because of the `session` callback in `src/auth.ts`; Auth.js drops it by default.

## Code conventions

- Formatting is Prettier's job (defaults, plus `prettier-plugin-tailwindcss` for class order). Do not hand-format or add ESLint style rules.
- UI text is Indonesian; code, comments, identifiers and commit messages are English.
- File names are kebab-case. Components are named exports in PascalCase; only Next.js route files use default exports.
- No `any` and no non-null assertions on external data. Derive types instead of rewriting them: `typeof table.$inferSelect` / `$inferInsert` for rows, `z.infer<typeof schema>` for inputs.
- Database identifiers are snake_case, TypeScript properties camelCase; the mapping comes from `casing: "snake_case"` (set in `drizzle.config.ts` and on the Drizzle client), so do not pass column names by hand.
- Enum values are lowercase snake_case in the database (`technical_test`); display labels are mapped in the UI. The allowed values live as plain tuples in `src/db/schema/enum-values.ts`; Zod schemas and Client Components import from there, never from `enums.ts` (which pulls in Drizzle).
- Read environment variables through `src/lib/env.ts`, not `process.env`, and add new ones to `.env.example`. The exception is the OAuth provider variables (`AUTH_GITHUB_*`, `AUTH_GOOGLE_*`), which Auth.js reads itself by naming convention.
- Multi-statement writes that must stay consistent (for example a status change plus its history row) run inside `db.transaction`.
- Timestamps are `timestamptz`; calendar dates without a time (applied date) are `date`.

## Next.js specifics

Next.js 16 differs from older versions in ways that matter here. The bundled docs at `node_modules/next/dist/docs/01-app/` are the source of truth (see AGENTS.md).

- `next.config.ts` enables `cacheComponents: true` and `partialPrefetching: true`. These change the caching and prefetching model for every route — read `01-getting-started/08-caching.md`, `02-guides/migrating-to-cache-components.md` and `02-guides/adopting-partial-prefetching.md` before adding data fetching, dynamic APIs, or `<Link>`-heavy navigation.
- Route prop types come from the globally generated helpers (`LayoutProps<"/">`, `PageProps<...>`) rather than hand-written `{ children: React.ReactNode }` types. They are generated by `next dev`, `next build` or `npx next typegen`; `npm run typecheck` runs typegen first.
- Middleware is called `proxy` in this version (`01-getting-started/16-proxy.md`).

## Styling

- Tailwind v4 is CSS-first: there is no `tailwind.config.*` and no PostCSS config. Tailwind runs through the `@tailwindcss/turbopack` loader registered under `turbopack.rules` in `next.config.ts`.
- All theme configuration lives in `src/app/globals.css`: the `@theme inline` block maps Tailwind tokens (`bg-primary`, `rounded-lg`, …) to CSS variables defined in `:root` and `.dark` (oklch, neutral base). Add or change design tokens there.
- Dark mode is class-based (`@custom-variant dark (&:is(.dark *))`), so it follows a `.dark` class on an ancestor, not `prefers-color-scheme`. Nothing sets that class yet.
- Fonts: `layout.tsx` defines `--font-geist-sans` and `--font-geist-mono`; `globals.css` maps `--font-sans`, `--font-heading` and `--font-mono` to them.

## UI components

- shadcn/ui is configured in `components.json` with the `base-nova` style, which builds on `@base-ui/react` primitives, not Radix. Base UI APIs differ from Radix (for example, composition uses the `render` prop rather than `asChild`).
- Add components with `npx shadcn@latest add <name>`; they land in `src/components/ui/` and are owned source, edited in place.
- Class merging uses the `cn` npm package (shadcn's compiled replacement for `clsx` + `tailwind-merge`). `src/lib/utils.ts` only re-exports it, so `@/lib/utils` and `cn` are interchangeable imports.
- Icons come from `lucide-react`.
- Shared, non-shadcn components live in `src/components/`: `OptionSelect` (single choice over labelled options), `DeleteButton` (confirm, then run a bound delete action) and `Markdown` (the only place user-written markdown is rendered; raw HTML is never rendered).
- Forms inside a `Dialog` put `key={useOpenKey(open)}` (`src/hooks/use-open-key.ts`) on the form component, because the dialog popup keeps its state across closes.
- Shared Zod field helpers (`optionalText`, `requiredText`, `optionalHttpUrl`, `optionalId`) are in `src/lib/form-schemas.ts`; `invalidResult` in `src/lib/action-result.ts` turns a Zod error into an `ActionResult`; `setFieldErrors` in `src/lib/form-errors.ts` maps it back onto the form.
- Forms are Client Components using `react-hook-form` with `zodResolver` and the schema from `schemas.ts`; the action re-parses the same raw values with the same schema. The form calls the action in a transition, maps `fieldErrors` onto fields, shows a `sonner` toast, then navigates. See `src/features/applications/components/application-form.tsx`.
- The kanban board (`src/features/applications/components/board.tsx`) uses `@dnd-kit/core` only, since cards have no order within a column. Moves go through `useOptimistic` inside a standalone `startTransition`, following `node_modules/next/dist/docs/01-app/02-guides/interactive-apps.md`; a failed action reverts by itself because nothing is revalidated.
- Charts use the shadcn `chart` component over Recharts 3 and live in `src/features/dashboard/components/` as Client Components that only render: aggregation happens in SQL in `src/features/dashboard/queries.ts`, and labels are formatted on the server and passed in. Series colours are `--chart-1` to `--chart-5` in `globals.css`, assigned in that order.
- Tables use TanStack Table v9 (`useTable` + `tableFeatures`), whose API differs from v8; its docs ship in `node_modules/@tanstack/react-table/skills/`.
- Path alias: `@/*` maps to `src/*`. `components.json` also reserves `@/hooks` for hooks.
