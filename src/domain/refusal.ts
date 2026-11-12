import type { Case, PatientFlag, ChainLink } from './types';
export const RULES: Record<string, string> = {
 'P-SUB-01': 'Een ander werkzaam bestanddeel is geen substitutie maar een therapiewijziging. Dat beslist de apotheker samen met de voorschrijver.',
 'P-CI-01': 'Er is een patiëntvlag die in de synthetische regeltabel als niet-opgeloste contra-indicatie staat. Deze combinatie is niet automatisch uitwisselbaar; de apotheker moet de officiële bron beoordelen.',
 'P-PAEDI-01': 'Dit product heeft in de synthetische tabel een volwassenenmarkering; deze casus is pediatrisch. De officiële leeftijdsgrens is niet geverifieerd.',
 'P-STR-02': 'Deze keten bevat meerdere wijzigingen. Een expliciete uitbreiding door de apotheker is nodig.',
 'P-STR-01': 'De sterkte of toedieningsvorm verandert zonder vastgestelde equivalentie. De apotheker moet de officiële bron beoordelen.',
 'P-IMPORT-01': 'Voor deze import ontbreekt een citeerbare buitenlandse registratie. Zonder registratiebewijs wordt geen importvoorstel goedgekeurd.',
 'P-REIMB-01': 'De vergoeding is onbekend. Er ontbreekt een actuele vermelding voor deze verzekeraar. Onbekend wordt nooit als voldaan behandeld.',
 'P-SOURCE-01': 'Voor dit product ontbreekt een controleerbare bron in de demo. Zonder bron wordt geen geldig voorstel gedaan.',
 'P-UNKNOWN-01': 'Deze stof staat niet in onze regeltabel. Wij gokken niet — de apotheker beslist.',
 'P-NOSEND-01': 'Dit systeem verstuurt niets naar derden. Documenten worden alleen lokaal geëxporteerd.',
 'G-NOTRIAGE-01': 'Wij beoordelen geen klachten en geven geen advies.',
};
export const FLAG_NAMES: Record<PatientFlag,string> = { renaal:'nierfunctie', zwangerschap:'zwangerschap', pediatrisch:'pediatrische', allergie_penicilline:'penicilline-allergie', allergie_nsaid:'NSAID-allergie', leverfunctie:'leverfunctie' };
export function refusal(rule: string, c?: Case, link?: ChainLink, extra?: string): string {
 if(rule==='P-CI-01' && c) return `Patiëntvlag: ${c.patient_flags.map(f=>FLAG_NAMES[f]).join(', ')}. ${RULES[rule]}`;
 if(rule==='P-STR-01' && c && link) return `${link.product} wijzigt de vorm of sterkte ten opzichte van ${c.strength} ${c.form}. ${extra || RULES[rule]}`;
 if(rule==='P-REIMB-01' && c) return `De vergoeding voor ${c.insurer === 'onbekend' ? 'een onbekende verzekeraar' : c.insurer} is onbekend. ${extra || 'Een actuele preferentielijst ontbreekt.'} Onbekend is niet hetzelfde als vergoed.`;
 return RULES[rule] || 'De beoordeling is onbekend; een apotheker moet deze casus beoordelen.';
}
