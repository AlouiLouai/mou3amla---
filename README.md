# Mou3amla

**Pay anyone, from any wallet you already have — Mou3amla never touches your money.**

Mou3amla (Tunisian Arabic for "transaction") is a zero-liability payment
*routing layer* for Tunisia, built on top of TUNPAY (BCT/SMT's
interoperability rail). It maps a public `@username` to a destination-only
routing identifier for a real provider — Flouci, D17, walletii, BIAT, Amen
Pay, Orange Money, Zitouna Pay, and more — and hands the actual transfer off
to the payer's own banking app. Mou3amla never holds a balance, moves funds,
or stores a banking credential; it only routes.

<p align="center">
  <img src="docs/assets/screen-auth.png" width="200" alt="Sign in screen" />
  <img src="docs/assets/screen-home.png" width="200" alt="Home screen with linked accounts" />
  <img src="docs/assets/screen-send.png" width="200" alt="Generate a payment intent" />
  <img src="docs/assets/screen-success.png" width="200" alt="Payment intent confirmation" />
</p>

## The problem

Mobile wallets in Tunisia are siloed. If you use Flouci and a friend uses
walletii, you can't send them money directly — you're stuck with cash, a
bank transfer, or asking them to also get your wallet. Every wallet is its
own island, and users end up juggling three or four apps just to stay
reachable by everyone they know.

## What Mou3amla does

Mou3amla sits on top of the wallets you already have instead of replacing
them — and, critically, it never becomes a custodian of anyone's money:

- **Link every wallet you use, once.** Flouci, D17, walletii, BIAT, Amen
  Pay, Orange Money, Zitouna Pay, Sobflous, ClicToPay — connect the ones you
  use to one `@username`, giving each only its public routing identifier
  (wallet tag / merchant id / RIB). No PINs, no passwords, no balances.
- **Generate a payment intent, not a transfer.** Pick a source, enter an
  amount, and Mou3amla builds a standard TUNPAY payload and hands off to a
  checkout that actually moves the money. Mou3amla routes; the provider
  executes.
- **Find each other without typing anything.** A rotating, signed QR code,
  or an AirDrop-style nearby handoff — pick a 5-digit code from a short list
  of nearby options, both sides confirm, and only then is the recipient
  revealed. Either way, you're resolving *who* you're paying, never *how
  much* money either side has.
- **Mode Professionnel.** Merchants and freelancers get a Matricule Fiscal
  field and an El Fatoora micro-invoice view, generated automatically from
  confirmed payment intents.

## Why now

This only works because the wallets themselves are no longer siloed at the
infrastructure level: **BCT (Banque Centrale de Tunisie)** and **SMT
(Société Monétique Tunisie)** built **TUNPAY**, the national interoperable
instant-payment switch that lets money move between different wallets and
banks under one regulated, authorized rail. Before TUNPAY, cross-wallet P2P
required bilateral deals between every pair of providers — impractical to
scale. Now that interoperability is a legal, central-bank-backed utility,
Mou3amla's job is to be the routing/alias layer on top of it — never the one
holding the money — so paying someone is as simple as knowing their
`@username`, no matter which wallet either side actually banks with.

## Status

This is a fully interactive, end-to-end prototype of the product experience.
Some of it is real, some of it is intentionally simulated and visibly
labeled as such in the UI — the full breakdown lives in
[docs/06-conventions.md](docs/06-conventions.md#mocked-vs-real-boundaries-in-the-mou3amla-shell),
but the short version:

**Real today:** phone + `@username` sign-in with a self-hosted WebAuthn
passkey gate (no OTP, no password, ever stored); linked destinations,
payment history, and notifications persisted in Supabase; server-minted,
signed QR tokens; the nearby handoff's mutual-accept handshake, delivered
live over Supabase Realtime.

**Simulated, clearly labeled where it appears:** identity verification (no
real eKYC provider integrated yet); the bank-side payment completion
callback (Mou3amla doesn't verify settlement itself); and BLE proximity
itself — a browser PWA can't advertise over Bluetooth, so "nearby" discovery
uses a coarse-geolocation-bounded handoff code instead of real proximity
detection.

**Try the two-sided flow yourself:** there's no built-in demo account
switcher, so sign up twice — two different phone numbers, in two separate
browser profiles (or one regular, one incognito) — send a payment from one
identity to the other, and watch it land in the recipient's own Activity
feed.

## Getting started

You'll need a Supabase project (see `.env.example` for the required keys,
and `supabase/migrations/` for the schema to apply).

```bash
pnpm install
cp .env.example .env   # fill in your Supabase project's keys
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
pnpm build      # production build (Turbopack + Serwist service worker)
pnpm start      # serve the production build
pnpm lint
pnpm typecheck
pnpm test
```

## Documentation

Full technical specs — tech stack, architecture, PWA setup, conventions, and
an agent-guardrails checklist for anyone (human or AI) working in this repo
— live in [docs/](docs/README.md). Start there before making structural
changes.
