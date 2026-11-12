import { buildPersonas } from '../src/domain/swarm/personas';
import { runEnsemble, formatFrequency } from '../src/domain/swarm/ensemble';
import { writeFileSync } from 'node:fs';
const start=performance.now();const result=runEnsemble(buildPersonas(240,20261111),200,{seed:20261111});result.generated_at=new Date().toISOString();writeFileSync('data/swarm/runs.json',JSON.stringify(result,null,2));console.log(`240 personas · 200 runs · ${(performance.now()-start).toFixed(0)} ms`);for(const f of result.frequencies)console.log(f.id,formatFrequency(f));console.log('Falsifiers fired:',result.falsifiers.filter(f=>f.fired).map(f=>f.id).join(', '));
