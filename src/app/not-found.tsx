import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { EmptyState } from '@/components/ui';
export default function NotFound(){return <div className="not-found panel"><EmptyState icon={<FileQuestion size={25}/>} title="Deze pagina bestaat niet" action={<Link href="/" className="button primary">Terug naar overzicht</Link>}>Deze casus of pagina is niet beschikbaar in de demo.</EmptyState></div>;}