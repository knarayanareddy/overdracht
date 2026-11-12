'use client';
import { useTranslation } from '@/lib/i18n';
export default function Loading(){const {t}=useTranslation();return <div className="loading" role="status">{t('loading.text')}</div>;}
