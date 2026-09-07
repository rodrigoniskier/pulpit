import {APP_VERSION,nowISO,downloadBlob} from './utils.js';
import {db} from './db.js';
import {validateBackup} from './schema.js';

const enc=new TextEncoder(), dec=new TextDecoder();
function bytesToB64(bytes){ let s=''; for(const b of bytes) s+=String.fromCharCode(b); return btoa(s); }
function b64ToBytes(s){ const raw=atob(s); return Uint8Array.from(raw,c=>c.charCodeAt(0)); }
async function keyFromPassword(password,salt){ const material=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']); return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:250000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']); }
export async function buildBackup(){
  const [sermons,studies,devotionals,translations,settingsRows]=await Promise.all(['sermons','studies','devotionals','translations','settings'].map(s=>db.getAll(s)));
  const settings=Object.fromEntries(settingsRows.map(x=>[x.key,x.value]));
  return {format:'pulpit-backup',version:2,appVersion:APP_VERSION,exportedAt:nowISO(),data:{sermons,studies,devotionals,translations,settings}};
}
export async function exportJson(){ const data=await buildBackup(); downloadBlob(JSON.stringify(data,null,2),`pulpit-backup-${new Date().toISOString().slice(0,10)}.json`,'application/json'); }
export async function exportEncrypted(password){
  if(!password||password.length<8) throw new Error('Use uma senha com pelo menos 8 caracteres.');
  const data=enc.encode(JSON.stringify(await buildBackup())); const salt=crypto.getRandomValues(new Uint8Array(16)); const iv=crypto.getRandomValues(new Uint8Array(12)); const key=await keyFromPassword(password,salt); const cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,data));
  const envelope={format:'pulpit-encrypted',version:1,kdf:'PBKDF2-SHA256',iterations:250000,cipher:'AES-256-GCM',salt:bytesToB64(salt),iv:bytesToB64(iv),data:bytesToB64(cipher)};
  downloadBlob(JSON.stringify(envelope),`pulpit-backup-${new Date().toISOString().slice(0,10)}.pulpit`,'application/octet-stream');
}
export async function readBackupFile(file,passwordProvider){
  if(file.size>30_000_000) throw new Error('Backup muito grande.');
  const raw=JSON.parse(await file.text()); let data=raw;
  if(raw.format==='pulpit-encrypted'){
    const password=await passwordProvider(); if(!password) throw new Error('Importação cancelada.');
    const key=await keyFromPassword(password,b64ToBytes(raw.salt));
    try{ const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64ToBytes(raw.iv)},key,b64ToBytes(raw.data)); data=JSON.parse(dec.decode(clear)); }
    catch{ throw new Error('Senha incorreta ou backup corrompido.'); }
  }
  return validateBackup(data);
}
export async function restoreBackup(validated){
  for(const store of ['sermons','studies','devotionals','translations']){ await db.clear(store); await db.bulkPut(store,validated.collections[store]||[]); }
  await db.clear('settings'); for(const [key,value] of Object.entries(validated.settings||{})) await db.put('settings',{key,value});
}
