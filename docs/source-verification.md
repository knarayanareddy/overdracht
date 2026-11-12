# Source verification — 11 November 2026

This is a desktop source review, not a clinical validation or a conversation with a pharmacy/practice. The application deliberately uses synthetic data and never represents its rule table as an official SmPC, registration database, or insurer policy. Retrieval dates are the review date, not invented publication dates.

## V1–V8: brief-mandated checks

| ID | Finding | Status / implementation consequence |
|---|---|---|
| V1 | VZVZ describes LSP exchange of dispensed medication, intolerances, contraindications and allergies between pharmacies and GPs; KNMP describes GP access and opt-in consent. This is not just a stock search. [1](https://www.vzvz.nl/diensten) [3](https://www.knmp.nl/dossiers/medicatieoverdracht/landelijk-schakelpunt-lsp) | **Verified: infrastructure exists.** Exact equivalence to the proposed justification/refusal/patient-quote payload is **not established**. Position Overdracht as a potential reasoning and patient-account layer; do not claim nobody digitised handover. No LSP integration in this build. |
| V2 | The sources establish available digital exchange, including GP access to pharmacy medication and ICA data. They do not establish how an individual assistant handles a particular substitution message today. [4](https://www.vzvz.nl/voor-wie/huisartsenzorg) | **Partially verified.** Treat inbox B as review, not a replacement for a universal phone/fax workflow. Observe real assistants before claiming minutes saved. |
| V3 | NZa's 2026 schedule distinguishes regular consults <5, 5–20, and ≥20 minutes; this does not verify a commonly funded 40-minute complex-patient slot or a specific code. [1](https://puc.overheid.nl/nza/doc/PUC_790675_22/1/) | **40-minute funding claim not verified.** Do not print it as fact. Pilot scheduling and payment need direct practice/insurer confirmation. |
| V4 | HZW describes digital registration, practice search, HIS connection, consent checks, and explicitly says the module is free for practices in 2026. [2](https://hzwhuisartsenzorg.nl/hzw-digiwijzer/digitaal-inschrijven/) Hadoks also describes free access for its practices and registration/dossier transfer. [1](https://www.hadoks.nl/zorgprofessional/professionele-ondersteuning/inschrijfmodule/) | **Verified for the named regional offers**, not every contract nationwide. Do not build a practice-availability map. |
| V5 | AP identifies health data as special personal data and a DPIA for large-scale health-data processing. NEN describes NEN 7510 as an information-security framework and says certification itself is not mandatory. [1](https://www.autoriteitpersoonsgegevens.nl/en/themes/health/using-and-sharing-health-data) [1](https://www.nen.nl/zorg-welzijn/ict-in-de-zorg/informatiebeveiliging-in-de-zorg) | **Expectations verified; legal review still required.** No certification claimed. A real pilot needs controller/processor mapping, Art. 28 agreement, lawful basis, consent arrangements, DPIA screening, access control, retention/deletion, incident response and hosting review. |
| V6 | No practice was interviewed and no HIS vendor accepted this export. | **Not verified.** JSON and browser-print PDF are provided as review artefacts only; no claim of HIS acceptance or certification. |
| V7 | No participating practice supplied a signed-off acute line. | **Not verified.** The exact brief sentence “Bij acute klachten: bel de praktijk.” is retained as a provisional demo string, explicitly not practice-approved. A real rollout must replace it with the practice's verbatim line and working contact route. This is not an emergency service. |
| V8 | KNMP describes notices from manufacturers/pharmacists, verification, availability, cause and expected date, and a reporting form. [2](https://farmanco.knmp.nl/intro) | **Reporting structure exists, universal schema not verified.** Intake accepts arbitrary notice text without scoring it. Structured prescription fields require explicit human confirmation; no unreliable regex pretends to understand every notice. |

## Numerical and positioning claims

- KNMP's January 2026 report on 2025 supports 1,134 shortages, mean 96 days, approximately 3.5 million affected people, and the approximately one FTE / 2,000 FTE / €220 million framing. The report describes a survey of >400 pharmacies for workload, so it is not a direct time study of every pharmacy. [1](https://www.knmp.nl/sites/default/files/2026-01/rapport_geneesmiddelentekorten_in_2025_def.pdf)
- The 75% same-substance coverage and ~95% hospital usage statements appear on geneesmiddelentekort.nl, attributed there to **2022**, not automatically to 2025/2026. Keep that date attached. [3](https://geneesmiddelentekort.nl/)
- Farmanco prices of €450 and €2,064/year appear on KNMP's product page; its search metadata shows an older page date, so reconfirm contract pricing before a pitch. [4](https://www.knmp.nl/over-de-knmp/producten-en-diensten/farmanco-website-geneesmiddelentekorten)
- **Not verified:** 26,000 shortage notifications/day; 40-minute registration; 80% paper; 2-in-3 practices closed; 777,000–926,000 without a GP; 24.1% full stops; a standard 10-minute / complex 40-minute norm; insurer structural funding of new practices; the minister's 99% statement; the LEF/SIR percentages; supplier change 3.3→2.6 as stated in the brief. These remain attributed brief assumptions in the analysis, not dashboard facts. The brief's 9 November 2026 patient-study citation postdates its aiGrunn build schedule and needs provenance reconciliation.
- **Not verified:** €150–400/month and €2–4/intake are proposed prices, not market evidence. No system-level savings claim is made.
- **Not validated:** all product registrations, dose-equivalence entries, contraindication flags and reimbursement snapshots are authored test fixtures. They are hashed and dated to make the engine auditable, not to make them clinically true.

## Energy claim

The brief's 1.4/3.1 kWh per 1,000 handovers assumes token-processing LLM passes, but §11 forbids LLM calls and this implementation uses deterministic rules and verbatim extraction. There is no measured GPU inference to account for. The app reports the brief numbers as **unmeasured assumptions**, not results, and does not fabricate an energy measurement. A hardware power-meter benchmark is a separate experiment.

## Next human validation

1. Pharmacist: review every rule, actual SmPC citations, import evidence and equivalence; approve the fixture vocabulary before any pilot.
2. Practice assistant: observe current message handling; time the one-click acceptance without coaching; test accountability and query routing.
3. GP: verify the one-screen summary, local acute wording, export acceptance and funded appointment model.
4. Privacy/security lead: establish roles and lawful exchange before introducing any real patient data.
