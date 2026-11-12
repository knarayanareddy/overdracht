import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import type { Case, SubstanceTable, Story } from './types';
import type { Preference } from './gate';
export const loadData=()=>{
 const root=process.cwd();const read=(p:string)=>JSON.parse(readFileSync(path.join(root,p),'utf8'));
 const cases=read('data/cases.json') as Case[];const table=read('data/substances.json') as SubstanceTable;
 const preferences=Object.fromEntries(['cz','vgz','menzis'].map(i=>[i,read(`data/preference/2026-${i}.json`) as Preference]));
 const stories=readdirSync(path.join(root,'data/stories')).filter(f=>f.endsWith('.json')).map(f=>read(`data/stories/${f}`) as Story).sort((a,b)=>a.story_id.localeCompare(b.story_id));
 return {cases,table,preferences,stories,substances:Object.keys(table)};
};
