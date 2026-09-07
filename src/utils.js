export const APP_VERSION = '2.1.0';

export function uid(prefix='id') {
  const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${id}`;
}

export function nowISO(){ return new Date().toISOString(); }
export function todayISO(){ return new Date().toISOString().slice(0,10); }
export function deepClone(value){ return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value)); }

export function normalizeString(value, max=50000){
  if (value == null) return '';
  return String(value).replace(/\u0000/g,'').slice(0,max);
}

export function normalizeTags(value){
  const raw = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(raw.map(v=>normalizeString(v,60).trim().toLowerCase()).filter(Boolean))].slice(0,30);
}

export function tagsToInput(tags){ return Array.isArray(tags) ? tags.join(', ') : ''; }

export function slugify(value){
  return normalizeString(value,180).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80) || 'sem-titulo';
}

export function escapeHtml(value){
  return normalizeString(value).replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
}

export function formatDate(value, fallback='Sem data'){
  if(!value) return fallback;
  const [y,m,d] = String(value).slice(0,10).split('-').map(Number);
  if(!y||!m||!d) return fallback;
  return new Intl.DateTimeFormat('pt-BR',{dateStyle:'medium'}).format(new Date(y,m-1,d));
}

export function formatDateTime(value){
  if(!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(d);
}

export function debounce(fn, wait=700){
  let timer;
  return (...args)=>{ clearTimeout(timer); timer=setTimeout(()=>fn(...args),wait); };
}

export function downloadBlob(content, filename, type='text/plain;charset=utf-8'){
  const blob = content instanceof Blob ? content : new Blob([content],{type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export function safeJsonParse(text){
  try { return {ok:true,value:JSON.parse(text)}; } catch(error){ return {ok:false,error}; }
}

export function entitySearchText(entity){
  const parts=[];
  const walk=v=>{ if(typeof v==='string') parts.push(v); else if(Array.isArray(v)) v.forEach(walk); else if(v&&typeof v==='object') Object.values(v).forEach(walk); };
  walk(entity); return parts.join(' ').toLocaleLowerCase('pt-BR');
}

export function stableHash(value){
  const text = JSON.stringify(value);
  let h=2166136261;
  for(let i=0;i<text.length;i++){ h^=text.charCodeAt(i); h=Math.imul(h,16777619); }
  return (h>>>0).toString(16);
}
