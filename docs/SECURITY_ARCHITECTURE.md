# TipSathi security architecture

No internet-facing financial system is literally bulletproof. TipSathi uses
multiple independent controls so one failed control does not automatically
expose credentials, another restaurant's data, or confirmed staff earnings.

## Trust boundaries

1. **Public customer browser** — may read one bill through its unguessable
   public token and submit a pending tip choice. It cannot confirm earnings.
2. **Staff session** — may read only the active employee's own restaurant,
   shift, allocation, payout, and report data.
3. **Manager session** — may mutate one restaurant's operational data. Every
   protected request rechecks the user, role, restaurant, and active status in
   PostgreSQL.
4. **POS webhook** — is public but accepts a bounded JSON body only after
   HMAC-SHA256 verification. Stable event IDs make retries idempotent.
5. **Outbound generic POS adapter** — permits HTTPS in production, exact
   configured hosts, same-origin relative endpoints, bounded JSON responses,
   timeouts, and no redirects.
6. **PostgreSQL** — is the source of truth for tenants, money, audit records,
   idempotency, and rate-limit state.

Confirmed earnings can be created only by a manager action or a trusted POS
payment/tip event. Customer submissions remain `PENDING` until that trusted
confirmation arrives. The one deliberate exception is the seeded
`DEMO` restaurant's `demo-bill`: it confirms immediately so a presentation can
show the complete allocation flow. That exception checks both the fixed public
token and the `DEMO` tenant code, remains rate-limited and audited, and cannot
confirm a real restaurant's tips.

## Controls implemented in the application

- Signed HS256 sessions with an explicit algorithm, issuer, audience, expiry,
  unique token ID, HTTP-only cookie, `SameSite=Strict`, and `Secure` plus the
  `__Host-` cookie prefix in production.
- Database-backed authorization on every protected request, including active
  account and tenant checks.
- Generic authentication errors, constant-work password/PIN verification, and
  separate account and IP throttles stored in PostgreSQL.
- Same-origin/Fetch Metadata checks for browser mutations. Signed POS webhooks
  are explicitly exempt because they are server-to-server requests.
- JSON content-type validation and byte limits on every JSON API request.
- Bounded webhook and outbound POS payloads.
- Tenant filters on application queries and allowlisted response fields for
  employees, so password and PIN hashes are never serialized.
- CUID2 bearer tokens for public bills; internal database IDs are not treated
  as authorization.
- Integer minor-unit money, atomic financial transactions, bill-scoped
  idempotency, trusted confirmation boundaries, and append-only audit events.
- AES-256-GCM encryption for stored POS credentials and HMAC-SHA256 webhook
  signatures.
- SSRF controls: production HTTPS, an exact hostname allowlist, DNS/private
  address checks, no redirects, same-origin endpoint resolution, and timeouts.
- Security headers including CSP, clickjacking protection, MIME sniffing
  prevention, restrictive permissions, referrer policy, COOP, HSTS in
  production, and `no-store` API responses.

## Required production infrastructure

Application code cannot replace these deployment controls:

- Put the app behind a managed TLS proxy/WAF that replaces forwarded-IP
  headers. Set `TRUST_PROXY_HEADERS=true` only in that environment.
- Apply coarse IP and bot rate limits at the edge. Database limits protect
  accounts and work across instances, but should not absorb a volumetric attack.
- Use a managed PostgreSQL service with TLS, a least-privilege application
  account, encrypted storage, automated backups, point-in-time recovery, and
  restore drills. Do not expose port 5432 publicly.
- Store `AUTH_SECRET`, `DATABASE_URL`, and
  `POS_CREDENTIAL_ENCRYPTION_KEY` in the hosting provider's secret manager.
  Never commit `.env`.
- Give every production environment different secrets. Rotate signing and
  encryption keys with a documented migration and incident-response process.
- Configure `POS_OUTBOUND_HOST_ALLOWLIST` with exact official API hosts.
  On-premise/private POS systems need a separate outbound connector; do not
  weaken the server's private-network block.
- Export application, WAF, authentication, POS failure, and audit logs to a
  monitored system with retention and alerts.
- Add manager MFA/SSO before handling real payouts. Password-only manager
  authentication is not sufficient for a high-value production deployment.
- Run dependency, secret, SAST, migration, backup-restore, and penetration
  testing in CI and before launch.

## Environment values

```dotenv
DATABASE_URL="postgresql://APP_USER:STRONG_PASSWORD@DB_HOST:5432/tipsathi?sslmode=require&schema=public"
AUTH_SECRET="64-or-more-random-characters"
APP_BASE_URL="https://tips.example.com"
NEXT_PUBLIC_APP_URL="https://tips.example.com"
POS_CREDENTIAL_ENCRYPTION_KEY="base64-encoded-32-byte-key"
TRUST_PROXY_HEADERS="true"
POS_OUTBOUND_HOST_ALLOWLIST="api.provider-one.com,api.provider-two.com"
```

Generate secrets:

```bash
openssl rand -hex 32
openssl rand -base64 32
```

Apply the security migration before deploying:

```bash
npx prisma migrate deploy
npm run db:generate
```

The migration adds durable rate-limit buckets and scopes tip idempotency keys
to their bill.

## Known residual risks

- The static CSP still permits inline scripts/styles for Next.js compatibility.
  A nonce-based CSP is stricter but makes the current app dynamically rendered.
- The generic POS allowlist reduces SSRF exposure, but provider DNS and account
  compromise remain external risks.
- Database tenancy is enforced in the application. PostgreSQL row-level
  security can be added as another layer once request-scoped tenant context and
  a restricted migration role are designed and tested.
- Audit records are append-only by application convention. Export them to
  immutable storage for tamper resistance.
- The application has no manager MFA or centralized session-revocation table.
  Disabled users are revoked on their next protected request because sessions
  are revalidated against PostgreSQL.
