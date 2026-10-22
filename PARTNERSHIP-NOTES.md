# HoldPay partnership discussion notes

These notes accompany the browser prototype. HoldPay is an early-stage concept; no partner, integration, pilot, customer, or transaction is claimed.

## Concept

HoldPay explores a local-commerce flow connecting a buyer and seller with a chosen pickup agent. The prototype illustrates catalogue discovery, agreed order details, simulated payment status, handover tracking, buyer confirmation, reviews, and a concern-reporting path.

## Service work and milestone agreements

HoldPay can also support work performed by a person or small business, such as
construction/renovation, repairs, professional services, delivery, or other
agreed tasks. In the first version, existing verified sellers can offer
services; a separate worker account type is not required.

1. A client selects a verified seller/service provider and writes the work
   scope, location/details, total price, and measurable milestone descriptions
   with an amount allocated to each milestone.
2. The client chooses, for that agreement, either approval of every stage or
   one final approval after all work is submitted.
3. The provider reviews and accepts the exact proposed terms before work
   begins. Changes require an agreed revised proposal so price/scope changes
   are visible to both parties.
4. The provider marks a milestone delivered and the client records approval,
   or either party raises a concern to pause the workflow. A concern is not
   automatically decided by HoldPay; independent mediation and any appeal
   process need separate design.
5. Once the contract's chosen approval condition is met, the prototype records
   completion. The current system does not collect or release the agreed
   amount.

For construction and regulated professions, a platform review is not a
replacement for permits, inspections, insurance, professional licensing,
technical acceptance, or statutory consumer protections. A pilot needs to
define acceptable evidence, scope changes, client-supplied materials, defects,
rework, delays, abandonment, safety responsibilities, dispute escalation, and
whether milestone percentages or amounts are retained when a job is paused.

## Proposed parcel sending for an unregistered recipient

A complementary use case is a verified sender in Nairobi sending goods to a
relative in Kakamega who does not have a HoldPay account. The recipient should
not need to register or install the app merely to collect a parcel.

Proposed journey:

1. The verified sender enters the recipient's Kenyan mobile number, parcel
   details, and a destination pickup point, and accepts the service terms.
2. An authorized origin agent records parcel acceptance and condition. An
   agreed carrier transports it to the destination pickup point.
3. When the destination agent records parcel arrival, HoldPay queues an SMS
   containing collection instructions, location and opening details, a parcel
   reference, and a one-time pickup code.
4. At collection, the recipient presents that SMS code to the pickup agent.
   The agent uses a provider-provisioned USSD service to submit the parcel
   reference and code. HoldPay verifies the authenticated agent session and
   checks that the parcel is ready at that location and the code has not
   expired, been used, or exceeded its attempt limit.
5. After successful verification, the code is consumed and the agent records
   the physical handover through USSD. The recipient's code confirms possession
   of the message/phone and authorizes the collection workflow; it is not
   identity verification or legal proof of who the recipient is.

This flow is a proposal only. The current website, Flutter app, and Odoo addon
do not send SMS, issue parcel pickup codes, transport parcels, or provide USSD
verification. It requires an SMS provider, a USSD aggregator and allocated
short code, participating origin/destination pickup points, and a contracted
carrier. Do not imply any named organization has agreed to participate.

Design requirements before a pilot include sender consent and accurate
recipient phone entry; one-time, short-lived, attempt-limited codes; secure
code hashing and no secret-code logging; code invalidation on resend; signed
and replay-protected USSD callbacks; verified agent/session binding; SMS retry
and delivery tracking; and a receipt notification that never repeats the
recipient's secret. Define prohibited goods, parcel limits, fees, custody and
liability at each handoff, late/lost/damaged/rejected parcels, code recovery,
recipients without phone access, support, and complaints before accepting
real parcels.

## Potential partner discussion

Conversations with mobile-money providers, banks, and agent networks could assess:

- Whether a partner-approved payment and settlement product can support the proposed customer journey.
- Which party would receive, safeguard, and settle funds, under what legal and regulatory model.
- Whether participating agent locations could support parcel collection, proof of handover, and customer assistance.
- Whether a contracted carrier and participating origin/destination pickup points could support a Nairobi-to-Kakamega parcel pilot, including custody, parcel limits, and service levels.
- Which SMS and USSD provider could deliver receiver instructions and support authenticated, one-time-code verification by an authorized pickup agent.
- What customer identification, fraud controls, privacy safeguards, complaints handling, and consumer disclosures are required.
- Which product categories, locations, limits, and operating hours are appropriate for a small pilot.

The prototype does not assume that a payment provider or agent is authorized to act as an escrow provider. Product structure, custody of funds, settlement triggers, and dispute responsibilities must be designed and approved with appropriately qualified partners and advisers before any real-money test.

## Example pilot questions

1. Which buyer and seller use case has a clear, testable delivery problem?
2. What is the smallest practical seller cohort and pickup footprint?
3. How is parcel identity and condition recorded at each handoff?
4. What happens when a parcel is late, damaged, missing, or rejected?
5. Who owns support, investigation, refunds, chargebacks, and escalation?
6. Which measures and thresholds should determine whether the pilot continues?
7. What happens if an unregistered recipient's SMS is delayed, the phone is lost, the pickup code expires, or the recipient cannot use a phone?

Possible measures to agree before launch include completed-order rate, successful pickup rate, time to collect, order cancellation rate, complaint rate, time to resolve complaints, customer satisfaction, repeat usage, and agent workload. The prototype contains no measured results or target claims.

## Prototype walkthrough

Open `index.html` in a modern browser. Demo changes are stored in that browser's local storage:

- **Buyer:** start an order, simulate a payment status, confirm collection, approve completion, and leave a review.
- **Seller:** add a catalogue listing and mark an order as sent to its pickup point.
- **Pickup agent:** confirm receipt of an order or record a delivery concern. Buyer and seller can separately mark the concern resolved before the demo flow resumes.
- Use **Switch account** to move between the sample roles. **Reset demo data** clears browser-stored demo activity and restores the sample marketplace.

No passwords are requested or stored. This is not real authentication. Payment, funds custody, shipping, identity checks, agent verification, ratings, and mediation are simulations only. Data remains in the current browser and is not shared between devices or users.

## Website sign-up and app KYC

The website requests only a name, email, account role, and (for pickup agents) operating area. It creates an incomplete profile marked `pending-mobile-app`; that profile cannot access marketplace, listing, or deal actions. The pending screen directs the user to complete KYC in the HoldPay phone app. Buyers must verify Kenyan citizenship, age 18+, and identity in the app. Sellers and pickup agents must also provide business registration documents there.

This prototype has no phone-app deep link, KYC integration, or verification status service, so website profiles remain pending. Sample demo accounts are separate walkthrough fixtures and bypass this gate. A production version must receive an authenticated verification decision from the app/backend; never treat a client-controlled browser flag as verified KYC.

## Parcel feature status

The proposed sender-to-unregistered-recipient journey is documented in
`BACKEND-API.md`. It has not been implemented in the browser, mobile app, or
Odoo backend. Any eventual SMS/USSD demonstration must be clearly marked as a
simulation unless live provider integrations and contracts are in place.
