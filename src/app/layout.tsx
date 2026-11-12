import type { Metadata, Viewport } from 'next';
import './globals.css';
import Shell from '@/components/Shell';
import { LanguageProvider } from '@/lib/LanguageProvider';
import { inboxRows } from '@/domain/store';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:{default:'Overdracht — Eén wijziging. Eén dossier.',template:'%s · Overdracht'},description:'Een synthetische demonstratie van medicatie-overdracht tussen apotheek, huisartsenpraktijk en patiënt.',applicationName:'Overdracht',robots:{index:false,follow:false}};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#0e5b6b'};
export default async function RootLayout({children}:{children:React.ReactNode}){const count=await inboxRows().then(rows=>rows.filter(r=>r.handover.status==='open').length).catch(()=>0);return <html lang="nl"><body><LanguageProvider><Shell openCount={count}>{children}</Shell></LanguageProvider></body></html>;}
