import { chromium as playwright } from '@playwright/test';
import serverlessChromium from '@sparticuz/chromium';
import { existsSync } from 'node:fs';
import { createReadStream } from 'node:fs';
import { createBrotliDecompress } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import tar from 'tar-fs';
export async function launchBrowser(){
 try{return await playwright.launch({headless:true});}catch{
  const executablePath=await serverlessChromium.executablePath();const libs=path.join(tmpdir(),'overdracht-qa-libs');
  if(!existsSync(path.join(libs,'lib','libnspr4.so'))){await pipeline(createReadStream(path.resolve('node_modules/@sparticuz/chromium/bin/al2023.tar.br')),createBrotliDecompress(),tar.extract(libs));}
  return playwright.launch({executablePath,headless:true,args:serverlessChromium.args.filter(a=>a!=='--disable-web-security'),env:{...process.env,LD_LIBRARY_PATH:`${libs}/lib:${tmpdir()}:${process.env.LD_LIBRARY_PATH||''}`}});
 }
}
