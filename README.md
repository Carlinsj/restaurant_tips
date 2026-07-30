# TipSathi

TipSathi connects restaurant bills, shifts, tips, and staff allocations. Money
is stored as integer minor units so every allocation can be reproduced and
audited without floating-point rounding errors.

## What works

- Manager and staff authentication with HTTP-only sessions
- Restaurant employees, tables, shifts, bills, tips, allocations, and payouts
- Staff dashboards with current earnings, previous shifts, and personal reports
- Customer tipping at `/tip/[publicToken]`
- Exact workload-balanced direct and table-split allocation
- ChefOS-ready and universal signed webhook connections
- Generic REST adapter and validated CSV bill imports
- Encrypted POS credentials, idempotent events, and audit records
- Durable login/webhook throttling, strict sessions, and same-origin mutations
- PostgreSQL persistence through Prisma

The manager, staff, and customer demos can be opened from the home page without
signing in. The interactive `DEMO` customer bill may record demo-only
allocations; real restaurant mutations still require the correct authenticated
role or trusted POS confirmation.

## Run locally

Requirements:

- Node.js 20 or newer
- PostgreSQL

Docker is optional. Use any local or hosted PostgreSQL database.

1. Install dependencies.

   ```bash
   npm install
   ```

2. Create the environment file.

   ```bash
   cp .env.example .env
   ```

3. Set these values in `.env`.

   ```dotenv
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/tipsathi?schema=public"
   AUTH_SECRET="at-least-32-random-characters"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   APP_BASE_URL="http://localhost:3000"
   TRUST_PROXY_HEADERS="false"
   POS_OUTBOUND_HOST_ALLOWLIST=""
   POS_CREDENTIAL_ENCRYPTION_KEY="base64-encoded-32-byte-key"
   ```

   Generate the two secrets with:

   ```bash
   openssl rand -hex 32
   openssl rand -base64 32
   ```

   Use the hex result for `AUTH_SECRET` and the base64 result for
   `POS_CREDENTIAL_ENCRYPTION_KEY`.

4. Create the database tables and demo data.

   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```

5. Start the application.

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

`npm run dev` starts the application. It does not install packages or create the
database; run the setup commands once on a new machine.

## Development accounts

```text
Restaurant code: DEMO
Manager email: manager@demo.in
Manager password: TipSathi123!

Employee code: W001
Employee PIN: 1234
```

These accounts come from the development seed and must not be used in
production.

## Interactive demo flow

After the database migration and seed are complete:

1. Open `/tip/demo-bill` and submit a tip for Table 6.
2. Arjun is assigned to 2 active tables and Priya to 3, so the workload rule
   gives them 60% and 40% of the Table 6 tip.
3. The confirmation page shows the exact split.
4. Open `/manager` to see the overall total, recent tip, table status, and team
   earnings update.
5. Open `/employee` to see Arjun's share in his current shift, assigned table,
   recent allocations, previous shifts, and reports.

The demo uses PostgreSQL when it is available. If PostgreSQL is offline,
practice tips are kept for up to eight hours in a signed, HTTP-only demo cookie,
so the customer, manager, and staff screens still show the same practice flow.
Practice data is isolated from restaurant records and never represents a
payment.

## Workload rule and table-tip splitting

This is the default rule for every newly confirmed table tip, whether it comes
from the customer demo, a manager entry, or a POS import.

In short, a table tip is shared only among staff assigned to that table. Staff
covering fewer active tables receive a larger share because they are assumed to
have contributed more focused attention, while everyone who served the tipped
table remains included.

TipSathi does not create a shift-wide or restaurant-wide tip pool. Every new
tip remains attached to its table and is credited only to staff assigned to
that table.

1. Only staff with an active assignment to the tipped table are eligible.
2. For each eligible person, TipSathi counts their distinct active table
   assignments in the same open shift. Duplicate assignment rows do not
   increase the count.
3. Each person receives an inverse-load weight:

   ```text
   raw weight = 1 / active table count
   share = person's raw weight / sum of all eligible raw weights
   ```

4. The tip is multiplied by those normalized shares.
5. Amounts are calculated in integer minor units (paise for INR). If division
   leaves one or more minor units, they go to the largest fractional
   remainders. An exact tie uses a stable hash of the tip's allocation key and
   employee ID. A retry produces the same result, while repeated tips do not
   always give the extra minor unit to the same employee.

Examples:

| Active tables among staff serving this table | Resulting split |
| --- | --- |
| 1 and 1 | 50% / 50% |
| 1 and 2 | 66.67% / 33.33% |
| 1 and 4 | 80% / 20% |
| 1, 2, and 4 | 57.14% / 28.57% / 14.29% |
| Arjun 2 and Priya 3 (demo Table 6) | 60% / 40% |

The rule rewards the person giving more attention to fewer tables without
excluding teammates who also served the table. A single eligible person
receives 100%. If nobody is assigned to the tipped table, TipSathi refuses to
allocate the tip and asks for a table assignment instead of guessing.

### Fairness assumptions

There is no single objectively fairest rule for every restaurant. This rule is
fair when the restaurant agrees that active table count is the best simple,
auditable proxy for a server's current workload and that everyone assigned to
the tipped table should participate.

It deliberately does not guess contribution from job title, primary-server
status, sales, party size, or how long someone covered the table. Those factors
should not be silently mixed into a direct-tip formula. Assignment records must
be kept current because incorrect assignments produce mathematically exact but
operationally unfair results.

Operational rules:

- An assignment is active while `endedAt` is empty. End it as soon as the
  person stops covering that table; otherwise it remains part of their load.
- A table is counted once per person even if the POS sends a duplicate
  assignment.
- Workload is measured when the tip is confirmed. Later assignment changes do
  not rewrite historical allocations.
- Every allocation stores the strategy version, active-table count, normalized
  share in basis points, rounding remainder, and deterministic remainder seed in
  `TipAllocation.calculationDetails` for auditability.
- The signed practice ledger is versioned. Changing the financial rule starts a
  fresh practice ledger so old demo splits cannot be mixed with the new rule.

The calculation scans active assignments once, apportions recipients in
`O(n log n)` time, and uses exact integer arithmetic throughout. A dedicated
database index supports active-assignment lookups by shift. Tests exhaustively
cover bounded workload combinations and input permutations, maximum safe
integer amounts, duplicate assignments, deterministic retries, and a
500-recipient stress case.

After pulling this change into an existing local demo database, run
`npm run db:seed` once. The seed adds the sample table assignments used to
demonstrate the 60/40 calculation.

## Useful commands

```bash
npm run dev          # development server
npm run build        # production build
npm start            # serve the production build
npm test             # unit tests
npm run typecheck    # TypeScript checks
npm run lint         # ESLint checks
npm run db:generate  # regenerate the Prisma client
npm run db:push      # sync a development database without a migration
npm run db:seed      # load development data
```

## POS connections

Managers choose one of three connection paths at `/manager/integrations`:

1. **ChefOS** — a signed webhook endpoint ready for account-specific mapping.
2. **Webhook** — the same normalized contract for any POS or middleware that
   can send signed JSON.
3. **CSV import** — a validated fallback for systems without API access.

The public webhook endpoint is:

```text
POST /api/integrations/pos/[integrationId]/webhook
```

The sender signs the exact request body with HMAC-SHA256 and sends
`sha256=<hex digest>` in `x-tipsathi-signature`. Unique event IDs make retries
safe.

See [ChefOS and POS integration setup](docs/CHEFOS_AND_POS_INTEGRATIONS.md) for
the event contract, CSV columns, provider checklist, and deployment steps.

Before a production launch, follow the
[security architecture and deployment checklist](docs/SECURITY_ARCHITECTURE.md).

## Project structure

```text
prisma/
  schema.prisma        database models
  migrations/          versioned database changes
  seed.ts              development data

src/app/
  api/                 authenticated and public HTTP endpoints
  manager/             manager routes
  employee/            staff dashboard
  tip/                 customer tipping flow

src/components/        reusable React screens and controls
src/integrations/pos/  provider adapters, mapping, security, and sync logic
src/lib/               authentication, currency, validation, and calculations
src/server/            server-side queries and audit helpers
src/tests/             calculation and integration unit tests
```

Core tip calculations do not depend on a POS provider or React component.
Provider data is normalized before it reaches financial logic.

## Verification

Before committing:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```
