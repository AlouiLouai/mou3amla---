# BCT Sandbox Readiness

Last updated: 2026-07-24

This note is a practical preparation document for presenting **Mou3amla** to
the **Banque Centrale de Tunisie (BCT)** Sandbox.

It is not legal advice. It is a working checklist based on:

- BCT Sandbox page: `https://fintech.bct.gov.tn/fr/sandbox`
- BCT Sandbox guide PDF: `https://fintech.bct.gov.tn/sites/default/files/2020-02/Guide%20Vfinal.pdf`
- BCT Sandbox Express page: `https://fintech.bct.gov.tn/fr/sandbox-express`
- Flouci official docs: `https://docs.flouci.com/`
- Tunisia Mobile ID / E-Houwiya public information: `https://idaraty.tn/fr/e-houwiya`

## Short answer

Mou3amla is a credible **ordinary BCT Sandbox candidate** if it is presented as:

- an innovative payment-routing layer
- a controlled experiment with volunteer users
- a zero-liability product that does not hold customer funds
- a product with clear mock boundaries and a realistic roadmap

Mou3amla is **not yet ready** to be presented as:

- a production-ready licensed payment operator
- a fully deployed eKYC onboarding platform
- a live interoperable payment rail already connected to every bank/wallet

For **Sandbox Express**, Mou3amla is **not the right fit today** unless it is
carried by a licensed bank or financial institution partner.

## What the BCT wants to see

Based on the BCT guide, the main eligibility points are:

1. Innovation
2. Clear customer benefit
3. Clear communication to volunteer clients
4. A technically tested solution
5. Readiness for regulatory testing, including protections and loss scenarios
6. A realistic post-test deployment plan

The BCT also asks for:

- a description of the candidate
- technical and business capability
- a test plan
- test scenarios
- an estimate of direct and indirect losses
- success/failure indicators
- a communication plan for volunteer users
- a transition plan after the test
- an exit plan if the test fails or is interrupted

## Where Mou3amla is already strong

- Clear innovation thesis: `@username`-based routing on top of Tunisian
  payment rails.
- Strong positioning for inclusion and usability.
- Zero-liability architecture: Mou3amla does not hold balances or move funds
  itself.
- Durable transaction history and notification trail.
- Honest mock labeling for KYC and payment checkout.
- Serious product framing for routing, auditability, and user protection.

## On-screen demo affordances already implemented

These were added directly to the live demo to make the BCT eligibility
pillars (innovation, quantifiable client benefit, technically tested
solution, regulatory risk management, volunteer client protection, exit
strategy) visible on screen rather than only in this document:

- **Test-limit cap**: `BCT_SANDBOX_TEST_LIMIT_TND` in
  [../src/features/payments/constants.ts](../src/features/payments/constants.ts)
  (currently 500 TND) is enforced both server-side (`sendPaymentSchema` in
  `payments/server/actions.ts`) and client-side (`generate-intent-screen.tsx`,
  `use-payment-actions.ts`), and shown as a badge under the amount on the
  send screen. This is a **proposed** figure for the written test plan, not
  a number BCT has mandated - change the constant if the submitted test plan
  uses a different cap.
- **Identity/architecture badges**: "Passkey Verified" and "Non-Custodial"
  badges on the sender/receiver cards in the mock checkout
  (`app/dev/mock-checkout/page.tsx`). Both are true today, not aspirational -
  every account is passkey-gated and Mou3amla never holds a balance.
- **Orchestration fee line**: Order Summary shows "0.000 TND (Free P2P
  Routing)" - accurate because there is no fee logic anywhere in
  `payments/` today.
- **Volunteer disclosure checkbox**: `mock-checkout-controls.tsx` requires an
  explicit acknowledgement ("routed in a controlled BCT Regulatory Sandbox
  environment... no real funds are held") before the Simulate Success/Failure
  buttons unlock.
- **Dispatch log / audit payload viewer**: `DispatchLogButton`
  (`payments/components/dispatch-log-button.tsx`) opens a JSON view built
  from the session's real `payment_transactions` row (ref id, provider,
  amount, status) - not a static sample. Useful as a live audit-trail demo
  for BCT reviewers.
- **Onboarding progress + honest-preview affordances** (added 2026-07-24):
  `auth-screen.tsx` and `passkey-screen.tsx` (register mode) show a 3-step
  "Device Connected / Build Profile / Secure Passkey" progress bar
  (`onboarding-stepper.tsx`) to demonstrate a low-friction, quantifiable
  time-to-onboard journey - a KPI the sandbox test plan's success metrics
  section already asks for. `proximity-sandbox-preview.tsx` lets a
  not-yet-registered visitor try the nearby-handoff radar before any signup
  step, and is explicitly labeled a simulated preview that contacts no real
  device or endpoint - same "clear customer benefit before commitment" and
  "honest mock labeling" principles the KYC demo panel already follows.
  `generate-intent-screen.tsx` now anchors the 0-fee P2P claim next to a
  visibly grayed-out "traditional bank transfer: fees apply" chip - no
  specific commission figure is invented (see guardrail #12), so this stays
  a qualitative, defensible comparison rather than a claim about any named
  bank's actual pricing.

None of this replaces the actual written dossier (test plan, risk register,
volunteer notice, etc.) required below - it makes the product itself
demonstrate the same commitments the paperwork will describe.

## Auth hardening audit (2026-07-24)

A targeted audit of the passkey auth path against "will BCT find this
secure, performant, and rate-limited" turned up one real gap, now fixed:
`getPasskeyRegistrationOptions`, `verifyPasskeyRegistration`,
`getPasskeyAuthenticationOptions`, and `verifyPasskeyAuthentication` had no
rate limiting at all, unlike `startPhoneAuth` right next to them - all four
are now IP-rate-limited the same way (see "Auth conventions" in
[06-conventions.md](./06-conventions.md)). Everything else checked out:
`checkRateLimit` is an atomic Postgres-function-backed fixed window (not
in-memory, so it's correct across multiple server instances - a real
scalability requirement, not just a correctness one), WebAuthn requires
`userVerification: "required"` on both registration and authentication (BCT
circular 2020-11's "authentification forte"), RP ID/origin are strictly
validated server-side, credentials are stored in Mou3amla's own table (not
trusting a client-supplied user id), and every phone/handle mismatch message
is deliberately vague enough to avoid account enumeration. The one accepted
tradeoff worth stating plainly in the regulatory test plan: rate limiting
"fails open" if the DB check itself errors, so it's explicitly defense in
depth on top of WebAuthn's own cryptographic guarantee, not the sole control.

## What Mou3amla misses right now

These are the main gaps today:

### 1. Real KYC

Current state:

- The in-app KYC flow is explicitly simulated.
- It is good for UX demonstration, but not enough for a strong regulatory file
  on its own.

What is missing:

- a real provider integration, or
- a signed partnership path, or
- a regulator-credible plan describing exactly which provider or identity rail
  will be used after sandbox admission

### 2. Real payment-provider handoff

Current state:

- Most send-money flows still use an internal mock checkout.
- Konnect is now wired as a real hosted sandbox pay-in path, which is stronger
  for demo credibility than a mock-only story.
- This is better than a fully mocked payment layer, but it is still not the
  same thing as a production-ready interoperable settlement partnership.

What is missing:

- a settlement partner path that matches Mou3amla's cross-provider routing
  thesis, not just merchant collection
- a signed integration roadmap with one regulated partner, or
- a precise explanation of what the sandbox is meant to validate before deeper
  interoperable integrations go live

### 3. Formal sandbox test package

Current state:

- The app exists and works.
- The regulatory experiment package around it is still missing.

What is missing:

- a written test plan
- volunteer-user communication
- loss estimation
- incident procedure
- success metrics
- stop-test and rollback procedure

### 4. Commercialization and regulatory path

Current state:

- The product idea is clear.
- The deployment route after sandbox is not yet strong enough.

What is missing:

- whether Mou3amla will operate via partnership, technical-service model, or
  future licensing path
- a business plan
- a post-sandbox transition plan

### 5. Some demo-only product areas

Current state:

- invoices/stamp duty are still placeholder-level
- nearby is still a web-safe simulation, not real BLE
- some presentation flows are still demo framing rather than market-ready

What is missing:

- either hide these areas in the BCT demo, or
- label them clearly as non-core / future phase

## What you need exactly before applying

Prepare the following package.

### A. Candidate profile

You need:

- founder/company summary
- current status: individual founder, startup in formation, or registered
  entity
- technical capability summary
- product scope summary
- realistic financial situation summary

Important:

- The ordinary Sandbox is open beyond already licensed institutions, but you
  still need to look operationally serious.
- A registered entity will help a lot, even if it is not a bank.

### B. Product note

You need a 2-4 page note that explains:

- what Mou3amla does
- what problem it solves in Tunisia
- why it is innovative
- what is real today
- what is mocked today
- what the sandbox should validate

Recommended framing:

`Mou3amla is a zero-liability payment-routing layer that maps a public
@username to a destination-only banking or wallet route, allowing faster and
more interoperable payment initiation without Mou3amla ever holding customer
funds.`

### C. Regulatory test plan

You need a written plan containing:

- objective of the test
- exact user journeys to test
- test duration
- number of volunteer users
- max transaction amounts
- max number of transactions
- environments used
- what is mocked
- what is live
- success criteria
- failure criteria
- reporting frequency

### D. Risk and protection pack

You need:

- user-risk register
- fraud-risk register
- outage/incident procedure
- complaint-handling process
- data-protection summary
- loss estimation table
- mitigation controls

At minimum define:

- no real money moved in mock flow
- max exposure per tester
- no irreversible user action without warning
- immediate test suspension rules

### E. Volunteer-user communication pack

You need a short written notice for testers covering:

- this is a sandbox/test product
- purpose of the experiment
- what is real and what is simulated
- key risks
- support contact
- complaint path
- consent to participate
- what happens if the test stops

### F. Success metrics

You need measurable KPIs such as:

- time to onboard
- time to create a payment route
- time to initiate a payment
- success/failure rate
- user understanding of who holds funds
- number of support issues
- notification delivery reliability
- number of blocked or suspicious attempts

### G. Post-test plan

You need:

- the partner strategy after successful sandbox completion
- the licensing or approval path
- the commercialization sequence
- the rollout constraints

## Can friends test the app?

Yes, but they must be treated as **volunteer test users**, not informal random
users.

That means:

- choose them intentionally
- limit their number
- define exactly what they will test
- give them written information
- collect explicit consent
- control the risk
- document outcomes

## Recommended friend-test structure

Use a small pilot like this:

- 10 to 20 volunteer users
- 2 to 4 weeks
- 2 user roles: sender and receiver
- no real-money settlement in the mock flow
- capped scenarios only
- one support contact
- one incident log

Suggested scenarios:

1. account creation and passkey onboarding
2. demo identity verification flow
3. wallet/bank route linking
4. QR receive flow
5. nearby handoff flow
6. send-money into Mou3amla mock checkout or Konnect hosted sandbox checkout
7. sender activity confirmation
8. receiver notification and activity confirmation

## What to tell the BCT about user testing

In the application dossier, say clearly:

- the users are volunteer testers
- the test is controlled
- the product includes mocked components
- the main objective is to validate UX, routing logic, security controls, and
  operational assumptions
- no real money is moved in the mocked provider flow
- customer risks are bounded and disclosed

## Suggested volunteer notice

You can adapt this for test users:

```text
Mou3amla is currently being tested in a controlled experimental environment.
Some functions are real application functions, while others are simulated for
testing purposes, including the current payment checkout and identity
verification demo flow.

By participating, you acknowledge that:
- this is a test product and not a production banking application;
- some payment and identity flows are indicative only;
- no real money should be assumed to move unless explicitly confirmed in a
  live approved test phase;
- support incidents, interruptions, or changes may occur during the test;
- your feedback and observed issues will be documented for product and
  regulatory testing purposes.
```

## Flouci sandbox: what this means for Mou3amla

As of 2026-07-20, the official Flouci docs say:

- Flouci Gateway is available for registered businesses in Tunisia, including
  auto-entrepreneurs and companies.
- After uploading an **RNE**, sandbox access is granted so testing can begin,
  even before KYB review is complete.
- Production requires KYB approval.

What this means in practice:

- If you **do not have an RNE or registered business profile yet**, you should
  assume you **cannot rely on Flouci's standard self-serve sandbox onboarding**
  today.
- You can still **contact Flouci** to discuss partnership or exploratory
  access, but the official public docs are built around a registered business
  onboarding flow.

Recommended action:

1. Register the company as soon as possible.
2. Obtain the RNE.
3. Then open a Flouci business/developer account.
4. In parallel, contact Flouci support or business development and explain
   that Mou3amla is a BCT Sandbox candidate exploring interoperability.

Useful official Flouci pages:

- Account creation: `https://docs.flouci.com/getting-started/create-an-account`
- Test environment: `https://docs.flouci.com/essentials/testing`
- Go live: `https://docs.flouci.com/essentials/production`

## KYC options in Tunisia: what can be said safely

### What I could verify publicly

As of 2026-07-20, I could verify:

- Tunisia has an official digital identity path through **Mobile ID /
  E-Houwiya**, described publicly on Idaraty.
- Flouci's official docs expose **eKYC/eKYB APIs** available to partners on
  demand and say configuration is done with **Kaoun**.

Useful public sources:

- E-Houwiya / Mobile ID: `https://idaraty.tn/fr/e-houwiya`
- Flouci eKYC/eKYB: `https://docs.flouci.com/api-reference/eKYC-eKYB`

### What I could not verify publicly

I could **not** verify a public official BCT or INPDP whitelist that says
`these are the officially approved private eKYC vendors for Tunisia`.

So the safe conclusion is:

- do **not** assume that a vendor claiming "Tunisia KYC coverage" is
  automatically regulator-accepted for your use case
- do **not** present any private vendor as "officially verified by BCT" unless
  you have direct written confirmation

### Best current paths for Mou3amla

The most credible options today are:

1. **Partner-led KYC path**
   Work with a regulated bank/wallet partner whose KYC process already exists.

2. **Flouci / Kaoun exploratory path**
   Ask whether their partner eKYC/eKYB stack can support your future sandbox
   design.

3. **E-Houwiya watch-and-align path**
   Monitor whether official digital identity rails become practically usable for
   your onboarding or authentication needs.

## Recommended immediate next steps

1. Create a legal entity and obtain the RNE.
2. Prepare a BCT-facing 3-page concept note.
3. Prepare the regulatory test plan and volunteer-user notice.
4. Run a controlled friend pilot with documentation.
5. Build a measurable KPI sheet from that pilot.
6. Contact Flouci for partnership/sandbox discussion once your entity is ready.
7. Prepare a KYC roadmap with one primary option and one fallback option.
8. Hide or clearly label non-core demo-only features during BCT presentation.

## Minimum BCT application pack for Mou3amla

Before submission, Mou3amla should have at least:

- candidate summary
- product note
- innovation justification
- customer-benefit note
- sandbox test plan
- volunteer-user communication notice
- risk register
- incident process
- loss estimation table
- KPI list
- post-test deployment plan
- KYC roadmap
- provider/partner roadmap

## Final positioning recommendation

The strongest BCT message is not:

`We already built a full payment super-app.`

The strongest BCT message is:

`We built a controlled, zero-liability interoperability layer for Tunisia that
can be tested safely with volunteer users to validate customer benefit,
security controls, and regulatory fit before deeper provider integrations and
commercial rollout.`
