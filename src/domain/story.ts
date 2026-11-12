import type { Story, Quote, Handover } from './types';
export const MEDICATION_WORDS = /\b(tablet|tabletten|capsule|capsules|puf|pufs|puffer|puffers|inhalator|zetpil|zetpillen|medicijn|medicijnen|medicatie|het nieuwe merk|de andere doos|het andere doosje)\b/i;
export function sentences(text:string):string[]{return (text.match(/[^.!?]+[.!?]*/g)||[]).map(s=>s.trim()).filter(Boolean);}
export function matchStoryToChange(story:Story,h:Handover,substance:string):{mentions:Quote[];consistency:'bevestigt'|'spreekt_tegen'|'onbekend'} {
 const mentions=sentences(story.text_nl).filter(s=>s.toLowerCase().includes(substance.toLowerCase())||MEDICATION_WORDS.test(s)).map(text_nl=>({field:'medicatie' as const,text_nl,confirmed:false}));
 const contradiction=mentions.find(q=>/\b(gestopt|nooit ontvangen|niet ontvangen|teruggedraaid|terugveranderd|weer terug naar|het oude merk weer)\b/i.test(q.text_nl));
 return {mentions,consistency:contradiction?'spreekt_tegen':mentions.some(q=>/\b(nieuw|nieuwe|ander|andere|verander|verandering|hetzelfde|ontvangen)\b/i.test(q.text_nl))?'bevestigt':'onbekend'};
}
export function attachStory(h:Handover,s:import('./types').IntakeSummary):{h:Handover;story:import('./types').IntakeSummary}{return {h:{...h,story_id:s.synthetic?h.story_id:null},story:s};}
export function reconcile(h:Handover,s:import('./types').IntakeSummary,story:Story,substance:string):{h:Handover;story:import('./types').IntakeSummary}{
 if(s.blocked)return {h,story:s};const match=matchStoryToChange(story,h,substance);const quote=match.mentions.find(q=>/\b(gestopt|nooit ontvangen|niet ontvangen|teruggedraaid|terugveranderd|weer terug naar|het oude merk weer)\b/i.test(q.text_nl));
 return attachStory({...h,story_id:story.story_id,consistency:match.consistency,contradiction_nl:quote?`Patiënt zegt: “${quote.text_nl}” — gemeld na de wijziging.`:null},s);
}
