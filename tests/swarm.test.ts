import { describe,it,expect } from 'vitest';
import { buildPersonas } from '@/domain/swarm/personas';
import { runSwarm } from '@/domain/swarm/engine';
import { runEnsemble,formatFrequency } from '@/domain/swarm/ensemble';
import { ARCH,ARCH_KEYS,DIMENSIONS } from '@/domain/swarm/archetypes';
import { wilson,shuffle,mulberry32 } from '@/domain/swarm/rng';
import { answerPersona,likert5,aggregateAnswers } from '@/domain/swarm/instrument';
import { readFileSync } from 'node:fs';
describe('synthetic population, not a forecast',()=>{
 const personas=buildPersonas();
 it('has exactly 240 personas with the ten specified quotas',()=>{expect(personas).toHaveLength(240);for(const key of ARCH_KEYS)expect(personas.filter(p=>p.archetype===key)).toHaveLength(ARCH[key].n);expect(personas.every(p=>p.synthetic)).toBe(true);expect(new Set(personas.map(p=>p.id)).size).toBe(240);});
 it('is deterministic and uses Fisher–Yates',()=>{expect(shuffle([1,2,3,4,5],mulberry32(42))).toEqual(shuffle([1,2,3,4,5],mulberry32(42)));const a=runSwarm(personas),b=runSwarm(personas);expect(JSON.stringify(a)).toBe(JSON.stringify(b));expect(a.snapshots).toHaveLength(25);expect(a.events).toHaveLength(3);});
 it('mixing zero produces ten non-communicating archetype clusters',()=>{const r=runSwarm(personas,{mixing:0});expect(r.edges.every(([i,j])=>personas[i].archetype===personas[j].archetype)).toBe(true);for(const key of ARCH_KEYS)expect(r.edges.some(([i,j])=>personas[i].archetype===key&&personas[j].archetype===key)).toBe(true);});
 it('injection replaces rather than adding a fourth event',()=>{const r=runSwarm(personas,{inject:'dubbel'});expect(r.events).toHaveLength(3);expect(r.events.filter(e=>e.id==='dubbel')).toHaveLength(1);expect(r.events.find(e=>e.id==='dubbel')?.injected).toBe(true);});
 it('all opinions stay in [0,1] at pressure extremes',()=>{for(const pressure of [.4,2])for(const mixing of [0,1]){const r=runSwarm(personas,{pressure,mixing});for(const s of r.snapshots)for(const o of s.opinions)for(const v of o){expect(v).toBeGreaterThanOrEqual(0);expect(v).toBeLessThanOrEqual(1);}}});
 it('Wilson intervals and the six frequency strings are well-formed',()=>{const ci=wilson(.195,200);expect(ci.lo).toBeCloseTo(.146,2);expect(ci.hi).toBeCloseTo(.255,2);const e=runEnsemble(personas,20);expect(e.frequencies).toHaveLength(6);for(const f of e.frequencies){expect(formatFrequency(f)).toMatch(/\d+ \/ \d+ runs \(p = [01]\.\d{3}, 95% CI [01]\.\d{3}–[01]\.\d{3}\)/);expect(f.lo).toBeLessThanOrEqual(f.p);expect(f.hi).toBeGreaterThanOrEqual(f.p);}expect(e.frequencies.find(f=>f.id==='QSHARED')!.n).toBeLessThanOrEqual(20);});
 it('the pre-registered falsifiers can contradict the pitch without tuning priors',()=>{const e=runEnsemble(personas,30);const disk=JSON.parse(readFileSync('data/swarm/falsifiers.json','utf8'));expect(e.falsifiers.map(f=>f.id)).toEqual(disk.map((f:{id:string})=>f.id));expect(e.falsifiers.some(f=>f.fired)).toBe(true);expect(ARCH.assist_gp.priors.retype).toBe(.34);expect(e.assistant.n).toBe(30);});
 it('survey answers trace to persona facts and abstentions are counted',()=>{const p=personas.find(p=>p.archetype==='assist_gp')!;const a=answerPersona(p,ARCH.assist_gp.priors,42);expect(['<2','2-5','6-15','>15']).toContain(a.years);expect(likert5(0)).toBe(1);expect(likert5(1)).toBe(5);const agg=aggregateAnswers(personas,runSwarm(personas).snapshots.at(-1)!.opinions.map(o=>Object.fromEntries(DIMENSIONS.map((d,i)=>[d,o[i]]))),42);expect(agg.abstentions.assist_gp.n).toBe(40);expect(agg.answers).toHaveLength(240);});
});
