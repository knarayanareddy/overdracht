'use client';
import { Printer } from 'lucide-react';
export default function PrintButton(){return <button className="button primary small" onClick={()=>window.print()}><Printer size={13}/>Afdrukken / bewaar als PDF</button>;}