export type Route = 'nl_geregistreerd' | 'import' | 'bereiding';
export type Verdict = 'geldig' | 'afgewezen' | 'onbekend';
export type Reimbursement = 'vergoed' | 'niet_vergoed' | 'onbekend';
export type Direction = 'naar_praktijk' | 'naar_patient' | 'beide';
export type HandoverStatus = 'open' | 'geaccepteerd' | 'gewijzigd' | 'teruggevraagd';
export type PatientFlag = 'renaal' | 'zwangerschap' | 'pediatrisch' | 'allergie_penicilline' | 'allergie_nsaid' | 'leverfunctie';
export type Task = 'geen' | 'herhaalrecept_controleren' | 'patient_informeren' | 'controle_afspraak';
export interface Source { doc: string; field: string; date: string; sha256: string; quote_nl?: string; value?: unknown }
export interface Product { product: string; substance: string; strength: string; form: string; packages: string[]; nl_registered: boolean; foreign_registration: string | null; smpc_ref: string | null; adult_only?: boolean }
export interface Substance { substance: string; atc: string; products: Product[]; dose_interval_equivalence: Record<string, { equivalent: boolean | null; rule: string; note_nl: string; source: Source }>; contra_indications: Partial<Record<PatientFlag, boolean | null>>; sources: Source[] }
export type SubstanceTable = Record<string, Substance>;
export interface Case { case_id: string; substance: string; atc: string; strength: string; form: string; package: string; patient_flags: PatientFlag[]; insurer: 'CZ' | 'VGZ' | 'Menzis' | 'onbekend'; notice_ref: string | null; age_band: '0-11' | '12-17' | '18-64' | '65+'; practice_id: string; title_nl: string; allow_two_hops?: boolean; unavailable_product?: string; scenario?: string; expected: { valid_min: number; valid_max: number; must_reject_rules: string[] } }
export interface ChainLink extends Product { package: string; route: Route; hop: 0 | 1 }
export interface ChainVerdict { chain_id: string; chain: ChainLink[]; status: Verdict; rules_passed: string[]; reject_rule: string | null; reject_reason_nl: string | null; secondary_rules?: string[]; flag?: PatientFlag; reimbursement: Reimbursement; reimbursement_source: { insurer: string; list: string; peildatum: string } | null; sources: Source[] }
declare const approvalBrand: unique symbol;
export type PharmacistApproval = { readonly [approvalBrand]: true; readonly chain_id: string; readonly by: string; readonly at: string };
export interface Edit { field: 'chain' | 'patient_text' | 'to_practice' | 'reimbursement' | 'task'; from: string; to: string; by: string; at: string; note_nl: string | null }
export interface HandoverResponse { by: string; at: string; action: 'geaccepteerd' | 'gewijzigd' | 'teruggevraagd'; edits: Edit[]; note_nl: string | null; query_nl: string | null }
export interface Handover { handover_id: string; case_id: string; practice_id: string; direction: Direction; to_practice_nl: string; patient_text_nl: string; task: Task; status: HandoverStatus; opened_at: string; response: HandoverResponse | null; gp_line_nl: string | null; record_entry_nl: string | null; story_id: string | null; consistency: 'bevestigt' | 'spreekt_tegen' | 'onbekend'; contradiction_nl: string | null }
export interface ChangeRecord { case: Case; chains: ChainVerdict[]; top: string | null; refusals: ChainVerdict[]; needs_pharmacist: true; pharmacist_approval: PharmacistApproval | null; handover: Handover | null; approval_edits: Edit[] }
export type StoryField = 'klacht' | 'verloop' | 'geprobeerd' | 'context' | 'verwachting' | 'medicatie';
export interface Quote { field: StoryField; text_nl: string; confirmed: boolean }
export interface Gap { field: string; question_nl: string }
export interface IntakeSummary { complaint: Quote; course: Quote | null; tried: Quote[]; context: Quote[]; expectation: Quote | null; medication_change: Quote[]; gaps: Gap[]; clinical_impression: null; urgency: null; advice: null; synthetic: true; practice_acute_line: string; blocked: boolean; confirmed: boolean; confirmed_at: string | null }
export interface Story { story_id: string; case_id: string; text_nl: string; synthetic: true; answers?: Partial<Record<StoryField, string>>; safety_fixture?: boolean; expected_consistency?: 'bevestigt' | 'spreekt_tegen' | 'onbekend' }
export interface HandoverRow { handover: Handover; record: ChangeRecord; approved_chain: ChainVerdict }
export interface AuditRow { seq: number; ts: string; actor: string; action: string; subject: string; payload: Record<string, unknown>; prev_hash: string; hash: string }
export interface AuditResult { total: number; verified: number; brokenAt: number | null; rows: AuditRow[] }
export const TASKS: Task[] = ['herhaalrecept_controleren', 'patient_informeren', 'controle_afspraak'];
export const TASK_LABELS: Record<Task, string> = { geen: 'Geen taak', herhaalrecept_controleren: 'Herhaalrecept controleren', patient_informeren: 'Patiënt informeren', controle_afspraak: 'Controleafspraak afstemmen' };
export const FLAG_LABELS: Record<PatientFlag, string> = { renaal: 'Nierfunctie', zwangerschap: 'Zwangerschap', pediatrisch: 'Pediatrisch', allergie_penicilline: 'Penicilline-allergie', allergie_nsaid: 'NSAID-allergie', leverfunctie: 'Leverfunctie' } as Record<PatientFlag, string>;
export const ACUTE_LINE = 'Bij acute klachten: bel de praktijk.';

export class DomainError extends Error { public code:string; constructor(message:string){super(message);this.code=message.match(/E-[A-Z]+-\d+/)?.[0]||'E-DOMAIN-01';} }
