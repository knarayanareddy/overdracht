import { DomainError } from './types';
import type { ChangeRecord, PharmacistApproval, Handover, ChainVerdict, Task } from './types';
import { TASKS, TASK_LABELS } from './types';
declare const approvalBrand:unique symbol;
export function createApproval(chain_id:string,by:string,at:string):PharmacistApproval {
 if(!/^AP-\d{2,6}$/.test(by)||!chain_id||!Number.isFinite(Date.parse(at)))throw new DomainError('E-APPROVAL-01: named demo pharmacist and valid timestamp required');
 return {chain_id,by,at} as unknown as PharmacistApproval;
}
export function approvedChain(rec:ChangeRecord):ChainVerdict {
 const chain=rec.chains.find(c=>c.chain_id===rec.pharmacist_approval?.chain_id);
 if(!rec.pharmacist_approval||!chain||chain.status!=='geldig')throw new DomainError('E-APPROVAL-01');return chain;
}
export function patientExplanation(rec:ChangeRecord,chain:ChainVerdict):string {
 const product=chain.chain[0];
 const reimbursement=chain.reimbursement==='vergoed'?'Vergoeding: vergoed volgens de synthetische voorbeeldlijst.':chain.reimbursement==='niet_vergoed'?'Vergoeding: niet vergoed volgens de synthetische voorbeeldlijst.':'Vergoeding: onbekend. De apotheek kan dit navragen.';
 return `Er is een wijziging voorgesteld voor uw medicijn. Het oorspronkelijke product is volgens de voorbeeldmelding niet leverbaar. Voorgesteld product: ${product.product}. De werkzame stof blijft ${rec.case.substance}. De apotheker heeft dit beoordeeld. ${reimbursement} Dit bericht bevat geen nieuwe gebruiksinstructies.`;
}
export function practiceNote(rec:ChangeRecord,chain:ChainVerdict):string {
 return `Medicatieverwijziging ${rec.case.case_id}: ${rec.case.substance} ${rec.case.strength} ${rec.case.form}. Voorstel: ${chain.chain[0].product}, ${chain.chain[0].package}. Werkzame stof ongewijzigd. Voorbeeldreden: oorspronkelijk product niet leverbaar. Vergoeding: ${chain.reimbursement.toUpperCase()}${chain.reimbursement_source?` (${chain.reimbursement_source.insurer}, peildatum ${chain.reimbursement_source.peildatum})`:''}. Regels en bronnen staan in het gekoppelde dossier. Apotheker ${rec.pharmacist_approval?.by} heeft goedgekeurd. Graag de registratie en patiënttaak afstemmen. Synthetische casus; geen gebruiksinstructie.`;
}
export function buildHandover(rec:ChangeRecord,approval:PharmacistApproval,openedAt:string,task:Task='herhaalrecept_controleren'):Handover {
 if(!rec.pharmacist_approval||approval.by!==rec.pharmacist_approval.by||approval.chain_id!==rec.pharmacist_approval.chain_id||approval.at!==rec.pharmacist_approval.at)throw new DomainError('E-APPROVAL-01');
 if(rec.handover)throw new DomainError('E-DUP-01');if(!TASKS.includes(task))throw new DomainError('E-TASK-01');
 const chain=approvedChain(rec);const note=practiceNote(rec,chain);if(note.split(/\s+/).length>120)throw Error('Practice note exceeds 120 words');
 return {handover_id:`H-${rec.case.case_id.slice(2)}`,case_id:rec.case.case_id,practice_id:rec.case.practice_id,direction:'beide',to_practice_nl:note,patient_text_nl:patientExplanation(rec,chain),task,status:'open',opened_at:openedAt,response:null,gp_line_nl:null,record_entry_nl:null,story_id:null,consistency:'onbekend',contradiction_nl:null};
}
export function respondHandover(h:Handover,by:string,at:string,action:'geaccepteerd'|'gewijzigd'|'teruggevraagd',task?:Task,note?:string,query?:string):Handover {
 if(!/^DA-\d{2,6}$/.test(by))throw new DomainError('E-ASSISTANT-01');if(h.response)throw new DomainError('E-DUP-01');
 if(action==='teruggevraagd'){if(!query?.trim()||query.trim().length<6)throw new DomainError('E-QUERY-01');return {...h,status:'teruggevraagd',response:{by,at,action,edits:[],note_nl:note||null,query_nl:query.trim()}};}
 const nextTask=task||h.task;if(!TASKS.includes(nextTask))throw new DomainError('E-TASK-01');
 const edits=nextTask!==h.task?[{field:'task' as const,from:h.task,to:nextTask,by,at,note_nl:note||null}]:[];
 return {...h,task:nextTask,status:action,record_entry_nl:`${h.case_id}: medicatiewijziging ontvangen en ${action} door ${by}; taak: ${TASK_LABELS[nextTask]}.`,gp_line_nl:`Medicatie: ${h.case_id} — ${h.to_practice_nl.split('. Voorstel: ')[1]?.split('. Werkzame')[0]||'wijziging geregistreerd'}. Overdracht ${action} door ${by}.`,response:{by,at,action,edits,note_nl:note?.trim()||null,query_nl:null}};
}
export function noSend():never{throw new DomainError('E-NOSEND-01: Dit systeem verstuurt niets.');}
