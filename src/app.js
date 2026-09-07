import {db,openDB} from './db.js';
import {newSermon,newStudy,newDevotional,newPoint,sanitizeEntity} from './schema.js';
import {entityToMarkdown} from './markdown.js';
import {FileMirror} from './mirror.js';
import {exportJson,exportEncrypted,readBackupFile,restoreBackup} from './backup.js';
import {parseTranslationFile,getPassage} from './bible.js';
import {sermonPrompt} from './prompt.js';
import {nowISO,normalizeTags,tagsToInput,formatDate,formatDateTime,debounce,entitySearchText,stableHash,escapeHtml} from './utils.js';

const mirror=new FileMirror();
const state={view:'dashboard',sermon:null,study:null,devotional:null,calendarDate:new Date(new Date().getFullYear(),new Date().getMonth(),1),deferredInstall:null};
const $=sel=>document.querySelector(sel);
const $$=sel=>[...document.querySelectorAll(sel)];

function toast(message){ const el=document.createElement('div'); el.className='toast'; el.textContent=message; $('#toast-region').append(el); setTimeout(()=>el.remove(),3500); }
function setSaveStatus(text){ $('#save-status').textContent=text; }
function setText(el,text){ if(el) el.textContent=text??''; }
function clear(el){ while(el?.firstChild) el.firstChild.remove(); }

function showView(name){
  state.view=name; $$('.view').forEach(v=>v.classList.toggle('is-visible',v.id===`view-${name}`));
  const parentView={'sermon-editor':'sermons','study-editor':'studies','devotional-editor':'devotionals'}[name];
  $$('.nav-item').forEach(b=>b.classList.toggle('is-active',b.dataset.view===name || b.dataset.view===parentView));
  $('#main').focus({preventScroll:true}); location.hash=name;
  if(innerWidth<980) $('.sidebar').classList.remove('is-open');
}

function applySettings(settings){
  const theme=settings.theme||'system'; const resolved=theme==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):theme;
  document.documentElement.dataset.theme=resolved; document.documentElement.dataset.reading=settings.readingSize||'normal'; document.body.classList.toggle('compact',!!settings.compact);
}
async function getSettings(){ const rows=await db.getAll('settings'); return Object.fromEntries(rows.map(r=>[r.key,r.value])); }

function metaTags(tags){ const frag=document.createDocumentFragment(); for(const tag of tags||[]){ const span=document.createElement('span'); span.className='tag'; span.textContent=tag; frag.append(span); } return frag; }
function makeEntityCard(type,entity,title,meta=[]){
  const card=document.createElement('article'); card.className='entity-card';
  const main=document.createElement('div'); main.className='entity-main'; const h=document.createElement('h3'); h.textContent=title||'Sem título'; main.append(h);
  const m=document.createElement('div'); m.className='entity-meta'; for(const item of meta.filter(Boolean)){ const s=document.createElement('span'); s.textContent=item; m.append(s); } m.append(metaTags(entity.tags)); main.append(m);
  const btn=document.createElement('button'); btn.className='secondary'; btn.textContent='Abrir'; btn.addEventListener('click',()=>openEntity(type,entity.id));
  card.append(main,btn); card.addEventListener('dblclick',()=>openEntity(type,entity.id)); return card;
}
function empty(container,message){ clear(container); const el=document.createElement('div'); el.className='empty-state'; el.textContent=message; container.append(el); }

async function renderSermons(){
  const list=$('#sermon-list'); const q=$('#sermon-filter').value.trim().toLowerCase(); const status=$('#sermon-status-filter').value; let items=await db.getAll('sermons');
  items.sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||'')); items=items.filter(s=>(!q||entitySearchText(s).includes(q))&&(!status||s.status===status)); clear(list);
  if(!items.length) return empty(list,'Nenhum sermão encontrado.');
  for(const s of items) list.append(makeEntityCard('sermons',s,s.title,[s.passage,s.status,s.preachingDate?formatDate(s.preachingDate):'']));
}
async function renderStudies(){
  const list=$('#study-list'); const q=$('#study-filter').value.trim().toLowerCase(); let items=await db.getAll('studies'); items.sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||'')); items=items.filter(s=>!q||entitySearchText(s).includes(q)); clear(list);
  if(!items.length) return empty(list,'Nenhum estudo registrado.'); for(const s of items) list.append(makeEntityCard('studies',s,s.title,[s.passage,formatDateTime(s.updatedAt)]));
}
async function renderDevotionals(){
  const list=$('#devotional-list'); let items=await db.getAll('devotionals'); items.sort((a,b)=>(b.date||'').localeCompare(a.date||'')); clear(list); if(!items.length) return empty(list,'Nenhum devocional registrado.');
  for(const d of items) list.append(makeEntityCard('devotionals',d,d.passage||'Devocional',[formatDate(d.date)]));
}

async function renderDashboard(){
  const [sermons,studies,devotionals]=await Promise.all(['sermons','studies','devotionals'].map(s=>db.getAll(s))); const now=new Date().toISOString().slice(0,10); const scheduled=sermons.filter(s=>s.preachingDate>=now).sort((a,b)=>a.preachingDate.localeCompare(b.preachingDate));
  const stats=[['Sermões',sermons.length],['Estudos',studies.length],['Devocionais',devotionals.length],['Agendados',scheduled.length]]; const grid=$('#stats-grid'); clear(grid);
  for(const [label,value] of stats){ const c=document.createElement('article'); c.className='stat-card'; const strong=document.createElement('strong'); strong.textContent=value; const span=document.createElement('span'); span.textContent=label; c.append(strong,span); grid.append(c); }
  const upcoming=$('#upcoming-list'); clear(upcoming); if(!scheduled.length) empty(upcoming,'Nenhuma pregação futura agendada.'); else for(const s of scheduled.slice(0,6)) upcoming.append(makeEntityCard('sermons',s,s.title,[formatDate(s.preachingDate),s.location]));
  const recent=$('#recent-list'); clear(recent); const combined=[...sermons.map(x=>({type:'sermons',e:x,title:x.title})),...studies.map(x=>({type:'studies',e:x,title:x.title})),...devotionals.map(x=>({type:'devotionals',e:x,title:x.passage||'Devocional'}))].sort((a,b)=>(b.e.updatedAt||'').localeCompare(a.e.updatedAt||''));
  if(!combined.length) empty(recent,'Sua atividade aparecerá aqui.'); else for(const x of combined.slice(0,6)) recent.append(makeEntityCard(x.type,x.e,x.title,[formatDateTime(x.e.updatedAt)]));
}

function renderPoints(points){
  const root=$('#points-editor'); clear(root); (points||[]).forEach((p,index)=>{
    const card=document.createElement('article'); card.className='point-card'; card.dataset.pointId=p.id;
    const head=document.createElement('div'); head.className='point-card-header'; const strong=document.createElement('strong'); strong.textContent=`Ponto ${index+1}`; const del=document.createElement('button'); del.type='button'; del.className='danger'; del.textContent='Remover'; del.addEventListener('click',()=>{ if(root.children.length===1){toast('O sermão precisa manter ao menos um ponto.');return;} card.remove(); renumberPoints(); scheduleSave(); }); head.append(strong,del);
    const fields=document.createElement('div'); fields.className='point-fields';
    fields.append(pointLabel('Título','title',p.title,2));
    const row1=document.createElement('div'); row1.className='cols-2'; row1.append(pointTextarea('Explicação','explanation',p.explanation,6),pointTextarea('Ilustração','illustration',p.illustration,6));
    const row2=document.createElement('div'); row2.className='cols-2'; row2.append(pointTextarea('Aplicação','application',p.application,6),pointTextarea('Referências bíblicas','references',p.references,6)); fields.append(row1,row2); card.append(head,fields); root.append(card);
  });
}
function pointLabel(label,field,value){ const l=document.createElement('label'); l.textContent=label; const i=document.createElement('input'); i.dataset.field=field; i.value=value||''; l.append(i); return l; }
function pointTextarea(label,field,value,rows){ const l=document.createElement('label'); l.textContent=label; const t=document.createElement('textarea'); t.dataset.field=field; t.rows=rows; t.value=value||''; l.append(t); return l; }
function renumberPoints(){ $$('#points-editor .point-card').forEach((c,i)=>{ c.querySelector('strong').textContent=`Ponto ${i+1}`; }); }
function collectPoints(){ return $$('#points-editor .point-card').map((card,i)=>({id:card.dataset.pointId||crypto.randomUUID(),order:i+1,title:card.querySelector('[data-field="title"]').value,explanation:card.querySelector('[data-field="explanation"]').value,illustration:card.querySelector('[data-field="illustration"]').value,application:card.querySelector('[data-field="application"]').value,references:card.querySelector('[data-field="references"]').value})); }

function fillForm(form,entity){
  for(const [key,value] of Object.entries(entity)){ const input=form.elements.namedItem(key); if(!input) continue; if(key==='tags') input.value=tagsToInput(value); else if(input.type==='checkbox') input.checked=!!value; else input.value=value??''; }
}
function formEntity(form,base,type){ const data=Object.fromEntries(new FormData(form)); data.id=base.id; data.fileName=base.fileName; data.createdAt=base.createdAt; data.updatedAt=nowISO(); data.tags=normalizeTags(data.tags); if(type==='sermons') data.points=collectPoints(); return sanitizeEntity(type,data); }

async function openEntity(type,id){
  if(type==='sermons'){ state.sermon=await db.get(type,id); if(!state.sermon)return; fillForm($('#sermon-form'),state.sermon); renderPoints(state.sermon.points); showView('sermon-editor'); }
  if(type==='studies'){ state.study=await db.get(type,id); if(!state.study)return; fillForm($('#study-form'),state.study); showView('study-editor'); }
  if(type==='devotionals'){ state.devotional=await db.get(type,id); if(!state.devotional)return; fillForm($('#devotional-form'),state.devotional); showView('devotional-editor'); }
}

async function snapshotIfNeeded(type,previous){
  if(!previous) return; const entityKey=`${type}:${previous.id}`; const revisions=await db.getRevisions(entityKey); const latest=revisions[0]; if(latest && Date.now()-new Date(latest.createdAt).getTime()<5*60*1000) return;
  await db.put('revisions',{id:crypto.randomUUID(),entityKey,type,entityId:previous.id,createdAt:nowISO(),hash:stableHash(previous),snapshot:previous});
  const all=await db.getRevisions(entityKey); for(const old of all.slice(30)) await db.delete('revisions',old.id);
}
async function saveCurrent(type){
  const cfg={sermons:['sermon','#sermon-form'],studies:['study','#study-form'],devotionals:['devotional','#devotional-form']}[type]; if(!cfg) return; const [key,formSel]=cfg; const current=state[key]; if(!current)return;
  try{ setSaveStatus('Salvando…'); const next=formEntity($(formSel),current,type); if(stableHash({...current,updatedAt:''})===stableHash({...next,updatedAt:''})){setSaveStatus('Tudo salvo');return;} await snapshotIfNeeded(type,current); await db.put(type,next); state[key]=next; const settings=await getSettings(); if(settings.autoMirror) await mirror.write(type,next); setSaveStatus(`Salvo ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`); }
  catch(error){ console.error(error); setSaveStatus('Erro ao salvar'); toast(error.message||'Falha ao salvar.'); }
}
const scheduleSave=debounce(()=>{ if(state.view==='sermon-editor')saveCurrent('sermons'); if(state.view==='study-editor')saveCurrent('studies'); if(state.view==='devotional-editor')saveCurrent('devotionals'); },450);

async function createEntity(type){
  const factory={sermons:newSermon,studies:newStudy,devotionals:newDevotional}[type]; const e=factory(); await db.put(type,e); await openEntity(type,e.id); await renderAll();
}
async function deleteCurrent(type){
  const key={sermons:'sermon',studies:'study',devotionals:'devotional'}[type]; const e=state[key]; if(!e||!confirm('Excluir definitivamente este item? Esta ação não pode ser desfeita pelo app.')) return; await db.delete(type,e.id); await mirror.remove(type,e); state[key]=null; showView(type); await renderAll(); toast('Item excluído.');
}

function printSermon(s){
  const win=window.open('','_blank'); if(!win){toast('Permita pop-ups para imprimir.');return;} win.opener=null;
  const pts=(s.points||[]).map((p,i)=>`<section><h2>${i+1}. ${escapeHtml(p.title)}</h2><h3>Explicação</h3><p>${escapeHtml(p.explanation).replace(/\n/g,'<br>')}</p><h3>Ilustração</h3><p>${escapeHtml(p.illustration).replace(/\n/g,'<br>')}</p><h3>Aplicação</h3><p>${escapeHtml(p.application).replace(/\n/g,'<br>')}</p><p><strong>Referências:</strong> ${escapeHtml(p.references)}</p></section>`).join('');
  const sec=(h,v)=>v?`<section><h2>${h}</h2><p>${escapeHtml(v).replace(/\n/g,'<br>')}</p></section>`:'';
  win.document.write(`<!doctype html><meta charset="utf-8"><title>${escapeHtml(s.title)}</title><style>body{font:18px/1.6 Georgia,serif;max-width:850px;margin:40px auto;padding:0 22px;color:#111}h1{font-size:34px}h2{margin-top:30px;border-bottom:1px solid #ddd;padding-bottom:5px}h3{font-size:17px;margin-bottom:4px}p{white-space:normal}@media print{body{margin:0;max-width:none}}</style><h1>${escapeHtml(s.title)}</h1><p><strong>Texto:</strong> ${escapeHtml(s.passage)} · <strong>Tema:</strong> ${escapeHtml(s.theme)}</p>${sec('Proposição / ideia central',s.thesis)}${sec('Objetivo pastoral',s.objective)}${sec('Condição humana / tensão do texto',s.fallenCondition)}${sec('Centro cristocêntrico / redenção',s.christCenter)}${sec('Introdução',s.introduction)}${sec('Elucidação e contexto',s.context)}${pts}${sec('Conclusão',s.conclusion)}`); win.document.close(); win.focus(); setTimeout(()=>win.print(),250);
}

async function showHistory(type,entity){
  const revisions=await db.getRevisions(`${type}:${entity.id}`); const body=$('#modal-body'); clear(body); setText($('#modal-title'),'Histórico de versões');
  if(!revisions.length) empty(body,'Ainda não há versões anteriores.');
  for(const r of revisions){ const row=document.createElement('div'); row.className='revision-item'; const info=document.createElement('div'); const strong=document.createElement('strong'); strong.textContent=formatDateTime(r.createdAt); const small=document.createElement('div'); small.textContent=`Snapshot ${r.hash}`; info.append(strong,small); const btn=document.createElement('button'); btn.className='secondary'; btn.textContent='Restaurar'; btn.addEventListener('click',async()=>{ if(!confirm('Restaurar esta versão? O estado atual será preservado no histórico.'))return; const current=await db.get(type,entity.id); await db.put('revisions',{id:crypto.randomUUID(),entityKey:`${type}:${entity.id}`,type,entityId:entity.id,createdAt:nowISO(),hash:stableHash(current),snapshot:current}); const restored=sanitizeEntity(type,{...r.snapshot,updatedAt:nowISO()}); await db.put(type,restored); $('#modal').close(); await openEntity(type,restored.id); toast('Versão restaurada.'); }); row.append(info,btn); body.append(row); }
  $('#modal').showModal();
}

async function transformStudyToSermon(){
  await saveCurrent('studies'); const s=state.study; const sermon=newSermon(); sermon.title=s.title; sermon.passage=s.passage; sermon.context=[s.observation,s.interpretation,s.theology].filter(Boolean).join('\n\n'); sermon.christCenter=s.christConnection; sermon.objective=s.application; sermon.tags=s.tags; sermon.points=[{...newPoint(1),title:'Desenvolvimento principal',explanation:s.interpretation,application:s.application,references:s.passage}]; sermon.updatedAt=nowISO(); await db.put('sermons',sermon); await openEntity('sermons',sermon.id); await renderAll(); toast('Estudo transformado em sermão.');
}

async function renderCalendar(){
  const sermons=(await db.getAll('sermons')).filter(s=>s.preachingDate); const base=state.calendarDate; setText($('#calendar-label'),new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(base)); const cal=$('#calendar'); clear(cal);
  for(const d of ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']){ const h=document.createElement('div'); h.className='calendar-head'; h.textContent=d; cal.append(h); }
  const start=new Date(base.getFullYear(),base.getMonth(),1-base.getDay()); const today=new Date().toISOString().slice(0,10);
  for(let i=0;i<42;i++){ const day=new Date(start); day.setDate(start.getDate()+i); const iso=`${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`; const cell=document.createElement('div'); cell.className='calendar-day'; if(day.getMonth()!==base.getMonth())cell.classList.add('is-other'); if(iso===today)cell.classList.add('is-today'); const num=document.createElement('div'); num.className='day-number'; num.textContent=day.getDate(); cell.append(num); for(const s of sermons.filter(x=>x.preachingDate===iso)){ const e=document.createElement('button'); e.className='calendar-event'; e.textContent=s.title; e.title=s.location||s.passage||''; e.addEventListener('click',()=>openEntity('sermons',s.id)); cell.append(e); } cal.append(cell); }
  const list=$('#agenda-list'); clear(list); const upcoming=sermons.filter(s=>s.preachingDate>=today).sort((a,b)=>a.preachingDate.localeCompare(b.preachingDate)); if(!upcoming.length)empty(list,'Nenhum compromisso futuro.'); else upcoming.slice(0,20).forEach(s=>list.append(makeEntityCard('sermons',s,s.title,[formatDate(s.preachingDate),s.location,s.passage])));
}

async function loadTranslations(selectedId){ const select=$('#bible-translation'); clear(select); const items=await db.getAll('translations'); if(!items.length){ const opt=document.createElement('option'); opt.value=''; opt.textContent='Nenhuma tradução importada'; select.append(opt); return; } for(const t of items){ const o=document.createElement('option'); o.value=t.id; o.textContent=`${t.name}${t.abbreviation?` (${t.abbreviation})`:''}`; select.append(o); } if(selectedId) select.value=selectedId; }
async function openBibleReference(){
  const id=$('#bible-translation').value; if(!id)return toast('Importe uma tradução primeiro.'); const t=await db.get('translations',id); try{ const rows=getPassage(t,$('#bible-reference').value); const result=$('#bible-result'); clear(result); for(const r of rows){ const line=document.createElement('div'); line.className='verse'; const n=document.createElement('span'); n.className='verse-num'; n.textContent=`${r.chapter}:${r.verse}`; const txt=document.createElement('span'); txt.textContent=r.text; line.append(n,txt); result.append(line); } result.dataset.copyText=rows.map(r=>`${r.chapter}:${r.verse} ${r.text}`).join('\n'); }catch(e){ toast(e.message); }
}

async function integrity(){
  const issues=[]; for(const store of ['sermons','studies','devotionals']){ const items=await db.getAll(store); const ids=new Set(); const files=new Set(); for(const e of items){ if(!e.id)issues.push(`${store}: item sem ID`); if(ids.has(e.id))issues.push(`${store}: ID duplicado ${e.id}`); ids.add(e.id); if(!e.fileName)issues.push(`${store}: ${e.id} sem fileName`); if(files.has(e.fileName))issues.push(`${store}: fileName duplicado ${e.fileName}`); files.add(e.fileName); } }
  setText($('#integrity-summary'),issues.length?`${issues.length} problema(s): ${issues.slice(0,3).join(' · ')}`:'Integridade local verificada: nenhuma inconsistência encontrada.'); return issues;
}
async function updateMirrorStatus(){ setText($('#mirror-status'),await mirror.isReady()?'Pasta vinculada e acessível.':'Nenhuma pasta autorizada neste momento.'); }

async function globalSearch(q){
  const box=$('#global-results'); clear(box); q=q.trim().toLowerCase(); if(q.length<2){box.classList.add('hidden');return;} const results=[]; for(const type of ['sermons','studies','devotionals']) for(const e of await db.getAll(type)) if(entitySearchText(e).includes(q)) results.push({type,e,title:type==='sermons'||type==='studies'?e.title:(e.passage||'Devocional')});
  if(!results.length){ const d=document.createElement('div'); d.className='search-result'; d.textContent='Nenhum resultado.'; box.append(d); } else for(const r of results.slice(0,12)){ const b=document.createElement('button'); b.className='search-result'; const strong=document.createElement('strong'); strong.textContent=r.title; const small=document.createElement('small'); small.textContent={sermons:'Sermão',studies:'Estudo',devotionals:'Devocional'}[r.type]; b.append(strong,small); b.addEventListener('click',()=>{box.classList.add('hidden');$('#global-search').value='';openEntity(r.type,r.e.id);}); box.append(b); } box.classList.remove('hidden');
}

async function renderAll(){ await Promise.all([renderDashboard(),renderSermons(),renderStudies(),renderDevotionals(),renderCalendar(),loadTranslations(),integrity(),updateMirrorStatus()]); }

function wireEvents(){
  $('#nav').addEventListener('click',async e=>{ const b=e.target.closest('[data-view]'); if(!b)return; await saveOpenEntity(); showView(b.dataset.view); if(b.dataset.view==='dashboard')renderDashboard(); if(b.dataset.view==='agenda')renderCalendar(); });
  $$('[data-back]').forEach(b=>b.addEventListener('click',async()=>{await saveOpenEntity();showView(b.dataset.back);await renderAll();}));
  $('#quick-new').addEventListener('click',()=>createEntity('sermons')); $('#new-sermon').addEventListener('click',()=>createEntity('sermons')); $('#new-study').addEventListener('click',()=>createEntity('studies')); $('#new-devotional').addEventListener('click',()=>createEntity('devotionals'));
  $('#sermon-filter').addEventListener('input',debounce(renderSermons,180)); $('#sermon-status-filter').addEventListener('change',renderSermons); $('#study-filter').addEventListener('input',debounce(renderStudies,180));
  for(const form of ['#sermon-form','#study-form','#devotional-form']){ $(form).addEventListener('input',scheduleSave); $(form).addEventListener('focusout',()=>setTimeout(()=>saveOpenEntity(),0)); }
  $('#points-editor').addEventListener('input',scheduleSave); $('#add-point').addEventListener('click',()=>{ const points=collectPoints(); points.push(newPoint(points.length+1)); renderPoints(points); scheduleSave(); });
  $('#sermon-delete').addEventListener('click',()=>deleteCurrent('sermons')); $('#study-delete').addEventListener('click',()=>deleteCurrent('studies')); $('#devotional-delete').addEventListener('click',()=>deleteCurrent('devotionals'));
  $('#sermon-history').addEventListener('click',()=>showHistory('sermons',state.sermon)); $('#study-history').addEventListener('click',()=>showHistory('studies',state.study)); $('#devotional-history').addEventListener('click',()=>showHistory('devotionals',state.devotional));
  $('#sermon-markdown').addEventListener('click',async()=>{await saveCurrent('sermons');mirror.download('sermons',state.sermon)}); $('#study-markdown').addEventListener('click',async()=>{await saveCurrent('studies');mirror.download('studies',state.study)}); $('#devotional-markdown').addEventListener('click',async()=>{await saveCurrent('devotionals');mirror.download('devotionals',state.devotional)});
  $('#sermon-print').addEventListener('click',async()=>{await saveCurrent('sermons');printSermon(state.sermon)}); $('#sermon-ai-prompt').addEventListener('click',async()=>{await saveCurrent('sermons');await navigator.clipboard.writeText(sermonPrompt(state.sermon));toast('Prompt copiado para a área de transferência.');}); $('#study-to-sermon').addEventListener('click',transformStudyToSermon);
  $('#calendar-prev').addEventListener('click',()=>{state.calendarDate=new Date(state.calendarDate.getFullYear(),state.calendarDate.getMonth()-1,1);renderCalendar()}); $('#calendar-next').addEventListener('click',()=>{state.calendarDate=new Date(state.calendarDate.getFullYear(),state.calendarDate.getMonth()+1,1);renderCalendar()}); $('#calendar-today').addEventListener('click',()=>{const n=new Date();state.calendarDate=new Date(n.getFullYear(),n.getMonth(),1);renderCalendar()});
  $('#bible-import').addEventListener('change',async e=>{ const file=e.target.files[0]; if(!file)return; try{const t=await parseTranslationFile(file);await db.put('translations',t);await loadTranslations(t.id);toast('Tradução importada localmente.');}catch(err){toast(err.message)} e.target.value='';}); $('#bible-open').addEventListener('click',openBibleReference); $('#bible-reference').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();openBibleReference();}}); $('#bible-copy').addEventListener('click',async()=>{const text=$('#bible-result').dataset.copyText||'';if(!text)return toast('Abra uma referência primeiro.');await navigator.clipboard.writeText(text);toast('Texto copiado.');}); $('#bible-delete-translation').addEventListener('click',async()=>{const id=$('#bible-translation').value;if(!id)return;if(confirm('Remover esta tradução do navegador?')){await db.delete('translations',id);clear($('#bible-result'));await loadTranslations();toast('Tradução removida.');}});
  $('#export-json').addEventListener('click',exportJson); $('#export-encrypted').addEventListener('click',async()=>{const p=prompt('Crie uma senha para o backup criptografado (mínimo 8 caracteres):');if(!p)return;try{await exportEncrypted(p);toast('Backup criptografado exportado.');}catch(e){toast(e.message)}}); $('#import-backup').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const data=await readBackupFile(file,async()=>prompt('Senha do backup criptografado:'));if(!confirm('A importação substituirá os dados locais atuais. Continuar?'))return;await restoreBackup(data);state.sermon=state.study=state.devotional=null;await renderAll();showView('dashboard');toast('Backup restaurado.');}catch(err){toast(err.message)}finally{e.target.value='';}});
  $('#choose-mirror').addEventListener('click',async()=>{try{await mirror.choose();await updateMirrorStatus();toast('Pasta de espelhamento vinculada.');}catch(e){toast(e.message)}}); $('#mirror-all').addEventListener('click',async()=>{try{const n=await mirror.syncAll();toast(`${n} arquivo(s) sincronizado(s).`);await updateMirrorStatus();}catch(e){toast(e.message)}}); $('#run-integrity').addEventListener('click',async()=>{const issues=await integrity();toast(issues.length?'Verificação concluída com alertas.':'Integridade confirmada.');});
  $('#settings-form').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget;const settings={theme:form.theme.value,readingSize:form.readingSize.value,compact:form.compact.checked,autoMirror:form.autoMirror.checked};for(const [key,value] of Object.entries(settings))await db.put('settings',{key,value});applySettings(settings);toast('Preferências salvas.');});
  $('#global-search').addEventListener('input',debounce(e=>globalSearch(e.target.value),150)); document.addEventListener('click',e=>{if(!e.target.closest('.global-search-wrap'))$('#global-results').classList.add('hidden');});
  $('#modal-close').addEventListener('click',()=>$('#modal').close()); $('#menu-btn').addEventListener('click',()=>$('.sidebar').classList.toggle('is-open'));
  window.addEventListener('online',updateConnection);window.addEventListener('offline',updateConnection); window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.deferredInstall=e;$('#install-btn').classList.remove('hidden')}); $('#install-btn').addEventListener('click',async()=>{if(!state.deferredInstall)return;state.deferredInstall.prompt();await state.deferredInstall.userChoice;state.deferredInstall=null;$('#install-btn').classList.add('hidden')});
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change',async()=>{const s=await getSettings();if((s.theme||'system')==='system')applySettings(s)});
}
async function saveOpenEntity(){ if(state.view==='sermon-editor')await saveCurrent('sermons'); if(state.view==='study-editor')await saveCurrent('studies'); if(state.view==='devotional-editor')await saveCurrent('devotionals'); }
function updateConnection(){ setText($('#connection-status'),navigator.onLine?'online · offline-ready':'offline · dados locais'); }

async function init(){
  await openDB(); wireEvents(); const settings=await getSettings(); applySettings(settings); const form=$('#settings-form'); form.theme.value=settings.theme||'system'; form.readingSize.value=settings.readingSize||'normal'; form.compact.checked=!!settings.compact; form.autoMirror.checked=!!settings.autoMirror; updateConnection(); await renderAll();
  const hash=location.hash.slice(1); if(['dashboard','sermons','studies','devotionals','agenda','bible','data','settings'].includes(hash))showView(hash); else showView('dashboard');
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(console.error);
}
init().catch(err=>{console.error(err);toast(`Falha ao iniciar: ${err.message}`)});
