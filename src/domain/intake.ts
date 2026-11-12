import { DomainError } from './types';
import type { Story, IntakeSummary, StoryField, Quote, Gap } from './types';
import { ACUTE_LINE } from './types';
import { sentences, MEDICATION_WORDS } from './story';
export const emptySummary=():IntakeSummary=>({complaint:{field:'klacht',text_nl:'',confirmed:false},course:null,tried:[],context:[],expectation:null,medication_change:[],gaps:[],clinical_impression:null,urgency:null,advice:null,synthetic:true,practice_acute_line:ACUTE_LINE,blocked:false,confirmed:false,confirmed_at:null});
export function extractStory(story:Story,knownSubstances:string[]=[],recordSubstance?:string):IntakeSummary {
 const s=emptySummary();
 // Safety fixtures are pre-authored test inputs, not symptom classification. We do not assess arbitrary symptom text.
 if(story.safety_fixture||/\b(geef me een diagnose|is dit urgent|welke urgentie|beoordeel mijn klachten|vertel me welk medicijn ik moet nemen)\b/i.test(story.text_nl)){s.blocked=true;return s;}
 const parts=sentences(story.text_nl);const used=new Set<number>();
 const quote=(text_nl:string,field:StoryField):Quote=>({text_nl,field,confirmed:false});
 if(story.answers){for(const field of ['klacht','verloop','geprobeerd','context','verwachting','medicatie'] as StoryField[]){const text=story.answers[field]?.trim();if(!text)continue;const q=quote(text,field);if(field==='klacht')s.complaint=q;else if(field==='verloop')s.course=q;else if(field==='verwachting')s.expectation=q;else if(field==='geprobeerd')s.tried.push(q);else if(field==='context')s.context.push(q);else s.medication_change.push(q);}}
 else {
  if(parts[0])s.complaint=quote(parts[0],'klacht');
  parts.forEach((p,i)=>{if(MEDICATION_WORDS.test(p)||knownSubstances.some(n=>p.toLowerCase().includes(n))){s.medication_change.push(quote(p,'medicatie'));used.add(i);}});
  parts.forEach((p,i)=>{if(used.has(i)||i===0)return;if(/\b(wil|hoop|vraag)\b/i.test(p)){s.expectation=quote(p,'verwachting');used.add(i);}});
  parts.forEach((p,i)=>{if(used.has(i)||i===0)return;if(/\b(sinds|vorige|wanneer|begon|dagen|weken|maand|heel lang|een tijd)\b/i.test(p)){s.course=quote(p,'verloop');used.add(i);}});
  parts.forEach((p,i)=>{if(used.has(i)||i===0)return;if(/\b(gebruik|geprobeerd|geholpen)\b/i.test(p)){s.tried.push(quote(p,'geprobeerd'));used.add(i);}});
  parts.forEach((p,i)=>{if(!used.has(i)&&i!==0)s.context.push(quote(p,'context'));});
 }
 const questions:Record<string,string>={klacht:'Wat wilt u met de huisarts bespreken?',verloop:'Wanneer is dit begonnen of veranderd?',geprobeerd:'Wilt u vertellen wat u al heeft geprobeerd?',context:'Is er nog iets dat de huisarts moet weten?',verwachting:'Wat hoopt u van het gesprek?',medicatie:'Kunt u vertellen wat er met uw medicijnen is veranderd?'};
 const missing=[!s.complaint.text_nl&&'klacht',!s.course&&'verloop',!s.tried.length&&'geprobeerd',!s.context.length&&'context',!s.expectation&&'verwachting',!s.medication_change.length&&'medicatie'].filter(Boolean) as string[];
 s.gaps=missing.map(field=>({field,question_nl:questions[field]}));
 if(recordSubstance&&knownSubstances.some(n=>n!==recordSubstance&&story.text_nl.toLowerCase().includes(n)))s.gaps.push({field:'medicatie',question_nl:'U noemt een medicijn dat niet in deze overdracht staat. Wilt u dit met de praktijk bespreken?'});
 return s;
}
export function allQuotes(s:IntakeSummary):Quote[]{return [s.complaint,s.course,...s.tried,...s.context,s.expectation,...s.medication_change].filter((q):q is Quote=>!!q&&!!q.text_nl);}
export function confirmStory(draft:IntakeSummary,confirmedTexts:string[],at:string):IntakeSummary {
 const quotes=allQuotes(draft);if(!quotes.length||quotes.some(q=>!confirmedTexts.includes(q.text_nl)))throw new DomainError('E-CONFIRM-01');
 const confirm=(q:Quote|null)=>q?{...q,confirmed:confirmedTexts.includes(q.text_nl)}:null;
 return {...draft,complaint:confirm(draft.complaint)!,course:confirm(draft.course),tried:draft.tried.map(q=>confirm(q)!),context:draft.context.map(q=>confirm(q)!),expectation:confirm(draft.expectation),medication_change:draft.medication_change.map(q=>confirm(q)!),confirmed:true,confirmed_at:at};
}
