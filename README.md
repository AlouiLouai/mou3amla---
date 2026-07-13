# SQUAD

**Pay anyone, from any wallet you already have — SQUAD never touches your money.**

SQUAD is a zero-liability payment *routing layer* for Tunisia, built on top
of TUNPAY (BCT/SMT's interoperability rail). It maps a public `@username` to
a destination-only routing identifier for a real provider — Flouci, D17,
walletii, BIAT, Amen Pay, and more — and hands the actual transfer off to the
payer's own banking app. SQUAD never holds a balance, moves funds, or stores
a banking credential; it only routes.

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

## What SQUAD does

SQUAD sits on top of the wallets you already have instead of replacing them
— and, critically, it never becomes a custodian of anyone's money:

- **Link every wallet you use, once.** Flouci, D17, walletii, BIAT, Amen
  Pay, Orange Money, Zitouna Pay, Sobflous, ClicToPay — connect the ones you
  use to one `@username`, giving each only its public routing identifier
  (wallet tag / merchant id / RIB). No PINs, no passwords, no balances.
- **Generate a payment intent, not a transfer.** Pick a source, enter an
  amount, and SQUAD builds a standard TUNPAY payload and deep-links straight
  into your own banking app to actually move the money (with a web-gateway
  fallback if no app claims the link). SQUAD hands off; your bank executes.
- **Find each other without typing anything.** A rotating, expiring QR code
  (and, on a native app down the line, BLE proximity) resolves who you're
  paying — not how much money either of you has.
- **Mode Professionnel.** Merchants and freelancers get a Matricule Fiscal
  field and an El Fatoora micro-invoice view (with CSV export) generated
  automatically from confirmed payment intents.

## Why now

This only works because the wallets themselves are no longer siloed at the
infrastructure level: **BCT (Banque Centrale de Tunisie)** and **SMT
(Société Monétique Tunisie)** built **TUNPAY**, the national interoperable
instant-payment switch that lets money move between different wallets and
banks under one regulated, authorized rail. Before TUNPAY, cross-wallet P2P
required bilateral deals between every pair of providers — impractical to
scale. Now that interoperability is a legal, central-bank-backed utility,
SQUAD's job is to be the routing/alias layer on top of it — never the one
holding the money — so paying someone is as simple as knowing their
`@username`, no matter which wallet either side actually banks with.

## Status

This is a fully interactive, end-to-end prototype of the product experience
— phone auth, profile + wallet registry onboarding, QR-based discovery, and
the full payment-intent generation flow all work and are navigable today.

**Try the full user-to-user flow yourself:** tap the profile row on Home to
open the account switcher — it lets you preview the app as a second seeded
persona ("Ahmed Karray") in the same browser tab, so you can send a payment
as yourself, switch accounts, and watch it actually land in Ahmed's Activity
feed and invoices. There's exactly one real identity per person in
production; this switcher is a demo-only convenience so the two-sided flow
is visible without a second device — see
[docs/06-conventions.md](docs/06-conventions.md#mocked-vs-real-boundaries-in-the-squad-feature).

Several pieces are intentionally simulated rather than wired to real
infrastructure: OTP (any 4-digit code), the bank's completion callback, and
BLE proximity (Web Bluetooth can't advertise from a browser — that needs a
native app). Same doc section above has the exact list of what's mocked and
where a real integration would plug in.

## Getting started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
pnpm build   # production build (Turbopack + Serwist service worker)
pnpm start   # serve the production build
pnpm lint
pnpm typecheck
```

## Documentation

Full technical specs — tech stack, architecture, PWA setup, conventions, and
an agent-guardrails checklist for anyone (human or AI) working in this repo
— live in [docs/](docs/README.md). Start there before making structural
changes.
