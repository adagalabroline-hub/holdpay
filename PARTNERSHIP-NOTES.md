# HoldPay partnership discussion notes

These notes accompany the browser prototype. HoldPay is an early-stage concept; no partner, integration, pilot, customer, or transaction is claimed.

## Concept

HoldPay explores a local-commerce flow connecting a buyer and seller with a chosen pickup agent. The prototype illustrates catalogue discovery, agreed order details, simulated payment status, handover tracking, buyer confirmation, reviews, and a concern-reporting path.

## Potential partner discussion

Conversations with mobile-money providers, banks, and agent networks could assess:

- Whether a partner-approved payment and settlement product can support the proposed customer journey.
- Which party would receive, safeguard, and settle funds, under what legal and regulatory model.
- Whether participating agent locations could support parcel collection, proof of handover, and customer assistance.
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
