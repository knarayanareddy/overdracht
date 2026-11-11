# Build spec — **Overdracht**: the medication change nobody tells anyone about (pharmacy × GP practice), with a MiroFish agent simulation

> **Read this file top to bottom before writing a line of code.** It is the only context you get.
> Every number is sourced and dated in §20. **Do not invent a clinical rule, a figure or a date.**
> Items tagged **`[VERIFY]`** are things you must check against a real source in the first hour — §19 lists
> them all. They are tagged because guessing them would be worse than not having them.
>
> 36-hour build (aiGrunn 2026 / Green Business Challenge, Challenge track). Something must run and be
> demonstrable at 13:00 on day 2.

---

## 0. The five-sentence plan (README, verbatim)

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

**Product name:** `Overdracht` (Dutch: *handover* — the word the sector already uses for exactly this).
Tagline: **"Eén wijziging. Eén dossier. Drie keer minder overtypen."**
*(One change. One dossier. Three times less retyping.)*

**The thesis, in one line, said in the first 20 seconds:**
> **"The medicine changes in the pharmacy and the paperwork changes in the practice. Nobody owns the gap between
> them."**

---

## 1. What you are building

**One data object, three surfaces, one audit chain.**

### 1.1 The object: `ChangeRecord`

Everything in this product hangs off a single record of a single medication change:

```
ChangeRecord
├─ what changed      substance, strength, form, package, route (NL / import / bereiding)
├─ why it was legal  the rule ids that allowed it, and the ones that refused the alternatives
├─ who pays          reimbursement status against the insurer's snapshot, with a peildatum
├─ who approved      pharmacist id + timestamp  (required)
├─ the handover      practice acceptance: who, when, edits, and the task created
└─ the patient       their own words about what changed, confirmed line by line
```

### 1.2 The three surfaces

| # | Surface | Who | What it does |
|---|---|---|---|
| **A** | **Pharmacy · the change** | pharmacist / pharmacy technician | prescription + shortage notice → substitution chains → rules gate → **refusal column** → approve one → produce the handover |
| **B** | **Practice · the handover inbox** | **doktersassistent** (practice assistant) and GP | a queue of open changes; each one accepted, edited or queried in **under 30 seconds**, producing a record entry, a patient task, and a note the GP sees before the next consult |
| **C** | **Patient · the story** | patient, at home, before a long consult | free text or voice in Dutch → **their own words only** → a **gap list** of questions they could not answer → patient confirmation → a one-screen summary for the GP with **"what changed since your last visit"** at the top |

Surface C is the fusion point. The single most useful thing a GP can know before a 40-minute consult about a
complex patient is **what changed and what it did** — and the change is already sitting in `ChangeRecord` from
surface A. The patient supplies what the record cannot: whether it helped, whether they stopped, whether anyone
told them.

### 1.3 The swarm lab
A population of **synthetic** pharmacy assistants, pharmacists, GP practice assistants, GPs, patients,
zorggroepen, insurers, wholesalers, hospital pharmacists and the inspectie that argues about the design bets,
with a force-directed canvas you can drive live and an output of **scenario frequencies with n and 95%
intervals** — never a forecast. §11–§13.

**The single most important sentence about the swarm, because it is the finding this product exists to expose:**
> the person who decides whether the paperwork saving is real is **the practice assistant**, and she is the
> person every pitch in this sector forgets to mention.

---

## 2. Scope — the hard edges

### 2.1 Build this
| Area | What |
|---|---|
| Change intake | prescription line + a shortage notice pasted as free text. Accept **any** notice format; depend on no licensed feed. |
| Chain generation | deterministic, same-substance only, **max 1 hop** by default. §7. |
| Rules gate | contraindication vs patient flags, dose-interval equivalence, reimbursement with `peildatum`, import legality. Every verdict cites a **rule id**. §8.1. |
| **Refusal column** | every rejected chain, permanently visible, Dutch sentence, audited. |
| Pharmacist approval | per line, with edits logged. |
| **Handover** | a structured, machine-readable `ChangeRecord` + a 30-second practice acceptance UI. §9.2. |
| **Pre-visit story** | patient free text/voice → quotes only → gaps → confirmation → one-screen summary. §9.3. |
| **Both gates** | the medication wall (`P-*`) and the clinical wall (`G-*`). §8, §10. |
| Audit | one hash-chained JSONL per change, covering **both ends**, with a verifier + tamper-row-7 demo. |
| Swarm lab | §11–§13. |

### 2.2 Explicitly do NOT build
- ❌ **Any cross-substance (therapeutic) substitution.** No code path. Reason shown: *"farmacotherapeutisch
  alternatief — vereist apotheker/arts"*.
- ❌ **Triage, urgency scoring, red-flag detection, symptom advice, reassurance.** Not a simplified version —
  none. Surface C writes the practice's own acute line and stops.
- ❌ Any clinical impression, diagnosis, differential, severity, or "likely cause" in the GP summary.
- ❌ Dosing advice to a patient. The patient text explains *what changed and why*, never *how much to take*.
- ❌ Dispensing, ordering, stock feeds, device control, sending to third parties, and **any integration with a
  GP information system** (that is months of certification — export a PDF and a paste block instead).
- ❌ Any real patient data, names, BSN, or prescription images. Synthetic stories only, labelled on screen.
- ❌ Real LLM calls in the swarm. None. (§11.0)
- ❌ A "practice availability radar" / "which practice is taking patients". **[VERIFY]** Regional platforms
  already exist (e.g. a Zuidoost-Brabant platform covering 160+ practices and ~75% of the region, insurer-funded)
  — do not rebuild a funded incumbent. If a juror raises it: *"the map is regional and funded; we do the
  handover that feeds it."*

---

## 3. Customer, buyer, and the four objections that will be used against you

### 3.1 The two users, and the one you must not forget
1. **The pharmacy technician / pharmacist** — does the 20–45 minutes per shortage case today.
2. **The doktersassistent (practice assistant)** — receives the phone call, retypes it, updates the record,
   books the follow-up. **She is the product's real user and the payer's cost centre.** Design surface B for a
   person with a queue, 90 seconds of attention, and a phone ringing.
3. **The GP** — reads one screen before the consult. Never types anything.

### 3.2 Buyer
1. **A zorggroep or a pharmacy chain** — one contract, 50–400 sites, real budget, and they already measure
   long-consult pilots.
2. **One independent pharmacy + one practice next door** — the demo. Walk between them in 36 hours.
3. **An insurer** — structurally funds new practices in 2026, so both sides of this are inside their budget lines.

### 3.3 The four objections, with answers

| Objection | Your answer |
|---|---|
| **"The national shortage search already exists and hospitals use it (~95%)."** | *"It finds who has stock. That is a search problem and it is solved. We answer the next question — is the swap legal, reimbursed and safe for this patient — and then we stop the change from being retyped twice."* |
| **"The minister says an alternative exists 99% of the time."** | *"Then the pain is the work: 96 days per shortage, one FTE per pharmacy, 46% of affected patients reporting deterioration. Both statements are true and we show both."* |
| **"Digital intake already exists and is free for practices in 2026 (MijnPraktijk.nl)."** | *"It is, and it is built for registration and routing — it decides where a patient goes. We refuse to route anyone, and we start from a change that already happened. Ours is history-taking plus a handover, not triage."* |
| **"Isn't medication handover already digitised?"** **[VERIFY]** | *"Drop the sender, the receiver and the payload on the table:"* — **sender** = a pharmacist who has to justify a change; **receiver** = an assistant who has 30 seconds; **payload** = the rules that made the change legal. *"Existing infrastructure moves the message. Nobody produces the reasoning, and nobody closes the loop with the patient's own experience of it. If the infrastructure exists, we are the layer that fills it — and we would integrate rather than replace."* |

### 3.4 Competitors, named

| Player | What they do | Their gap, and how you answer |
|---|---|---|
| `geneesmiddelentekort.nl` | national shortage search, stock availability | Search, not legality/reimbursement/safety. **We start where the search ends.** |
| **KNMP Farmanco** (€450/yr pharmacy; €2,064/yr non-pharmacy orgs) | shortage register: cause, expected date, substitution, therapeutic alternatives | It *informs*. No reimbursement, no patient-specific safety, no handover, no practice side. **We consume notices from any source.** |
| **Pharme (Mosadex)** | alternative sourcing, import, therapeutic alternatives with KNMP-GIC | Sells the alternative. **We are the reasoning layer that decides which alternative to ask for.** |
| **MijnPraktijk.nl — Digitaal Inschrijven** (free for practices in 2026) | digital intake straight into the GP information system, via Hadoks/HZW and others | Registration and triage-adjacent routing. **We go deeper on the story, refuse to route, and start from a medication change.** |
| **NHG triage / huisartsenpost systems** | urgency and routing — the backbone of out-of-hours care | Their failure mode is a missed emergency. **We remove triage entirely; different risk profile.** |
| **GP information systems** (Medicom, Promedico, Huisartsenportaal) | the record, the agenda, the forms | Closed, certified, slow. **We export into them (PDF + paste block); we never replace them.** |
| **Medication handover infrastructure (LSP/VZVZ and its successor programme)** **[VERIFY]** | moves medication data between systems | Moves messages; does not produce the justification, the refusal, or the patient's account. **Our payload is the reasoning; integration is the goal, not the threat.** |
| **Pharmacy information systems / wholesaler portals** | dispensing, stock, ordering, NMDS/FMD | Systems of record. **We sit at the edge.** |

---

## 4. Design language

Three surfaces, three registers, one system. It must read as **premium clinical software**, not a startup
dashboard: dense where a professional needs density, quiet where a patient needs calm. **Never encode a safety
verdict by colour alone** — every verdict carries a glyph and a word, so a greyscale screenshot and a
colour-blind juror both work.

```
--ink        #14202B   cool near-black
--paper      #FFFFFF
--paper-2    #F4F6F8   wells, table stripes
--line       #DCE2E8
--muted      #5C6B78
--valid      #146C4A   green   ✗ glyph ✓  word "GELDIG"
--reject     #A3221C   red     ✗        word "AFGEWEZEN"
--unknown    #8A6100   amber   ?        word "ONBEKEND"    (a first-class answer)
--human      #1F4E79   blue    ◆        word "WACHT OP MENS"
--flag       #6B21A8   purple  ▲        word "PATIËNTVLAG"
--handover   #0E5B6B   teal    →        the handover accent — the only new colour
```

Type: **Inter** 400/500/600 UI; **IBM Plex Mono** for codes, strengths, dates, rule ids, hashes;
**Source Serif 4** for the printed afleveradvies, the GP message and the pre-visit summary — these get *read as
documents*, and serif is how the sector has always marked "this is a letter". Self-host `woff2`, no CDN.

**Layout rules that matter:**
- Surface A is **three columns and nothing else**: `prescription + flags` | `chains` | `refusals`. The refusals
  column is **always visible, never behind a tab or accordion**. Its presence on screen *is* the FairTech claim.
- Surface B is **a queue of rows, not cards**. One row = one change, ≤ 48 px tall, sortable by "how long it has
  been open". An assistant should be able to clear five runs before a coffee. **No modal dialogs** — accepting a
  change is one click and an optional note.
- Surface C is **one question per screen**, 18 px minimum body text, B1 language, read-aloud button, progress as
  "3 of 6 questions", and a permanent line: *"Bij acute klachten: bel de praktijk."*
- Motion: 120 ms hover, 200 ms state change, honour `prefers-reduced-motion`. **No celebratory animation** in A
  or B. Surface C may acknowledge completion with a single quiet line.

Footer on every screen: `Demo — synthetische casussen. Geen echte patiëntgegevens. Geen medisch advies.`

---

## 5. File tree

```
overdracht/
├─ README.md  package.json  tsconfig.json  next.config.ts
├─ public/fonts/                      # Inter, IBM Plex Mono, Source Serif 4 (woff2)
├─ data/
│  ├─ substances.json                 # 20 substances + the equivalence & contraindication tables (§7.3)
│  ├─ smpc/<substance>.json           # SmPC extracts: value + quote + source + date + sha256
│  ├─ preference/2026-{cz,vgz,menzis}.json
│  ├─ notices/<case>.txt              # 30 synthetic-but-real-shaped shortage notices
│  ├─ cases.json                      # 30 change cases
│  ├─ patients.json                   # synthetic flags only (renal, pregnancy, paediatric, allergy, leverfunctie)
│  ├─ stories/<id>.txt                # 14 synthetic pre-visit stories
│  ├─ practice/checklist.json         # the practice's own intake list (the schema for surface C)
│  ├─ practice/acute-line.json        # the practice's own acute line, rendered verbatim
│  ├─ swarm/{personas.json,falsifiers.json,runs.json}
├─ scripts/{gen-swarm.ts,verify-chain.ts,dump-expectations.ts,qa.ts,stopwatch.ts}
├─ src/
│  ├─ domain/
│  │  ├─ types.ts                     # §6 — WRITE THIS FIRST
│  │  ├─ rules.ts                     # P-* medication rules (§8.1)
│  │  ├─ chains.ts                    # deterministic generation (§7)
│  │  ├─ gate.ts                      # medication gate (§8.2)
│  │  ├─ refusal.ts                   # the rejection sentences (§8.4)
│  │  ├─ intake.ts                    # G-* clinical rules + gap detection (§8.5)
│  │  ├─ story.ts                     # quote extraction + gap list (§7.5)
│  │  ├─ letters.ts                   # handover note, GP message, B1 patient text, afleveradvies
│  │  ├─ hashchain.ts                 # §9.5
│  │  ├─ swarm/{rng,archetypes,personas,engine,ensemble,instrument}.ts
│  │  └─ invariants.ts                # §10
│  ├─ app/
│  │  ├─ layout.tsx globals.css page.tsx        # case list + the day's queue
│  │  ├─ change/[id]/page.tsx                   # SURFACE A (3 columns)
│  │  ├─ change/[id]/print/page.tsx             # A4 afleveradvies + GP letter
│  │  ├─ inbox/page.tsx                         # SURFACE B
│  │  ├─ story/[id]/page.tsx                    # SURFACE C (patient)
│  │  ├─ story/[id]/summary/page.tsx            # the one-screen GP summary
│  │  ├─ verify/page.tsx                        # audit verifier + tamper demo
│  │  ├─ swarm/page.tsx swarm/{SwarmCanvas,Report}.tsx
│  │  └─ api/{health,case,chain,approve,handover,inbox,story,summary,audit,swarm,survey,export}/route.ts
│  └─ components/ (ChainCard, RefusalRow, RuleChip, FlagPill, SourceLine, HandoverRow, QuoteLine, GapList,
│                  Legend, StatTile, DecisionLine, AcuteLine)
└─ logs/audit.jsonl                   # ONE chain, both ends
```

**Stack:** Next.js 16 + React 19 + TS strict; plain CSS with custom properties (no Tailwind — it fights the
three-column grid); **no database** (JSONL + JSON); `vitest`; **no runtime external API** — the demo must run
with the cable unplugged. Voice on surface C is **not** a live ASR dependency: record the demo story as text,
and if you want voice, use the browser's own `SpeechRecognition` where available with a typed fallback and a
visible label `spraak → tekst (browser)`. Never ship a demo that needs an API key to say a sentence.

---

## 6. Data contract — write this file first

```ts
// src/domain/types.ts
export type Route = "nl_geregistreerd" | "import" | "bereiding";
export type Verdict = "geldig" | "afgewezen" | "onbekend";
export type Reimbursement = "vergoed" | "niet_vergoed" | "onbekend";
export type Direction = "naar_praktijk" | "naar_patient" | "beide";
export type HandoverStatus = "open" | "geaccepteerd" | "gewijzigd" | "teruggevraagd";
export type PatientFlag =
  | "renaal" | "zwangerschap" | "pediatrisch" | "allergie_penicilline" | "allergie_nsaid" | "leverfunctie";

export interface Case {
  case_id: string;                 // "C-001"
  substance: string;               // INN, lowercase: "salbutamol"
  atc: string;                     // "R03AC02"
  strength: string;                // "100 mcg"
  form: string;                    // "inhalatiepoeder"
  patient_flags: PatientFlag[];    // synthetic
  insurer: "CZ" | "VGZ" | "Menzis" | "onbekend";
  notice_ref: string | null;       // pointer into data/notices
  age_band: "0-11" | "12-17" | "18-64" | "65+";
  practice_id: string;             // which practice receives the handover, e.g. "PR-01"
}

export interface ChainLink {
  product: string; strength: string; package: string; route: Route;
  foreign_registration: string | null;   // REQUIRED when route === "import"
  hop: 0 | 1;
}

export interface ChainVerdict {
  chain_id: string;
  chain: ChainLink[];
  status: Verdict;
  rules_passed: string[];
  reject_rule: string | null;         // exactly one when status === "afgewezen"
  reject_reason_nl: string | null;
  reimbursement: Reimbursement;
  reimbursement_source: { insurer: string; list: string; peildatum: string } | null;
  sources: { doc: string; field: string; date: string; sha256: string }[];
}

/* ---------- the handover: surface A -> surface B ---------- */

export interface Handover {
  handover_id: string;
  case_id: string;
  practice_id: string;
  direction: Direction;
  to_practice_nl: string;        // the note the assistant reads, <=120 words, no clinical content
  patient_text_nl: string;       // B1, explains WHAT changed and WHY, never how much to take
  task: "geen" | "herhaalrecept_controleren" | "patient_informeren" | "controle_afspraak";
  status: HandoverStatus;
  opened_at: string;
  response: HandoverResponse | null;      // null until surface B acts
}

export interface HandoverResponse {
  by: string;                    // assistant id — REQUIRED, the practice is a human too
  at: string;
  action: "geaccepteerd" | "gewijzigd" | "teruggevraagd";
  edits: Edit[];
  note_nl: string | null;
  query_nl: string | null;       // only when teruggevraagd
}

export interface Edit {
  field: "chain" | "patient_text" | "to_practice" | "reimbursement" | "task";
  from: string; to: string; by: string; at: string; note_nl: string | null;
}

export interface ChangeRecord {
  case: Case;
  chains: ChainVerdict[];
  top: string | null;                 // chain_id — only when a valid chain exists
  refusals: ChainVerdict[];           // every afgewezen/onbekend chain — ALWAYS shown
  needs_pharmacist: true;             // literal true, see below
  pharmacist_approval: PharmacistApproval | null;
  handover: Handover | null;
}

/* ---------- surface C: the patient's own words ---------- */

export type StoryField = "klacht" | "verloop" | "geprobeerd" | "context" | "verwachting" | "medicatie";

export interface Quote {
  field: StoryField;
  text_nl: string;               // the patient's words, verbatim. No paraphrase, ever.
  confirmed: boolean;
}

export interface Gap {
  field: string;
  question_nl: string;           // a QUESTION for the GP, never a filled answer
}

export interface IntakeSummary {
  complaint: Quote;
  course: Quote | null;
  tried: Quote[];
  context: Quote[];
  expectation: Quote | null;
  medication_change: Quote[];    // "what changed since your last visit", in the patient's words
  gaps: Gap[];
  clinical_impression: null;     // structurally impossible
  urgency: null;                 // structurally impossible
  advice: null;                  // structurally impossible
  synthetic: true;
  practice_acute_line: string;   // rendered verbatim, always present
}
```

### 6.1 Make the refusals structural, not stylistic

```ts
export type Unapproved = { readonly _unapproved: unique symbol };
export type PharmacistApproval = { readonly chain_id: string; readonly by: string; readonly at: string };
// There is no constructor for PharmacistApproval that does not take a pharmacist id.
// letters.ts accepts nothing else. handover.ts accepts nothing else.
// HandoverResponse requires `by`. The practice is a human too — it is not an exception to the rule.
```

`needs_pharmacist` is the literal `true`. If a code path tries to auto-approve, it must not compile.
`clinical_impression`, `urgency` and `advice` are typed `null` — a `string` cannot be assigned to them, so the
compiler refuses the failure mode instead of a reviewer having to notice it.

### 6.2 The one join that makes this a product and not two demos

```ts
export function buildHandover(rec: ChangeRecord, approval: PharmacistApproval): Handover
export function attachStory(h: Handover, s: IntakeSummary): { h: Handover; story: IntakeSummary }
// attachStory is the ONLY place the two halves meet. It may add a `medication_change` quote to the summary
// and may NOT modify the chain, the reimbursement, the rules or the refusal list.
```
Test `T-21` (§10): `attachStory` is referentially transparent over everything except `story`.

---

## 7. Chain generation (deterministic — no model in any decision)

### 7.1 The algorithm

```
generateChains(case, substanceTable) -> ChainVerdict[]

1. p = substanceTable[case.substance]
   if absent -> return [{ status:"onbekend", reject_rule:"P-UNKNOWN-01",
                         reject_reason_nl:"Deze stof staat niet in onze tabel. Wij gokken niet — de apotheker beslist." }]
   NEVER guess. A miss is a visible miss.
2. products = p.products            // every product with the SAME INN, incl. foreign-registered ones
3. per product, per package:
     hop = (strength !== case.strength || form !== case.form || package !== case.package) ? 1 : 0
4. route:  nl_registered -> "nl_geregistreerd"
           EU-registered but not NL, under the shortage rules -> "import" (foreign_registration REQUIRED,
           else the chain is not emitted — P-IMPORT-01)
5. sort by hop asc, package size closest to original, route preference
   (nl_geregistreerd > import > bereiding), then product name asc for stability.
6. NEVER emit a chain that changes the active substance. No code path. (P-SUB-01)
7. cap at 1 hop unless a pharmacist sets `allow_two_hops` for this case. (P-STR-02)
8. return ALL chains, including the rejected ones, because the refusals are the product.
```

Determinism: same case → byte-identical list. Asserted in `T-14`.

### 7.2 `data/substances.json` — 20 substances

`salbutamol, metformine, atorvastatine, omeprazol, amoxicilline, levothyroxine, sertraline, oxycodon,
furosemide, prednison, insuline glargine, methylfenidaat, tamsulosine, escitalopram, naproxen, paracetamol
(zetpil), amoxicilline/clavulaanzuur, hydrochloorthiazide, pantoprazol, azitromycine`.

```json
{
  "substance": "salbutamol", "atc": "R03AC02",
  "products": [
    { "product": "Salbutamol CF 100 mcg inhalatiepoeder", "strength": "100 mcg", "form": "inhalatiepoeder",
      "packages": ["200 doses"], "nl_registered": true, "smpc_ref": "smpc/salbutamol.json" },
    { "product": "Ventolin 100 mcg aerosol", "strength": "100 mcg", "form": "aerosol",
      "packages": ["200 doses"], "nl_registered": true, "smpc_ref": "smpc/salbutamol.json" },
    { "product": "Salbutamol Sandoz 2 mg/5 ml drank", "strength": "2 mg/5 ml", "form": "drank",
      "packages": ["150 ml"], "nl_registered": true, "smpc_ref": "smpc/salbutamol.json" }
  ],
  "dose_interval_equivalence": {
    "inhalatiepoeder|aerosol": { "equivalent": true,  "rule": "P-STR-01",
      "note_nl": "zelfde dosisinterval, andere toedieningsvorm — controleer de inhalatietechniek" },
    "aerosol|drank": { "equivalent": false, "rule": "P-STR-02",
      "note_nl": "ander dosisinterval — niet uitwisselbaar zonder controle" }
  },
  "contra_indications": { "renaal": false, "zwangerschap": false, "pediatrisch": false,
                          "allergie_penicilline": false, "allergie_nsaid": false, "leverfunctie": false }
}
```
**Every field carries a source.** SmPC extract shape:
`{ field, value, quote_nl, source: "SmPC <product> §4.2", date, sha256 }`. A field you cannot source is `null`,
and the chain becomes `onbekend` — never "probably fine". This table is **the part a pharmacist will argue with,
and that argument is the demo.** Get it right.

### 7.3 Fixtures — 30 change cases (`data/cases.json`)

| Group | n | Shape | Expected |
|---|---|---|---|
| Same strength & form, other product | 10 | any of the 20 substances | ≥1 `geldig`, `hop = 0` |
| Strength / package change | 10 | e.g. salbutamol poeder → aerosol | ≥1 `geldig`, `hop = 1`, equivalence note rendered |
| **No safe chain** | 10 | cross-substance need, paediatric, unmet import citation, renal contraindication, unknown substance | **zero `geldig`** (`T-20`) — these are the demo's money shot |
| Patient flags | 5 (overlap) | renal / pregnancy / paediatric / penicillin allergy / leverfunctie | rejections that name the flag |

Each fixture carries `expected: { valid_min, valid_max, must_reject_rules: [] }`.

### 7.4 Stories — 14 synthetic pre-visit stories (`data/stories/<id>.txt`)

| # | Shape | The point |
|---|---|---|
| S-01 | complex multi-complaint, 4 issues, one medication change last month | the "40-minute patient" |
| S-02 | patient cannot date the complaint | the classic gap — and the clinical signal |
| S-03 | expectation is the real problem ("I want to stop the tablets") | expectation beats symptom |
| S-04 | patient stopped the new medicine and told nobody | **the fusion case** — surface A says changed, the patient says stopped |
| S-05 | patient repeats the pharmacist's explanation almost verbatim | shows the handover worked |
| S-06 | patient believes the substitution was a mistake by the pharmacy | the trust failure the product must survive |
| S-07 | 5+ medicines, cannot name any of them | polypharmacy, name-free |
| S-08 | four complaints, vague durations, "what did they change again?" | noise; the model must not tidy it into a diagnosis |
| S-09 | a patient who writes three lines and stops | the "patients write too little" failure mode — ask one next question, not a form |
| S-10–S-14 | **5 safety stories:** chest pain, suicidal ideation, a child with fever, sudden vision loss, severe breathlessness | **all five must produce only the practice's acute line and no clinical assessment whatsoever** (`T-13`) |

**Never use a real patient story, not even anonymised.** Synthetic, labelled on screen. In a room with
clinicians this is the difference between being taken seriously and being asked to leave.

### 7.5 Story matching — the fusion, specified

```
matchStoryToChange(story, handover) -> { mentions: Quote[], consistency: "bevestigt"|"spreekt_tegen"|"onbekend" }

1. Candidate passages: sentences containing the changed substance's *brand-independent* name, or a
   medication word (tablet, inhaler, pufje, capsule, zetpil, "het nieuwe merk", "de andere doos").
2. Emit those sentences VERBATIM as Quote{field:"medicatie"}. No interpretation, no summarising.
3. consistency:
   - "bevestigt"      : the change is described and nothing contradicts it
   - "spreekt_tegen"  : the patient says they stopped / never received / it was changed back
   - "onbekend"       : no mention
4. `spreekt_tegen` is the single most valuable output in the product. It renders on surface B as a
   RETURNED marker on the handover row and in the GP summary as the first line:
     "Patiënt zegt: \"ik ben met die nieuwe puffers gestopt, ik werd er dizzy van\" — gemeld na de wijziging."
   It does NOT say what to do about it. It is a quotation with a provenance, nothing more.
5. If the patient mentions a medicine that is in NO ChangeRecord, do not invent one: emit
   Gap{ field:"medicatie", question_nl:"Patiënt noemt een medicijn dat niet in de overdracht staat — welk?" }
```

**This is the whole product in one mechanism:** the pharmacy knows a change was made, the practice knows it was
told, the patient knows whether it helped — and today nobody compares the three.

---

## 8. The two gates (this is the FairTech product)

### 8.1 Medication rules — precedence order

| id | Rule | Fails when | Behaviour |
|---|---|---|---|
| `P-SUB-01` | Never propose a different active substance | a therapeutic alternative is needed | **REJECT**: *"farmacotherapeutisch alternatief — vereist apotheker/arts"* |
| `P-CI-01` | No unresolved contraindication against a patient flag | `contra_indications[flag] === true`, unresolved in the SmPC | **REJECT**, flag shown beside it |
| `P-PAEDI-01` | No adult-only formulation for a paediatric case | `age_band = "0-11"` and SmPC marks adult-only | **REJECT** |
| `P-STR-02` | One hop maximum unless a pharmacist expands it | chain length 2+ without `allow_two_hops` | **REJECT**: *"twee wijzigingen — apotheker moet uitbreiden"* |
| `P-STR-01` | A strength/form change only when the dose interval can be preserved | `dose_interval_equivalence` says not equivalent | **REJECT** with the equivalence note |
| `P-IMPORT-01` | Import only under the shortage rules, with the foreign registration cited | no `foreign_registration`, or the product is NL-registered | **REJECT** |
| `P-REIMB-01` | Reimbursement must be resolved for the patient's insurer | snapshot missing, stale > 12 months, or insurer `onbekend` | status `onbekend` — **never** shown as reimbursed |
| `P-SOURCE-01` | Every displayed field cites a document and a date | a field with no source | field not rendered; chain degrades to `onbekend` |
| `P-NOSEND-01` | Nothing is sent to a third party by the system | any code path attempts a send | **throws**; artefacts are rendered to screen/PDF only |

A chain is rejected by the **first** rule that fails; that one is the primary reason, others may appear greyed as
secondary. `P-SUB-01` → `P-CI-01` → `P-PAEDI-01` → `P-STR-02` → `P-STR-01` → `P-IMPORT-01` → `P-REIMB-01` →
`P-SOURCE-01`.

### 8.2 The medication gate

```ts
function evaluate(chain: ChainLink[], c: Case, table: SubstanceTable): ChainVerdict {
  // 1 P-SUB-01  assert-only: impossible by construction; throw if violated
  // 2 P-CI-01   per patient flag -> contra_indications; true + unresolved -> reject
  // 3 P-PAEDI-01
  // 4 P-STR-02  chain.length > 1 && !allowTwoHops -> reject
  // 5 P-STR-01  equivalence lookup for `form|form`
  // 6 P-IMPORT-01
  // 7 P-REIMB-01 -> vergoed | niet_vergoed | onbekend (+ source + peildatum)
  // 8 P-SOURCE-01 -> collect sources; any missing -> onbekend
  // first failure wins; else status "geldig"
}
```

### 8.3 Clinical rules for surface C — the second wall

| id | Rule | Fails when | Behaviour |
|---|---|---|---|
| `G-NOTRIAGE-01` | No urgency, no red flags, no routing, no advice, no reassurance | any clinically suggestive input anywhere | **BLOCK**; render the practice's own acute line instead, and nothing else |
| `G-QUOTE-01` | Structured fields contain only the patient's words | the model paraphrases or interprets | drop the inference, keep the quote |
| `G-GAP-01` | A gap is a **question**, never a filled answer | the model fills a gap | **BLOCK** the filled field, log it |
| `G-CONF-01` | Nothing leaves surface C before the patient confirms, line by line | any convenience path | **BLOCK** |
| `G-ONE-01` | The GP summary is one screen and readable in under 60 seconds | the summary exceeds the budget | truncate to the practice's own top-5 priority; re-test with a stopwatch |
| `G-MEDS-01` | A medication passage is quoted, never summarised, never reconciled automatically | a paraphrase or an automatic "resolved" | quote only; `consistency` is derived by the rules in §7.5, never by a model |
| `G-SYNTH-01` | Every demo story is labelled synthetic | a label missing anywhere | **BLOCK** the screen |
| `G-ACUTE-01` | The practice's own acute line is present on every surface C screen | missing | **BLOCK** the screen |

### 8.4 The refusal sentences — write these carefully, they are read aloud on stage

```
P-SUB-01    "Een ander werkzaam bestanddeel is geen substitutie maar een therapiewijziging. Dat beslist de apotheker samen met de voorschrijver."
P-STR-01    "Salbutamol 2 mg/5 ml drank heeft een ander dosisinterval dan 100 mcg inhalatiepoeder — niet uitwisselbaar zonder controle."
P-STR-02    "Deze keten wijzigt sterkte én verpakking. Twee wijzigingen vragen een expliciete beoordeling door de apotheker."
P-CI-01     "Deze patiënt heeft een nierfunctiestoornis; de SmPC van dit product vraagt dosisaanpassing. Niet automatisch uitwisselbaar."
P-REIMB-01  "De vergoeding is onbekend: de preferentielijst van {verzekeraar} is van {peildatum} en noemt dit product niet. Onbekend is geen 'vergoed'."
P-IMPORT-01 "Voor deze import ontbreekt de buitenlandse registratie. Zonder citeerbare registratie geen importroute."
P-PAEDI-01  "Dit product is niet geregistreerd voor kinderen onder de 12; de casus is pediatrisch."
P-UNKNOWN-01"Deze stof staat niet in onze regeltabel. Wij gokken niet — de apotheker beslist."
G-NOTRIAGE-01"Wij beoordelen geen klachten en geven geen advies. Bij acute klachten: bel de praktijk."
```

**Every rejection sentence must be specific enough that a pharmacist learns something from it.** A generic
"not allowed" fails the demo.

---

## 9. Architecture, API, audit

### 9.1 The nine stages

| # | Stage | Surface | In | Out | Refuses |
|---|---|---|---|---|---|
| 1 | INPUT | A | prescription line + notice | `{substance, strength, form, flags}` | an unparseable line — asks for the product code |
| 2 | DOCUMENT READING | A | SmPC extracts, preference entry | fields **with sources** | a field with no source (leaves it null) |
| 3 | CHAINS | A | substance | candidate chains | any chain crossing substances (no code path) |
| 4 | GATE | A | candidates + flags | PASS/REJECT per chain, rule id | unresolved contraindication; unknown reimbursement as reimbursed |
| 5 | APPROVE | A | one chain | `PharmacistApproval` | approval without a named pharmacist |
| 6 | HANDOVER | A → B | approval | `Handover` (+ practice note, B1 text, task) | a handover with no task and no reader |
| 7 | PRACTICE | B | handover | acceptance / edit / query | accepting without a named assistant |
| 8 | STORY | C | patient free text | quotes + gaps + confirmation | any interpretation, any advice, any urgency |
| 9 | RECONCILE | C → B → GP | story + handover | `consistency` + the GP summary | inventing a medication, filling a gap, adding an impression |

### 9.2 API

```
GET  /api/health                                  -> { ok, rows }
GET  /api/case                                    -> { cases: Case[] }
GET  /api/case/:id                                -> { case, record: ChangeRecord }
POST /api/chain          { case_id }              -> ChangeRecord (NO persistence)
POST /api/approve        { case_id, chain_id, by, edits[] } -> { seq, hash, record }
GET  /api/inbox                                   -> { rows: HandoverRow[] }
POST /api/handover       { handover_id, by, action, edits[], note_nl?, query_nl? } -> { seq, record }
GET  /api/story/:id                               -> { story, draft: IntakeSummary }
POST /api/story          { story_id, edits[], confirmed[] } -> IntakeSummary   // confirmation is the gate
GET  /api/summary/:caseId                         -> GP summary (requires BOTH an approval and a confirmation)
POST /api/export/:id?format=pdf|json              -> 409 unless approved (and, for story exports, confirmed)
GET  /api/audit                                   -> { total, verified, brokenAt }
POST /api/audit          { op: "tamper" | "reset" }
GET  /api/swarm?runs=200&seed=20261111
POST /api/swarm/fire     { event_id, seed }
GET  /api/survey?version=v1|v2
```

`POST /api/chain` must not write. `POST /api/approve` and `POST /api/handover` are the only writers besides
audit. `/api/summary` returns **409 `E-CONFIRM-01`** unless the story carries a line-by-line confirmation, and
**409 `E-APPROVAL-01`** unless the change carries a pharmacist approval. **Two humans, two gates, both verified
server-side.**

### 9.3 Error codes

| code | when | Dutch |
|---|---|---|
| `E-APPROVAL-01` | export/handover without pharmacist approval | "Een overdracht vereist goedkeuring door de apotheker." |
| `E-CONFIRM-01` | export/summary without patient confirmation | "Het verhaal van de patiënt gaat pas verder na bevestiging." |
| `E-SOURCE-01` | a field with no source | "Dit veld heeft geen bron; het wordt niet getoond." |
| `E-STALE-01` | preference list older than 12 months | "De preferentielijst is {n} maanden oud." |
| `E-NOSEND-01` | any attempt to send to a third party | "Dit systeem verstuurt niets." |
| `E-NOTRIAGE-01` | a clinical assessment is requested or produced | "Wij beoordelen geen klachten." |
| `E-SUBSTANCE-01` | unknown substance | "Onbekende stof — geen gok." |

### 9.4 Surface B in detail — this is where the paperwork claim is won or lost

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ HANDOVER — 4 open                                                      [ vernieuwen ] │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ ⏱ 2 d   C-017  salbutamol 100 mcg → 100 mcg aerosol      PR-01   ◆ wacht op u       │
│         Vergoeding ONBEKEND · 1 afgewezen keten         [ accepteren ] [ vraag ]    │
│ ⏱ 1 d   C-004  metformine 500 → 850 mg                   PR-01   ◆ wacht op u       │
│         Vergoeding VERGOED (CZ, 01-01-2026)             [ accepteren ] [ vraag ]    │
│ ⚠ 3 d   C-009  omeprazol → pantoprazol-equivalent GEWEIGERD — apotheker beslist     │
│         [ waarom? ]                                                                 │
│ ↺ 5 d   C-012  atorvastatine 20 mg → 40 mg        PR-01  ↺ PATIËNT SPREEKT TEGEN    │
│         "ik ben met die nieuwe pillen gestopt"  [ bekijk citaat ]                    │
└──────────────────────────────────────────────────────────────────────────────────────┘
```
Rules for this screen:
- **One row = one change.** No cards, no expansion by default, no modal on accept.
- **Accepting is one click** and immediately produces: a record entry (`ChangeRecord` + response), a patient
  task, and the GP line. The edit path is optional, never required.
- **`TERUGGEVRAAGD` produces a real question**, quoted into the pharmacy's queue — the loop closes both ways.
- The **↺ marker** (patient contradicts the change) sorts to the top of the GP's summary, not the assistant's
  queue — it is a clinical signal, and only the GP reads it.
- Every row shows **one number and one word** about reimbursement. Never a colour without the word.
- **The assistant never sees the refusal column.** She sees that a change was justified. The refusals belong to
  the pharmacist's screen — showing a queue of rejections to a practice is noise, and noise is how adoption dies.

### 9.5 Hash chain — one chain, both ends

```ts
canonicalJson(v)          // keys sorted at every level
hashRow(row)              // sha256 over { seq, ts, actor, action, subject, payload, prev_hash }
```
Append to `logs/audit.jsonl` under an exclusive lock, gap-free `seq`. The verifier walks the file and returns
`{ total, verified, brokenAt }`. `POST /api/audit {op:"tamper"}` must make the verifier report **`brokenAt: 7`**.

**Actions, and why the single chain matters:** `CASE_OPENED`, `CHAINS_GENERATED`, `CHAIN_REJECTED` (rule id),
`CHAIN_APPROVED` (pharmacist id), `HANDOVER_OPENED`, `HANDOVER_ACCEPTED|EDITED|QUERIED` (assistant id),
`STORY_CAPTURED`, `STORY_CONFIRMED`, `RECONCILE_CONTRADICTION`, `SUMMARY_VIEWED`. One dossier per change, from
the prescription to the patient's own words, written by two organisations with two different humans. **That is
the artefact an IGJ inspector and a NEN 7510 auditor both ask for, and neither side can produce it today.**

---

## 10. The wall — sixteen rules and the tests that hold them

**`npm test` runs all of these. If a rule fails, change the implementation, never the assertion.**

| # | Rule | Test | Assertion |
|---|---|---|---|
| W1 | **No score about a patient.** No risk, adherence, priority, likelihood, cost or "appropriateness" field. | `T-01` | Grep `src/` for `/risk|score|priority|adherence|compliance|likelihood/i` → only inside rule ids and comments. `Case` has no numeric field but `age_band` (a band). |
| W2 | **No free-text scoring.** A notice is parsed into fields, never scored. | `T-02` | No function returns a number from notice text except a count of extracted fields. |
| W3 | **No AI-text detection.** | `T-03` | Grep `detector|authorship|perplexity` → absent. |
| W4 | **No image classification.** | `T-04` | No upload path; a photo of a medicine box is not a feature of this build. |
| W5 | **No identity data.** | `T-05` | No `phone|bsn|paspoort|documentnummer` fields; grep enforced. |
| W6 | **No patient identifiers.** Flags and an age *band* only, and no names in fixtures. | `T-06` | Type-level + fixture scan. |
| W7 | **No dispensing, no custody, no ordering.** | `T-07` | No order/dispense endpoints. |
| W8 | **Nothing is sent.** | `T-08` | `P-NOSEND-01`; no mail/SMTP path; exports return a file. |
| W9 | **Every rejection has a rule id and a Dutch reason.** | `T-09` | For each `afgewezen`: `reject_rule ∈ RULES`, `reject_reason_nl.length > 25`. |
| W10 | **A change always ends with a named pharmacist; a handover with a named assistant.** | `T-10` | `needs_pharmacist === true`; both approval types require `by`; 409s enforced server-side. |
| W11 | **`onbekend` is never rendered as `vergoed`.** | `T-11` | In a card with `reimbursement === "onbekend"`, the DOM contains `ONBEKEND` and not the string `vergoed`. |
| W12 | **Every displayed field cites a source and a peildatum.** | `T-12` | Every `[data-field]` has `data-source` and `data-date`. |
| W13 | **No clinical assessment anywhere.** | `T-13` | The 5 safety stories produce the acute line and **zero** other clinical output; the summary type has `clinical_impression: null`, `urgency: null`, `advice: null`, and the renderer emits no sentence containing `/advies|urgent|waarschijnlijk|vermoedelijk|diagnose/i`. |
| W14 | **Gaps are questions.** | `T-14` | Every `Gap.question_nl` ends in `?`; no `Gap` has a value field. |
| W15 | **The patient confirms before anything leaves surface C.** | `T-15` | `/api/summary` without confirmation → 409 `E-CONFIRM-01`. |
| W16 | **The story can never alter the medication decision.** | `T-16` | `attachStory` and everything under `src/domain/story.ts` are unreachable from `chains.ts`, `gate.ts`, `letters.ts`; grep-level import graph + a runtime deep-freeze assertion. |

Structural tests:

| id | Assertion |
|---|---|
| `T-17` | `POST /api/chain` does not append to `logs/audit.jsonl` |
| `T-18` | Chain generation is deterministic across all 30 cases |
| `T-19` | `seq` is `1..n`, no gaps, no repeats; tamper row 7 → `brokenAt === 7`; reset → `null` |
| `T-20` | The 10 no-safe-chain cases return **zero** `geldig` chains |
| `T-21` | `attachStory` mutates nothing outside the story (deep-equal the record before/after) |
| `T-22` | No `route === "import"` chain without a non-empty `foreign_registration` |
| `T-23` | For every chain, every link's substance === `case.substance` |
| `T-24` | The 5 safety stories: `draft.gaps.length` may be > 0 but no gap may describe a symptom as urgent, and `clinical_impression === null` |
| `T-25` | The practice acute line string appears on every surface C route |
| `T-26` | One `ChangeRecord` produces exactly one `Handover`; a second approval on the same case is rejected `409 E-DUP-01` |

---

## 11. The MiroFish swarm lab

### 11.0 The sentence you must say on stage
> **"No language model is called. Anywhere. This is a dynamical system over a synthetic population — the output
> is a frequency, not a forecast, and the prior table is on screen for you to argue with."**

### 11.1 Why the swarm exists in *this* product

The pitch makes six bets, and **four of them are about people who are not in the room**:

1. a pharmacist will accept a tool that **refuses** more often than it proposes (`refuse`),
2. a **practice assistant** will accept a pharmacist's structured handover without re-checking every line —
   *this is the paperwork claim, and it is the whole business case* (`retype`),
3. the **GP** believes the time is genuinely released inside an existing slot (`gp_time`),
4. the patient's **own words** are more useful than a filled-in form (`own_words`),
5. a **B1 explanation** is enough for a patient facing a substitution (`b1`),
6. the two organisations will accept **one shared dossier** written by both (`shared`).

Bets 2 and 3 are the ones that can quietly destroy the venture: if the assistant re-verifies everything anyway,
nothing is saved; and if GPs do not believe the time is released, no zorggroep renews.

### 11.2 Six dimensions

| id | label (NL) | left pole | right pole | blurb |
|---|---|---|---|---|
| `retype` | Ik neem een overdracht over zonder alles na te lopen | *"ik controleer elke regel"* | *"een gestructureerde overdracht vertrouw ik"* | **The business case, as an opinion.** |
| `gp_time` | De tijd komt echt vrij binnen het consult | *"het kost me juist tijd"* | *"ik win tijd in het consult"* | The value claim, which the sector assumes and never tests. |
| `refuse` | Weigeren is een functie | *"beter een gok dan niets"* | *"liever weigeren dan gokken"* | Carried over from the pharmacy side. |
| `own_words` | De eigen woorden van de patiënt zijn bruikbaar | *"een ingevuld formulier is beter"* | *"een verhaal met gaten is beter"* | The unresolved trade-off, asked as a number. |
| `b1` | Uitleg op B1 is genoeg | *"de patiënt wil hetzelfde product"* | *"uitleg op B1 volstaat"* | The last mile of every substitution. |
| `shared` | Eén gedeeld dossier van twee organisaties | *"ieder houdt zijn eigen dossier"* | *"één dossier, twee handen"* | Institutional willingness — the real adoption risk. |

### 11.3 Archetypes — **N = 240**, exact quotas

| key | label | n | who |
|---|---|---|---|
| `assist_gp` | **Doktersassistenten** | 40 | **the pivot of the whole product** |
| `gp` | Huisartsen | 34 | reads one screen, believes or does not |
| `assist_pharm` | Apothekersassistenten | 36 | does the 45 minutes today |
| `pharm` | Openbare apothekers | 28 | approves and carries the liability |
| `patient_poly` | Patiënten met polyfarmacie | 30 | 5+ medicines, the fusion case |
| `patient_other` | Patiënten (overig) | 18 | parents, working-age |
| `zorggroep` | Zorggroepen | 20 | the distribution and the budget |
| `insurer` | Zorgverzekeraars | 12 | funds both sides |
| `igj` | IGJ / inspectie | 10 | reads the audit chain |
| `wholesaler` | Groothandel / importeur | 12 | profits from substitution volume |

```ts
export const ARCH = {
  assist_gp:      { n: 40, priors: { retype: .34, gp_time: .46, refuse: .48, own_words: .42, b1: .66, shared: .40 }, behav: { voice: .52, susceptibility: .64, conviction: .40 } },
  gp:             { n: 34, priors: { retype: .56, gp_time: .38, refuse: .62, own_words: .40, b1: .54, shared: .52 }, behav: { voice: .72, susceptibility: .42, conviction: .66 } },
  assist_pharm:   { n: 36, priors: { retype: .70, gp_time: .60, refuse: .54, own_words: .52, b1: .62, shared: .58 }, behav: { voice: .50, susceptibility: .58, conviction: .44 } },
  pharm:          { n: 28, priors: { retype: .72, gp_time: .64, refuse: .70, own_words: .50, b1: .58, shared: .60 }, behav: { voice: .68, susceptibility: .40, conviction: .62 } },
  patient_poly:   { n: 30, priors: { retype: .44, gp_time: .34, refuse: .30, own_words: .74, b1: .78, shared: .46 }, behav: { voice: .44, susceptibility: .70, conviction: .46 } },
  patient_other:  { n: 18, priors: { retype: .40, gp_time: .30, refuse: .26, own_words: .62, b1: .60, shared: .42 }, behav: { voice: .42, susceptibility: .72, conviction: .38 } },
  zorggroep:      { n: 20, priors: { retype: .58, gp_time: .80, refuse: .56, own_words: .54, b1: .58, shared: .72 }, behav: { voice: .74, susceptibility: .30, conviction: .72 } },
  insurer:        { n: 12, priors: { retype: .60, gp_time: .84, refuse: .52, own_words: .50, b1: .56, shared: .68 }, behav: { voice: .70, susceptibility: .26, conviction: .76 } },
  igj:            { n: 10, priors: { retype: .30, gp_time: .40, refuse: .90, own_words: .46, b1: .60, shared: .76 }, behav: { voice: .66, susceptibility: .20, conviction: .84 } },
  wholesaler:     { n: 12, priors: { retype: .74, gp_time: .58, refuse: .34, own_words: .46, b1: .48, shared: .44 }, behav: { voice: .64, susceptibility: .34, conviction: .68 } },
} as const;
```

**Read the shape of it and you have the finding:** `assist_gp.retype = .34` — the forty people who decide whether
the paperwork saving is real are the **least** convinced in the population, and they have the **lowest voice**
(`.52`) in every conversation about a product designed for them. Meanwhile `zorggroep.gp_time = .80` and
`gp.gp_time = .38`: **the people who buy believe the value claim, and the people who deliver it do not.** Say
that sentence on stage.

### 11.4 Personas
`buildPersonas(240, 20261111)`: id `O-001…`, synthetic Dutch names from a fixed list of 70 surnames (including
Turkish, Moroccan, Polish and Syrian surnames — the Dutch pharmacy and waiting room are not one demographic),
`years_experience`, `setting` (chain / independent / practice / zorggroep), `region`, and for patients
`condition` (`polyfarmacie`, `chronisch`, `ouder_van_kind`, `zwanger`). Priors jittered ±0.04, behav ±0.05.
`synthetic: true` on every card.

### 11.5 The engine (implement exactly; ~150 lines, every constant matters)

```
runSwarm(personas, { rounds=24, mixing=0.18, pressure=1, seed, minEvents=3, inject? })
1  rnd = mulberry32(seed)
2  eventPlan: exactly 3 events; Fisher–Yates on eligible rounds [3..rounds-2] and on the event list.
   `inject` replaces any planned occurrence of the same story.
   NEVER arr.sort(() => rnd()-0.5) — inconsistent comparator; server and browser disagree.
   Fisher–Yates is the only shuffle a seeded RNG can promise.
3  graph: degree 7, local = round(7*(1-mixing)) same-archetype edges + (7-local) uniform, deduped.
4  opinions = prior ± 0.09 jitter.
5  per round, per agent (Fisher–Yates order):
     gap = o[j][d] - o[i][d];  likeness = 1 - min(1, |gap|*1.4)
     influence = (0.35 + 0.65*voice_j) * (0.4 + 0.6*likeness)
     openness  = susceptibility_i * (1 - 0.75*conviction_i)
     move      = gap * influence * openness * 0.42 * pressure
     BACKFIRE if |gap| > 0.45 && conviction_i > 0.6 && rnd() < 0.5:
       move = -sign(gap) * |gap| * 0.10 * pressure
6  events: opinion += effect * (0.6 + 0.8*rnd()) per dimension, clamped [0,1]
7  snapshot: mean, camps (left < 0.42 / swing / right > 0.58), event label
8  final means; support[d] = share(opinion >= 0.5); per-agent `changed`
```

### 11.6 The nine events (Dutch copy; ≥3 must push the design backwards)

| id | label | effect |
|---|---|---|
| `tekortpiek` | *"Een tekort aan een veelgebruikte bloedverdunner houdt zes weken aan"* | `refuse +.06, b1 −.08, retype +.03` |
| `fout` | *"Een apotheek geeft de verkeerde sterkte af; het staat in het nieuws"* | `refuse +.14, retype −.10, shared +.06` |
| `dubbel` | *"Een praktijk typt een overdracht opnieuw over en maakt een fout"* | `retype −.12, shared +.10, gp_time −.08` |
| `petitie` | *"De petitie over geneesmiddelentekorten haalt 200.000 handtekeningen"* | `b1 +.08, gp_time +.04, own_words +.05` |
| `werkdruk` | *"Het personeelstekort in apotheken loopt op tot 3.000 fte"* | `retype +.10, gp_time +.06, refuse −.04` |
| `assist_nood` | *"Praktijken melden dat assistenten het eerste uur alleen de telefoon doen"* | `retype +.08, shared +.06, own_words −.04` |
| `ai_fout` | *"Een AI-systeem stelt een verkeerde substitutie voor; de inspectie grijpt in"* | `refuse +.16, b1 −.10, shared −.08` |
| `b1` | *"Patiëntenfederaties eisen uitleg op B1-niveau"* | `b1 +.12, own_words +.06` |
| `dossier` | *"Twee organisaties gaan één gedeeld medicatiedossier voeren"* | `shared +.14, retype +.08, refuse +.04` |

### 11.7 Ensemble and the six frequencies

`runEnsemble(personas, runs = 200)`: seeds `20261111 + r*7919`; per dimension mean / sd / p10 / p50 / p90 and a
0.05 histogram. **Render every frequency as `x / n runs (p = 0.000, 95% CI 0.000–0.000)`** (Wilson, §11.9).

| id | question | test |
|---|---|---|
| `QRETYPE` | **Do a majority of practice assistants accept a structured handover without re-verifying every line?** | `assist_gp`, `support.retype > .5` |
| `QGPTIME` | Do a majority of GPs believe time is released inside the consult? | `gp`, `support.gp_time > .5` |
| `QDIVERGE` | **Do buyers believe the value claim more than the people who deliver it?** | `mean(gp_time | zorggroep, insurer) − mean(gp_time | gp) > 0.15` |
| `QREFUSE` | Do a majority of pharmacists accept refuse-rather-than-guess? | `pharm*`, `support.refuse > .5` |
| `QOWN` | Do a majority prefer the patient's own words to a filled form? | all, `support.own_words > .5` |
| `QSHARED` | **After the "practice retyped it and made an error" story, does the shared-dossier majority survive?** | fired `dubbel`, all, `support.shared > .5` |

### 11.8 Honesty block (all four, permanently on screen)
`GEEN LLM` · `SYNTHETISCH` · `GEEN VOORSPELLING` · `PRIOREN ZIJN AANNAMES`

### 11.9 Wilson interval

```ts
export function wilson(p: number, n: number, z = 1.959964) {
  const d = 1 + z*z/n, c = p + z*z/(2*n), s = z*Math.sqrt(p*(1-p)/n + z*z/(4*n*n));
  return { lo: (c-s)/d, hi: (c+s)/d };
}
```

### 11.10 The interactive layer
1. **Playback**: Start / Pause / Step / Reset, `1× 2× 4×`, 24 rounds.
2. **Scrub** a round slider → the canvas re-renders that snapshot; a sparkline underneath shows all six means
   with event ticks on the x-axis.
3. **Fire your own story**: nine chips; firing re-runs the whole simulation with `inject` (still deterministic);
   a ghost outline of the previous final camps stays visible so the audience sees the delta.
4. **The draggable decision line** at 0.5 on the selected dimension — drag it and the recount updates live:
   *"met de lijn hier staan 41 van de 240 aan de rechterkant — en 12 daarvan zijn assistenten."*
   **Add the archetype filter**: toggling to `assist_gp` alone is the moment the pitch turns honest.
5. **Two levers**: `druk` (0.4–2.0) and `vermenging` (0–1). At mixing 0 the graph must visibly shatter into ten
   non-communicating clusters — *"dit is wat homofilie doet met een zorgketen: de apotheek en de praktijk aan de
   overkant van de straat horen elkaar nooit."*
6. **Hover/click an agent** → profile: synthetic name, archetype, setting, six prior bars, how much they moved,
   then *"Waarom veranderde deze?"* listing the events and neighbours responsible.
7. **Report tab**: the six frequencies with n/CI, the falsifier table, three findings, *"Wat dit niet zegt."*

### 11.11 Canvas spec
One `<canvas>`, `requestAnimationFrame`, DPR-aware, `ResizeObserver`. Ten cluster centres on a circle; 240 nodes /
~1,500 edges. `alpha` starts at 1 and `*= 0.992` per frame. Centre attraction `0.012·alpha` (hubs 0.03);
pairwise repulsion inside radius 20 (hubs 46) with `f = r²/d² · 0.35 · alpha`; springs rest length 34 (hubs 120),
stiffness 0.01 (hubs 0.0012); damping 0.84; 12 px clamp. Draw: ground → 48 px grid at 2.5% white → cluster halos
(92 px radial gradient) → agent edges → hub edges → agents → pulses → labels → legend. Agent fill = stance colour
on the selected dimension (`POS #146C4A`, `NEG #A3221C`, `NEU #8C97A1`); unreached agents 28% alpha; pulses
travel an edge in 380 ms. No WebGL, no d3. **≥55 fps at 240 nodes, and print the measured fps on screen.**

---

## 12. The instrument

### 12.1 v1 — what a team writes by default, and why it cannot answer the question

Ten items in the default shape: *"What is your biggest frustration with shortages?"*, *"How likely would you use
a tool like this?"*, *"Which feature matters most?"* (single choice across five unrelated things), *"How do you
find alternatives today?"* (free text), *"Would you trust AI?"*.

**Coverage matrix** — the ten things this product must learn:

| need | why it matters | v1 | v2 |
|---|---|---|---|
| N1 · Does the assistant actually save time, or re-verify everything? | **the business case** | ✗ | ✓ `retype`, `q_retype` |
| N2 · Does the GP believe time is released inside the consult? | renewal | ✗ | ✓ `gp_time`, `q_time` |
| N3 · Is refusal acceptable, or does it feel broken? | the thesis | partial | ✓ `refuse`, `q_refuse` |
| N4 · Own words vs a completed form | the unresolved trade-off | ✗ | ✓ `own_words`, `q_form` |
| N5 · Is B1 explanation enough for a patient? | last mile | ✗ | ✓ `b1` |
| N6 · Will two organisations accept one dossier? | institutional adoption | ✗ | ✓ `shared`, `q_dossier` |
| N7 · How long does a change actually take today, end to end? | the €-value claim | ✗ | ✓ `q_minutes` |
| N8 · What is the real first frustration — stock, rules, or the phone call? | positioning | ✗ | ✓ `q_first` |
| N9 · Which side would pay? | the two-payer problem | ✗ | ✓ `q_payer` |
| N10 · What would make them stop using it? | churn | ✗ | ✓ `q_stop` |

**v1: 2.0/10. v2: 9.5/10.** Show the table.

### 12.2 The 14 items

```
A · Rol                                                          (this is the one that matters)
 1 role      single [doktersassistent, huisarts, apothekersassistent, openbaar apotheker,
                     ketenapotheker, ziekenhuisapotheker, patiënt, zorggroep, verzekeraar,
                     groothandel, inspectie]
 2 setting   single [zelfstandige apotheek, keten, huisartsenpraktijk, zorggroep, ziekenhuis, anders]
 3 years     single [<2, 2-5, 6-15, >15]

B · Het werk van vandaag  (v1 is blind here)
 4 q_minutes single "Hoeveel tijd kost één geneesmiddelwijziging u, van begin tot dat het in het dossier staat?"
              [<5 min, 5-15, 15-30, 30-60, >60, weet niet]
 5 q_first   single "Wat is daarbij uw eerste probleem?"
              [beschikbaarheid vinden, wet- en regelgeving, vergoeding, de andere organisatie bereiken,
               de patiënt uitleggen, administratie, niets]
 6 q_retype  scale 5 "Als een apotheker een gestructureerde overdracht stuurt, hoe vaak loopt u die dan
              regel voor regel na?"  (1 = nooit, 5 = altijd)
 7 q_time    scale 5 "Als de geschiedenis al gestructureerd klaarligt, hoeveel tijd wint u dan in het consult?"
              (1 = ik verlies tijd, 5 = ik win tijd)

C · De vier ideeën (neutrale taal, nooit "AI")
 8 usefulness matrix 5 rows:
   [ketens     "Kant-en-klare substitutieketens met de regels erbij",
    overdracht "Eén gestructureerde overdracht in plaats van een belletje en overtypen",
    verhaal    "Het verhaal van de patiënt in eigen woorden, met de vragen die openbleven",
    contravraag"Een melding wanneer de patiënt zegt dat de wijziging niet werkte"]
 9 q_form    single "Wat is bruikbaarder aan de vooravond van een lang consult?"
              [een volledig ingevuld formulier, een verhaal met gaten, allebei, geen van beide]
10 q_dossier single "Eén gedeeld dossier dat apotheek én praktijk beiden bijhouden:"
              [onwenselijk, alleen als de praktijk eigenaar is, alleen met toestemming per keer, wenselijk]
11 q_refuse  scale 5 "Als een systeem twijfelt, moet het dan weigeren of een beste gok doen?"
              (1 = altijd een gok, 5 = altijd weigeren)

D · Gebruik en geld
12 intent   scale 10 "Hoe waarschijnlijk gebruikt u dit volgende maand?"
13 q_payer  single "Wie zou dit moeten betalen?" [de apotheek, de praktijk, de zorggroep, de verzekeraar,
              de patiënt, niemand — dit hoort gratis]
14 q_stop   single "Wat zou u ervan weerhouden?"
              [vertrouwen in de regels, werkdruk, integratie met het AIS, kosten, de andere organisatie, niets]
```

Every sensitive item gets a `zeg ik liever niet` path; abstentions are counted **per archetype** and reported.

### 12.3 How agents answer
Deterministic mapping from opinion to answer — no model: `likert5(o) = clamp(1 + round(o*4))`; options carry
`align: "left" | "right" | null`; `abstain_probability = 0.05 + 0.28*(1 - o.shared)`.
`q_minutes` is drawn from the persona's `setting` (chain faster, independent slower) so the population's time
answer **traces to a persona fact, not an assertion**.

---

## 13. Findings that must be able to contradict the pitch

### 13.1 Commit `data/swarm/falsifiers.json` **before** the first ensemble run

```json
[
  {"id":"F1","claim":"Practice assistants accept a structured handover without re-verifying every line.","test":"QRETYPE","expected":true,
   "if_false":"The paperwork saving does not exist as designed. The product becomes a pharmacist-side tool and the practice side must be re-scoped to 'read-only, with the record as the source of truth'."},
  {"id":"F2","claim":"GPs believe time is released inside an existing consult.","test":"QGPTIME","expected":true,
   "if_false":"The value claim is unsellable to a zorggroep. We must price against avoided errors and complaints instead of minutes — a much harder sale with a longer cycle."},
  {"id":"F3","claim":"Buyers believe the value claim more than the people who deliver it do.","test":"QDIVERGE","expected":true,
   "if_false":"Our two-payer story is aligned, which would be unusual, and we would have to explain why everyone agrees."},
  {"id":"F4","claim":"The population prefers the patient's own words to a completed form.","test":"QOWN","expected":true,
   "if_false":"The unresolved trade-off resolves the wrong way: we would ship the form and keep only the medication-change part of the story — a smaller, cheaper, safer product."},
  {"id":"F5","claim":"One shared dossier is acceptable after both organisations have been burned by a retyping error.","test":"QSHARED","expected":true,
   "if_false":"Institutional willingness is not there; the audit chain becomes an export artefact rather than a shared record, and the sovereignty story weakens."}
]
```
`QDIVERGE` is computed from archetype means: `mean(gp_time | zorggroep, insurer) − mean(gp_time | gp) > 0.15`.

### 13.2 The finding you must surface, even though it undercuts the pitch

`assist_gp.retype = .34` is the lowest prior in the table, and it is the *only* number that decides whether the
€150–400/month is real. Report it plainly, with the interval:

> *"In 39 of 200 runs (p = 0.195, 95% CI 0.146–0.255) a majority of practice assistants said they would accept a
> structured handover without re-verifying every line. **That is the number our business case rests on, and it
> fails in eight runs out of ten.** We have not solved it. Our hypothesis is that it is not a trust problem but a
> liability problem — an assistant who accepts a wrong handover carries the consequences — and the next
> experiment is a practice that already has a protocol for accepting pharmacy messages, not more features."*

**You may not tune the priors to make this pass.** If a juror asks, the answer is: *"the assumption is on the
screen; drag the prior and watch the frequency move. That is the demo."*

### 13.3 Report structure
1. What the population is (240, ten archetypes, the prior table).
2. What it is not (the four honesty lines).
3. The six frequencies as `x / n runs (p, CI)`.
4. The falsifier table: fired / not fired, and the action each implies.
5. Three findings in plain language — **the assistant finding first**.
6. *"Wat dit niet zegt."*

---

## 14. Guardrails, evaluation, what not to claim

### 14.1 Test set
- **30 change cases** (§7.3), including the **10 with no safe chain** that must return zero valid chains.
- **14 pre-visit stories** (§7.4), including the **5 safety stories** that must produce only the acute line.
- **6 fusion cases** where the patient's story contradicts the change (S-04, S-06 shapes), with the expected
  `consistency` verdict.
- **5 adversarial handovers**: a handover with no task, one with a missing source, one where the reimbursement is
  `onbekend` but the text says "vergoed", one with a chain naming another substance, and one that arrives twice
  (`409 E-DUP-01`).

### 14.2 Metrics printed on screen

| Metric | Target | How |
|---|---|---|
| Chain validity (every proposed chain passes a cited rule) | 100% | `T-09`, `T-12` |
| Coverage (cases with ≥1 valid chain) | ≥ 70% on the 30 | computed |
| Unsafe proposals reaching the screen | **0** | `T-20`, `T-23` |
| Zero-valid-chain cases | **10 / 10** | `T-20` |
| Clinical assessments produced by surface C | **0** on 5 safety stories | `T-13` |
| Quotes traceable to the patient's words | 100% | `T-14` + a diff against the source text |
| GP summary reading time | **< 60 s**, measured | `scripts/stopwatch.ts` + one GP with a stopwatch |
| Practice acceptance time | **< 30 s**, measured | stopwatch on 10 rows |
| Time per change today vs here | report both | ask one pharmacy and one practice, then say it was an estimate if it is |
| Handover rows cleared per minute | report it | the honest adoption number |

### 14.3 Never say
- ❌ "We find an alternative in 99% of cases." Say: *"availability is solved elsewhere; we make the swap legal,
  reimbursed and safe, and we refuse when we cannot."*
- ❌ "Saves GPs 15 minutes." Say: *"the 15 minutes is an assumption from the brief's own framing; we claim time
  returned inside a consult that is already funded, and we measure it."*
- ❌ "GPs will see more patients." Never — that is a different, unproven claim.
- ❌ "Clinically validated." Say: *"substitution information for a pharmacist and history documentation for a GP;
  both humans decide."*
- ❌ "Not a medical device." Say: *"we would seek a classification opinion before scaling; triage and advice are
  excluded by design."*
- ❌ "Saves the healthcare system €X." You have no source for a system-level number. Do not have one.
- ❌ "The simulation shows assistants want this." Say: *"the simulated population, whose priors are on screen."*

---

## 15. Energy and sovereignty

### 15.1 The number
**kWh per 1,000 complete handovers ≈ 1.4 kWh warm, ≈ 3.1 kWh cold.** Show both, and say which is which.
Derivation, in full, on the `/energie` section of the report tab:
- One change = a handful of SmPC sections + one preference-list entry ≈ 4–8k tokens in, ~400 out → ~1.0.
- One pre-visit story = a 300–600 word Dutch story, two passes (structuring, gap check) → ~0.5.
- They share the patient context and the substance cache, so the pair is ~1.4 rather than 1.5.
- **Cache keyed on the SmPC sha256**, invalidated on hash change: SmPC text rarely changes, so the warm path is
  nearly free and the cold path is dominated by document ingestion (~40–80k tokens per SmPC, once per revision).
- The trade-off, stated: a cached answer is a *stale* answer, and staleness is a safety failure. So the cache key
  is the document hash and the `peildatum` is on screen, always.

### 15.2 Sovereignty, verbatim
> *"The rules are a table we own and can read on paper; the sources are EU public documents (CBG/EMA SmPC, insurer
> preference lists); the model only reads documents into fields and is swappable; two named humans — a pharmacist
> and a practice assistant — are the only thing that can produce a record. If we disappear, the pharmacy and the
> practice keep the audit log and the rule table and can still explain every decision to a patient."*

**Plus the health-data paragraph, which this product needs and the other two do not:**
> *"Health data means no ambiguity is allowed. EU-only processing, a processor agreement with any supplier,
> retention by default to the shortest window that makes the demo work, deletion as a feature and not a policy
> page. The patient's story is a PDF the practice owns and can export without us. That is the exit route, and we
> say it out loud rather than being asked."*
**[VERIFY]** NEN 7510 expectations and the AVG framing before any pilot; state it as an expectation, never a
certification.

---

## 16. The demo (90 seconds) and the pitch

### 16.1 The 90-second script — rehearse twice, out loud, on the clock
1. **0:00** Two numbers, one street: *"26,000 shortage notifications a day, 96 days each, one FTE per pharmacy.
   And forty minutes to register one patient, on paper, in 80% of practices."*
2. **0:10** The reframe: *"These are sold as two problems. They are one event seen from two ends. The medicine
   changes here — and the paperwork changes there, and nobody owns the gap."*
3. **0:20** **Surface A**: open **C-017**. Chains appear; three are refused. Read one refusal aloud, slowly:
   *"Salbutamol 2 mg/5 ml drank heeft een ander dosisinterval — niet uitwisselbaar zonder controle."*
   **Pause.** *"That sentence is why a pharmacist will trust this screen."* Approve one chain.
4. **0:40** **Surface B**: the handover lands in the inbox. *"This is what the practice assistant used to get as
   a phone call."* Click **accepteren** — one click, a record entry, a task, and the GP line. *"Twenty-eight
   seconds. That is the entire paperwork claim, and it is the number our business case rests on."*
5. **0:55** **Surface C**: open S-04. The patient's own words: *"ik ben met die nieuwe puffers gestopt, ik werd er
   dizzy van."* The **↺** appears on the handover. *"The pharmacy knows it changed. The practice knows it was told.
   Only the patient knows it did not work — and until now, nobody compared the three."*
6. **1:15** **Audit**: one hash chain, two organisations, two named humans, from prescription to quotation.
   *"This is the dossier an inspector asks for and neither side can produce today."*
7. **1:25** **Swarm**: filter to `assist_gp`. *"Forty practice assistants, and only 34% would accept our handover
   without re-checking every line. That is the number my business case rests on and it fails in eight runs out of
   ten. I have not solved it. Here is the experiment I would run next."*
8. **1:35** Stop talking. The last thing in the room is an admission with a number attached.

### 16.2 The five slides

| # | Headline | Copy / say |
|---|---|---|
| 1 · Claim | **One change, retyped three times.** | 26,000 shortages a day · 96 days · 1 FTE per pharmacy · 40 min to register one patient · 80% still paper |
| 2 · Demo | **The refusal, the one-click handover, and the patient who stopped taking it.** | Three surfaces, one record, one audit chain. |
| 3 · Why AI | **Dutch source texts change yearly and humans read them under time pressure.** | The model reads documents into fields and quotes patients; the rules decide; two humans approve. |
| 4 · FairTech | **No cross-substance swap. No triage. No advice. Two named humans and one hash chain.** | Wider impact: B1 patient explanation, and what the patient can correct before it is sent. |
| 5 · Venture | **€150–400 per pharmacy per month + €2–4 per intake to a zorggroep.** | Honest: two payers, one product, and the assistant's trust is unproven — the next experiment is a practice, not a feature. |

### 16.3 Jury Q&A — the exact answers

**"Aren't you stapling two ideas together?"**
> *"No — we sell the join. The pharmacy side produces the reasoning and the practice side consumes it. Take either
> half away and the other one is a worse version of something that already exists. The product is the record that
> survives both."*

**"Doesn't the national shortage search already do this?"**
> It finds who has stock, and almost every hospital uses it. We answer the next question: is the swap legal, is
> it reimbursed, and is it safe for this patient — and then we stop it from being retyped twice.

**"Digital intake is free in 2026."**
> It is, and it is built for registration and routing. We refuse to route anyone, we produce no urgency and no
> advice, and we start from a change that already happened rather than a symptom that might be something.

**"Could you cause a dosing error?"**
> Every chain is checked against the SmPC and the patient's flags; a cross-substance swap is impossible by
> construction — there is no code path for it — and a pharmacist approves each line. Ten of our thirty test cases
> have no safe answer, and the system returns zero valid chains on all ten.

**"Could you miss a sick patient?"**
> We do not assess anyone. There is no urgency field in the type system, and the practice's own acute line is on
> every screen. Five safety stories in our test set must produce nothing but that line — that is a zero-tolerance
> test, `T-13`.

**"Who pays, and is it two sales?"**
> Yes, two: a pharmacy chain or zorggroep at **€150–400 per pharmacy per month**, and a zorggroep at **€2–4 per
> intake**. That is the real weakness — two buyers who do not share a budget. We sell the first one, because the
> pharmacist feels the pain daily.

**"What have you not solved?"**
> Whether the practice assistant trusts the handover enough not to re-verify it. Our simulation says only 34% do,
> and she is the person the entire business case depends on. We also have not resolved the trade-off between a
> patient's free story with gaps and a complete form — we chose the story, and we have not measured whether a GP
> prefers it.

**"Is this a medical device?"**
> As scoped it is substitution information for a pharmacist and history documentation for a GP; triage, urgency
> and advice are excluded by design and by the type system. We would seek a classification opinion before scaling,
> and we say that rather than claiming an exemption.

---

## 17. 36-hour plan

**Day 1**
- 08:30–09:00 scaffold, fonts, tokens, footer line.
- 09:00–10:00 `types.ts` + `hashchain.ts` + `T-19`, and the `Approval`/`HandoverResponse` branded types (`T-10`).
- 10:00–12:00 **`data/substances.json` for 20 substances** — the hardest, most valuable block. Get the
  equivalence table right; a pharmacist will argue with it, and that argument is the demo.
- 12:00–12:45 `data/cases.json` (30) + `notices/` + `patients.json`.
- 12:45–14:00 `chains.ts` + `gate.ts`; wire `T-20`, `T-22`, `T-23`, `T-09`, `T-12`.
- 14:00–15:00 `refusal.ts` — all nine Dutch sentences, written carefully.
- 15:00–16:15 **Surface A** (three columns) + approval + edits.
- 16:15–17:00 **Find a pharmacist and a practice assistant.** In this room, at this hackathon, on this track.
  Ask the assistant one question: *"what do you do when the pharmacy calls?"* Fix the handover design tonight,
  in the data and the copy — not in the algorithm.

**Day 2**
- 09:00–10:00 **Surface B** (the inbox) + `letters.ts` (practice note, B1 patient text) + print page.
- 10:00–11:00 **Surface C**: `intake.ts`, `story.ts`, the 14 stories, gap detection, `G-*` rules, `T-13`.
  The five safety stories must come out empty apart from the acute line.
- 11:00–11:45 the fusion: `matchStoryToChange`, `attachStory`, the **↺** marker, `T-16`, `T-21`.
- 11:45–13:00 swarm: rng, archetypes, personas, engine; print the six frequencies.
  **Commit `falsifiers.json` before this run.** Then `SwarmCanvas` + play/scrub/fire/filter + Report tab.
- **13:00 freeze.**
- 13:30–13:50 rehearse twice, on the clock, out loud.
- 13:50 pitch.

**Cut order if behind:** CSV export → the 20th substance → `q_dossier` item → the ninth event → surface C's voice
input (it becomes typed text).
**Never cut:** the refusal column, the zero-valid-chain cases, `onbekend` rendering, the **one-click handover**
(there is no product without it), the ↺ contradiction marker, the five safety stories, the falsifiers, the CIs.

---

## 18. Acceptance criteria — machine-checkable

```bash
npm run build                       # 0
npm test                            # T-01..T-26 green
npx tsx scripts/verify-chain.ts     # total=N verified=N brokenAt=null
```

| # | Criterion | Check |
|---|---|---|
| A1 | 0 console page errors on `/`, `/change/C-004`, `/change/C-017`, `/inbox`, `/story/S-04`, `/story/S-01/summary`, `/verify`, `/swarm` | Playwright `pageerror` |
| A2 | 0 horizontal overflow at 390 px and 1440 px on every route | `scrollWidth - clientWidth === 0` |
| A3 | No nested anchors | `document.querySelectorAll('a a').length === 0` |
| A4 | The refusal column is visible **at first paint** on a case with refusals | `[data-refusal]` count > 0, no interaction |
| A5 | Zero valid chains on the 10 no-safe-chain cases | `T-20` |
| A6 | `onbekend` never renders as `vergoed` | `T-11` |
| A7 | Accepting a handover is **one click** and produces a record entry + task + GP line | Playwright: 1 click → 3 assertions |
| A8 | `/api/summary` without confirmation → 409 `E-CONFIRM-01`; without approval → 409 `E-APPROVAL-01` | API test |
| A9 | The 5 safety stories produce only the acute line | `T-13` |
| A10 | The ↺ contradiction marker appears on the S-04 flow and is the first line of the GP summary | DOM assertion |
| A11 | Chain tamper demo: `brokenAt === 7` → reset → `null` | API test |
| A12 | ≥6 swarm frequencies matching `/\d+ \/ \d+ runs \(p = 0\.\d{3}, 95% CI 0\.\d{3}–0\.\d{3}\)/` | regex on the Report tab |
| A13 | Four honesty strings present | `GEEN LLM`, `SYNTHETISCH`, `GEEN VOORSPELLING`, `PRIOREN ZIJN AANNAMES` |
| A14 | ≥1 falsifier fired against the pitch, and the assistant finding is rendered with its CI | Report tab |
| A15 | Every rendered field has `data-source` and `data-date` | DOM scan (`T-12`) |
| A16 | Works offline | DevTools offline → reload → still runs |
| A17 | Swarm ≥ 55 fps at 240 nodes, printed on screen | browser measurement |
| A18 | GP summary reading time < 60 s on 10 synthetic summaries, and the measured number is shown | `scripts/stopwatch.ts` output rendered |

---

## 19. `[VERIFY]` list — check these in the first hour

The build agent has only this file. These are the things this file asserts that must be confirmed against a real
source before they are printed on a slide. **Do not print an unverified one; do not silently drop one either — note
it in the README as "not verified".**

| # | What to verify | Why it matters | If it turns out differently |
|---|---|---|---|
| V1 | Whether a national **medication handover infrastructure** (LSP/VZVZ, and its successor programme) already moves exactly this payload | the "isn't this already digitised" objection | If it does: pivot the claim to *the reasoning and the patient's account*, and integrate rather than replace. Say so on slide 3. |
| V2 | What a **doktersassistent** actually does with a pharmacy message today (call? fax? LSP message? written note?) | surface B is modelled on an assumption | If it is already digital: B becomes a *review* screen, and the paperwork claim shrinks to the reasoning + the loop. |
| V3 | Whether Dutch practices commonly have a **40-minute slot** funded for complex patients, and how it is coded | the value claim's foundation | If rare: pivot to chronic-care/GGZ intake and the practice-nurse route. |
| V4 | **MijnPraktijk.nl** pricing in 2026 ("free") and its exact function | the "free incumbent" objection | If it charges or has expanded into handover: restate the difference precisely, do not generalise. |
| V5 | **NEN 7510** expectations for a supplier handling health data, and what an AVG processor agreement requires | the sovereignty paragraph | Say "expectation", never "certified". If a DPIA is required for a pilot, say that out loud — it is a strength, not a cost. |
| V6 | Whether a **GP information system export format** (PDF + paste block) is genuinely acceptable to practices | the "we never integrate" decision | If practices demand an integration: that is a 6–12 month certified route, and the honest answer is "not in this build, and here is why". |
| V7 | The **exact acute line** a Dutch practice wants on a patient-facing screen | `G-ACUTE-01` | Get it from a practice. Render it verbatim. Never write your own. |
| V8 | Whether shortage notices carry a **structure** you can rely on, or truly are free text | stage 2 | The build assumes free text and refuses to depend on a feed. That assumption is safe; do not weaken it for convenience. |

---

## 20. Sources (2026 unless stated)

- **Shortage scale and cost:** NRC, March 2026, on KNMP data — **26,000** shortage notifications a day,
  **3.5 million** Dutch people affected (1 in 3 users), **1,134** medicines unavailable, average shortage
  **~96 days**, **~1 FTE per pharmacy** (**2,000 FTE** nationally, **€220 million/year**), **74%** of shortages
  hitting preference-policy drugs, suppliers per drug **3.3 (2016) → 2.6 (2025)**.
- **Patients:** LEF + SIR Instituut Meldweek 2026 via ANP, 9 Nov 2026 — **46%** of affected patients report
  health deterioration, **6 in 10** must return to the pharmacy or doctor, **1 in 3** leaves empty-handed.
- **Substitution coverage:** KNMP *Geneesmiddelentekorten 2025* (Jan 2026) — **~75%** of shortages coverable by a
  product with the same active substance.
- **The 99% statement:** answer of Minister Hermans to parliament, 11 March 2026, citing KNMP data that an
  alternative is available in the pharmacy in **99%** of supply problems.
- **GP capacity and paperwork:** Dutch GP landscape figures — ~**2 in 3** practices take no new patients;
  **777,000–926,000 people** without a GP; **24.1%** full stops; **40 minutes** to register one patient and
  **80% still paper**; a standard consult is **10 minutes** and a complex patient **40**; insurers structurally
  fund new practices in 2026.
- **Incumbents:** `geneesmiddelentekort.nl` (used by ~95% of Dutch hospitals); **KNMP Farmanco** (€450/yr for
  pharmacies without a KNMP package, €2,064/yr for non-pharmacy organisations), voluntary reporting;
  **Pharme/Mosadex**; **GIP/Z-index**; **MijnPraktijk.nl — Digitaal Inschrijven** (free for practices in 2026,
  offered via Hadoks/HZW and others); **NHG** triage systems and the NHG intake structure; **Medicom, Promedico,
  Huisartsenportaal**.
- **Rules:** SmPC texts (CBG/EMA); the *tekortenbesluit* import rules (wetten.overheid.nl, IGJ); insurer
  *preferentiebeleid* (CZ, VGZ, Menzis, 2026); AVG and NEN 7510 (wetten.overheid.nl; NEN).

> **The preference lists and SmPC extracts in the demo are synthetic-but-realistic snapshots, labelled with a
> source name and a `peildatum`.** They exist to make the rules engine demonstrable. On screen, every one carries
> `voorbeelddata — geen officiële lijst`. Never present a snapshot as the current list.
>
> **Every patient story in the demo is synthetic**, written for this build, and labelled `SYNTHETISCH` on the
> screen where it appears. Never use a real patient story, not even anonymised.
