import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { ChangeRecord, IntakeSummary } from '@/domain/types';
import { allQuotes } from '@/domain/intake';
import { approvedChain } from '@/domain/letters';
const plain=(s:string)=>s.replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/[–—]/g,'-').replace(/→/g,'->').replace(/↺/g,'TERUGGEVRAAGD:');
export async function exportPdf(record:ChangeRecord,summary?:IntakeSummary){
 if(!record.pharmacist_approval)throw Error('E-APPROVAL-01');const doc=await PDFDocument.create();const font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);let page=doc.addPage([595.28,841.89]),y=790;
 const line=(text:string,size=10,heading=false)=>{const clean=plain(text);const max=Math.floor(495/(size*.52));const words=clean.split(/\s+/);let current='';const lines:string[]=[];for(const w of words){if((current+' '+w).length>max){lines.push(current);current=w;}else current+=(current?' ':'')+w;}if(current)lines.push(current);for(const t of lines){if(y<55){page=doc.addPage([595.28,841.89]);y=790;}page.drawText(t,{x:50,y,size,font:heading?bold:font,color:rgb(.08,.13,.17)});y-=size+5;}};
 line('Overdracht',24,true);line(`Synthetisch dossier ${record.case.case_id} · 11 november 2026`,10);line('Demo - geen echte patientgegevens - geen medisch advies.',9);y-=12;
 line('1. Wijziging en beoordeling',14,true);line(record.case.title_nl);line(`Werkzame stof: ${record.case.substance} ${record.case.strength} ${record.case.form}`);line(`Goedgekeurd voorstel: ${approvedChain(record).chain[0].product}`);line(`Apotheker: ${record.pharmacist_approval.by} · ${record.pharmacist_approval.at}`);line(`Vergoeding: ${record.pharmacist_approval?approvedChain(record).reimbursement:'onbekend'}`);y-=10;
 line('2. Praktijkoverdracht',14,true);line(record.handover?.to_practice_nl||'Nog geen overdracht.');line(`Taak: ${record.handover?.task||'geen'}`);line(`Status: ${record.handover?.status||'niet geopend'}`);if(record.handover?.response)line(`Ontvanger: ${record.handover.response.by} · ${record.handover.response.at}`);y-=10;
 line('3. Uitleg voor de patient',14,true);line(record.handover?.patient_text_nl||'Nog niet beschikbaar.');y-=10;
 if(summary?.confirmed){line('4. Het verhaal in eigen woorden',14,true);if(record.handover?.contradiction_nl)line(record.handover.contradiction_nl,11,true);for(const q of allQuotes(summary))line(`"${q.text_nl}"`);line('Open vragen',11,true);for(const g of summary.gaps)line(g.question_nl);line(`Bevestigd door patient: ${summary.confirmed_at}`,9);}
 y-=12;line('Alle produkt- en regelwaarden zijn synthetisch. Geen officiele SmPC of preferentielijst.',8);line('Bij acute klachten: bel de praktijk.',9);
 const pages=doc.getPages();pages.forEach((p,i)=>p.drawText(`Overdracht · demo · ${i+1}/${pages.length}`,{x:50,y:28,size:8,font,color:rgb(.36,.42,.47)}));return doc.save();
}
