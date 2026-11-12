'use client';
import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { useTranslation } from '@/lib/i18n';
export default function NotFound(){const {t}=useTranslation();return <div className="not-found panel"><EmptyState icon={<FileQuestion size={25}/>} title={t('notFound.title')} action={<Link href="/" className="button primary">{t('notFound.back')}</Link>}>{t('notFound.body')}</EmptyState></div>;}
