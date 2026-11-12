import type { ChangeRecord, IntakeSummary, Handover } from './types';
import { ACUTE_LINE } from './types';
export function assertSummary(s:IntakeSummary,source?:string):void {
 if(s.clinical_impression!==null||s.urgency!==null||s.advice!==null||!s.synthetic||s.practice_acute_line!==ACUTE_LINE)throw Error('G-WALL-01');
 if(s.gaps.some(g=>!g.question_nl.endsWith('?')||'value' in g))throw Error('G-GAP-01');
 if(s.blocked&&(s.complaint.text_nl||s.course||s.tried.length||s.context.length||s.expectation||s.medication_change.length||s.gaps.length))throw Error('G-NOTRIAGE-01');
 if(source){const quotes=[s.complaint,s.course,...s.tried,...s.context,s.expectation,...s.medication_change].filter(Boolean);if(quotes.some(q=>!source.includes(q!.text_nl)))throw Error('G-QUOTE-01');}
}
export function assertRecord(r:ChangeRecord):void {
 if(r.needs_pharmacist!==true)throw Error('W10');
 if(r.pharmacist_approval&&!r.chains.some(c=>c.chain_id===r.pharmacist_approval?.chain_id&&c.status==='geldig'))throw Error('E-APPROVAL-01');
 if(r.chains.some(c=>c.chain.some(l=>l.substance!==r.case.substance)))throw Error('P-SUB-01');
 if(r.chains.some(c=>c.status==='afgewezen'&&(!c.reject_rule||!c.reject_reason_nl||c.reject_reason_nl.length<=25)))throw Error('W9');
}
export function assertHandover(h:Handover):void {if(!h.practice_id||h.task==='geen'||!h.to_practice_nl||!h.patient_text_nl)throw Error('E-HANDOVER-01');}
export function deepFreeze<T>(v:T):T {if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.freeze(v);Object.values(v).forEach(deepFreeze);}return v;}
