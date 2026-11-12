import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { Case, ChainLink, ChainVerdict, SubstanceTable, Source, Reimbursement, ChangeRecord, Verdict } from './types';
import { candidateChains, chainId } from './chains';
import { refusal } from './refusal';
export interface Preference { synthetic: boolean; insurer:string; list:string; peildatum:string; entries:Record<string,Reimbursement> }
export function validSource(s?: Source | null): boolean {
 if(!s || !s.doc || !s.date || !/^[a-f0-9]{64}$/.test(s.sha256) || !('value' in s)) return false;
 return createHash('sha256').update(JSON.stringify({doc:s.doc,field:s.field,value:s.value,date:s.date,synthetic:true})).digest('hex')===s.sha256;
}
export function evaluate(chain: ChainLink[], c: Case, table: SubstanceTable, preferences: Record<string,Preference>, asOf = new Date()): ChainVerdict {
 const p = table[c.substance];
 const link = chain[0];
 let status: Verdict = 'geldig', reject_rule: string | null = null, reject_reason_nl: string | null = null, flag: ChainVerdict['flag'];
 const passed:string[] = [], secondary:string[] = [];
 const fail = (rule:string, verdict:Verdict='afgewezen', extra?:string) => { if(!reject_rule) { reject_rule=rule; status=verdict; reject_reason_nl=refusal(rule,c,link,extra); } else secondary.push(rule); };
 const pass = (r:string) => { passed.push(r); if(reject_rule && !secondary.includes(reject_rule)) secondary.push(reject_rule); };
 if(!link || chain.some(l=>l.substance!==c.substance)) fail('P-SUB-01');
 if(p) {
   for(const f of c.patient_flags) if(p.contra_indications[f]===true) { flag=f; fail('P-CI-01'); }
   pass('P-CI-01');
   if(c.age_band==='0-11' && chain.some(l=>l.adult_only)) fail('P-PAEDI-01'); else pass('P-PAEDI-01');
 }
 if(chain.length>1 && !c.allow_two_hops) fail('P-STR-02'); else pass('P-STR-02');
 if(link && p && (link.form!==c.form || link.strength!==c.strength)) {
   const e = p.dose_interval_equivalence[`${c.form}|${link.form}`];
   if(!e || e.equivalent!==true || !validSource(e.source)) fail('P-STR-01','onbekend',e?.note_nl); else pass('P-STR-01');
 } else pass('P-STR-01');
 if(link?.route==='import' && (!link.foreign_registration?.trim() || link.nl_registered || !c.notice_ref)) fail('P-IMPORT-01'); else pass('P-IMPORT-01');
 let reimbursement:Reimbursement='onbekend'; let reimbursement_source:ChainVerdict['reimbursement_source']=null;
 const pref=preferences[c.insurer.toLowerCase()];
 if(pref && c.insurer!=='onbekend') {
   reimbursement_source={insurer:c.insurer,list:pref.list,peildatum:pref.peildatum};
   const d=new Date(pref.peildatum+'T00:00:00Z');
   const months=(asOf.getUTCFullYear()-d.getUTCFullYear())*12+asOf.getUTCMonth()-d.getUTCMonth()-(asOf.getUTCDate()<d.getUTCDate()?1:0);
   const peildatum=c.scenario==='stale'?'2025-01-01':pref.peildatum;
   reimbursement_source.peildatum=peildatum;
   const age=(asOf.getTime()-new Date(peildatum+'T00:00:00Z').getTime())/86400000;
   if(!Number.isFinite(age)||age<0||months>12||c.scenario==='stale') fail('P-REIMB-01','onbekend',`De synthetische lijst heeft peildatum ${peildatum} en is meer dan twaalf maanden oud.`);
   else { reimbursement=pref.entries[`${c.substance}|${link?.strength}|${link?.form}`] || 'onbekend'; if(reimbursement==='onbekend') fail('P-REIMB-01','onbekend',`De lijst van ${peildatum} noemt dit product niet.`); else pass('P-REIMB-01'); }
 } else fail('P-REIMB-01','onbekend');
 const sources:Source[]=[];
 for(const l of chain) {
   const ref=p?.products.find(x=>x.product===l.product);
   const file=ref?.smpc_ref;
   if(c.scenario==='missing_source'||!file||!existsSync(path.join(process.cwd(),file))) { fail('P-SOURCE-01','onbekend'); continue; }
   const doc=JSON.parse(readFileSync(path.join(process.cwd(),file),'utf8')) as {fields:Source[]};
   for(const field of ['substance','strength','form','packages','nl_registered']) {
     const s=doc.fields.find(x=>x.field===field);
     const value=field==='packages'?l.package:l[field as keyof ChainLink];
     const matches=s && (field==='packages'?Array.isArray(s.value)&&(s.value as string[]).includes(l.package):s.value===value);
     if(!matches||!validSource(s)) fail('P-SOURCE-01','onbekend'); else sources.push(s!);
   }
 }
 if(!reject_rule) pass('P-SOURCE-01');
 return {chain_id:chain.length?chainId(c,chain):`${c.case_id}-unknown`,chain,status,rules_passed:passed,reject_rule,reject_reason_nl,secondary_rules:secondary,flag,reimbursement,reimbursement_source,sources};
}
export function generateChains(c:Case, table:SubstanceTable, preferences:Record<string,Preference>, asOf?:Date):ChangeRecord {
 let chains=candidateChains(c,table).map(links=>evaluate(links,c,table,preferences,asOf));
 if(!chains.length) {
   const rule=!table[c.substance]||c.scenario==='unknown'?'P-UNKNOWN-01':'P-SUB-01';
   chains=[{chain_id:`${c.case_id}-unknown`,chain:[],status:'onbekend',rules_passed:[],reject_rule:rule,reject_reason_nl:refusal(rule,c),reimbursement:'onbekend',reimbursement_source:null,sources:[]}];
 }
 const refusals=chains.filter(x=>x.status!=='geldig');
 return {case:c,chains,top:chains.find(x=>x.status==='geldig')?.chain_id||null,refusals,needs_pharmacist:true,pharmacist_approval:null,handover:null,approval_edits:[]};
}
