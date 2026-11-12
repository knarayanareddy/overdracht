import Link from 'next/link';
import { Plus } from 'lucide-react';
import { listRecords } from '@/domain/store';
import CaseTable from '@/components/CaseTable';
import { PageHeading } from '@/components/ui';
export const dynamic='force-dynamic';
export const metadata={title:'Wijzigingen'};
export default async function Page(){return <><PageHeading eyebrow="APOTHEEK" title="Het wijzigingsregister" description="Beoordeel voorgestelde ketens. Elke weigering blijft zichtbaar, met de regel en de bron." actions={<Link href="/intake" className="button primary"><Plus size={15}/>Nieuwe wijziging</Link>}/><CaseTable records={await listRecords()}/></>;}
