'use client';
import { useEffect, useState } from 'react';
import IntakeForm from '@/components/IntakeForm';
import { PageHeading } from '@/components/ui';
import { api } from '@/lib/client';
import { useTranslation } from '@/lib/i18n';
export default function Page(){const {t}=useTranslation();const [table,setTable]=useState(null);const [loading,setLoading]=useState(true);useEffect(()=>{let cancelled=false;api('/api/substances').then(d=>{if(cancelled)return;setTable((d as {table:any}).table);setLoading(false);});return()=>{cancelled=true;}},[]);if(loading)return <div>{t('intake.loading')||'Laden…'}</div>;return <div style={{maxWidth:850,margin:'0 auto'}}><PageHeading eyebrow={t('intake.eyebrow')} title={t('intake.title')} description={t('intake.desc')}/><IntakeForm table={table}/></div>;}
