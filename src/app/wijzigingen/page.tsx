'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { api } from '@/lib/client';
import CaseTable from '@/components/CaseTable';
import { PageHeading } from '@/components/ui';
import { useTranslation } from '@/lib/i18n';
export default function Page(){const {t}=useTranslation();const [records,setRecords]=useState([]);const [loading,setLoading]=useState(true);useEffect(()=>{let cancelled=false;api('/api/records').then(rec=>{if(cancelled)return;setRecords((rec as {records:any[]}).records);setLoading(false);});return()=>{cancelled=true;}},[]);if(loading)return <div>{t('changes.loading')}</div>;return (<><PageHeading eyebrow="APOTHEEK" title={t('changes.title')} description={t('changes.desc')} actions={<Link href="/intake" className="button primary"><Plus size={15}/>{t('changes.newChange')}</Link>}/><CaseTable records={records}/></>);
}
