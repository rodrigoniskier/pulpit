import {APP_VERSION,nowISO,downloadBlob} from './utils.js';
import {db} from './db.js';
import {validateBackup} from './schema.js';

const enc=new TextEncoder(), dec=new TextDecoder();
function bytesToB64(bytes){ let s=''; for(const b of bytes) s+=String.fromCharCode(b); return btoa(s); }
function b64ToBytes(s){ const raw=atob(s); return Uint8Array.from(raw,c=>c.charCodeAt(0)); }
async function keyFromPassword(password,salt){ const material=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']); return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:250000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']); }
export async function buildBackup(){
  const [sermons,studies,preparations,devotionals,translations,settingsRows]=await Promise.all(['sermons','studies','preparations','devotionals','translations','settings'].map(s=>db.getAll(s)));
  const settings=Object.fromEntries(settingsRows.map(x=>[x.key,x.value]));
  return {format:'pulpit-backup',version:3,appVersion:APP_VERSION,exportedAt:nowISO(),data:{sermons,studies,preparations,devotionals,translations,settings}};
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
  let raw;
  try{ raw=JSON.parse(await file.text()); }catch{ throw new Error('O arquivo não contém um backup JSON válido.'); }
  let data=raw;
  if(raw.format==='pulpit-encrypted'){
    if(raw.version!==1||raw.kdf!=='PBKDF2-SHA256'||raw.cipher!=='AES-256-GCM') throw new Error('Formato de backup criptografado não suportado.');
    if(typeof raw.salt!=='string'||typeof raw.iv!=='string'||typeof raw.data!=='string') throw new Error('Backup criptografado inválido.');
    const password=await passwordProvider(); if(!password) throw new Error('Importação cancelada.');
    try{
      const salt=b64ToBytes(raw.salt), iv=b64ToBytes(raw.iv), cipher=b64ToBytes(raw.data);
      if(salt.length!==16||iv.length!==12||!cipher.length) throw new Error('Envelope inválido.');
      const key=await keyFromPassword(password,salt);
      const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,cipher);
      data=JSON.parse(dec.decode(clear));
    }catch{ throw new Error('Senha incorreta ou backup corrompido.'); }
  }
  return validateBackup(data);
}
export async function restoreBackup(validated){
  await db.restoreUserData(validated.collections,validated.settings||{});
}
