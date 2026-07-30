# ChefOS and worldwide POS connections

## What is implemented

TipSathi supports three connection routes:

1. **ChefOS signed webhook** — a secure TipSathi endpoint receives normalized
   ticket, employee, table, and tip events.
2. **Universal signed webhook** — the same contract works with another POS,
   middleware service, or a small provider-specific transformer.
3. **CSV import** — the operational fallback when a provider does not grant API
   or webhook access.

The webhook route verifies HMAC-SHA256 signatures before parsing data, stores
credentials encrypted, rejects duplicate event IDs, and imports financial
records through the existing audited allocation service.

## The ChefOS boundary

ChefOS describes itself as an operating layer around an existing POS rather
than a replacement POS. Its public integrations page advertises REST APIs and
webhooks and shows an aggregate `POST /v1/sales.ingest` example. The public
site does not publish the ticket-, employee-, payment-, and tip-level response
contract TipSathi needs for automatic employee allocation.

TipSathi therefore does not guess ChefOS endpoint names or scrape ChefOS. The
secure receiver is ready; the final ChefOS-to-TipSathi field mapping must be
based on the official documentation and credentials issued for the restaurant
account.

Official references:

- [ChefOS](https://chefos.us/)
- [ChefOS integrations](https://chefos.us/integrations)
- [ChefOS privacy](https://chefos.us/privacy)
- [ChefOS terms](https://chefos.us/terms)

## Create the connection

1. Set `POS_CREDENTIAL_ENCRYPTION_KEY` in `.env`.
2. Apply database migrations with `npx prisma migrate deploy`.
3. Start TipSathi and sign in as a manager.
4. Open **POS import → ChefOS → Set up ChefOS**.
5. Enter the restaurant's three-letter ISO currency code.
6. Create the endpoint, then copy its URL and signing secret. The secret is
   shown once.
7. Give the endpoint, signing rule, and event contract to ChefOS or the
   restaurant's integration partner.
8. Send employee and table events first, then paid bill/tip events.
9. Confirm the imported record and employee allocation in TipSathi.

For local development, ChefOS cannot call `localhost`. Use an approved HTTPS
tunnel or a deployed staging URL. Never use a production signing secret in a
local tunnel.

## Questions to send ChefOS

Ask for account-specific answers to these questions:

- How do we obtain a scoped API key or webhook configuration for this
  restaurant and each location?
- Which official endpoints or outbound webhooks contain orders/checks,
  payments, gratuities, employees, tables, shifts, and refunds?
- Are tips separate records or fields on payments/checks?
- Which stable IDs identify the event, location, employee, table, bill,
  payment, and tip?
- Are monetary amounts major-unit decimals or integer minor units, and is the
  ISO currency included?
- What signature header and retry/idempotency behavior does ChefOS use?
- Can ChefOS send a custom webhook body, or is a small transformer required?
- What API limits, historical backfill window, and data-residency options
  apply to the account?

Do not enable a guessed integration. Obtain a sample payload with personal
data removed and test it against a staging restaurant first.

## TipSathi webhook contract

Send `POST` requests to the endpoint created in the manager workspace.

Headers:

```text
Content-Type: application/json
x-tipsathi-signature: sha256=<hex HMAC-SHA256 digest>
```

Compute the digest over the exact request body bytes using the one-time signing
secret.

Example:

```json
{
  "id": "event_01",
  "type": "TIP_CONFIRMED",
  "occurredAt": "2026-07-29T18:42:00Z",
  "data": {
    "bill": {
      "id": "bill_1042",
      "number": "1042",
      "tableId": "table_6",
      "tableName": "Table 6",
      "employeeId": "employee_17",
      "employeeName": "Alex",
      "subtotalMinor": 20000,
      "taxMinor": 0,
      "totalMinor": 20000,
      "tipMinor": 2000,
      "currency": "USD",
      "status": "PAID",
      "paidAt": "2026-07-29T18:41:30Z"
    }
  }
}
```

Supported event types:

```text
BILL_CREATED
BILL_UPDATED
BILL_PAID
BILL_CANCELLED
BILL_REFUNDED
TIP_CONFIRMED
PAYMENT_CONFIRMED
EMPLOYEE_UPDATED
TABLE_UPDATED
```

Amounts are whole-number minor units:

- USD 20.00 → `2000`
- INR 200.00 → `20000`
- JPY 200 → `200`
- KWD 20.000 → `20000`

Event IDs must be stable. Re-sending an event with the same ID is safe and does
not duplicate a tip.

## CSV fallback

The minimum major-unit file is:

```csv
bill_number,table_number,bill_total,employee_code,status,currency,tip_amount
1042,6,200.00,E017,PAID,USD,20.00
```

For an unambiguous provider export, use integer minor units:

```csv
bill_number,table_number,bill_total_minor,employee_code,status,currency,tip_amount_minor
1042,6,20000,E017,PAID,USD,2000
```

TipSathi recognizes common aliases such as `invoice_number`, `check_total`,
`server_id`, `waiter_code`, `gratuity`, and `payment_status`.

## What “worldwide compatible” means

TipSathi can represent any supported ISO 4217 currency using the currency's
standard zero-, two-, or three-decimal minor-unit precision. It can receive a
common webhook contract or CSV from any country.

No product can connect automatically to every restaurant system without the
provider's cooperation. A live connection still requires at least one of:

- an official read API;
- configurable outbound webhooks;
- an approved middleware transformer; or
- a bill export.

This boundary is intentional: it avoids scraping, shared passwords, invented
APIs, and silent financial errors.
