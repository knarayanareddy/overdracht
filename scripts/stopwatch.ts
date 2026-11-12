import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin as input,stdout as output } from 'node:process';
import { data } from '../src/domain/store';
import { extractStory,allQuotes } from '../src/domain/intake';
interface Fixture{id:string;story_id:string|null;text:string;words:number;estimated_seconds_at_200wpm:number}
const fixtures:Fixture[]=[];
for(const s of data.stories.filter(s=>!s.safety_fixture).slice(0,9)){const d=extractStory(s,data.substances);const text=[...new Set(allQuotes(d).map(q=>q.text_nl))].join('\n')+'\nOpen vragen:\n'+d.gaps.map(g=>g.question_nl).join('\n');fixtures.push({id:`R-${String(fixtures.length+1).padStart(2,'0')}`,story_id:s.story_id,text,words:text.split(/\s+/).filter(Boolean).length,estimated_seconds_at_200wpm:Math.round(text.split(/\s+/).filter(Boolean).length/200*60)});}
const extra='Ik wil graag het overzicht van mijn medicijnen bespreken.\nMijn andere doosje heb ik vorige week gekregen.\nIk hoop dat we vandaag één duidelijk overzicht maken.\nOpen vragen:\nWanneer is dit begonnen of veranderd?\nWilt u vertellen wat u al heeft geprobeerd?';
fixtures.push({id:'R-10',story_id:null,text:extra,words:extra.split(/\s+/).filter(Boolean).length,estimated_seconds_at_200wpm:Math.round(extra.split(/\s+/).filter(Boolean).length/200*60)});
mkdirSync('data/practice',{recursive:true});writeFileSync('data/practice/reading-fixtures.json',JSON.stringify({synthetic:true,note:'Leestijdfixtures; geen klinische validatie. R-10 is een extra synthetische tekst.',fixtures},null,2));
const measurements={synthetic:true,gp_reading:{median_seconds:null as number|null,n:0,measured_at:null as string|null,method:'Nog niet gemeten met een huisarts. Word-count/200wpm is alleen een schatting.'},practice_acceptance:{median_seconds:null,n:0,measured_at:null,method:'Nog niet gemeten in een praktijkstudie.'},fixtures:fixtures.map(f=>({id:f.id,words:f.words,estimated_seconds_at_200wpm:f.estimated_seconds_at_200wpm}))};
async function main(){if(process.argv.includes('--record')){const rl=createInterface({input,output});const times:number[]=[];for(const f of fixtures){console.log(`\n--- ${f.id} (${f.words} woorden) ---\n${f.text}\n`);const answer=await rl.question('Gemeten leestijd in seconden (leeg = overslaan): ');const n=Number(answer.replace(',','.'));if(answer.trim()&&Number.isFinite(n)&&n>0)times.push(n);}rl.close();if(times.length){times.sort((a,b)=>a-b);measurements.gp_reading={median_seconds:times[Math.floor(times.length/1)],n:times.length,measured_at:new Date().toISOString(),method:'Door de operator ingevoerde stopwatchmetingen; geen gevalideerde klinische studie.'};}}
writeFileSync('data/measurements.json',JSON.stringify(measurements,null,2));console.log(`10 fixtures ready. Human median: ${measurements.gp_reading.median_seconds??'not measured'} s. Estimates are not study results.`);}
main().catch(e=>{console.error(e);process.exitCode=1;});
