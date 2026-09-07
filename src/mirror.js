import {db} from './db.js';
import {entityToMarkdown} from './markdown.js';
import {downloadBlob} from './utils.js';
const dirs={sermons:'Sermoes',preparations:'Preparacao-do-Texto',studies:'Estudos',devotionals:'Devocionais'};
async function permission(handle,write=true){ if(!handle) return false; const opts={mode:write?'readwrite':'read'}; if((await handle.queryPermission?.(opts))==='granted') return true; return (await handle.requestPermission?.(opts))==='granted'; }
export class FileMirror{
  async choose(){ if(!window.showDirectoryPicker) throw new Error('Seu navegador não oferece seleção persistente de pasta.'); const handle=await window.showDirectoryPicker({mode:'readwrite'}); if(!await permission(handle)) throw new Error('Permissão negada.'); await db.put('handles',{key:'mirrorDirectory',value:handle}); return handle; }
  async getHandle(){ const row=await db.get('handles','mirrorDirectory'); return row?.value||null; }
  async isReady(){ try{return await permission(await this.getHandle(),false);}catch{return false;} }
  async write(type,entity){ const handle=await this.getHandle(); if(!handle||!await permission(handle)) return false; const dir=await handle.getDirectoryHandle(dirs[type],{create:true}); const file=await dir.getFileHandle(entity.fileName,{create:true}); const writable=await file.createWritable(); await writable.write(entityToMarkdown(type,entity)); await writable.close(); return true; }
  async remove(type,entity){ const handle=await this.getHandle(); if(!handle||!await permission(handle)) return false; try{ const dir=await handle.getDirectoryHandle(dirs[type]); await dir.removeEntry(entity.fileName); return true; }catch{return false;} }
  download(type,entity){ downloadBlob(entityToMarkdown(type,entity),entity.fileName,'text/markdown;charset=utf-8'); }
  async syncAll(){ let count=0; for(const type of Object.keys(dirs)){ for(const entity of await db.getAll(type)){ if(await this.write(type,entity)) count++; } } return count; }
}
