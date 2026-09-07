import {uid,nowISO,todayISO,normalizeString,normalizeTags} from './utils.js';

const stringFields={
  sermons:['title','passage','status','preachingDate','theme','location','thesis','objective','fallenCondition','christCenter','introduction','context','conclusion','notes','fileName','createdAt','updatedAt'],
  studies:['title','passage','observation','interpretation','theology','christConnection','application','notes','fileName','createdAt','updatedAt'],
  preparations:['title','passage','genre','structure','keywords','relatedTerms','crossReferences','doctrines','summary','insights','fallenCondition','relevance','centralIdea','thesis','basicPurpose','specificPurposes','theme','christConnection','characters','setting','plotConflict','turningPoint','gospelContext','christologicalFocus','churchContext','epistlePurpose','occasion','argumentFlow','poeticStructure','imagery','parallelism','emotion','wisdomQuestion','wisdomPrinciple','contrasts','practicalWisdom','propheticContext','covenantIssue','oracleStructure','fulfillment','symbols','visions','historicalContext','hopeMessage','fileName','createdAt','updatedAt'],
  devotionals:['passage','date','lesson','application','prayer','fileName','createdAt','updatedAt']
};

export function newSermon(){ const id=uid('sermon'); return {id,title:'Novo sermão',passage:'',status:'Rascunho',preachingDate:'',theme:'',location:'',tags:[],thesis:'',objective:'',fallenCondition:'',christCenter:'',introduction:'',context:'',points:[newPoint(1)],conclusion:'',notes:'',fileName:`${id}.md`,createdAt:nowISO(),updatedAt:nowISO()}; }
export function newPoint(order=1){ return {id:uid('point'),order,title:`Ponto ${order}`,explanation:'',illustration:'',application:'',references:''}; }
export function newStudy(){ const id=uid('study'); return {id,title:'Novo estudo',passage:'',tags:[],observation:'',interpretation:'',theology:'',christConnection:'',application:'',notes:'',fileName:`${id}.md`,createdAt:nowISO(),updatedAt:nowISO()}; }
export function newPreparation(){ const id=uid('preparation'); return {id,title:'Novo estudo preparatório',passage:'',genre:'',tags:[],structure:'',keywords:'',relatedTerms:'',crossReferences:'',doctrines:'',summary:'',insights:'',fallenCondition:'',relevance:'',centralIdea:'',thesis:'',basicPurpose:'',specificPurposes:'',theme:'',christConnection:'',characters:'',setting:'',plotConflict:'',turningPoint:'',gospelContext:'',christologicalFocus:'',churchContext:'',epistlePurpose:'',occasion:'',argumentFlow:'',poeticStructure:'',imagery:'',parallelism:'',emotion:'',wisdomQuestion:'',wisdomPrinciple:'',contrasts:'',practicalWisdom:'',propheticContext:'',covenantIssue:'',oracleStructure:'',fulfillment:'',symbols:'',visions:'',historicalContext:'',hopeMessage:'',fileName:`${id}.md`,createdAt:nowISO(),updatedAt:nowISO()}; }
export function newDevotional(){ const id=uid('devotional'); return {id,passage:'',date:todayISO(),tags:[],lesson:'',application:'',prayer:'',fileName:`${id}.md`,createdAt:nowISO(),updatedAt:nowISO()}; }

export function sanitizeEntity(type,input){
  if(!stringFields[type]) throw new Error('Tipo de entidade inválido.');
  const out={id:normalizeString(input.id,120)||uid(type.slice(0,-1)),tags:normalizeTags(input.tags)};
  for(const field of stringFields[type]) out[field]=normalizeString(input[field], field==='notes'?100000:50000);
  out.createdAt=out.createdAt||nowISO(); out.updatedAt=out.updatedAt||nowISO();
  if(type==='sermons'){
    out.status=['Rascunho','Em preparação','Pronto','Pregado'].includes(out.status)?out.status:'Rascunho';
    out.points=Array.isArray(input.points)?input.points.slice(0,20).map((p,i)=>({id:normalizeString(p?.id,120)||uid('point'),order:i+1,title:normalizeString(p?.title,500),explanation:normalizeString(p?.explanation,50000),illustration:normalizeString(p?.illustration,50000),application:normalizeString(p?.application,50000),references:normalizeString(p?.references,5000)})):[];
    if(!out.points.length) out.points=[newPoint(1)];
  }
  if(type==='preparations'){
    out.genre=['Narrativo','Evangelho','Epistolar','Poético','Sabedoria','Profético','Apocalíptico'].includes(out.genre)?out.genre:'';
    out.basicPurpose=['Evangelístico','Devocional','Missionário','Pastoral','Ético','Doutrinário'].includes(out.basicPurpose)?out.basicPurpose:'';
  }
  return out;
}

export function validateBackup(data){
  if(!data||typeof data!=='object') throw new Error('Backup inválido.');
  if(data.format!=='pulpit-backup') throw new Error('Formato de backup não reconhecido.');
  const collections={};
  for(const type of ['sermons','studies','preparations','devotionals']){
    const raw=data.data?.[type];
    if(type==='preparations'&&!Array.isArray(raw)){ collections[type]=[]; continue; }
    if(!Array.isArray(raw)) throw new Error(`Coleção ausente: ${type}.`);
    if(raw.length>10000) throw new Error(`Backup excede o limite em ${type}.`);
    collections[type]=raw.map(v=>sanitizeEntity(type,v));
  }
  collections.translations=Array.isArray(data.data?.translations)?data.data.translations.slice(0,20).map(sanitizeTranslation):[];
  const settings=data.data?.settings&&typeof data.data.settings==='object'?data.data.settings:{};
  return {collections,settings};
}

export function sanitizeTranslation(input){
  if(!input||typeof input!=='object'||!input.books||typeof input.books!=='object') throw new Error('Tradução bíblica inválida.');
  const out={id:normalizeString(input.id,120)||uid('translation'),name:normalizeString(input.name,160)||'Tradução importada',abbreviation:normalizeString(input.abbreviation,30),language:normalizeString(input.language,30),license:normalizeString(input.license,1000),books:{},createdAt:normalizeString(input.createdAt,40)||nowISO()};
  let verseCount=0;
  for(const [book,chapters] of Object.entries(input.books).slice(0,80)){
    if(!chapters||typeof chapters!=='object') continue;
    const safeBook=normalizeString(book,80); out.books[safeBook]={};
    for(const [chapter,verses] of Object.entries(chapters).slice(0,200)){
      if(!Array.isArray(verses)) continue;
      const safeVerses=verses.slice(0,300).map(v=>normalizeString(v,5000)); verseCount+=safeVerses.length;
      if(verseCount>50000) throw new Error('Tradução excede o limite de 50.000 versículos.');
      out.books[safeBook][String(Number(chapter)||chapter)]=safeVerses;
    }
  }
  return out;
}
