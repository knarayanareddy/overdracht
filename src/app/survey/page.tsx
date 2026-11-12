'use client';
import Survey from '@/components/Survey';
import { PageHeading } from '@/components/ui';
import { useTranslation } from '@/lib/i18n';
export default function Page(){const {t}=useTranslation();return <div style={{maxWidth:980,margin:'0 auto'}}><PageHeading eyebrow={t('survey.eyebrow')} title={t('survey.title')} description={t('survey.description')}/><Survey/></div>;}
}
