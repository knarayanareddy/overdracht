import { ensureStore } from '../src/domain/store';
import { readAudit } from '../src/domain/hashchain';
async function main(){await ensureStore();const a=readAudit();console.log(`Seed ready: ${a.total} rows, verified=${a.verified}, brokenAt=${a.brokenAt}`);}main().catch(e=>{console.error(e);process.exitCode=1;});
