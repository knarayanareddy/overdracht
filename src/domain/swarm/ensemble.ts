import { buildPersonas } from './personas';
import { runSwarm, type SwarmOptions, type SwarmRun } from './engine';
import { DIMENSIONS, type Dimension } from './archetypes';
import { mean, wilson } from './rng';
export interface Frequency{id:string;label:string;x:number;n:number;p:number;lo:number;hi:number}
export interface Ensemble{runs:number;seed:number;options:SwarmOptions;frequencies:Frequency[];dimensions:Record<Dimension,{mean:number;sd:number;p10:number;p50:number;p90:number;histogram:number[]}>;assistant:Frequency;falsifiers:{id:string;claim:string;test:string;expected:boolean;fired:boolean;support:number;if_false:string}[];outcomes:Record<string,boolean>[];generated_at:string}
export const QUESTIONS=[
 {id:'QRETYPE',label:'Meerderheid doktersassistenten neemt over zonder alles na te lopen',test:(r:SwarmRun)=>r.archetypeSupport.assist_gp.retype>.5},
 {id:'QGPTIME',label:'Meerderheid huisartsen ervaart tijdwinst in het consult',test:(r:SwarmRun)=>r.archetypeSupport.gp.gp_time>.5},
 {id:'QDIVERGE',label:'Kopers geloven tijdwinst sterker dan huisartsen',test:(r:SwarmRun)=>(r.archetypeMeans.zorggroep.gp_time*20+r.archetypeMeans.insurer.gp_time*12)/32-r.archetypeMeans.gp.gp_time>.15},
 {id:'QREFUSE',label:'Meerderheid apothekersteams accepteert weigeren boven gokken',test:(r:SwarmRun)=>(r.archetypeSupport.pharm.refuse*28+r.archetypeSupport.assist_pharm.refuse*36)/64>.5},
 {id:'QOWN',label:'Meerderheid prefereert eigen woorden boven een formulier',test:(r:SwarmRun)=>r.support.own_words>.5},
 {id:'QSHARED',label:'Gedeeld-dossiermeerderheid overleeft de overtypfout',test:(r:SwarmRun)=>r.support.shared>.5},
];
export function runEnsemble(personas=buildPersonas(),runs=200,options:SwarmOptions={}):Ensemble{
 if(!Number.isInteger(runs)||runs<1||runs>1000)throw Error('runs must be 1–1000');const seed=options.seed??20261111;const outcomes:Record<string,boolean>[]=[];const values=Object.fromEntries(DIMENSIONS.map(d=>[d,[] as number[]])) as Record<Dimension,number[]>;const assistantRuns:boolean[]=[];let sharedRuns=0,sharedYes=0;const eventEligible:boolean[]=[];
 for(let r=0;r<runs;r++){const result=runSwarm(personas,{...options,seed:seed+r*7919});const outcome=Object.fromEntries(QUESTIONS.map(q=>[q.id,q.test(result)]));outcomes.push(outcome);for(const d of DIMENSIONS)values[d].push(result.support[d]);assistantRuns.push(outcome.QRETYPE);const eligible=result.events.some(e=>e.id==='dubbel');eventEligible.push(eligible);if(eligible){sharedRuns++;if(outcome.QSHARED)sharedYes++;}}
 const frequency=(id:string,label:string,yes:number,n:number)=>{const p=n?yes/n:0;const ci=wilson(p,n);return {id,label,x:yes,n,p,lo:ci.lo,hi:ci.hi};};
 const frequencies=QUESTIONS.map(q=>frequency(q.id,q.label,q.id==='QSHARED'?sharedYes:outcomes.filter(o=>o[q.id]).length,q.id==='QSHARED'?sharedRuns:runs));
 const dimensions=Object.fromEntries(DIMENSIONS.map(d=>{const a=[...values[d]].sort((a,b)=>a-b);const m=mean(a);const quantile=(p:number)=>a[Math.min(a.length-1,Math.floor(p*a.length))];const histogram=Array(20).fill(0);a.forEach(v=>histogram[Math.min(19,Math.floor(v*20))]++);return [d,{mean:m,sd:Math.sqrt(mean(a.map(v=>(v-m)**2))),p10:quantile(.1),p50:quantile(.5),p90:quantile(.9),histogram}];})) as Ensemble['dimensions'];
 // Falsification means the simulated majority contradicts the pre-registered claim, not a real-world validation.
 const { readFileSync } = require('node:fs') as typeof import('node:fs');
 const falsifiers=JSON.parse(readFileSync('data/swarm/falsifiers.json','utf8')) as {id:string;claim:string;test:string;expected:boolean;if_false:string}[];
 return {runs,seed,options:{...options,seed},frequencies,dimensions,assistant:frequencies[0],falsifiers:falsifiers.map(f=>{const eligible=outcomes.filter((o,i)=>f.test!=='QSHARED'||eventEligible[i]);const support=eligible.length?eligible.filter(o=>o[f.test]===f.expected).length/eligible.length:0;return {...f,fired:eligible.length>0&&support<.5,support};}),outcomes,generated_at:'deterministic'};
}
export { formatFrequency } from './rng';
