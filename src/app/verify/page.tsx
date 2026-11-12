import AuditExplorer from '@/components/AuditExplorer';
import { ensureStore } from '@/domain/store';
import { readAudit } from '@/domain/hashchain';
export const dynamic='force-dynamic';
export const metadata={title:'Auditketen'};
export default async function Page(){try{await ensureStore();}catch{/* The verifier must remain reachable when the chain is broken. */}return <AuditExplorer initial={readAudit()}/>;}
