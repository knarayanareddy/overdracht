# Overdracht

**Eén wijziging. Eén dossier.**

A working, offline-capable **synthetic demo** of the medication-change handover described in [`build-pharmacy-gp-fusion.md`](build-pharmacy-gp-fusion.md): pharmacy → practice → patient → one audit chain.

> **Not a clinical product.** Every case, product registration, equivalence entry, contraindication flag, reimbursement snapshot and patient story is authored test data. There is no official SmPC or insurer list in this build, no authenticated clinician identity, no triage, no diagnosis, no dosing advice and no transmission to third parties. Do not enter real patient data.

## Run it

```bash
npm ci
npm run build
npm run start -- --port 3000
```

Open `http://localhost:3000`. For development: `npm run dev` (binds to `0.0.0.0`). The production build generates a build-specific service worker; offline reading is enabled after the first successful visit. Offline writes are explicitly refused, not faked.

## Two-minute demo

1. Open **C-017**. Read the three visible refusals, select a valid same-substance package alternative, check the pharmacist acknowledgement and approve.
2. Open **Overdrachten**. Accept **H-004** or **H-017** with one click. The dossier entry, patient task and GP note appear together.
3. Open **S-04**, expand the synthetic example, fill the demo, answer/skip the six questions, then confirm each quote.
4. Read the GP summary. The patient's “stopped the new puffers” quote is the first line, above the pharmacy's record of the change.
5. Open **Auditketen**. Change row 7, see `brokenAt=7`, then restore the original log.
6. Open **Swarm lab**, filter to **doktersassistenten**, and read **Rapport & aannames**. The pre-registered falsifiers contradict the paperwork/time-saving pitch under the brief's own priors.

## Verify

```bash
npm run typecheck
npm test                         # 38 domain/API/swarm tests
npm run verify                   # total=N verified=N brokenAt=null
npm run expectations             # writes data/expectations.json
npm run stopwatch                # 10 reading fixtures; human timing remains null
npm run stopwatch -- --record    # operator-recorded stopwatch session
```

Browser acceptance suite (run against an isolated production server, not the demo you want to keep clean):

```bash
OVERDRACHT_LOG_DIR=/tmp/overdracht-qa npm run start -- --port 3100
# in another terminal:
npm run qa                       # defaults to http://localhost:3100
```

The suite scans 68 routes at 390 px and 1440 px, checks provenance attributes and nested anchors, exercises approval → one-click acceptance → patient confirmation → contradiction summary → PDF, tampers/restores the audit chain, measures canvas fps, checks the swarm report and survey, creates a free-text-notice case, and reloads offline. It writes `test-results/qa-report.json`. Human clinician reading/acceptance studies are **not** fabricated; they remain pending.

Latest verification on this checkout:

- Strict typecheck and production build passed; build ID `pCke_LA43dNhuoRNLhoCm`.
- **38/38** domain/API/swarm tests passed.
- Full browser suite: **15/15** checks, **136 route loads**, **0** document overflows, **0** page errors, **60 fps** at 240 nodes in the test browser.
- Clean preview chain: `total=104 verified=104 brokenAt=null`. QA mutations used an isolated log directory.
- **A18 remains pending:** no clinician reading-time measurement has been performed.

## What is implemented

- **Pharmacy:** 20-substance synthetic table, 30 cases, deterministic same-substance chains, rule precedence, visible refusal column, explicit pharmacist approval, task/note edits, free-format notice intake.
- **Practice:** sortable review queue, one-click acceptance, inline query/edit, dossier entry + patient task + GP note, no refusal-column noise.
- **Patient:** six-question typed flow, local draft, verbatim quotes, gap questions, line-by-line confirmation, local-only read-aloud when a Dutch system voice exists, one-screen GP summary, contradiction-first fusion.
- **Trust:** canonical SHA-256 hash chain, exclusive append lock, verifier, row-7 tamper/reset demo, dated/hashed fixture sources, JSON/PDF/paste-block exports.
- **Lab:** 240 seeded personas in ten exact quotas, 24-round force-directed simulation, nine injectable stories, playback/scrub/filter/levers, six Wilson frequencies, pre-registered falsifiers, prior table, 14-item browser-only survey.
- **Offline:** self-hosted fonts, no runtime external API, build-specific service worker, explicit offline read-only state.

## Source verification

See [`docs/source-verification.md`](docs/source-verification.md) for V1–V8 and numerical claims. Key corrections:

- **LSP already exchanges medication data** between pharmacies and GPs. Overdracht is positioned as a possible reasoning/patient-account layer, not a claim that handover is undigitised.
- **MijnPraktijk.nl digital registration is free in 2026 for the named HZW offer**; it is not a universal nationwide contract claim.
- The **40-minute complex-consult funding claim is not verified** by the NZa duration bands.
- The **practice acute line is not practice-approved**. The app uses the brief's exact sentence provisionally and labels the verification gap.
- The brief's **1.4/3.1 kWh energy estimate assumes LLM processing**; this build makes no LLM calls, so those numbers are reported as unmeasured and not applicable results.

Full end-to-end analysis, contradictions and production gaps: [`docs/analysis.md`](docs/analysis.md).

## Architecture

Next.js 16 + React 19 + strict TypeScript, plain CSS, no database. Domain logic lives in `src/domain`; the HTTP contract is implemented by `src/app/api/[...path]/route.ts` and `src/server/api.ts`. State is hydrated from `logs/audit.jsonl`; mutations append audit events under an exclusive lock. Patient drafts and survey answers stay in localStorage until explicit confirmation/export. The global chain carries a `subject` per change so both organisations share one verifiable sequence.

## Deliberate cuts and limits

- Typed patient input replaces live ASR; read-aloud uses only a local browser voice. No external speech service is required.
- CSV export is omitted; JSON, PDF and a paste block are present.
- No real authentication/RBAC, HIS/LSP integration, certified import registry, live insurer feed, clinical validation, DPIA, processor agreement, production retention/deletion service or independent audit anchoring.
- Hash chaining detects modified rows but does not prevent an administrator from rewriting the whole chain.
- The simulation is a deterministic assumption exercise, not a forecast or market study.

## The brief's five-sentence plan (verbatim archive)

> **Verification notice:** this is the original brief text, preserved for traceability. Several figures and claims in it are **not verified** (see the source-verification document). They are not repeated as dashboard facts or validated product claims.

1. Dutch pharmacies face around **26,000 shortage notifications a day**, an average shortage lasts about
   **96 days**, and each pharmacy burns roughly **one FTE** finding alternatives — while at the other end of the
   same street a GP practice spends **40 minutes registering one new patient**, **80% of practices still work on
   paper**, and a standard consult is **10 minutes** while a complex patient gets **40**.
2. These are described as two problems. **They are one event seen from two ends:** a medicine changes, and the
   change is then retyped — pharmacy → phone call → practice assistant → free-text record → the patient's own
   medication overview, which diverges a little more every time.
3. We make **one record of the change** — the substitution with the legal, reimbursement and safety rules that
   justify it, and the practice's acceptance of it — and then let that single record feed the **practice
   handover**, the **patient's own B1 explanation**, and the **pre-visit conversation** where the patient says
   in their own words what changed and what it did.
4. **The pharmacist approves the change; the practice assistant accepts it; the patient confirms their own
   story.** No triage, no urgency score, no diagnosis, no advice — and every refusal is shown with its reason
   and audited.
5. **€150–400 per pharmacy per month plus €2–4 per intake to a zorggroep**, against one FTE of pharmacist time
   and fifteen minutes of routine history-taking inside a consult that is already funded.

Product name: `Overdracht`. Brief tagline: **“Eén wijziging. Eén dossier. Drie keer minder overtypen.”** The “three times less retyping” phrase is a positioning claim, not a measured result.
