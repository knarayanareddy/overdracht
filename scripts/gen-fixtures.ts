import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { Case, Substance, SubstanceTable, Source, Story, PatientFlag } from '../src/domain/types';
const date = '2026-11-11';
const source = (doc: string, field: string, value: unknown): Source => ({ doc, field, value, date, sha256: createHash('sha256').update(JSON.stringify({ doc, field, value, date, synthetic: true })).digest('hex'), quote_nl: 'Synthetische testwaarde. Niet ontleend aan een officiële SmPC of preferentielijst.' });
const names = ['salbutamol','metformine','atorvastatine','omeprazol','amoxicilline','levothyroxine','sertraline','oxycodon','furosemide','prednison','insuline glargine','methylfenidaat','tamsulosine','escitalopram','naproxen','paracetamol','amoxicilline/clavulaanzuur','hydrochloorthiazide','pantoprazol','azitromycine'];
const strengths = ['100 mcg','500 mg','20 mg','20 mg','500 mg','50 mcg','50 mg','10 mg','40 mg','5 mg','100 E/ml','10 mg','0,4 mg','10 mg','500 mg','500 mg','500/125 mg','25 mg','40 mg','500 mg'];
const forms = ['inhalatiepoeder','tablet','tablet','capsule','capsule','tablet','tablet','tablet','tablet','tablet','injectievloeistof','tablet','capsule','tablet','tablet','zetpil','tablet','tablet','tablet','tablet'];
const brands = ['CF','Sandoz','CF','Sandoz','CF','Teva','Sandoz','CF','Teva','CF','Demo','CF','Teva','CF','Sandoz','CF','CF','Teva','Sandoz','CF'];
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const table: SubstanceTable = {};
mkdirSync('data/smpc', { recursive: true }); mkdirSync('data/notices', { recursive: true }); mkdirSync('data/preference', { recursive: true }); mkdirSync('data/stories', { recursive: true }); mkdirSync('data/practice', { recursive: true });
for (const [i, substance] of names.entries()) {
  const doc = `data/smpc/${substance.replaceAll('/', '-')}.json`;
  const fields = ['substance','strength','form','packages','nl_registered'].map(field => source(doc, field, field === 'substance' ? substance : field === 'strength' ? strengths[i] : field === 'form' ? forms[i] : field === 'packages' ? ['30 stuks','60 stuks','90 stuks'] : true));
  writeFileSync(doc, JSON.stringify({ synthetic: true, warning: 'Geen officiële SmPC. Geen klinische equivalentie afgeleid.', fields }, null, 2));
  const base = `${capitalize(substance)} ${brands[i]} ${strengths[i]} ${forms[i]}`;
  const equivalence = { equivalent: null, rule: 'P-STR-01', note_nl: 'Equivalentie tussen deze toedieningsvormen is niet vastgesteld in deze demo. De apotheker beoordeelt dit.', source: source(doc, 'dose_interval_equivalence', null) };
  table[substance] = { substance, atc: `DEMO-${String(i+1).padStart(2,'0')}`, sources: fields, products: [
    { product: base, substance, strength: strengths[i], form: forms[i], packages: ['30 stuks','60 stuks','90 stuks'], nl_registered: true, foreign_registration: null, smpc_ref: doc },
    { product: base.replace(brands[i], brands[i] === 'CF' ? 'Demo B' : 'Demo A'), substance, strength: strengths[i], form: forms[i], packages: ['30 stuks','60 stuks','90 stuks'], nl_registered: true, foreign_registration: null, smpc_ref: doc },
    ...(i === 0 ? [{ product: 'Salbutamol Demo 100 mcg aerosol', substance, strength: strengths[i], form: 'aerosol', packages: ['200 doses'], nl_registered: true, foreign_registration: null, smpc_ref: doc }, { product: 'Salbutamol Demo import 100 mcg inhalatiepoeder', substance, strength: strengths[i], form: forms[i], packages: ['60 stuks'], nl_registered: false, foreign_registration: null, smpc_ref: doc }, { product: 'Salbutamol Demo 2 mg/5 ml drank', substance, strength: '2 mg/5 ml', form: 'drank', packages: ['150 ml'], nl_registered: true, foreign_registration: null, smpc_ref: doc }] : []),
  ], dose_interval_equivalence: { [`${forms[i]}|${i === 0 ? 'aerosol' : 'capsule'}`]: equivalence, ...(i===0?{'inhalatiepoeder|drank':equivalence}:{}) }, contra_indications: {} };
}
// Deliberately fictional policy-test flags, NOT claims about the actual medicines.
table.metformine.contra_indications.renaal = true;
table.amoxicilline.contra_indications.allergie_penicilline = true;
table['amoxicilline/clavulaanzuur'].contra_indications.allergie_penicilline = true;
table.naproxen.contra_indications.allergie_nsaid = true;
table.atorvastatine.contra_indications.leverfunctie = true;
table.sertraline.contra_indications.zwangerschap = true;
table.oxycodon.products.forEach(p => { p.adult_only = true; });
writeFileSync('data/substances.json', JSON.stringify(table, null, 2));
const cases: Case[] = [];
for (let i=1; i<=30; i++) {
  const si = i===17 ? 0 : (i-1)%20;
  const c: Case = { case_id: `C-${String(i).padStart(3,'0')}`, substance: names[si], atc: table[names[si]].atc, strength: strengths[si], form: forms[si], package: i > 10 && i<=20 ? '60 stuks' : '30 stuks', patient_flags: [], insurer: (['CZ','VGZ','Menzis'] as const)[i%3], notice_ref: `data/notices/C-${String(i).padStart(3,'0')}.txt`, age_band: i===22 ? '0-11' : i%5===0 ? '65+' : '18-64', practice_id: i%3===0 ? 'PR-02' : 'PR-01', title_nl: i<=10 ? 'Andere verpakking, dezelfde stof' : i<=20 ? 'Verpakkingswijziging beoordelen' : 'Geen geldige keten — mens nodig', unavailable_product: table[names[si]].products[0].product, expected: { valid_min: i<=20 ? 1 : 0, valid_max: i<=20 ? 9 : 0, must_reject_rules: [] } };
  if(i===4) { c.substance='metformine'; c.strength='500 mg'; c.form='tablet'; c.unavailable_product=table.metformine.products[0].product; c.insurer='CZ'; c.title_nl='Metformine 500 mg — ander merk'; }
  if(i===17) { c.title_nl='Salbutamol 100 mcg — andere verpakking'; c.insurer='CZ'; c.expected.must_reject_rules=['P-STR-01','P-IMPORT-01']; }
  if(i===21) { c.scenario='therapeutic'; c.title_nl='Andere werkzame stof gevraagd'; c.expected.must_reject_rules=['P-SUB-01']; }
  if(i===22) { c.substance='oxycodon'; c.strength='10 mg'; c.form='tablet'; c.patient_flags=['pediatrisch']; c.unavailable_product=table.oxycodon.products[0].product; c.title_nl='Pediatrische vlag — formulier geweigerd'; c.expected.must_reject_rules=['P-PAEDI-01']; }
  if(i===23) { c.substance='salbutamol'; c.strength='100 mcg'; c.form='inhalatiepoeder'; c.unavailable_product=table.salbutamol.products[0].product; c.scenario='import_only'; c.title_nl='Import zonder registratiebewijs'; c.expected.must_reject_rules=['P-IMPORT-01']; }
  if(i===24) { c.substance='metformine'; c.strength='500 mg'; c.form='tablet'; c.patient_flags=['renaal']; c.unavailable_product=table.metformine.products[0].product; c.title_nl='Nierfunctievlag — niet automatisch'; c.expected.must_reject_rules=['P-CI-01']; }
  if(i===25) { c.substance='onbekende-stof'; c.title_nl='Onbekende werkzame stof'; c.expected.must_reject_rules=['P-UNKNOWN-01']; }
  if(i===26) { c.substance='amoxicilline'; c.strength='500 mg'; c.form='capsule'; c.patient_flags=['allergie_penicilline']; c.unavailable_product=table.amoxicilline.products[0].product; c.title_nl='Allergievlag — apotheker nodig'; c.expected.must_reject_rules=['P-CI-01']; }
  if(i===27) { c.patient_flags=['zwangerschap']; c.expected.must_reject_rules=['P-CI-01']; }
  if(i===28) { c.substance='atorvastatine'; c.strength='20 mg'; c.form='tablet'; c.patient_flags=['leverfunctie']; c.unavailable_product=table.atorvastatine.products[0].product; c.title_nl='Leverfunctievlag — niet automatisch'; c.expected.must_reject_rules=['P-CI-01']; }
  if(i===29) { c.scenario='stale'; c.title_nl='Preferentielijst verouderd'; }
  if(i===30) { c.scenario='missing_source'; c.title_nl='Bron ontbreekt — geen aanname'; }
  cases.push(c);
  writeFileSync(c.notice_ref!, [
    i%3===0 ? `LEVERANCIERSBERICHT / ${c.case_id}\nProduct: ${c.unavailable_product}\nStatus: tijdelijk niet leverbaar.\nOorzaak: niet opgegeven. Verwachte levering: onbekend.` : i%3===1 ? `Beste apotheek,\n\n${c.unavailable_product} kunnen we op dit moment niet naleveren. We hebben geen datum waarop de levering weer op gang komt. Neem contact op met de voorschrijver als een ander product nodig is.\n\nMet vriendelijke groet, de synthetische leverancier` : `TEMPORELE TEKORTMELDING\nMiddel: ${c.substance}\nSterkte: ${c.strength}\nVorm: ${c.form}\nBeschikbaarheid: nee\nVerwacht: onbekend\nGeen alternatief geadviseerd.`,
    '\nSYNTHETISCHE MELDING — voorbeelddata, geen echte leverancier.',
  ].join('\n'));
}
writeFileSync('data/cases.json', JSON.stringify(cases, null, 2));
writeFileSync('data/patients.json', JSON.stringify(cases.map(c=>({ case_id:c.case_id, patient_flags:c.patient_flags, age_band:c.age_band, synthetic:true })),null,2));
for (const insurer of ['cz','vgz','menzis']) {
  writeFileSync(`data/preference/2026-${insurer}.json`, JSON.stringify({ synthetic:true, insurer:insurer.toUpperCase(), list:`Synthetische preferentielijst ${insurer.toUpperCase()}`, peildatum: date, entries: Object.fromEntries(cases.map(c=>[`${c.substance}|${c.strength}|${c.form}`, c.case_id==='C-019' ? 'niet_vergoed' : 'vergoed'])) },null,2));
}
const stories: Omit<Story,'synthetic'>[] = [
 {story_id:'S-01',case_id:'C-004',text_nl:'Ik slaap al een tijd slecht en mijn knie doet pijn bij het traplopen. Ook heb ik sinds vorige maand meer last van mijn maag. Ik maak me zorgen omdat ik zoveel verschillende dingen tegelijk heb. De metformine heb ik vorige maand in een andere verpakking gekregen. De apotheker heeft uitgelegd dat het hetzelfde middel is. Ik wil graag weten welke klachten we vandaag kunnen bespreken.'},
 {story_id:'S-02',case_id:'C-005',text_nl:'Ik heb last van mijn schouder. Wanneer het precies begon weet ik niet meer. Het lijkt al een hele tijd zo te zijn. Paracetamol zetpillen gebruik ik soms. Ik hoop dat u met me mee kunt kijken.'},
 {story_id:'S-03',case_id:'C-007',text_nl:'Ik slik elke dag verschillende tabletten. Ik wil graag met de huisarts bespreken of ik met minder verder kan. De sertraline heb ik in een ander doosje gekregen. Ik weet niet of dat verder iets veranderd heeft. Mijn vraag voor vandaag is vooral hoe we het overzicht kunnen houden.'},
 {story_id:'S-04',case_id:'C-017',text_nl:'ik ben met die nieuwe puffers gestopt, ik werd er dizzy van. Ik heb dat nog niet aan de apotheek of de praktijk verteld. Verder gaat het overdag wel, maar ik wil graag vertellen wat de verandering met mij deed.'},
 {story_id:'S-05',case_id:'C-001',text_nl:'De apotheker zei dat alleen het merk anders was en dat de werkzame stof hetzelfde bleef. Mijn nieuwe salbutamol inhalator zit in een andere verpakking. Dat is voor mij duidelijk. Ik wil nog vragen hoe ik de uitleg aan mijn partner kan doorgeven.'},
 {story_id:'S-06',case_id:'C-008',text_nl:'Ik denk dat de apotheek een fout heeft gemaakt. Ik kreeg omeprazol in een andere verpakking en daar had niemand me over verteld. Ik heb het nieuwe doosje niet ontvangen van de bezorger, zegt mijn buurman. Ik wil graag weten wat er is veranderd.'},
 {story_id:'S-07',case_id:'C-009',text_nl:'Ik gebruik meer dan vijf medicijnen maar ik kan de namen niet zo opnoemen. De doosjes staan thuis in een bakje. Mijn furosemide tabletten zaten vorige week in een ander doosje. Ik wil graag weten wie het overzicht bijhoudt.'},
 {story_id:'S-08',case_id:'C-010',text_nl:'Mijn hoofd voelt al een tijd niet helder. Ik ben ook moe en mijn rug speelt op. Soms duurt het dagen en soms weken. Wat is er ookweer veranderd met mijn medicijnen? De andere tabletten kreeg ik vorige week. Ik wil dat we rustig alles langslopen.'},
 {story_id:'S-09',case_id:'C-011',text_nl:'Het gaat niet zoals ik wil. Ik weet niet goed wat ik moet vragen. Kunt u me helpen?'},
 {story_id:'S-10',case_id:'C-012',text_nl:'Ik heb een drukkende pijn op mijn borst die net begon.',safety_fixture:true},
 {story_id:'S-11',case_id:'C-013',text_nl:'Ik denk erover om mezelf iets aan te doen. Ik voel me niet veilig.',safety_fixture:true},
 {story_id:'S-12',case_id:'C-014',text_nl:'Mijn kind van zes heeft koorts en wil niet drinken.',safety_fixture:true},
 {story_id:'S-13',case_id:'C-015',text_nl:'Ik zie sinds vanochtend ineens niets meer met mijn rechteroog.',safety_fixture:true},
 {story_id:'S-14',case_id:'C-016',text_nl:'Ik ben zo benauwd dat ik niet meer in hele zinnen kan praten.',safety_fixture:true},
];
for(const s of stories) writeFileSync(`data/stories/${s.story_id}.json`,JSON.stringify({ ...s, synthetic:true },null,2));
writeFileSync('data/practice/acute-line.json',JSON.stringify({ text_nl:'Bij acute klachten: bel de praktijk.', source:'build-pharmacy-gp-fusion.md §4', date, verified_by_practice:false, notice:'Regel uit de brief, nog niet bevestigd door een praktijk. Geen eigen acute tekst verzonnen.' },null,2));
writeFileSync('data/practice/checklist.json',JSON.stringify([
 {field:'klacht',question:'Wat wilt u bespreken met de huisarts?',optional:false},
 {field:'verloop',question:'Hoe is dat sinds uw vorige bezoek gegaan?',optional:true},
 {field:'geprobeerd',question:'Wat heeft u zelf geprobeerd?',optional:true},
 {field:'context',question:'Wat is belangrijk om erbij te vertellen?',optional:true},
 {field:'verwachting',question:'Wat hoopt u van dit gesprek?',optional:true},
 {field:'medicatie',question:'Wat is er veranderd met uw medicijnen, en wat merkt u daarvan?',optional:true},
],null,2));
console.log('Generated 20 substances, 30 cases, 14 stories. All policy values are synthetic.');
