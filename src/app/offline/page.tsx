import Link from 'next/link';
import { WifiOff } from 'lucide-react';
import { EmptyState } from '@/components/ui';
export default function Page(){return <div className="panel summary-gate"><EmptyState icon={<WifiOff size={25}/>} title="U bent offline" action={<Link className="button primary" href="/">Naar het overzicht</Link>}>Eerder bezochte pagina’s blijven beschikbaar. Goedkeuren en bevestigen zijn pas weer mogelijk als de lokale server bereikbaar is.</EmptyState></div>;}