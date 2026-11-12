import { readAudit, demoTamper } from '@/domain/hashchain';
import { generateChains } from '@/domain/gate';
import { approvedChain } from '@/domain/letters';
import { ApiError, data, ensureStore, listRecords, getRecord, getNotice, inboxRows, getDraft, listStories, approveCase, respond, confirmPatientStory, getSummary, markSummaryViewed, createCase } from '@/domain/store';
import { runEnsemble } from '@/domain/swarm/ensemble';
import { buildPersonas } from '@/domain/swarm/personas';
import { V1_ITEMS,V2_ITEMS,COVERAGE } from '@/domain/swarm/instrument';
import { exportPdf } from './export';
import type { Case, Edit, Task } from '@/domain/types';
import { readFileSync } from 'node:fs';
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
const text=(v:unknown,status:number)=>typeof v==='string'?v:JSON.stringify(v);
function str(v:unknown,name:string,max=200):string{if(typeof v!=='string'||!v.trim()||v.length>max)throw new ApiError('E-INPUT-01',`Ongeldig veld: ${name}`,400);return v.trim();}
function optional(v:unknown,max=2000):string|undefined{if(v===undefined||v===null)return undefined;if(typeof v!=='string'||v.length>max)throw new ApiError('E-INPUT-01','Tekst te lang.',400);return v;}
function checkOrigin(req:Request){const site=req.headers.get('sec-fetch-site');const origin=req.headers.get('origin');const hosts=[req.headers.get('host'),req.headers.get('x-forwarded-host')?.split(',')[0].trim(),new URL(req.url).host].filter(Boolean);if(site==='cross-site'||(origin&&(!['http:','https:'].includes(new URL(origin).protocol)||!hosts.includes(new URL(origin).host))))throw new ApiError('E-ORIGIN-01','Alleen acties vanuit deze demo zijn toegestaan.',403);}
async function body(req:Request):Promise<Record<string,unknown>>{if(Number(req.headers.get('content-length')||0)>64000)throw new ApiError('E-INPUT-01','Verzoek te groot.',413);try{const raw=await req.text();if(raw.length>64000)throw Error();const b=JSON.parse(raw);if(!b||typeof b!=='object'||Array.isArray(b))throw Error();return b;}catch{throw new ApiError('E-INPUT-01','Ongeldige JSON.',400);}}
function swarmOptions(url:URL){const runs=Number(url.searchParams.get('runs')||200),seed=Number(url.searchParams.get('seed')||20261111),pressure=Number(url.searchParams.get('pressure')||1),mixing=Number(url.searchParams.get('mixing')||.18),inject=url.searchParams.get('inject')||undefined;if(!Number.isInteger(runs)||runs<1||runs>1000||!Number.isInteger(seed)||seed<0||seed>4294967295||!Number.isFinite(pressure)||pressure<.4||pressure>2||!Number.isFinite(mixing)||mixing<0||mixing>1)throw new ApiError('E-INPUT-01','Ongeldige simulatieparameters.',400);return {runs,options:{seed,pressure,mixing,inject}};}
export async function handleApi(req:Request):Promise<Response>{
 try{
  const url=new URL(req.url),parts=url.pathname.replace(/^\/api\/?/,'').split('/').filter(Boolean),[root,id]=parts,method=req.method;
  if(method!=='GET')checkOrigin(req);
  if(method==='GET'){
   if(root==='health'){await ensureStore();return json({ok:readAudit().brokenAt===null,rows:readAudit().total,synthetic:true});}
   if(root==='case'&&!id)return json({cases:(await listRecords()).map(r=>r.case)});
   if(root==='case'&&id)return json({case:(await getRecord(id)).case,record:await getRecord(id),notice_nl:await getNotice(id)});
   if(root==='inbox')return json({rows:await inboxRows()});
   if(root==='story'&&!id)return json({stories:await listStories()});
   if(root==='story'&&id)return json(await getDraft(id));
   if(root==='summary'&&id)return json(await getSummary(id,url.searchParams.get('story_id')||undefined));
   if(root==='audit')return json(readAudit());
   if(root==='swarm'){const {runs,options}=swarmOptions(url);if(runs===200&&options.seed===20261111&&options.pressure===1&&options.mixing===.18&&!options.inject)return json(JSON.parse(readFileSync('data/swarm/runs.json','utf8')));return json(runEnsemble(buildPersonas(),runs,options));}
   if(root==='survey'){const version=url.searchParams.get('version')||'v2';return json({version,items:version==='v1'?V1_ITEMS:V2_ITEMS,coverage:COVERAGE,synthetic:true});}
  }
  if(method==='POST'){
   const b=await body(req);
   if(root==='chain'){const c=await getRecord(str(b.case_id,'case_id'));return json(generateChains(c.case,data.table,data.preferences));}
   if(root==='case'){const c=b.case as Case;if(!c||typeof c!=='object')throw new ApiError('E-INPUT-01','Casus ontbreekt.',400);return json({record:await createCase(c,optional(b.notice_nl,12000)||'')},201);}
   if(root==='approve'){
     const case_id=str(b.case_id,'case_id'),chain_id=str(b.chain_id,'chain_id'),by=str(b.by,'by');const record=await getRecord(case_id);const raw=Array.isArray(b.edits)?b.edits:[];if(raw.length>5)throw new ApiError('E-INPUT-01','Te veel bewerkingen.',400);
     const edits:Edit[]=raw.map((e:Record<string,unknown>)=>{const field=str(e.field,'edit.field');if(!['task','to_practice'].includes(field))throw new ApiError('E-EDIT-01','Dit veld vereist een nieuwe farmacotherapeutische beoordeling.');return {field:field as Edit['field'],from:field==='task'?'herhaalrecept_controleren':String(record.top||''),to:str(e.to,'edit.to',3000),by,at:new Date().toISOString(),note_nl:optional(e.note_nl)||null};});
     const next=await approveCase(case_id,chain_id,by,edits);const row=readAudit().rows.findLast(r=>r.subject===case_id&&r.action==='CHAIN_APPROVED');return json({seq:row?.seq,hash:row?.hash,record:next});
   }
   if(root==='handover'){const handover_id=str(b.handover_id,'handover_id'),by=str(b.by,'by'),action=str(b.action,'action');if(!['geaccepteerd','gewijzigd','teruggevraagd'].includes(action))throw new ApiError('E-INPUT-01','Ongeldige actie.',400);if(b.edits!==undefined&&!Array.isArray(b.edits))throw new ApiError('E-INPUT-01','Edits moet een lijst zijn.',400);const record=await respond(handover_id,by,action as 'geaccepteerd',b.task as Task,optional(b.note_nl),optional(b.query_nl));const row=readAudit().rows.findLast(r=>r.subject===record.case.case_id&&r.action.startsWith('HANDOVER_')&&r.actor===by);return json({seq:row?.seq,record});}
   if(root==='story'){const story_id=str(b.story_id,'story_id');if(!Array.isArray(b.confirmed)||b.confirmed.length>100||b.confirmed.some(x=>typeof x!=='string'))throw new ApiError('E-CONFIRM-01','Bevestig elke regel afzonderlijk.');const raw=optional(b.text_nl,12000);let answers:Record<string,string>|undefined;if(b.answers&&typeof b.answers==='object'){answers={};for(const [k,v] of Object.entries(b.answers)){if(!['klacht','verloop','geprobeerd','context','verwachting','medicatie'].includes(k)||typeof v!=='string'||v.length>12000)throw new ApiError('E-INPUT-01','Ongeldig antwoord.',400);answers[k]=v;}}const joined=raw||Object.values(answers||{}).join(' ');return json(await confirmPatientStory(story_id,answers?joined:raw,b.confirmed as string[],answers as never));}
   if(root==='summary'){await markSummaryViewed(str(b.case_id,'case_id'),str(b.story_id,'story_id'));return json({ok:true});}
   if(root==='audit'){if(!['tamper','reset'].includes(String(b.op)))throw new ApiError('E-INPUT-01','Kies tamper of reset.',400);return json(await demoTamper(b.op==='reset'));}
   if(root==='swarm'&&id==='fire'){const event_id=str(b.event_id,'event_id');const seed=Number(b.seed??20261111);if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw new ApiError('E-INPUT-01','Ongeldige seed.',400);const pressure=Number(b.pressure??1),mixing=Number(b.mixing??.18);if(!Number.isFinite(pressure)||pressure<.4||pressure>2||!Number.isFinite(mixing)||mixing<0||mixing>1)throw new ApiError('E-INPUT-01','Ongeldige simulatieparameters.',400);return json(runEnsemble(buildPersonas(),200,{seed,inject:event_id,pressure,mixing}));}
   if(root==='export'&&id){const record=await getRecord(id);if(!record.pharmacist_approval)throw new ApiError('E-APPROVAL-01','Een overdracht vereist goedkeuring door de apotheker.');const storyId=url.searchParams.get('story_id');const summary=storyId?await getSummary(id,storyId):undefined;const format=url.searchParams.get('format')||'json';if(format==='json')return new Response(JSON.stringify({record,summary:summary||null,synthetic:true},null,2),{headers:{'Content-Type':'application/json','Content-Disposition':`attachment; filename="${id}.json"`,'Cache-Control':'no-store'}});if(format==='pdf'){const bytes=await exportPdf(record,summary);return new Response(Buffer.from(bytes),{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${id}.pdf"`,'Cache-Control':'no-store'}});}throw new ApiError('E-INPUT-01','Kies pdf of json.',400);}
  }
  return json({error:{code:'E-NOTFOUND-01',message:'Endpoint niet gevonden.'}},404);
 }catch(e){const known=e instanceof ApiError;const code=known?e.code:String(e instanceof Error?e.message:'E-INTERNAL-01').match(/E-[A-Z]+-\d+/)?.[0]||'E-INTERNAL-01';const status=known?e.status:code.startsWith('E-')&&code!=='E-INTERNAL-01'?409:500;return json({error:{code,message:known||(e instanceof Error&&e.message.startsWith('E-'))?e.message:'De actie kon niet worden uitgevoerd. Probeer opnieuw.'}},status);}
}
