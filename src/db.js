const DB_NAME='pulpit-ultimate';
const DB_VERSION=1;
const STORES=['sermons','studies','devotionals','translations','revisions','settings','handles'];
let dbPromise;

function requestToPromise(req){ return new Promise((resolve,reject)=>{ req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error); }); }
function txDone(tx){ return new Promise((resolve,reject)=>{ tx.oncomplete=()=>resolve(); tx.onabort=()=>reject(tx.error||new Error('Transação cancelada.')); tx.onerror=()=>reject(tx.error||new Error('Falha na transação.')); }); }

export function openDB(){
  if(dbPromise) return dbPromise;
  dbPromise=new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      for(const name of STORES){
        if(!db.objectStoreNames.contains(name)){
          const store=db.createObjectStore(name,{keyPath:name==='settings'||name==='handles'?'key':'id'});
          if(['sermons','studies','devotionals'].includes(name)) store.createIndex('updatedAt','updatedAt');
          if(name==='revisions'){
            store.createIndex('entityKey','entityKey');
            store.createIndex('createdAt','createdAt');
          }
        }
      }
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
    req.onblocked=()=>reject(new Error('O banco está bloqueado por outra aba do Pulpit. Feche as outras abas e tente novamente.'));
  });
  return dbPromise;
}

async function withStore(name,mode,work){
  const database=await openDB();
  const tx=database.transaction(name,mode);
  const done=txDone(tx);
  const result=await work(tx.objectStore(name),tx);
  await done;
  return result;
}

export const db={
  async get(store,key){ return withStore(store,'readonly',s=>requestToPromise(s.get(key))); },
  async getAll(store){ return withStore(store,'readonly',s=>requestToPromise(s.getAll())); },
  async put(store,value){ return withStore(store,'readwrite',s=>requestToPromise(s.put(value))); },
  async delete(store,key){ return withStore(store,'readwrite',s=>requestToPromise(s.delete(key))); },
  async clear(store){ return withStore(store,'readwrite',s=>requestToPromise(s.clear())); },
  async bulkPut(store,values){ return withStore(store,'readwrite',s=>{ for(const value of values) s.put(value); }); },
  async getRevisions(entityKey){
    const database=await openDB();
    const tx=database.transaction('revisions','readonly');
    const done=txDone(tx);
    const items=await requestToPromise(tx.objectStore('revisions').index('entityKey').getAll(entityKey));
    await done;
    return items.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  },
  async restoreUserData(collections,settings={}){
    const database=await openDB();
    const stores=['sermons','studies','devotionals','translations','settings','revisions'];
    const tx=database.transaction(stores,'readwrite');
    const done=txDone(tx);
    for(const name of stores) tx.objectStore(name).clear();
    for(const name of ['sermons','studies','devotionals','translations']){
      const store=tx.objectStore(name);
      for(const value of collections[name]||[]) store.put(value);
    }
    const settingsStore=tx.objectStore('settings');
    for(const [key,value] of Object.entries(settings)) settingsStore.put({key,value});
    await done;
  },
  async clearUserData(){
    const database=await openDB();
    const tx=database.transaction(STORES,'readwrite');
    const done=txDone(tx);
    for(const store of STORES) tx.objectStore(store).clear();
    await done;
  }
};
