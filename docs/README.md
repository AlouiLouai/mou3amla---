# Mou3amla — Project Specs

`mou3amla` is the repo/project name (Tunisian Arabic for "transaction"); the
product built inside it is **SQUAD**, a P2P social-ledger PWA for Tunisia —
send/receive money via an ultrasonic "beam" between devices, backed by
linked local mobile-money wallets (Flouci, Ooredoo M-Tidjar, etc.) and Didit
identity verification. The whole app is `src/features/squad/`; see
[02-architecture.md](./02-architecture.md) for where things live.

This folder is the source of truth for how this app is built. It exists so
that anyone — human or AI coding agent — can make correct changes without
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

## Keeping this up to date

These docs describe **intent and pattern**, not a changelog. When you add a
new feature slice, a new shared primitive, or change a convention, update the
relevant doc in the same PR. Don't let this drift from the code — a stale doc
that confidently says the wrong thing is worse than no doc at all.
