import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
async function walk(dir){const out=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())out.push(...await walk(p));else if(e.name.endsWith('.js')||e.name.endsWith('.mjs'))out.push(p)}return out}
const files=[...(await walk('src')), ...(await walk('scripts')), 'sw.js']; let failed=false;
for(const file of files){const r=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});if(r.status!==0)failed=true}
if(failed)process.exit(1); console.log(`Syntax OK: ${files.length} files`);
