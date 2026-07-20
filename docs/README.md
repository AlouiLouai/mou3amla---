# Mou3amla - Project Specs

`mou3amla` is the repo/company name (Tunisian Arabic for "transaction"); the
product built inside it is **Mou3amla**, a **zero-liability payment routing
layer** for Tunisia built on top of TUNPAY (BCT/SMT's interoperability rail).
Mou3amla never holds a balance, moves funds itself, or stores banking
credentials - it maps a public `@username` to a destination-only routing
identifier (wallet tag / merchant id / RIB) for a real provider (Flouci, D17,
walletii, BIAT, Amen Pay, etc.), and hands off the actual payment to the
user's own banking rail. For the current demo build, send-money now creates a
durable Mou3amla intent first, then opens an internal Mou3amla-branded
development checkout at `/dev/mock-checkout` so the payment UI can still be
demonstrated while third-party sandboxes are unstable. Flouci and Konnect stay
visible in the provider list as explicit **service down** references rather
than active link/send options; the other rails remain linkable and route into
that internal mock checkout instead. In practice, that means a user's
public/default receive route can still be any linked wallet or bank account,
while the send screen now offers any linked non-disabled rail as the source
for the in-app demo handoff. Linked destinations can also now be removed from
the Accounts screen with a deliberate two-step confirmation. QR discovery
still uses a real rotating-QR-code rail or a
**simulated** BLE proximity indicator (real BLE peripheral advertising isn't
possible from a browser - see
[07-agent-guardrails.md](./07-agent-guardrails.md)).
Authentication now uses a single Supabase-backed entry flow: one landing
screen collects a Tunisian `+216` phone number plus a unique `@username`,
then routes every user through a passkey (WebAuthn) gate before sending them
to the home dashboard - new identities register a device passkey, returning
identities sign in with it, both via a self-hosted WebAuthn implementation
(`@simplewebauthn/server`/`@simplewebauthn/browser`, storing credentials in
`public.passkeys`) rather than Supabase Auth's native passkey support, whose
experimental verify endpoint proved unreliable - see
[06-conventions.md](./06-conventions.md#auth-conventions). No SMS provider,
OTP, or password is stored or transmitted. Digital identity verification is
a separate flow launched from the dashboard banner or profile. It currently
runs as a visibly-labeled simulated demo (no real eKYC provider is wired up
yet - Mou3amla itself never captures or stores identity documents or biometric
data, and won't once a real provider accepted under INPDP is integrated
either). The same Supabase `verification_status` controls which high-trust
features unlock, including linking any wallet or bank destination, and every
status change is recorded in `verification_events` for audit.
Linked destinations, routed payment records, and in-app notifications now
persist in Supabase instead of living only in the client shell.
Mode Professionnel accounts get a lightweight El Fatoora micro-invoicing
view. The app is split into domain feature folders (`auth`, `onboarding`,
`wallets`, `payments`, `activity`, `notifications`, `invoices`, `profile`)
plus a `mou3amla` shell that owns the shared state/routing - see
[02-architecture.md](./02-architecture.md) for where things live.

This folder is the source of truth for how this app is built. It exists so
that anyone - human or AI coding agent - can make correct changes without
guessing, re-deriving conventions from scratch, or introducing a pattern that
conflicts with what's already here.

**If you are an AI agent working in this repo, read
[07-agent-guardrails.md](./07-agent-guardrails.md) first.** It's the shortest
path to not breaking things.

## Index

| Doc | Covers |
| --- | --- |
| [01-tech-stack.md](./01-tech-stack.md) | Exact framework/library choices and why, versions that matter |
| [02-architecture.md](./02-architecture.md) | Folder structure, feature-sliced pattern, where new code goes |
| [03-pwa.md](./03-pwa.md) | Manifest, service worker (Serwist/Turbopack), icons, install prompt, offline page |
| [04-routing-and-proxy.md](./04-routing-and-proxy.md) | App Router conventions, `proxy.ts` (not `middleware.ts`) |
| [05-styling-ui.md](./05-styling-ui.md) | Tailwind v4, shadcn/ui conventions, theming |
| [06-conventions.md](./06-conventions.md) | Naming, `"use client"` boundaries, Server Actions, env/config |
| [07-agent-guardrails.md](./07-agent-guardrails.md) | Explicit do/don't list, known hallucination traps for this stack |
| [08-testing.md](./08-testing.md) | Vitest setup, the `server-only` mock gotcha, how to mock Supabase in a test |
| [09-bct-sandbox-readiness.md](./09-bct-sandbox-readiness.md) | BCT Sandbox prep, volunteer-test structure, current Flouci/KYC readiness notes |

## Keeping this up to date

These docs describe **intent and pattern**, not a changelog. When you add a
new feature slice, a new shared primitive, or change a convention, update the
relevant doc in the same PR. Don't let this drift from the code - a stale doc
that confidently says the wrong thing is worse than no doc at all.
