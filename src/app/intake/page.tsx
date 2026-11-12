import IntakeForm from '@/components/IntakeForm';
import { PageHeading } from '@/components/ui';
import { data } from '@/domain/store';
export const metadata={title:'Nieuwe wijziging'};
export default function Page(){return <div style={{maxWidth:850,margin:'0 auto'}}><PageHeading eyebrow="APOTHEEK · NIEUWE CASUS" title="Begin bij de wijziging." description="Een voorschrift en een tekortmelding. De regels beoordelen we daarna pas."/><IntakeForm table={data.table}/></div>;}
