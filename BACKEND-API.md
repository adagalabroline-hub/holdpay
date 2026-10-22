# HoldPay Odoo backend API

The Odoo 18 addon in `holdpay_odoo/` is the initial backend foundation for the
website and Flutter clients. Odoo owns account roles, verification state,
listings, orders, pickup milestones, mediation cases, and reviews. The API uses
Odoo's authenticated user session; it does not issue a separate HoldPay token.

This is a prototype backend, not a production payment or escrow service. Do not
record a payment as confirmed until an approved provider integration and its
server-verified confirmation are in place.

## Install and configure

1. Install the addon on an Odoo 18 staging database and update the Apps list.
2. Test with HTTPS, configured database selection, mail, backups, and least
   privilege admin accounts.
3. Use Odoo's signup and login flow. A mobile client authenticates through
   `/web/session/authenticate` and sends the returned session cookie on API
   requests. Keep the cookie in platform-secure storage; never put database
   passwords or Odoo admin credentials in the app.
4. API routes are JSON-RPC endpoints. Send a POST with
   `{"jsonrpc":"2.0","method":"call","params":{...},"id":1}` and include the
   JSON-RPC session cookie. The route argument values go inside `params`.
5. Only an authorized Odoo administrator can approve KYC and seller/agent
   business verification. Verification documents are not accepted by the
   website or these API routes.

Example authentication request:

```json
{
  "jsonrpc": "2.0",
  "method": "call",
  "params": {
    "db": "your-staging-database",
    "login": "account@example.com",
    "password": "provided-out-of-band"
  },
  "id": 1
}
```

POST that body to `/web/session/authenticate`, then call the API using the
session cookie from the response. Never commit real credentials or session
cookies.

## API routes

All routes below require an authenticated Odoo user and use POST. API responses
use `{"ok":true,"data":...}` on success, or
`{"ok":false,"error":{"code":"...","message":"..."}}` for expected validation
and permission failures.

| Route | Purpose |
| --- | --- |
| `/holdpay/api/v1/me` | Return the current user's role, KYC and business verification states, and activation status. |
| `/holdpay/api/v1/account/role` | Set an account role once; agent signup also requires an operating area. |
| `/holdpay/api/v1/listings` | List published listings, create/update a seller's listings, or list reviews with `action: "reviews"` and `listing_id`. |
| `/holdpay/api/v1/agents` | List verified pickup agents, optionally filtered by `operating_area`. |
| `/holdpay/api/v1/deals` | List deals visible to the current participant, or create a buyer order with `action: "create"`. |
| `/holdpay/api/v1/deals/<deal_id>/milestones` | Advance a handover/collection using the `action` parameter. |
| `/holdpay/api/v1/deals/<deal_id>/cases` | Open a delivery concern with `description`. |
| `/holdpay/api/v1/cases` | List cases where the user is the reporter, buyer, or assigned agent. |
| `/holdpay/api/v1/cases/<case_id>/resolve` | Resolve a case assigned to the verified pickup agent with `resolution_note`. |
| `/holdpay/api/v1/deals/<deal_id>/reviews` | Submit a 1–5 buyer rating and optional `comment` after completion. |
| `/holdpay/api/v1/service-providers` | List verified sellers eligible to provide services. |
| `/holdpay/api/v1/service-contracts` | List agreements involving the current account, or propose a service agreement as a verified buyer. |
| `/holdpay/api/v1/service-contracts/<contract_id>/accept` | Let the selected verified seller accept the exact proposed scope, price, and milestones. |
| `/holdpay/api/v1/service-contracts/<contract_id>/milestones/<milestone_id>/submit` | Submit the next agreed stage as delivered. |
| `/holdpay/api/v1/service-contracts/<contract_id>/approve` | Approve a delivered milestone or the full job, according to the agreement. |
| `/holdpay/api/v1/service-contracts/<contract_id>/concern` | Pause an active service agreement and record a concern. |
| `/holdpay/api/v1/service-contracts/<contract_id>/resolve-concern` | Have one party record agreement to resume; both client and provider must agree. |

### Common request parameters

Role selection:

```json
{"role":"buyer"}
```

Agent role selection:

```json
{"role":"agent","operating_area":"Nakuru"}
```

Create a draft listing (sellers can publish it by using `"state":"published"`):

```json
{
  "action":"create",
  "name":"Handmade basket",
  "description":"Woven locally",
  "price":2500,
  "state":"draft"
}
```

Create an order:

```json
{
  "action":"create",
  "listing_id":12,
  "agent_id":34,
  "payment_method":"mpesa_paybill",
  "buyer_note":"Please contact me when it arrives."
}
```

An order must have an assigned, verified pickup agent. Use `/holdpay/api/v1/agents`
to discover eligible pickup points first.

Supported payment method identifiers are `mpesa_till`, `mpesa_pochi`,
`mpesa_paybill`, and `globalpay`. They identify the buyer's intended method
only. In this backend all new orders have `payment_status: "not_configured"`;
no checkout, collection, settlement, refund, or custody operation is performed.
The seller cannot begin handover until payment is later confirmed by an approved
provider integration. Do not mark payment confirmed manually in production.

Milestone `action` values, in order:

1. `seller_handover` — seller, only after provider payment confirmation.
2. `agent_received` — assigned verified pickup agent.
3. `buyer_collected` — assigned verified pickup agent.
4. `buyer_confirm` — verified buyer; completes the deal.

Only a buyer or seller can open a concern. The assigned verified agent may
record a resolution; the deal returns to its pre-dispute milestone and still
requires the buyer's collection confirmation to complete.

## Service agreements

Verified sellers can also act as service providers; there is no separate
worker role in this first concept. A verified buyer proposes a written scope,
service category, agreed price, milestone descriptions and amounts, and one of
two approval modes:

- `per_milestone`: the provider submits stages in order and the buyer approves
  each stage before the next one can be submitted.
- `final`: the provider submits all stages in order, then the buyer approves
  the complete job once.

The seller must accept the proposal before work can start. Acceptance confirms
the proposed scope, price, milestone plan, and approval mode; these contract
terms are read-only after proposal through the API. If the parties need a
change, create a revised agreement rather than silently editing accepted
terms. The model stores the KES milestone allocations and enforces that they
sum to the agreed total.

Example proposal request to `/holdpay/api/v1/service-contracts`:

```json
{
  "action": "create",
  "seller_id": 34,
  "title": "Renovate a two-room home",
  "category": "construction",
  "scope": "Repair the roof, plaster two rooms, and paint the agreed walls at the specified site.",
  "agreed_price": 120000,
  "approval_mode": "per_milestone",
  "milestones": [
    {"description": "Site inspection and materials plan", "amount": 10000},
    {"description": "Roof and wall repairs", "amount": 80000},
    {"description": "Painting, inspection, and handover", "amount": 30000}
  ]
}
```

After the seller accepts, the seller submits the next milestone as delivered.
For `per_milestone`, the buyer approves that stage before work can advance. For
`final`, the buyer approves only when every stage has been submitted. Both
parties may raise a concern; the demo returns the agreement to active only
after both record that the discussion is resolved. This is not independent
arbitration.

Approval is a record of the agreed work status only. The current backend does
not collect, segregate, hold, release, or refund money; `payment_status` is
`not_configured` until any approved provider integration exists. Even a
successful service approval response explicitly states that no funds were
released. Do not represent this as escrow or guarantee provider payment.

## Authorization and verification

- Account role, KYC state, and business verification are read from the
  server-side contact, never accepted as verified values from a client.
- Buyer activity requires approved identity/age KYC. Sellers and pickup agents
  also require approved business verification.
- API routes use explicit ownership/participation checks. Portal users have
  read-only model ACLs; controlled API operations use server-side validation
  before writing.
- Listing visibility is limited to published listings, plus the current
  seller's own listings.
- Orders are limited to their buyer, seller, and assigned agent. Case details
  are limited to the reporter and the assigned agent/participants.
- Reviews can only be submitted once per completed order by its buyer.
- Model identifiers are database-local integer IDs. Treat them as opaque.

## Not implemented

This addon does not include KYC vendor callbacks, document storage, email/SMS
verification, payment provider credentials/webhooks, automatic settlement,
refunds, pickup-network integrations, native push notifications, rate limiting,
or production monitoring. It also does not provide licensed professional
verification, construction permits/inspections, insurance, independent
arbitration, or a legal contract service. These need security, privacy,
provider, and operating model decisions before launch. The Flutter app has
not yet been wired to these API routes.

## Proposed parcel-to-unregistered-recipient flow (not implemented)

This is a planned extension, not a route or capability in the current addon.
Example: a verified sender in Nairobi sends goods to a relative in Kakamega
who has never registered with HoldPay.

1. The sender creates a parcel request using an active, verified HoldPay
   account. The request records sender, recipient phone number, parcel
   description/category, destination pickup point, and agreed service terms.
   The sender is responsible for entering the recipient's number accurately
   and confirming permission to use it.
2. An eligible origin agent accepts the parcel and records its condition and
   handover. An agreed carrier transports it to the destination pickup point.
   HoldPay must not list a location or carrier until participation and
   operating terms are confirmed.
3. The destination agent records arrival. Only then does HoldPay enqueue an
   SMS to the recipient with collection instructions, location/opening
   details, parcel reference, and a one-time pickup code. The recipient needs
   no account, app, or data bundle just to collect a parcel addressed to them.
4. At pickup, the recipient presents that SMS code to the pickup agent. The
   agent opens the provider's USSD service and enters the parcel reference and
   code. The provider forwards an authenticated session/callback to HoldPay.
   The backend verifies the caller is an assigned, active agent, the parcel is
   ready at that pickup point, the recipient code is valid, unexpired, and
   unused, and attempt limits have not been exceeded.
5. After successful verification, the code is consumed once and the backend
   records the agent, timestamp, pickup point, and handover result. The agent
   gives the parcel to the recipient and closes the USSD session. The
   recipient confirms possession by presenting the SMS code; the agent
   confirms the completed physical handover through USSD. The SMS code is a
   claim/handover check, not proof of legal identity, citizenship, or KYC.
6. HoldPay sends a receipt/status SMS if the SMS provider is available. Sender
   notifications must not disclose or repeat the recipient's secret pickup
   code.

The code should be generated using a cryptographically secure random
generator, stored only as a keyed hash, expire after a configured short window,
be invalid after a successful use, and have strict per-parcel, per-agent, and
per-phone attempt limits. Resending or replacing a code must invalidate the
previous code. Do not put codes in URLs, app/browser responses, ordinary logs,
or analytics. The SMS outbox must track delivery separately from parcel state
and retry safely using an idempotency key; an SMS delivery receipt is not proof
of pickup.

The agent's USSD session must be authenticated by the selected provider and
bound to a server-verified agent identity. Never trust an agent ID or phone
number supplied only as ordinary USSD input. Provider callbacks require TLS,
authenticity/signature verification, replay protection, and idempotent
processing. USSD short codes, session formats, callback security, charges,
availability, and coverage must be agreed with a real provider; no HoldPay
short code or SMS integration currently exists.

Before implementation, define parcel acceptance and prohibited-goods rules,
size/weight limits, pricing and liability, origin-to-destination custody,
late/lost/damaged/rejected parcels, storage limits, code recovery, failed-SMS
handling, accessible alternatives for recipients without a working phone, and
complaints/refunds. Keep parcel carriage and any payment/escrow arrangement
separate unless the responsible approved partners and operating model are
confirmed.
