# Overdracht — end-to-end analysis and build report

**Review date:** 11 November 2026 (fixture/source-review date). Runtime audit timestamps use the server clock.

**Scope reviewed:** `build-pharmacy-gp-fusion.md` in full, the empty starting repository, the implemented application, domain/API tests and browser acceptance runs.

**Bottom line:** the product is demonstrable as a synthetic, local-first handover workflow. It is not a clinically validated or production-ready health-data service. The strongest implemented idea is the join between an approved pharmacy change and the patient's later, confirmed account; the weakest business assumption is that a practice assistant will accept the handover without re-verifying it.

---

## 1. What the brief is actually proposing

The brief describes one event seen from three places:

1. **Pharmacy:** a shortage forces a product change. The pharmacist needs same-substance candidates, rule verdicts, reimbursement status and a permanent refusal record.
2. **Practice:** an assistant receives the change and must turn it into a record entry, a patient task and a GP-visible note without retyping the whole justification.
3. **Patient:** before a longer consult, the patient explains in their own words what changed and what they experienced. Missing information stays a question; every quote is confirmed before sharing.

The fusion is not “AI summaries everywhere”. It is a constrained comparison: the pharmacy record says a change was approved; the practice record says it was received; the patient may say they stopped, never received it, or changed back. That returned quote is the useful signal. The system must not diagnose, triage, reconcile medication automatically, or advise.

The swarm lab is a separate assumption-testing instrument. It uses no LLM and produces seeded scenario frequencies with Wilson intervals, not forecasts. Its purpose is to expose the adoption bets—especially the practice assistant's trust/liability problem—rather than decorate the pitch.

## 2. Starting repository and implementation shape

The repository initially contained only `README.md` and the 85,999-byte specification. There was no app, package manifest, data model or test harness to extend.

Implemented stack:

- Next.js 16, React 19, strict TypeScript, plain CSS with the brief's tokens.
- Self-hosted Inter, IBM Plex Mono and Source Serif 4; license files included.
- No database: JSON fixtures plus one append-only JSONL audit chain, hydrated into an in-process state map.
- Vitest domain/API/swarm tests; Playwright browser acceptance script.
- `pdf-lib` for real PDF exports; browser print and clipboard paste block as additional exits.
- Build-specific service worker for offline reading. No runtime external API or API key.

Main paths:

| Path | Purpose |
|---|---|
| `/` and `/wijzigingen` | day overview and searchable/filterable case register |
| `/intake` | structured prescription fields + arbitrary notice text, explicitly human-confirmed |
| `/change/[id]` | three-column pharmacy surface: context, candidates, permanent refusals |
| `/inbox` | practice review queue; one-click accept, inline query/edit |
| `/story/[id]` | six-question patient flow, local draft, quote confirmation |
| `/story/[id]/summary` | two-gate GP summary; contradiction first |
| `/verify` | audit explorer, verifier, row-7 tamper/reset |
| `/swarm` | canvas lab and report/priors/falsifiers/energy section |
| `/survey` | v1/v2 instrument comparison; browser-only answers and export |
| `/bronnen` | source checks, boundaries and demo script |

## 3. End-to-end workflow analysis

| Stage | Implemented behaviour | Refusal / gate |
|---|---|---|
| Input | Known substance/product selection plus editable strength/form/package; arbitrary notice text stored as evidence | Unknown substance or missing structured fields refused; notice is not scored or “understood” by a model |
| Document reading | Synthetic SmPC-shaped fields and insurer snapshots carry document, field, date and SHA-256 | Missing/invalid source degrades to `onbekend`; stale/missing reimbursement never becomes `vergoed` |
| Chain generation | Same INN only; original unavailable product excluded; package variants; deterministic sort; one link / one hop | Cross-substance need returns a visible `P-SUB-01` refusal, never an alternative substance |
| Medication gate | Precedence: substance → contraindication flag → paediatric → hop → strength/form equivalence → import → reimbursement → source | First failure is primary; secondary rules retained; unknown is first-class |
| Pharmacist approval | Named demo pharmacist ID, selected valid chain, explicit acknowledgement; task/note edits logged | No valid chain, missing ID or duplicate approval refused |
| Handover | Structured record, ≤120-word practice note, B1 what/why text without dosing instructions, mandatory task | No handover without approval; no task `geen` |
| Practice response | One click creates dossier entry + patient task + GP line; query returns a real question; task edits logged | Named demo assistant ID required; duplicate response refused |
| Patient story | Typed answers or synthetic example; verbatim sentence/field quotes; gaps are questions | Safety fixtures and explicit assessment requests produce only the acute line; no symptom classifier |
| Confirmation | Every displayed quote checked individually; server re-extracts and verifies quotes against source | Partial confirmation refused; draft stays local until confirmation |
| Reconcile | Medication passages matched by substance/medication words; stopped/never-received/changed-back language yields `spreekt_tegen` | Story cannot mutate chains, reimbursement, rules or refusals |
| GP summary | Requires pharmacist approval and patient confirmation; contradiction quote first; open questions remain open | `E-APPROVAL-01` / `E-CONFIRM-01` server-side |
| Audit/export | Canonical hashes, gap-free sequence, exclusive lock, tamper demo; JSON/PDF/paste block | Writes blocked while chain is broken; export blocked without approval/confirmation |

## 4. Data and provenance

- `data/substances.json`: 20 substances. Product combinations and policy flags are explicitly synthetic. Unknown form/strength equivalence is `null`, not guessed.
- `data/smpc/*.json`: SmPC-shaped fixtures with hashed fields. They are **not** official SmPC extracts.
- `data/preference/2026-{cz,vgz,menzis}.json`: synthetic snapshots with `peildatum`; stale/unknown cases exercise refusal.
- `data/cases.json`: 30 cases. Twenty have at least one valid candidate; ten deliberately have none. Five overlapping patient flags are represented.
- `data/notices/*.txt`: three free-text shapes; intake accepts arbitrary text without depending on a licensed feed.
- `data/stories/*.json`: 14 synthetic stories, including five safety fixtures that render only the contact line.
- `data/swarm/falsifiers.json`: committed before the first ensemble run (commit `50d13e1`).
- `data/swarm/runs.json`: actual 200-run output, not the brief's illustrative “39/200” example.
- `logs/audit.jsonl`: seeded demo chain plus runtime events. One global chain, `subject` identifies the change.

The fixture hashes make the demo auditable and tamper-evident; they do not make the authored clinical values true.

## 5. Contradictions in the brief and how they were resolved

1. **Cross-substance examples vs hard ban.** The inbox sketch shows omeprazol → pantoprazol-equivalent. That is a therapeutic change and forbidden by `P-SUB-01`. Fixtures use same-INN alternatives; cross-substance need is a refusal case.
2. **C-017 pitch vs unknown reimbursement.** The demo script approves C-017 while the sketch says reimbursement `ONBEKEND`; the gate makes unknown non-valid. C-017 uses a known synthetic CZ snapshot and a package-only alternative, with three refusals (missing import citation and two unknown form equivalences). Unknown-reimbursement behaviour is tested elsewhere.
3. **Coverage target is arithmetically impossible.** Ten zero-valid cases out of thirty cap coverage at 20/30 = 66.7%, below the stated ≥70%. The app reports the actual 20/30 and does not tune fixtures to hide the contradiction.
4. **Import refusal visibility vs “do not emit” and T-22.** A missing foreign registration must be visible as a refusal, but T-22 requires non-empty citations on import chains. The refused candidate retains `foreign_registration: null`; no such chain is approvable. We do not invent a fake citation to satisfy a string test.
5. **Hop definition vs two-change rule.** The algorithm defines a hop by strength/form/package difference, while `P-STR-02` prose describes strength+package as two changes. Generation emits at most one link; multi-link chains are rejected without explicit expansion. Package-only changes can be valid; unverified form/strength equivalence cannot.
6. **“Any clinically suggestive input” vs normal history-taking.** Blocking every symptom mention would empty all nine normal stories. The implementation blocks the five authored safety fixtures and explicit requests for diagnosis/urgency/advice, and always shows the acute line. It does not attempt red-flag detection on arbitrary text. This is a demo boundary, not a safety classifier for real patients.
7. **Practice-owned acute line vs no practice contact.** V7 cannot be verified without a practice. The exact brief sentence is retained provisionally and labelled unverified; no new emergency wording was invented.
8. **One chain per change vs one shared JSONL.** The file tree and “one chain, both ends” conflict. A single global chain with per-change `subject` preserves cross-organisation ordering; filtered views/exports keep original sequence numbers.
9. **“Only approve/handover write” vs story/intake persistence.** Capturing and confirming a story and creating a case must persist. All writes go through the same audit transaction path; survey answers remain browser-only.
10. **No LLM vs token-based energy estimate.** The 1.4/3.1 kWh figures assume model ingestion. This deterministic build has no such workload. The report labels them unmeasured brief assumptions, not results.
11. **Wilson display regex excludes certainty.** The acceptance regex only allows `p = 0.xxx`, but legitimate outputs include `1.000`. Formatting remains mathematically correct; the QA regex allows `[01].xxx`.
12. **Duplicate T-14 numbering.** The brief uses T-14 for both gap questions and determinism. Tests label gap checks T-14 and determinism T-18, matching the structural table.
13. **Source timeline.** The LEF/SIR citation dated 9 November 2026 postdates the described hackathon build schedule. It is not printed as a verified dashboard fact.
14. **Named humans vs authentication.** Required IDs are enforced, but demo IDs are not authenticated identities. The UI says so; production auth/RBAC is a separate requirement.
15. **Hash chain vs compliance.** A local hash chain detects row edits but an administrator can recompute it. It is not an electronic signature, independent timestamp authority or NEN 7510 certification.
16. **Offline “still runs” vs server writes.** Cached pages and the local simulation work offline. Approvals/confirmations require the local server and fail explicitly; the app never queues a fake approval.
17. **Human timing targets vs hackathon evidence.** No GP/assistant stopwatch study was performed. The UI shows pending human measurement; the stopwatch script supports a real session instead of fabricating a number.
18. **Voice dependency.** Live ASR was cut in favour of typed input and local-only read-aloud, as the brief's cut order permits.

## 6. Source verification outcome

Full details and links: [`source-verification.md`](source-verification.md).

- **V1 verified:** LSP/VZVZ and KNMP describe medication and allergy/intolerance exchange between pharmacy and GP. The “nobody digitised handover” framing is too strong. Exact coverage of justification/refusal/patient-quote payload is not established.
- **V2 partial:** digital availability does not prove the assistant's current local workflow. Observe before claiming time saved.
- **V3 not verified:** NZa duration bands do not establish a commonly funded 40-minute complex slot.
- **V4 verified for named offer:** HZW says MijnPraktijk digital registration is free for practices in 2026; Hadoks describes free access for its practices. Not a universal contract claim.
- **V5 framework verified:** AP special-category/DPIA guidance and NEN 7510 framing; no certification claimed.
- **V6 not verified:** no practice/HIS vendor accepted the export format.
- **V7 not verified:** no practice-approved acute line/contact path.
- **V8 safe assumption:** notices have structure but no guaranteed universal schema; arbitrary text plus human-confirmed fields is retained.

KNMP's 2025 report supports 1,134 shortages, 96-day mean duration and the workload framing. The 75% same-substance figure on the shortage search site is attributed there to 2022. Several headline numbers in the brief remain unverified and are absent from product metrics.

## 7. Simulation and business-case findings

The engine uses the brief's exact archetype quotas and priors, seeded Mulberry32, Fisher–Yates shuffles, 24 rounds, three planned events, bounded influence/backfire, and Wilson intervals. No LLM is called. Mixing zero produces no cross-archetype edges. Injection replaces a planned event rather than adding a fourth.

Actual default 200-run output at seed 20261111:

| Question | Result |
|---|---|
| QRETYPE — assistant majority accepts without rechecking | 29/200, p=0.145, 95% CI 0.103–0.200 |
| QGPTIME — GP majority believes time is released | 1/200, p=0.005, 95% CI 0.001–0.028 |
| QDIVERGE — buyers more convinced than GPs | 200/200, p=1.000, 95% CI 0.981–1.000 |
| QREFUSE — pharmacy teams accept refusal over guessing | 200/200, p=1.000, 95% CI 0.981–1.000 |
| QOWN — own-words majority | 104/200, p=0.520, 95% CI 0.451–0.588 |
| QSHARED — shared-dossier majority after retyping-error story | 55/55 eligible runs, p=1.000, 95% CI 0.935–1.000 |

F1 and F2 fire against the pitch. The assistant finding is rendered first. These are consequences of the chosen assumptions, not evidence about real adoption. The own-words interval overlaps 0.5; the form-vs-story question remains unresolved.

Commercially, the brief has two payers (pharmacy chain and zorggroep) that do not automatically share a budget. Proposed prices €150–400/site/month and €2–4/intake are hypotheses. The next experiment should test assistant acceptance protocols and liability, GP reading time, and who owns the shared record—not add more simulation personas.

## 8. Acceptance evidence

| Criterion | Status | Evidence |
|---|---|---|
| A1 zero page errors | Passed | Browser suite across 68 routes at two widths; zero `pageerror` |
| A2 no horizontal overflow | Passed | 390 px and 1440 px scans; document overflow 0 |
| A3 no nested anchors | Passed | DOM scan |
| A4 refusals at first paint | Passed | C-017 has three `[data-refusal]` rows without interaction |
| A5 ten zero-valid cases | Passed | T-20 |
| A6 unknown never reimbursed | Passed | T-11 and gate behaviour |
| A7 one-click handover outputs | Passed | Browser click → dossier entry, task, GP line |
| A8 two summary gates | Passed | API tests: `E-CONFIRM-01`, then `E-APPROVAL-01` |
| A9 five safety stories acute-only | Passed | T-13/T-24 and DOM scan |
| A10 contradiction first | Passed | S-04 browser flow; first summary blockquote contains “gestopt” |
| A11 tamper/reset | Passed | `brokenAt=7` → reset → `null` |
| A12 six frequency strings | Passed with corrected boundary regex | Allows legitimate `1.000` |
| A13 honesty strings | Passed | All four permanently rendered |
| A14 falsifier + assistant CI | Passed | F1/F2 fired; actual CI rendered |
| A15 provenance attributes | Passed | Every `[data-field]` has source and date |
| A16 offline reload | Passed | Service worker cached app reloads with explicit read-only banner |
| A17 ≥55 fps / 240 nodes | Passed in test browser | Measured 60 fps; device-dependent, not a universal guarantee |
| A18 GP reading <60 s measured | **Pending human study** | Ten fixtures and stopwatch script exist; no clinician measurement fabricated |

Final verification on this checkout: strict TypeScript passed; production build `pCke_LA43dNhuoRNLhoCm` completed without errors; **38/38 domain/API/swarm tests** passed. The full browser suite passed **15/15 checks**, including all 68 routes at both widths (136 route loads), with **zero document overflows and zero page errors**, and measured **60 fps at 240 nodes**. It also exercises PDF download, survey export, free-text notice intake and the full fusion path. The clean preview audit chain verified as `total=104 verified=104 brokenAt=null`; acceptance mutations used a separate log directory. A18 remains pending rather than being inferred from word-count estimates.

## 9. Security, privacy and production readiness

This build is safe to explore only because it contains synthetic data and exposes demo identities. Before any real pilot:

1. **Identity and access:** authenticated pharmacist/assistant/patient roles, per-record authorization, session handling, CSRF/origin policy, rate limits and audit of failed access.
2. **Clinical governance:** pharmacist-reviewed rule table, official SmPC/registration sources, import evidence, insurer policy snapshots, equivalence validation, change control and incident escalation. The current `null` equivalence policy is intentionally conservative.
3. **Privacy:** controller/processor mapping, lawful basis and consent model, Art. 28 agreements, DPIA screening, data minimisation, retention schedules, deletion/export workflows, breach response and hosting/data-residency review.
4. **Audit integrity:** independent or append-only external storage, signed/checkpointed heads, backup/restore, clock policy and retention. A local JSONL hash chain alone is insufficient.
5. **Integration:** agree whether LSP/Mitz or another infrastructure carries the payload; validate HIS export acceptance; do not claim certification or replace funded regional registration platforms.
6. **Patient safety:** obtain the practice's verbatim acute line and working contact route; validate the no-triage boundary with clinicians; do not rely on the five-fixture test as a real-world safety guarantee.
7. **Operations:** monitoring, error reporting without health data leakage, dependency updates, accessibility review, device performance testing, disaster recovery and a documented exit route.
8. **Measurement:** timed assistant acceptance without coaching, GP reading study, query-loop completion, and buyer interviews. Report estimates as estimates.

## 10. Deliberate cuts

- Live speech recognition: replaced by typed input; read-aloud only with a local Dutch browser voice.
- CSV export: omitted; JSON, PDF and paste block are implemented.
- Real integrations, real patient data, real LLM calls, dispensing/ordering/stock feeds, practice availability radar: excluded by scope.
- Human validation and production compliance: not performed, explicitly listed rather than implied.

## 11. Recommended next sequence

1. Run the two-minute demo with one pharmacist and one doktersassistent; watch where they hesitate or re-verify.
2. Replace synthetic rule values with reviewed, cited extracts in a controlled fixture branch; keep unknowns visible.
3. Obtain the practice's acute wording and export acceptance; time ten handovers and ten GP summaries.
4. Decide the infrastructure boundary with LSP/consent infrastructure owners.
5. Complete privacy/security design and a small synthetic-data pilot before any real patient information enters the system.
