import { notFound } from 'next/navigation';
import ChangeWorkspace from '@/components/ChangeWorkspace';
import { getRecord,getNotice,listStories,ApiError } from '@/domain/store';
export const dynamic='force-dynamic';
export const metadata={title:'Wijziging beoordelen'};
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;try{const record=await getRecord(id);return <ChangeWorkspace key={id} initial={record} notice={await getNotice(id)} stories={(await listStories()).filter(s=>s.case_id===id)}/>;}catch(e){if(e instanceof ApiError&&e.status===404)notFound();throw e;}}
