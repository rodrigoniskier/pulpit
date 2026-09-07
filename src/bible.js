import {sanitizeTranslation} from './schema.js';
import {db} from './db.js';

export const YOUVERSION_NVI_ID=129;
const YOUVERSION_PROXY='./__youversion';
const aliases={joao:'João',john:'João',sl:'Salmos',salmo:'Salmos',salmos:'Salmos',rm:'Romanos',rom:'Romanos',gn:'Gênesis',gen:'Gênesis',mt:'Mateus',mc:'Marcos',lc:'Lucas',atos:'Atos',at:'Atos',ef:'Efésios',fp:'Filipenses',cl:'Colossenses',hb:'Hebreus',tg:'Tiago',ap:'Apocalipse'};
const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');

const bookCodes=new Map([
  ['genesis','GEN'],['gn','GEN'],['gen','GEN'],['exodo','EXO'],['ex','EXO'],['levitico','LEV'],['lv','LEV'],['numeros','NUM'],['nm','NUM'],['deuteronomio','DEU'],['dt','DEU'],
  ['josue','JOS'],['js','JOS'],['juizes','JDG'],['jz','JDG'],['rute','RUT'],['rt','RUT'],['1 samuel','1SA'],['1sm','1SA'],['2 samuel','2SA'],['2sm','2SA'],['1 reis','1KI'],['1rs','1KI'],['2 reis','2KI'],['2rs','2KI'],['1 cronicas','1CH'],['1cr','1CH'],['2 cronicas','2CH'],['2cr','2CH'],['esdras','EZR'],['ed','EZR'],['neemias','NEH'],['ne','NEH'],['ester','EST'],['et','EST'],['jo','JOB'],['job','JOB'],
  ['salmos','PSA'],['salmo','PSA'],['sl','PSA'],['proverbios','PRO'],['pv','PRO'],['eclesiastes','ECC'],['ec','ECC'],['cantico dos canticos','SNG'],['canticos','SNG'],['ct','SNG'],['isaias','ISA'],['is','ISA'],['jeremias','JER'],['jr','JER'],['lamentacoes','LAM'],['lm','LAM'],['ezequiel','EZK'],['ez','EZK'],['daniel','DAN'],['dn','DAN'],['oseias','HOS'],['os','HOS'],['joel','JOL'],['jl','JOL'],['amos','AMO'],['am','AMO'],['obadias','OBA'],['ob','OBA'],['jonas','JON'],['jn','JON'],['miqueias','MIC'],['mq','MIC'],['naum','NAM'],['na','NAM'],['habacuque','HAB'],['hc','HAB'],['sofonias','ZEP'],['sf','ZEP'],['ageu','HAG'],['ag','HAG'],['zacarias','ZEC'],['zc','ZEC'],['malaquias','MAL'],['ml','MAL'],
  ['mateus','MAT'],['mt','MAT'],['marcos','MRK'],['mc','MRK'],['lucas','LUK'],['lc','LUK'],['joao','JHN'],['john','JHN'],['atos','ACT'],['at','ACT'],['romanos','ROM'],['rm','ROM'],['1 corintios','1CO'],['1co','1CO'],['2 corintios','2CO'],['2co','2CO'],['galatas','GAL'],['gl','GAL'],['efesios','EPH'],['ef','EPH'],['filipenses','PHP'],['fp','PHP'],['colossenses','COL'],['cl','COL'],['1 tessalonicenses','1TH'],['1ts','1TH'],['2 tessalonicenses','2TH'],['2ts','2TH'],['1 timoteo','1TI'],['1tm','1TI'],['2 timoteo','2TI'],['2tm','2TI'],['tito','TIT'],['tt','TIT'],['filemom','PHM'],['fm','PHM'],['hebreus','HEB'],['hb','HEB'],['tiago','JAS'],['tg','JAS'],['1 pedro','1PE'],['1pe','1PE'],['2 pedro','2PE'],['2pe','2PE'],['1 joao','1JN'],['1jo','1JN'],['2 joao','2JN'],['2jo','2JN'],['3 joao','3JN'],['3jo','3JN'],['judas','JUD'],['jd','JUD'],['apocalipse','REV'],['ap','REV']
]);

export function parseReference(text){
  const m=String(text||'').trim().match(/^(.+?)\s+(\d+)(?::(\d+))?(?:-(?:(\d+):)?(\d+))?$/);
  if(!m) return null;
  let book=m[1].trim(); const alias=aliases[fold(book)]; if(alias) book=alias;
  const chapter=Number(m[2]); const verseStart=m[3]?Number(m[3]):null; const endChapter=m[4]?Number(m[4]):chapter; const verseEnd=m[5]?Number(m[5]):verseStart;
  if(!chapter||chapter<1||endChapter<chapter) return null;
  return {book,chapter,verseStart,endChapter,verseEnd};
}

export function toUsfmReference(reference){
  const ref=typeof reference==='string'?parseReference(reference):reference;
  if(!ref) throw new Error('Referência bíblica inválida.');
  const code=bookCodes.get(fold(ref.book));
  if(!code) throw new Error(`Livro não reconhecido para NVI Online: ${ref.book}`);
  let usfm=`${code}.${ref.chapter}`;
  if(ref.verseStart){
    usfm+=`.${ref.verseStart}`;
    const isRange=ref.verseEnd&&(ref.endChapter!==ref.chapter||ref.verseEnd!==ref.verseStart);
    if(isRange) usfm+=ref.endChapter!==ref.chapter?`-${ref.endChapter}.${ref.verseEnd}`:`-${ref.verseEnd}`;
  }
  return usfm;
}

export function buildYouVersionUrl(reference){
  const usfm=toUsfmReference(reference);
  return `https://www.bible.com/pt/bible/${YOUVERSION_NVI_ID}/${usfm}.NVI`;
}

function resolveBook(books,wanted){
  if(books[wanted]) return wanted; const f=fold(wanted); return Object.keys(books).find(k=>fold(k)===f)||null;
}
export function getPassage(translation,reference){
  const ref=typeof reference==='string'?parseReference(reference):reference; if(!ref) throw new Error('Referência inválida.');
  const book=resolveBook(translation.books,ref.book); if(!book) throw new Error(`Livro não encontrado: ${ref.book}`);
  const rows=[];
  for(let ch=ref.chapter;ch<=ref.endChapter;ch++){
    const verses=translation.books[book]?.[String(ch)]; if(!Array.isArray(verses)) throw new Error(`Capítulo não encontrado: ${book} ${ch}`);
    const start=ch===ref.chapter?(ref.verseStart||1):1; const end=ch===ref.endChapter?(ref.verseEnd||verses.length):verses.length;
    for(let v=start;v<=Math.min(end,verses.length);v++) rows.push({book,chapter:ch,verse:v,text:verses[v-1]});
  }
  return rows;
}
export async function parseTranslationFile(file){ const text=await file.text(); if(text.length>25_000_000) throw new Error('Arquivo de tradução muito grande.'); return sanitizeTranslation(JSON.parse(text)); }

function unwrapApiPayload(value){ return value?.data??value; }
async function callYouVersion(path,appKey){
  if(typeof navigator==='undefined'||!navigator.serviceWorker?.controller) throw new Error('O leitor online ainda está inicializando. Recarregue o Pulpit uma vez e tente novamente.');
  const response=await fetch(YOUVERSION_PROXY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({path,appKey})});
  let payload={}; try{payload=await response.json();}catch{}
  if(response.ok) return unwrapApiPayload(payload);
  if(response.status===401) throw new Error('YouVersion App Key inválida ou ausente.');
  if(response.status===403) throw new Error('A App Key não possui acesso à NVI. No YouVersion Platform, aceite a licença aplicável à NVI e tente novamente.');
  if(response.status===404) throw new Error('A NVI ou a passagem solicitada não está disponível para esta App Key.');
  if(response.status===429) throw new Error('Limite temporário da YouVersion API atingido. Tente novamente em instantes.');
  throw new Error(payload?.message||payload?.error||`Falha na YouVersion API (${response.status}).`);
}

export async function getYouVersionNvi(reference,appKey){
  if(!appKey||String(appKey).trim().length<8) throw new Error('Configure uma YouVersion App Key válida.');
  const usfm=toUsfmReference(reference);
  const passagePath=`/v1/bibles/${YOUVERSION_NVI_ID}/passages/${encodeURIComponent(usfm)}?format=text&include_headings=true&include_notes=true`;
  const versionPath=`/v1/bibles/${YOUVERSION_NVI_ID}`;
  const [passage,version]=await Promise.all([callYouVersion(passagePath,String(appKey).trim()),callYouVersion(versionPath,String(appKey).trim())]);
  if(!passage?.content) throw new Error('A YouVersion API não retornou o texto solicitado.');
  return {passage,version,url:buildYouVersionUrl(reference)};
}

async function getAppKey(){ return (await db.get('secrets','youVersionAppKey'))?.value||''; }
async function setAppKey(value){ const key=String(value||'').trim(); if(!key) return db.delete('secrets','youVersionAppKey'); await db.put('secrets',{key:'youVersionAppKey',value:key}); }
function externalLink(label,href){ const a=document.createElement('a'); a.href=href; a.target='_blank'; a.rel='noopener noreferrer'; a.textContent=label; return a; }
function setStatus(el,text){ el.textContent=text; }

async function initNviOnlineUI(){
  const view=document.querySelector('#view-bible'); const reference=document.querySelector('#bible-reference'); const result=document.querySelector('#bible-result');
  if(!view||!reference||!result||document.querySelector('#nvi-online-panel')) return;
  const localNotice=view.querySelector('.notice');
  const panel=document.createElement('article'); panel.id='nvi-online-panel'; panel.className='panel';
  const h=document.createElement('h2'); h.textContent='NVI Online — YouVersion';
  const p=document.createElement('p'); p.textContent='Leia a Nova Versão Internacional por uma fonte oficial licenciada. O Pulpit não armazena nem redistribui o texto da NVI.';
  const help=document.createElement('p'); help.append('A leitura externa funciona imediatamente. Para ler dentro do Pulpit, configure uma App Key do ',externalLink('YouVersion Platform','https://platform.youversion.com/'),' com a licença aplicável à NVI aceita.');
  const actions=document.createElement('div'); actions.className='toolbar-actions';
  const inline=document.createElement('button'); inline.type='button'; inline.className='primary'; inline.textContent='Ler NVI aqui';
  const online=document.createElement('button'); online.type='button'; online.className='secondary'; online.textContent='Abrir no YouVersion';
  const configure=document.createElement('button'); configure.type='button'; configure.className='secondary'; configure.textContent='Configurar acesso';
  const status=document.createElement('p'); status.id='nvi-online-status'; status.setAttribute('aria-live','polite');
  actions.append(inline,online,configure); panel.append(h,p,help,actions,status);
  localNotice?.before(panel);

  const refreshStatus=async()=>setStatus(status,await getAppKey()?'Leitura NVI dentro do Pulpit: configurada. A chave fica apenas neste navegador e não entra nos backups.':'Leitura NVI dentro do Pulpit: App Key ainda não configurada.');
  await refreshStatus();

  configure.addEventListener('click',async()=>{
    const current=await getAppKey();
    const value=prompt(current?'Cole uma nova YouVersion App Key. Deixe em branco para manter a atual.':'Cole sua YouVersion App Key:');
    if(value===null) return;
    if(!value.trim()){
      if(current&&confirm('Remover a App Key atualmente salva neste navegador?')){ await setAppKey(''); setStatus(status,'App Key removida. A leitura externa da NVI continua disponível.'); }
      return refreshStatus();
    }
    if(value.trim().length<8){ setStatus(status,'A App Key informada parece inválida.'); return; }
    await setAppKey(value); setStatus(status,'App Key salva apenas neste navegador.');
  });

  online.addEventListener('click',()=>{
    try{ window.open(buildYouVersionUrl(reference.value||'João 3:16'),'_blank','noopener,noreferrer'); }
    catch(error){ setStatus(status,error.message); }
  });

  inline.addEventListener('click',async()=>{
    try{
      const key=await getAppKey(); if(!key){ setStatus(status,'Configure uma YouVersion App Key para ler a NVI dentro do Pulpit. Você pode usar “Abrir no YouVersion” sem configuração.'); return; }
      setStatus(status,'Carregando NVI licenciada pela YouVersion…');
      const data=await getYouVersionNvi(reference.value||'João 3:16',key);
      while(result.firstChild) result.firstChild.remove();
      const title=document.createElement('h2'); title.textContent=`${data.passage.reference||reference.value} · NVI`;
      const text=document.createElement('div'); text.className='verse'; const body=document.createElement('span'); body.textContent=String(data.passage.content||''); text.append(body);
      const attribution=document.createElement('div'); attribution.className='notice'; const copyright=String(data.version?.copyright||'').trim(); attribution.append(document.createTextNode(copyright||'Copyright e licença conforme metadados da YouVersion Platform.'),document.createElement('br'),externalLink('Abrir esta passagem no YouVersion',data.url));
      result.append(title,text,attribution);
      result.dataset.copyText=[`${data.passage.reference||reference.value} NVI`,data.passage.content,copyright].filter(Boolean).join('\n\n');
      setStatus(status,'NVI carregada pela YouVersion Platform. O texto não foi salvo no Pulpit.');
    }catch(error){ setStatus(status,error.message); }
  });
}

if(typeof document!=='undefined') queueMicrotask(()=>initNviOnlineUI().catch(console.error));
