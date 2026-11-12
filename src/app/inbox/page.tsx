import Inbox from '@/components/Inbox';
import { inboxRows } from '@/domain/store';
export const dynamic='force-dynamic';
export const metadata={title:'Overdrachten'};
export default async function Page(){return <Inbox initial={await inboxRows()}/>;}
