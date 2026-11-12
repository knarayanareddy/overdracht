'use client';
import { CircleAlert } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
export default function ErrorPage({reset}:{error:Error;reset:()=>void}){const {t}=useTranslation();return <div className="panel summary-gate"><div className="panel-body"><CircleAlert size={28}/><h2>{t('error.title')}</h2><p>{t('error.body')}</p><div className="button-row"><button className="button primary" onClick={reset}>{t('error.retry')}</button><Link className="button" href="/verify">{t('error.toAudit')}</Link></div></div></div>;}
