import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, rmSync, openSync, fsyncSync, closeSync } from 'node:fs';
import path from 'node:path';
import type { AuditRow, AuditResult } from './types';
export function canonicalJson(value:unknown):string {
 const seen=new WeakSet<object>();
 const walk=(v:unknown):unknown=>{
  if(v===null||typeof v==='string'||typeof v==='boolean') return v;
  if(typeof v==='number'&&Number.isFinite(v)) return v;
  if(Array.isArray(v)) { if(seen.has(v))throw Error('Circular JSON');seen.add(v);return v.map(walk); }
  if(typeof v==='object'&&v!==null) { if(seen.has(v))throw Error('Circular JSON');seen.add(v);return Object.fromEntries(Object.entries(v).filter(([,x])=>x!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,walk(x)])); }
  throw Error('Unsupported canonical JSON value');
 };
 return JSON.stringify(walk(value));
}
export function hashRow(row:Omit<AuditRow,'hash'>):string {return createHash('sha256').update(canonicalJson(row)).digest('hex');}
export function verifyRows(rows:AuditRow[]):AuditResult {
 let prev='',verified=0,brokenAt:number|null=null;
 for(let i=0;i<rows.length;i++){const r=rows[i];const ok=r.seq===i+1&&r.prev_hash===prev&&r.hash===hashRow({seq:r.seq,ts:r.ts,actor:r.actor,action:r.action,subject:r.subject,payload:r.payload,prev_hash:r.prev_hash});if(!ok){brokenAt=r.seq||i+1;break;}verified++;prev=r.hash;}
 return {total:rows.length,verified,brokenAt,rows};
}
export function parseAudit(text:string):AuditRow[]{return text.split('\n').filter(Boolean).map(line=>JSON.parse(line));}
export function logPath(){return path.resolve(process.env.OVERDRACHT_LOG_DIR||path.join(process.cwd(),'logs'),'audit.jsonl');}
const pause=(ms:number)=>new Promise(r=>setTimeout(r,ms));
export async function exclusive<T>(fn:()=>T|Promise<T>):Promise<T>{
 const file=logPath();mkdirSync(path.dirname(file),{recursive:true});const lock=file+'.lock';let acquired=false;
 for(let i=0;i<100;i++){try{mkdirSync(lock);acquired=true;break;}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;await pause(20);}}
 if(!acquired)throw Error('Audit lock busy; retry');
 try{return await fn();}finally{rmSync(lock,{recursive:true,force:true});}
}
export function readAudit():AuditResult {const file=logPath();return verifyRows(existsSync(file)?parseAudit(readFileSync(file,'utf8')):[]);}
export async function appendAudit(events:Omit<AuditRow,'seq'|'hash'|'prev_hash'|'ts'>[], ts?:string, locked=false):Promise<AuditRow[]>{
 const append=()=>{const audit=readAudit();if(audit.brokenAt!==null)throw Error(`Audit integrity failure at ${audit.brokenAt}`);let prev=audit.rows.at(-1)?.hash||'';const added:AuditRow[]=[];
 for(const e of events){const row={seq:audit.rows.length+added.length+1,ts:ts||new Date().toISOString(),...e,prev_hash:prev};const complete={...row,hash:hashRow(row)};added.push(complete);prev=complete.hash;}
 const fd=openSync(logPath(),'a');try{appendFileSync(fd,added.map(r=>JSON.stringify(r)).join('\n')+'\n');fsyncSync(fd);}finally{closeSync(fd);}return added;};
 return locked?append():exclusive(append);
}
export async function demoTamper(reset=false):Promise<AuditResult>{
 return exclusive(()=>{const file=logPath(),backup=file+'.tampered';if(reset){if(existsSync(backup))renameSync(backup,file);return readAudit();}
 const a=readAudit();if(a.brokenAt!==null)throw Error('Reset the existing tamper first');if(a.total<7)throw Error('Seed at least seven audit rows');if(existsSync(backup))throw Error('Tamper backup already exists');
 const rows=structuredClone(a.rows);rows[6].payload={...rows[6].payload,demo_tampered:true};writeFileSync(backup,readFileSync(file));const fd=openSync(file,'w');try{writeFileSync(fd,rows.map(r=>JSON.stringify(r)).join('\n')+'\n');fsyncSync(fd);}finally{closeSync(fd);}return readAudit();});
}
