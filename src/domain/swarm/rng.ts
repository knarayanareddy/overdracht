export function mulberry32(seed:number){let a=seed>>>0;return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
export function shuffle<T>(items:T[],rnd:()=>number):T[]{const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export const clamp=(n:number,lo=0,hi=1)=>Math.max(lo,Math.min(hi,n));
export const mean=(a:number[])=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
export function wilson(p:number,n:number,z=1.959964){if(n===0)return {lo:0,hi:1};const d=1+z*z/n,c=p+z*z/(2*n),s=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n));return {lo:(c-s)/d,hi:(c+s)/d};}

export function formatFrequency(f:{x:number;n:number;p:number;lo:number;hi:number}){return `${f.x} / ${f.n} runs (p = ${f.p.toFixed(3)}, 95% CI ${f.lo.toFixed(3)}–${f.hi.toFixed(3)})`;}
