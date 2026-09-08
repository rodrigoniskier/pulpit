import {db,openDB} from './db.js';
import {newPreparation,newSermon,newPoint,sanitizeEntity} from './schema.js';
import {nowISO,normalizeTags,tagsToInput,escapeHtml} from './utils.js';
import {BibleSelector} from './bible-selector.js';
import {FileMirror} from './mirror.js';

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
let currentPreparation=null;
let prepSaveTimer=null;
let lastMarkTarget=null;
const mirror=new FileMirror();

const GENRE_FIELDS={
  Narrativo:['characters','setting','plotConflict','turningPoint'],
  Evangelho:['characters','setting','gospelContext','christologicalFocus'],
  Epistolar:['churchContext','epistlePurpose','occasion','argumentFlow'],
  Poético:['poeticStructure','imagery','parallelism','emotion'],
  Sabedoria:['wisdomQuestion','wisdomPrinciple','contrasts','practicalWisdom'],
  Profético:['propheticContext','covenantIssue','oracleStructure','fulfillment'],
  Apocalíptico:['symbols','visions','historicalContext','hopeMessage']
};

function toast(message){
  const region=$('#toast-region'); if(!region)return;
  const el=document.createElement('div'); el.className='toast'; el.textContent=message; region.append(el); setTimeout(()=>el.remove(),3500);
}
function showFeatureView(name){
  $$('.view').forEach(v=>v.classList.toggle('is-visible',v.id===`view-${name}`));
  $$('.nav-item').forEach(b=>b.classList.toggle('is-active',b.dataset.view===name||((name==='preparation-editor')&&b.dataset.view==='preparations')));
  location.hash=name;
  $('#main')?.focus({preventScroll:true});
  if(innerWidth<980) $('.sidebar')?.classList.remove('is-open');
}
function fillForm(form,entity){
  for(const [key,value] of Object.entries(entity)){
    const input=form.elements.namedItem(key); if(!input)continue;
    input.value=key==='tags'?tagsToInput(value):(value??'');
  }
}
function collectPreparation(){
  const form=$('#preparation-form');
  const data=Object.fromEntries(new FormData(form));
  data.id=currentPreparation.id; data.createdAt=currentPreparation.createdAt; data.fileName=currentPreparation.fileName;
  data.updatedAt=nowISO(); data.tags=normalizeTags(data.tags);
  return sanitizeEntity('preparations',data);
}
async function savePreparation(){
  if(!currentPreparation)return;
  try{
    const next=collectPreparation();
    await db.put('preparations',next);
    const autoMirror=(await db.get('settings','autoMirror'))?.value;
    if(autoMirror) await mirror.write('preparations',next).catch(console.error);
    currentPreparation=next;
    $('#prep-save-status').textContent=`Salvo às ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`;
    await renderPreparations();
    await updatePreparationDashboard();
  }catch(error){ console.error(error); $('#prep-save-status').textContent='Erro ao salvar'; toast(error.message); }
}
function schedulePreparationSave(){
  $('#prep-save-status').textContent='Salvando…';
  clearTimeout(prepSaveTimer); prepSaveTimer=setTimeout(savePreparation,500);
}
function updateGenreFields(){
  const genre=$('#preparation-form')?.elements.namedItem('genre')?.value||'';
  $$('.genre-fields').forEach(group=>group.classList.toggle('hidden',!String(group.dataset.genre||'').split('|').includes(genre)));
}
async function renderPreparations(){
  const list=$('#preparation-list'); if(!list)return;
  const q=($('#preparation-filter')?.value||'').trim().toLowerCase();
  let rows=await db.getAll('preparations');
  rows.sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
  if(q) rows=rows.filter(r=>JSON.stringify(r).toLowerCase().includes(q));
  list.replaceChildren();
  if(!rows.length){ const e=document.createElement('div');e.className='empty-state';e.textContent='Nenhum estudo preparatório registrado.';list.append(e);return; }
  for(const row of rows){
    const card=document.createElement('article'); card.className='entity-card';
    const main=document.createElement('div'); main.className='entity-main';
    const h=document.createElement('h3'); h.textContent=row.title||row.theme||row.passage||'Estudo preparatório';
    const meta=document.createElement('div');meta.className='entity-meta';
    for(const value of [row.passage,row.genre,row.theme].filter(Boolean)){const s=document.createElement('span');s.textContent=value;meta.append(s);}
    main.append(h,meta);
    const b=document.createElement('button');b.className='secondary';b.textContent='Abrir';b.addEventListener('click',()=>openPreparation(row.id));
    card.append(main,b);card.addEventListener('dblclick',()=>openPreparation(row.id));list.append(card);
  }
}
async function openPreparation(id){
  const row=await db.get('preparations',id); if(!row)return;
  currentPreparation=row; fillForm($('#preparation-form'),row); updateGenreFields(); showFeatureView('preparation-editor');
}
async function createPreparation(){
  const row=newPreparation(); await db.put('preparations',row); await renderPreparations(); await openPreparation(row.id); await updatePreparationDashboard();
}
async function deletePreparation(){
  if(!currentPreparation||!confirm('Excluir definitivamente este estudo preparatório?'))return;
  await mirror.remove('preparations',currentPreparation).catch(()=>false); await db.delete('preparations',currentPreparation.id); currentPreparation=null; showFeatureView('preparations'); await renderPreparations(); await updatePreparationDashboard(); toast('Estudo preparatório excluído.');
}
function appendSection(parts,label,value){ if(value?.trim())parts.push(`${label}:\n${value.trim()}`); }
async function preparationToSermon(){
  await savePreparation(); const p=currentPreparation; if(!p)return;
  const sermon=newSermon();
  sermon.title=p.theme||p.title||p.passage||'Novo sermão';
  sermon.passage=p.passage;
  sermon.theme=p.theme;
  sermon.thesis=p.thesis||p.centralIdea;
  sermon.objective=p.specificPurposes;
  sermon.fallenCondition=p.fallenCondition;
  sermon.christCenter=p.christConnection||p.christologicalFocus;
  sermon.tags=p.tags;
  const context=[];
  appendSection(context,'Gênero literário',p.genre);
  appendSection(context,'Diagramação / estrutura',p.structure);
  appendSection(context,'Resumo',p.summary);
  appendSection(context,'Palavras-chave',p.keywords);
  appendSection(context,'Termos relacionados',p.relatedTerms);
  appendSection(context,'Referências cruzadas',p.crossReferences);
  appendSection(context,'Doutrinas relacionadas',p.doctrines);
  for(const field of GENRE_FIELDS[p.genre]||[]) appendSection(context,fieldLabel(field),p[field]);
  appendSection(context,'Insights e dúvidas',p.insights);
  appendSection(context,'Relevância',p.relevance);
  sermon.context=context.join('\n\n');
  sermon.points=[{...newPoint(1),title:p.centralIdea||p.thesis||'Desenvolvimento principal',explanation:p.summary||p.structure,application:p.specificPurposes,references:p.crossReferences||p.passage}];
  sermon.updatedAt=nowISO();
  await db.put('sermons',sermon);
  toast('Sermão criado a partir do estudo preparatório.');
  location.hash='sermons';
  location.reload();
}
function fieldLabel(field){
  return ({
    characters:'Personagens',setting:'Cenário',plotConflict:'Conflito e desenvolvimento',turningPoint:'Ponto de virada',
    gospelContext:'Contexto no Evangelho',christologicalFocus:'Ênfase cristológica',churchContext:'Contexto da igreja',
    epistlePurpose:'Propósito da epístola',occasion:'Ocasião / problema que motivou a carta',argumentFlow:'Fluxo do argumento',
    poeticStructure:'Estrutura poética',imagery:'Imagens e figuras',parallelism:'Paralelismos',emotion:'Movimento emocional',
    wisdomQuestion:'Questão de sabedoria',wisdomPrinciple:'Princípio de sabedoria',contrasts:'Contrastes',practicalWisdom:'Sabedoria prática',
    propheticContext:'Contexto profético',covenantIssue:'Questão de aliança',oracleStructure:'Estrutura do oráculo',fulfillment:'Cumprimento / horizonte',
    symbols:'Símbolos',visions:'Visões',historicalContext:'Contexto histórico',hopeMessage:'Mensagem de esperança'
  })[field]||field;
}

function setupSidebar(){
  const button=$('#sidebar-collapse');
  if(button){
    const apply=collapsed=>document.body.classList.toggle('sidebar-collapsed',collapsed);
    apply(localStorage.getItem('pulpit-sidebar-collapsed')==='1');
    button.addEventListener('click',()=>{
      const collapsed=!document.body.classList.contains('sidebar-collapsed');apply(collapsed);
      localStorage.setItem('pulpit-sidebar-collapsed',collapsed?'1':'0');
      button.setAttribute('aria-label',collapsed?'Expandir barra lateral':'Recolher barra lateral');
    });
  }
  const backdrop=$('#sidebar-backdrop');
  $('#menu-btn')?.addEventListener('click',()=>backdrop?.classList.add('is-visible'));
  backdrop?.addEventListener('click',()=>{$('.sidebar')?.classList.remove('is-open');backdrop.classList.remove('is-visible');});
  $('#nav')?.addEventListener('click',()=>backdrop?.classList.remove('is-visible'));
}

function setupMarking(){
  document.addEventListener('focusin',e=>{
    if(e.target.matches?.('#sermon-form textarea,#points-editor textarea')) lastMarkTarget=e.target;
  });
  $('#sermon-mark-toolbar')?.addEventListener('click',e=>{
    const b=e.target.closest('[data-mark]'); if(!b)return;
    if(!lastMarkTarget){toast('Clique primeiro no campo e selecione o trecho que deseja marcar.');return;}
    const start=lastMarkTarget.selectionStart,end=lastMarkTarget.selectionEnd;
    if(start===end){toast('Selecione um trecho do texto antes de aplicar a cor.');return;}
    const color=b.dataset.mark, value=lastMarkTarget.value, selected=value.slice(start,end);
    const replacement=color==='clear'?selected.replace(/\[\[\/?(?:yellow|blue|green|pink)\]\]/g,''):`[[${color}]]${selected}[[/${color}]]`;
    lastMarkTarget.setRangeText(replacement,start,end,'end');
    lastMarkTarget.dispatchEvent(new Event('input',{bubbles:true}));
    lastMarkTarget.focus();
  });
}
function renderMarkup(text){
  let html=escapeHtml(text||'').replace(/\n/g,'<br>');
  for(const color of ['yellow','blue','green','pink']){
    const re=new RegExp(`\\[\\[${color}\\]\\]([\\s\\S]*?)\\[\\[\\/${color}\\]\\]`,'g');
    html=html.replace(re,`<mark class="mark-${color}">$1</mark>`);
  }
  return html;
}
function sermonFromForm(){
  const form=$('#sermon-form'); if(!form)return null;
  const data=Object.fromEntries(new FormData(form));
  data.points=$$('#points-editor .point-card').map(card=>({
    title:card.querySelector('[data-field="title"]')?.value||'',
    explanation:card.querySelector('[data-field="explanation"]')?.value||'',
    illustration:card.querySelector('[data-field="illustration"]')?.value||'',
    application:card.querySelector('[data-field="application"]')?.value||'',
    references:card.querySelector('[data-field="references"]')?.value||''
  }));
  return data;
}
function printSermonForPulpit(){
  const s=sermonFromForm(); if(!s)return;
  const size=Number($('#sermon-print-size')?.value||22);
  const win=window.open('','_blank'); if(!win){toast('Permita pop-ups para gerar o PDF.');return;} win.opener=null;
  const sec=(title,value)=>value?`<section><h2>${escapeHtml(title)}</h2><div>${renderMarkup(value)}</div></section>`:'';
  const points=(s.points||[]).map((p,i)=>`<section class="point"><h2>${i+1}. ${renderMarkup(p.title)}</h2>${sec('Explicação',p.explanation)}${sec('Ilustração',p.illustration)}${sec('Aplicação',p.application)}${p.references?`<p class="refs"><strong>Referências:</strong> ${renderMarkup(p.references)}</p>`:''}</section>`).join('');
  win.document.write(`<!doctype html><meta charset="utf-8"><title>${escapeHtml(s.title||'Sermão')}</title><style>@page{margin:14mm}body{font-family:Georgia,serif;font-size:${size}pt;line-height:1.45;color:#111;margin:0}h1{font-size:1.55em;line-height:1.15}h2{font-size:1.08em;margin:1.2em 0 .45em;border-bottom:1px solid #ccc;padding-bottom:.15em}section section h2{font-size:.82em;border:0;margin:.8em 0 .2em}.meta{font-size:.72em;color:#444}.refs{font-size:.72em}.mark-yellow{background:#fff08a}.mark-blue{background:#bde5ff}.mark-green{background:#c9f2cc}.mark-pink{background:#ffd1e6}mark{padding:0 .08em;border-radius:.08em}</style><h1>${renderMarkup(s.title)}</h1><p class="meta"><strong>Texto:</strong> ${renderMarkup(s.passage)}${s.theme?` · <strong>Tema:</strong> ${renderMarkup(s.theme)}`:''}</p>${sec('Proposição / ideia central',s.thesis)}${sec('Objetivo pastoral',s.objective)}${sec('Condição humana / tensão do texto',s.fallenCondition)}${sec('Centro cristocêntrico / redenção',s.christCenter)}${sec('Introdução',s.introduction)}${sec('Elucidação e contexto',s.context)}${points}${sec('Conclusão',s.conclusion)}`);
  win.document.close();win.focus();setTimeout(()=>win.print(),220);
}
function buildSlides(s){
  const slides=[];
  slides.push({title:s.title||'Sermão',body:[s.passage,s.theme].filter(Boolean).join('\n')});
  if(s.introduction)slides.push({title:'Introdução',body:s.introduction});
  if(s.context)slides.push({title:'Elucidação e contexto',body:s.context});
  (s.points||[]).forEach((p,i)=>{
    slides.push({title:`${i+1}. ${p.title||`Ponto ${i+1}`}`,body:p.explanation||''});
    if(p.illustration)slides.push({title:`${i+1}. Ilustração`,body:p.illustration});
    if(p.application)slides.push({title:`${i+1}. Aplicação`,body:p.application});
  });
  if(s.conclusion)slides.push({title:'Conclusão',body:s.conclusion});
  return slides;
}
function startPresentation(){
  const s=sermonFromForm(); if(!s)return;
  const slides=buildSlides(s); if(!slides.length)return;
  const overlay=$('#sermon-presentation'); let index=0;
  const render=()=>{
    $('#presentation-title').innerHTML=renderMarkup(slides[index].title);
    $('#presentation-body').innerHTML=renderMarkup(slides[index].body);
    $('#presentation-counter').textContent=`${index+1} / ${slides.length}`;
    $('#presentation-prev').disabled=index===0; $('#presentation-next').disabled=index===slides.length-1;
  };
  const next=()=>{if(index<slides.length-1){index++;render();}};
  const prev=()=>{if(index>0){index--;render();}};
  overlay.classList.remove('hidden');document.body.classList.add('presentation-open');render();
  const key=e=>{if(e.key==='ArrowRight'||e.key===' '||e.key==='PageDown'){e.preventDefault();next();}if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();prev();}if(e.key==='Escape')close();};
  const close=()=>{overlay.classList.add('hidden');document.body.classList.remove('presentation-open');document.removeEventListener('keydown',key);if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});};
  document.addEventListener('keydown',key);
  $('#presentation-next').onclick=next;$('#presentation-prev').onclick=prev;$('#presentation-close').onclick=close;
  $('#presentation-font').oninput=e=>overlay.style.setProperty('--presentation-size',`${e.target.value}px`);
  overlay.requestFullscreen?.().catch(()=>{});
}
function setupSermonDelivery(){
  const oldPrint=$('#sermon-print');
  oldPrint?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();printSermonForPulpit();},true);
  $('#sermon-present')?.addEventListener('click',startPresentation);
}

function setupPreparation(){
  $('#new-preparation')?.addEventListener('click',createPreparation);
  $('#preparation-filter')?.addEventListener('input',()=>renderPreparations());
  $('#preparation-back')?.addEventListener('click',async()=>{await savePreparation();showFeatureView('preparations');await renderPreparations();});
  $('#preparation-delete')?.addEventListener('click',deletePreparation);
  $('#preparation-to-sermon')?.addEventListener('click',preparationToSermon);
  const form=$('#preparation-form');
  form?.addEventListener('input',schedulePreparationSave);
  form?.elements.namedItem('genre')?.addEventListener('change',()=>{updateGenreFields();schedulePreparationSave();});
}

function localDateValue(date=new Date()){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function setupAgendaScheduling(){
  const view=$('#view-agenda');
  if(!view||$('#agenda-schedule-panel'))return;
  const panel=document.createElement('section');
  panel.id='agenda-schedule-panel';
  panel.className='panel';
  panel.innerHTML=`
    <div class="panel-header">
      <div><h2>Agendar pregação</h2><p class="view-description">O agendamento cria um sermão em Rascunho na Biblioteca. Alterar ou remover a data no sermão atualiza automaticamente esta Agenda.</p></div>
    </div>
    <form id="agenda-schedule-form" class="editor-form" autocomplete="off">
      <div class="form-grid cols-2">
        <label>Título do sermão<input name="title" maxlength="180" required placeholder="Ex.: A graça que transforma"></label>
        <label>Data da pregação<input name="preachingDate" type="date" required></label>
        <label>Texto bíblico<div class="passage-field"><input id="agenda-passage" class="passage-picker" name="passage" maxlength="160" readonly placeholder="Clique para selecionar"><button type="button" class="secondary passage-button" data-passage-target="#agenda-passage">Selecionar</button></div></label>
        <label>Local<input name="location" maxlength="180" placeholder="Ex.: Igreja Presbiteriana Central"></label>
      </div>
      <div class="toolbar-actions"><button type="submit" class="primary">Agendar e criar sermão</button></div>
    </form>`;
  const label=$('#calendar-label');
  if(label)view.insertBefore(panel,label);else view.append(panel);
  const form=$('#agenda-schedule-form');
  form.elements.namedItem('preachingDate').value=localDateValue();
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const data=Object.fromEntries(new FormData(form));
    const sermon=sanitizeEntity('sermons',{
      ...newSermon(),
      title:String(data.title||'').trim(),
      passage:String(data.passage||'').trim(),
      preachingDate:String(data.preachingDate||''),
      location:String(data.location||'').trim(),
      status:'Rascunho',
      updatedAt:nowISO()
    });
    if(!sermon.title||!sermon.preachingDate){toast('Informe o título e a data da pregação.');return;}
    try{
      await db.put('sermons',sermon);
      const autoMirror=(await db.get('settings','autoMirror'))?.value;
      if(autoMirror)await mirror.write('sermons',sermon).catch(console.error);
      toast('Pregação agendada e sermão criado na Biblioteca.');
      location.hash='sermons';
      location.reload();
    }catch(error){console.error(error);toast(error.message||'Não foi possível agendar a pregação.');}
  });
}

async function updatePreparationDashboard(){
  const grid=$('#stats-grid'); if(!grid)return;
  const existing=grid.querySelector('[data-prep-stat]'); if(existing)existing.remove();
  const rows=await db.getAll('preparations');
  const card=document.createElement('article');card.className='stat-card';card.dataset.prepStat='1';
  const strong=document.createElement('strong');strong.textContent=rows.length;
  const span=document.createElement('span');span.textContent='Preparações de texto';card.append(strong,span);grid.append(card);
}

function setupPreparationSearch(){
  let timer;
  $('#global-search')?.addEventListener('input',e=>{
    clearTimeout(timer);
    const q=e.target.value.trim().toLowerCase();
    if(q.length<2)return;
    timer=setTimeout(async()=>{
      const box=$('#global-results'); if(!box)return;
      const rows=(await db.getAll('preparations')).filter(r=>JSON.stringify(r).toLowerCase().includes(q)).slice(0,4);
      for(const row of rows){
        if(box.querySelector(`[data-prep-result="${CSS.escape(row.id)}"]`))continue;
        const b=document.createElement('button');b.className='search-result';b.dataset.prepResult=row.id;
        const strong=document.createElement('strong');strong.textContent=row.title||row.theme||row.passage||'Preparação do texto';
        const small=document.createElement('small');small.textContent='Preparação do texto';
        b.append(strong,small);b.addEventListener('click',()=>{box.classList.add('hidden');$('#global-search').value='';openPreparation(row.id);});
        box.append(b);
      }
      if(rows.length)box.classList.remove('hidden');
    },230);
  });
}

function watchDashboard(){
  const grid=$('#stats-grid'); if(!grid)return;
  const observer=new MutationObserver(()=>{if(!grid.querySelector('[data-prep-stat]'))setTimeout(updatePreparationDashboard,0);});
  observer.observe(grid,{childList:true});
}

async function init(){
  await openDB();
  new BibleSelector().init();
  setupSidebar();setupPreparation();setupAgendaScheduling();setupMarking();setupSermonDelivery();setupPreparationSearch();watchDashboard();
  await renderPreparations();
  setTimeout(updatePreparationDashboard,150);
  const hash=location.hash.slice(1);
  if(hash==='preparations')showFeatureView('preparations');
  if(hash==='preparation-editor')showFeatureView('preparations');
}
init().catch(error=>{console.error(error);toast(`Falha nas melhorias: ${error.message}`);});