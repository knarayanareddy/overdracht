import type { Persona } from './personas';
import { ARCH_KEYS } from './archetypes';
import { mulberry32, clamp } from './rng';
export const COVERAGE=[
 ['N1','Neemt de assistent echt iets over, of loopt ze alles na?','retype, q_retype',false],
 ['N2','Gelooft de huisarts in tijdwinst binnen het consult?','gp_time, q_time',false],
 ['N3','Is weigeren acceptabel?','refuse, q_refuse',false],
 ['N4','Eigen woorden of een volledig formulier?','own_words, q_form',false],
 ['N5','Is uitleg op B1 genoeg?','b1',false],
 ['N6','Accepteren twee organisaties één dossier?','shared, q_dossier',false],
 ['N7','Hoe lang duurt een wijziging vandaag?','q_minutes',false],
 ['N8','Wat is het eerste probleem?','q_first',false],
 ['N9','Welke kant zou betalen?','q_payer',false],
 ['N10','Waarom zou iemand stoppen?','q_stop',false],
] as const;
export const V2_ITEMS=[
 {id:'role',label:'Wat is uw rol?',options:['doktersassistent','huisarts','apothekersassistent','openbaar apotheker','ketenapotheker','ziekenhuisapotheker','patiënt','zorggroep','verzekeraar','groothandel','inspectie']},
 {id:'setting',label:'In welke setting werkt u of ontvangt u zorg?',options:['zelfstandige apotheek','keten','huisartsenpraktijk','zorggroep','ziekenhuis','anders']},
 {id:'years',label:'Hoeveel jaar ervaring heeft u?',options:['<2','2-5','6-15','>15']},
 {id:'q_minutes',label:'Hoeveel tijd kost één geneesmiddelwijziging u, van begin tot dat het in het dossier staat?',options:['<5 min','5-15','15-30','30-60','>60','weet niet']},
 {id:'q_first',label:'Wat is daarbij uw eerste probleem?',options:['beschikbaarheid vinden','wet- en regelgeving','vergoeding','de andere organisatie bereiken','de patiënt uitleggen','administratie','niets']},
 {id:'q_retype',label:'Als een apotheker een gestructureerde overdracht stuurt, hoe vaak loopt u die dan regel voor regel na?',scale:['Nooit','Altijd']},
 {id:'q_time',label:'Als de geschiedenis al gestructureerd klaarligt, hoeveel tijd wint u dan in het consult?',scale:['Ik verlies tijd','Ik win tijd']},
 {id:'usefulness',label:'Hoe bruikbaar zijn deze onderdelen?',matrix:[['ketens','Kant-en-klare substitutieketens met de regels erbij'],['overdracht','Eén gestructureerde overdracht in plaats van een belletje en overtypen'],['verhaal','Het verhaal van de patiënt in eigen woorden, met open vragen'],['contravraag','Een melding wanneer de patiënt zegt dat de wijziging niet werkte']]},
 {id:'q_form',label:'Wat is bruikbaarder aan de vooravond van een lang consult?',options:['een volledig ingevuld formulier','een verhaal met gaten','allebei','geen van beide']},
 {id:'q_dossier',label:'Eén gedeeld dossier dat apotheek én praktijk beiden bijhouden:',options:['onwenselijk','alleen als de praktijk eigenaar is','alleen met toestemming per keer','wenselijk']},
 {id:'q_refuse',label:'Als een systeem twijfelt, moet het dan weigeren of een beste gok doen?',scale:['Altijd een gok','Altijd weigeren']},
 {id:'intent',label:'Hoe waarschijnlijk gebruikt u dit volgende maand?',scale:['Zeer onwaarschijnlijk','Zeer waarschijnlijk']},
 {id:'q_payer',label:'Wie zou dit moeten betalen?',options:['de apotheek','de praktijk','de zorggroep','de verzekeraar','de patiënt','niemand — dit hoort gratis']},
 {id:'q_stop',label:'Wat zou u ervan weerhouden?',options:['vertrouwen in de regels','werkdruk','integratie met het AIS','kosten','de andere organisatie','niets']},
];
export const V1_ITEMS=['Wat frustreert u het meest aan tekorten?','Hoe waarschijnlijk zou u deze tool gebruiken?','Welke functie vindt u het belangrijkst?','Hoe vindt u vandaag alternatieven?','Zou u AI vertrouwen?','Welke software gebruikt u?','Wat vindt u van digitalisering?','Hoe belangrijk is gebruiksgemak?','Wilt u meedoen aan een pilot?','Heeft u nog suggesties?'].map((label,i)=>({id:`v1_${i}`,label}));
export const likert5=(o:number)=>clamp(1+Math.round(o*4),1,5);
export function answerPersona(p:Persona,opinions:Record<string,number>,seed:number){const rnd=mulberry32(seed);const abstain=.05+.28*(1-opinions.shared);const answer=(v:unknown)=>rnd()<abstain?null:v;const timeOptions=p.setting==='keten'?['<5 min','5-15','15-30']:p.setting==='zelfstandige apotheek'?['15-30','30-60','>60']:['5-15','15-30','30-60'];return {role:ARCH_KEYS.includes(p.archetype)?p.archetype:'anders',setting:p.setting,years:p.years_experience<2?'<2':p.years_experience<=5?'2-5':p.years_experience<=15?'6-15':'>15',q_minutes:answer(timeOptions[Math.floor(rnd()*timeOptions.length)]),q_first:answer(['beschikbaarheid vinden','wet- en regelgeving','vergoeding','de andere organisatie bereiken','administratie'][Math.floor(rnd()*5)]),q_retype:answer(likert5(1-opinions.retype)),q_time:answer(likert5(opinions.gp_time)),q_form:answer(opinions.own_words>=.5?'een verhaal met gaten':'een volledig ingevuld formulier'),q_dossier:answer(opinions.shared>=.5?'wenselijk':'onwenselijk'),q_refuse:answer(likert5(opinions.refuse)),q_payer:answer(p.archetype==='zorggroep'?'de zorggroep':'de apotheek'),q_stop:answer(opinions.shared<.5?'de andere organisatie':'integratie met het AIS')};}
export function aggregateAnswers(personas:Persona[],opinions:Record<string,number>[],seed:number){const answers=personas.map((p,i)=>answerPersona(p,opinions[i],seed+i));return {answers,abstentions:Object.fromEntries(ARCH_KEYS.map(a=>{const group=answers.filter((_,i)=>personas[i].archetype===a);return [a,{n:group.length,count:group.filter(x=>Object.values(x).some(v=>v===null)).length}];})),counts:Object.fromEntries(['q_minutes','q_retype','q_time','q_form','q_dossier','q_refuse','q_payer'].map(key=>[key,Object.entries(answers.reduce((acc,a)=>{const v=String(a[key as keyof typeof a]??'zeg ik liever niet');acc[v]=(acc[v]||0)+1;return acc;},{} as Record<string,number>))]))};}
