import type { Case, ChainLink, SubstanceTable } from './types';
import { createHash } from 'node:crypto';
export function candidateChains(c: Case, table: SubstanceTable): ChainLink[][] {
 const p = table[c.substance];
 if (!p || ['therapeutic','unknown'].includes(c.scenario || '')) return [];
 const rank = { nl_geregistreerd:0, import:1, bereiding:2 };
 const size = (s: string) => Number(s.match(/[\d,.]+/)?.[0].replace(',','.') || 0);
 const candidates = p.products.filter(product => product.product !== c.unavailable_product && (c.scenario !== 'import_only' || !product.nl_registered)).flatMap(product => product.packages.map(pkg => {
   const hop = (product.strength !== c.strength || product.form !== c.form || pkg !== c.package) ? 1 : 0;
   const link: ChainLink = { ...product, substance: c.substance, package:pkg, hop, route: product.nl_registered ? 'nl_geregistreerd' : 'import' };
   return [link];
 }));
 candidates.sort((a,b) => a[0].hop-b[0].hop || Math.abs(size(a[0].package)-size(c.package))-Math.abs(size(b[0].package)-size(c.package)) || rank[a[0].route]-rank[b[0].route] || a[0].product.localeCompare(b[0].product,'nl') || a[0].package.localeCompare(b[0].package,'nl'));
 return candidates.filter((v,i,a)=>a.findIndex(x=>JSON.stringify(x)===JSON.stringify(v))===i);
}
export function chainId(c: Case, chain: ChainLink[]) { return `${c.case_id}-${createHash('sha256').update(JSON.stringify(chain)).digest('hex').slice(0,10)}`; }
