import { ensureStore } from '../src/domain/store';
import { readAudit } from '../src/domain/hashchain';
async function main(){await ensureStore();const {total,verified,brokenAt}=readAudit();console.log(`total=${total} verified=${verified} brokenAt=${brokenAt}`);if(brokenAt!==null)process.exitCode=1;}main().catch(e=>{console.error(e);process.exitCode=1;});
