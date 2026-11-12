import { notFound } from 'next/navigation';
import PatientStory from '@/components/PatientStory';
import { getDraft,getRecord,data,ApiError } from '@/domain/store';
export const dynamic='force-dynamic';
export const metadata={title:'Uw verhaal'};
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;try{const {story,draft}=await getDraft(id);return <PatientStory key={id} story={story} initialDraft={draft} substances={data.substances} record={await getRecord(story.case_id)}/>;}catch(e){if(e instanceof ApiError&&e.status===404)notFound();throw e;}}
