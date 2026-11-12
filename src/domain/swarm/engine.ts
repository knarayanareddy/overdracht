import { ARCH_KEYS, DIMENSIONS, EVENTS, type Dimension } from './archetypes';
import type { Persona } from './personas';
import { mulberry32, shuffle, clamp, mean } from './rng';
export interface SwarmOptions{rounds?:number;mixing?:number;pressure?:number;seed?:number;minEvents?:number;inject?:string}
export interface SwarmRun{seed:number;rounds:number;personas:Persona[];edges:[number,number][];snapshots:{round:number;opinions:number[][];means:Record<Dimension,number>;camps:Record<Dimension,{left:number;swing:number;right:number}>;event:string|null}[];events:{round:number;id:string;label:string;injected:boolean}[];support:Record<Dimension,number>;means:Record<Dimension,number>;archetypeMeans:Record<string,Record<Dimension,number>>;archetypeSupport:Record<string,Record<Dimension,number>>;changed:boolean[];reasons:{events:string[];neighbors:{id:string;amount:number}[]}[]}
export function runSwarm(personas:Persona[],options:SwarmOptions={}):SwarmRun{
 const {rounds=24,mixing=.18,pressure=1,seed=20261111,minEvents=3,inject}=options;const rnd=mulberry32(seed);const n=personas.length;
 if(rounds<8||rounds>120||mixing<0||mixing>1||pressure<.4||pressure>2)throw Error('Invalid simulation parameters');
 const eventCount=Math.max(3,minEvents);const eligible=shuffle(Array.from({length:rounds-4},(_,i)=>i+3),rnd).slice(0,eventCount);const eventOrder=shuffle([...EVENTS],rnd).slice(0,eventCount);
 const events=eligible.map((round,i)=>{const e=eventOrder[i];return {round,id:e.id as string,label:e.label as string,injected:false};});
 if(inject){const index=events.findIndex(e=>e.id===inject);const e=EVENTS.find(e=>e.id===inject);if(!e)throw Error('Unknown event');events[index<0?0:index]={...events[index<0?0:index],id:e.id,label:e.label,injected:true};}
 const groups=Object.fromEntries(ARCH_KEYS.map(a=>[a,personas.map((p,i)=>p.archetype===a?i:-1).filter(i=>i>=0)]));
 const edgeSet=new Set<string>();const edges:[number,number][]=[];const local=Math.round(7*(1-mixing));
 const add=(i:number,j:number)=>{if(i===j)return;const key=i<j?`${i}:${j}`:`${j}:${i}`;if(!edgeSet.has(key)){edgeSet.add(key);edges.push([Math.min(i,j),Math.max(i,j)]);}};
 for(let i=0;i<n;i++){const same=groups[personas[i].archetype];for(let k=0;k<local;k++)add(i,same[Math.floor(rnd()*same.length)]);for(let k=local;k<7;k++)add(i,Math.floor(rnd()*n));}
 const neighbours=Array.from({length:n},()=>[] as number[]);for(const [i,j] of edges){neighbours[i].push(j);neighbours[j].push(i);}
 let opinions=personas.map(p=>DIMENSIONS.map(d=>clamp(p.priors[d]+(rnd()-.5)*.18)));
 const snapshots:SwarmRun['snapshots']=[];const reasons=personas.map(()=>({events:[] as string[],neighborTotals:new Map<number,number>()}));
 const snapshot=(round:number,event:string|null)=>{const means=Object.fromEntries(DIMENSIONS.map((d,j)=>[d,mean(opinions.map(o=>o[j]))])) as Record<Dimension,number>;const camps=Object.fromEntries(DIMENSIONS.map((d,j)=>[d,{left:opinions.filter(o=>o[j]<.42).length,swing:opinions.filter(o=>o[j]>=.42&&o[j]<=.58).length,right:opinions.filter(o=>o[j]>.58).length}])) as SwarmRun['snapshots'][number]['camps'];snapshots.push({round,opinions:opinions.map(o=>[...o]),means,camps,event});};
 snapshot(0,null);
 for(let round=1;round<=rounds;round++){
   const order=shuffle(Array.from({length:n},(_,i)=>i),rnd);
   for(const i of order){const ns=shuffle(neighbours[i],rnd);if(!ns.length)continue;const j=ns[Math.floor(rnd()*ns.length)];const d=Math.floor(rnd()*6);const gap=opinions[j][d]-opinions[i][d];const likeness=1-Math.min(1,Math.abs(gap)*1.4);const influence=(.35+.65*personas[j].behav.voice)*(.4+.6*likeness);const openness=personas[i].behav.susceptibility*(1-.75*personas[i].behav.conviction);let move=gap*influence*openness*.42*pressure;if(Math.abs(gap)>.45&&personas[i].behav.conviction>.6&&rnd()<.5)move=-Math.sign(gap)*Math.abs(gap)*.10*pressure;opinions[i][d]=clamp(opinions[i][d]+move);const t=reasons[i].neighborTotals;const key=t.get(j)||0;t.set(j,key+Math.abs(move));}
   const event=events.find(e=>e.round===round);
   if(event){const definition=EVENTS.find(e=>e.id===event.id)!;for(let i=0;i<n;i++){for(const [dimension,effect] of Object.entries(definition.effect)){const j=DIMENSIONS.indexOf(dimension as Dimension);opinions[i][j]=clamp(opinions[i][j]+effect*(.6+.8*rnd()));}reasons[i].events.push(event.label);}}
   snapshot(round,event?.label||null);
 }
 const support=Object.fromEntries(DIMENSIONS.map((d,j)=>[d,opinions.filter(o=>o[j]>=.5).length/n])) as Record<Dimension,number>;
 const archetypeMeans:SwarmRun['archetypeMeans']={},archetypeSupport:SwarmRun['archetypeSupport']={};
 for(const a of ARCH_KEYS){const ids=personas.map((p,i)=>p.archetype===a?i:-1).filter(i=>i>=0);archetypeMeans[a]=Object.fromEntries(DIMENSIONS.map((d,j)=>[d,mean(ids.map(i=>opinions[i][j]))])) as Record<Dimension,number>;archetypeSupport[a]=Object.fromEntries(DIMENSIONS.map((d,j)=>[d,ids.length?ids.filter(i=>opinions[i][j]>=.5).length/ids.length:0])) as Record<Dimension,number>;}
 return {seed,rounds,personas,edges,snapshots,events,support,means:snapshots.at(-1)!.means,archetypeMeans,archetypeSupport,changed:opinions.map((o,i)=>o.some((v,j)=>Math.abs(v-personas[i].priors[DIMENSIONS[j]])>.05)),reasons:reasons.map(r=>({events:r.events,neighbors:[...r.neighborTotals].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([i,amount])=>({id:personas[i].id,amount}))}))};
}
