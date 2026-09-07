const DB_NAME='pulpit-ultimate';
const DB_VERSION=1;
const STORES=['sermons','studies','devotionals','translations','revisions','settings','handles'];
let dbPromise;

function requestToPromise(req){ return new Promise((resolve,reject)=>{ req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error); }); }
function txDone(tx){ return new Promise((resolve,reject)=>{ tx.oncomplete=()=>resolve(); tx.onabort=()=>reject(tx.error); tx.onerror=()=>reject(tx.error); }); }

export function openDB(){
  if(dbPromise) return dbPromise;
  dbPromise=new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      for(const name of STORES){
        if(!db.objectStoreNames.contains(name)){
          const store=db.createObjectStore(name,{keyPath:name==='settings'||name==='handles'?'key':'id'});
          if(['sermons','studies','devotionals'].includes(name)){
            store.createIndex('updatedAt','updatedAt');
          }
          if(name==='revisions'){
            store.createIndex('entityKey','entityKey');
            store.createIndex('createdAt','createdAt');
          }
        }
      }
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
  return dbPromise;
}

async function withStore(name,mode,work){
  const db=await openDB(); const tx=db.transaction(name,mode); const store=tx.objectStore(name); const result=await work(store,tx); await txDone(tx); return result;
}

export const db={
  async get(store,key){ return withStore(store,'readonly',s=>requestToPromise(s.get(key))); },
  async getAll(store){ return withStore(store,'readonly',s=>requestToPromise(s.getAll())); },
  async put(store,value){ return withStore(store,'readwrite',s=>requestToPromise(s.put(value))); },
  async delete(store,key){ return withStore(store,'readwrite',s=>requestToPromise(s.delete(key))); },
  async clear(store){ return withStore(store,'readwrite',s=>requestToPromise(s.clear())); },
  async bulkPut(store,values){ return withStore(store,'readwrite',async s=>{ for(const value of values) await requestToPromise(s.put(value)); }); },
  async getRevisions(entityKey){
    const database=await openDB(); const tx=database.transaction('revisions','readonly'); const idx=tx.objectStore('revisions').index('entityKey'); const req=idx.getAll(entityKey); const items=await requestToPromise(req); await txDone(tx); return items.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  },
  async clearUserData(){ for(const store of ['sermons','studies','devotionals','translations','revisions','settings','handles']) await this.clear(store); }
};
