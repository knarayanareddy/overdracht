'use client';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
export default function CopyButton({text}:{text:string}){const [state,setState]=useState<'idle'|'copied'|'error'>('idle');async function copy(){try{await navigator.clipboard.writeText(text);setState('copied');setTimeout(()=>setState('idle'),2000);}catch{setState('error');}}return <span><button className="button small" onClick={copy}>{state==='copied'?<Check size={12}/>:<Copy size={12}/>} {state==='copied'?'Gekopieerd':'Kopieer plakblok'}</button>{state==='error'&&<span className="muted" style={{fontSize:9,display:'block',marginTop:5}}>Kopiëren niet beschikbaar; selecteer de tekst op de printpagina.</span>}</span>;}
