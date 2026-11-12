export const DIMENSIONS = ['retype','gp_time','refuse','own_words','b1','shared'] as const;
export type Dimension=typeof DIMENSIONS[number];
export const DIMENSION_LABELS:Record<Dimension,{label:string;left:string;right:string}>={
 retype:{label:'Overnemen zonder alles na te lopen',left:'Ik controleer elke regel',right:'Ik vertrouw de overdracht'},
 gp_time:{label:'Tijdwinst in het consult',left:'Het kost me juist tijd',right:'Ik win tijd in het consult'},
 refuse:{label:'Weigeren is een functie',left:'Beter een gok dan niets',right:'Liever weigeren dan gokken'},
 own_words:{label:'Eigen woorden van de patiënt',left:'Een formulier is beter',right:'Een verhaal met gaten is beter'},
 b1:{label:'Uitleg op B1',left:'De patiënt wil hetzelfde product',right:'Uitleg op B1 volstaat'},
 shared:{label:'Eén gedeeld dossier',left:'Ieder zijn eigen dossier',right:'Eén dossier, twee handen'},
};
export const ARCH={
 assist_gp:{n:40,label:'Doktersassistenten',priors:{retype:.34,gp_time:.46,refuse:.48,own_words:.42,b1:.66,shared:.40},behav:{voice:.52,susceptibility:.64,conviction:.40}},
 gp:{n:34,label:'Huisartsen',priors:{retype:.56,gp_time:.38,refuse:.62,own_words:.40,b1:.54,shared:.52},behav:{voice:.72,susceptibility:.42,conviction:.66}},
 assist_pharm:{n:36,label:'Apothekersassistenten',priors:{retype:.70,gp_time:.60,refuse:.54,own_words:.52,b1:.62,shared:.58},behav:{voice:.50,susceptibility:.58,conviction:.44}},
 pharm:{n:28,label:'Openbare apothekers',priors:{retype:.72,gp_time:.64,refuse:.70,own_words:.50,b1:.58,shared:.60},behav:{voice:.68,susceptibility:.40,conviction:.62}},
 patient_poly:{n:30,label:'Patiënten met polyfarmacie',priors:{retype:.44,gp_time:.34,refuse:.30,own_words:.74,b1:.78,shared:.46},behav:{voice:.44,susceptibility:.70,conviction:.46}},
 patient_other:{n:18,label:'Patiënten (overig)',priors:{retype:.40,gp_time:.30,refuse:.26,own_words:.62,b1:.60,shared:.42},behav:{voice:.42,susceptibility:.72,conviction:.38}},
 zorggroep:{n:20,label:'Zorggroepen',priors:{retype:.58,gp_time:.80,refuse:.56,own_words:.54,b1:.58,shared:.72},behav:{voice:.74,susceptibility:.30,conviction:.72}},
 insurer:{n:12,label:'Zorgverzekeraars',priors:{retype:.60,gp_time:.84,refuse:.52,own_words:.50,b1:.56,shared:.68},behav:{voice:.70,susceptibility:.26,conviction:.76}},
 igj:{n:10,label:'IGJ / inspectie',priors:{retype:.30,gp_time:.40,refuse:.90,own_words:.46,b1:.60,shared:.76},behav:{voice:.66,susceptibility:.20,conviction:.84}},
 wholesaler:{n:12,label:'Groothandel / importeur',priors:{retype:.74,gp_time:.58,refuse:.34,own_words:.46,b1:.48,shared:.44},behav:{voice:.64,susceptibility:.34,conviction:.68}},
} as const;
export type Archetype=keyof typeof ARCH;
export const ARCH_KEYS=Object.keys(ARCH) as Archetype[];
export const COLORS=['','#55b5a6','#80a9d8','#d3b77b','#aab889','#bd9bc9','#d89587','#7eb8c4','#b1a3d2','#d0bd94','#8da9a0'];
export const EVENTS=[
 {id:'tekortpiek',label:'Een tekort aan een veelgebruikte bloedverdunner houdt zes weken aan',effect:{refuse:.06,b1:-.08,retype:.03}},
 {id:'fout',label:'Een apotheek geeft de verkeerde sterkte af; het staat in het nieuws',effect:{refuse:.14,retype:-.10,shared:.06}},
 {id:'dubbel',label:'Een praktijk typt een overdracht opnieuw over en maakt een fout',effect:{retype:-.12,shared:.10,gp_time:-.08}},
 {id:'petitie',label:'De petitie over geneesmiddelentekorten haalt 200.000 handtekeningen',effect:{b1:.08,gp_time:.04,own_words:.05}},
 {id:'werkdruk',label:'Het personeelstekort in apotheken loopt op tot 3.000 fte',effect:{retype:.10,gp_time:.06,refuse:-.04}},
 {id:'assist_nood',label:'Praktijken melden dat assistenten het eerste uur alleen de telefoon doen',effect:{retype:.08,shared:.06,own_words:-.04}},
 {id:'ai_fout',label:'Een AI-systeem stelt een verkeerde substitutie voor; de inspectie grijpt in',effect:{refuse:.16,b1:-.10,shared:-.08}},
 {id:'b1',label:'Patiëntenfederaties eisen uitleg op B1-niveau',effect:{b1:.12,own_words:.06}},
 {id:'dossier',label:'Twee organisaties gaan één gedeeld medicatiedossier voeren',effect:{shared:.14,retype:.08,refuse:.04}},
] as const;
