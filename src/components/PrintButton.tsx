'use client';
import { Printer } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
export default function PrintButton(){const {t}=useTranslation();return <button className="button primary small" onClick={()=>window.print()}><Printer size={13}/>{t('summary.print')}</button>;}
