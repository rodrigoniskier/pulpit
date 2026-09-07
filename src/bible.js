import {sanitizeTranslation} from './schema.js';

const aliases={jo:'João',joao:'João',john:'João',sl:'Salmos',salmo:'Salmos',salmos:'Salmos',rm:'Romanos',rom:'Romanos',gn:'Gênesis',gen:'Gênesis',mt:'Mateus',mc:'Marcos',lc:'Lucas',atos:'Atos',at:'Atos',ef:'Efésios',fp:'Filipenses',cl:'Colossenses',hb:'Hebreus',tg:'Tiago',ap:'Apocalipse'};
const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function parseReference(text){
  const m=String(text||'').trim().match(/^(.+?)\s+(\d+)(?::(\d+))?(?:-(?:(\d+):)?(\d+))?$/);
  if(!m) return null;
  let book=m[1].trim(); const alias=aliases[fold(book)]; if(alias) book=alias;
  const chapter=Number(m[2]); const verseStart=m[3]?Number(m[3]):null; const endChapter=m[4]?Number(m[4]):chapter; const verseEnd=m[5]?Number(m[5]):verseStart;
  if(!chapter||chapter<1||endChapter<chapter) return null;
  return {book,chapter,verseStart,endChapter,verseEnd};
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
