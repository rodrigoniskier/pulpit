import {normalizeString} from './utils.js';
const line=v=>normalizeString(v).trim();
const section=(title,text)=>line(text)?`\n## ${title}\n\n${line(text)}\n`:'';
export function sermonToMarkdown(s){
  let md=`# ${line(s.title)||'Sem título'}\n\n**Texto:** ${line(s.passage)||'—'}  \n**Tema:** ${line(s.theme)||'—'}  \n**Status:** ${line(s.status)||'—'}  \n**Data:** ${line(s.preachingDate)||'—'}  \n**Local:** ${line(s.location)||'—'}  \n**Tags:** ${(s.tags||[]).join(', ')||'—'}\n`;
  md+=section('Proposição / ideia central',s.thesis)+section('Objetivo pastoral',s.objective)+section('Condição humana / tensão do texto',s.fallenCondition)+section('Centro cristocêntrico / redenção',s.christCenter)+section('Introdução',s.introduction)+section('Elucidação e contexto',s.context);
  for(const [i,p] of (s.points||[]).entries()){
    md+=`\n## ${i+1}. ${line(p.title)||`Ponto ${i+1}`}\n`+section('Explicação',p.explanation)+section('Ilustração',p.illustration)+section('Aplicação',p.application)+section('Referências',p.references);
  }
  return md+section('Conclusão',s.conclusion)+section('Notas privadas',s.notes)+`\n---\nAtualizado: ${s.updatedAt||''}\n`;
}
export function studyToMarkdown(s){ return `# ${line(s.title)||'Estudo bíblico'}\n\n**Passagem:** ${line(s.passage)||'—'}  \n**Tags:** ${(s.tags||[]).join(', ')||'—'}\n`+section('Observação',s.observation)+section('Interpretação',s.interpretation)+section('Teologia e conexões canônicas',s.theology)+section('Conexão cristocêntrica',s.christConnection)+section('Aplicações',s.application)+section('Notas e fontes',s.notes); }
export function devotionalToMarkdown(d){ return `# Devocional — ${line(d.passage)||'Sem passagem'}\n\n**Data:** ${line(d.date)||'—'}  \n**Tags:** ${(d.tags||[]).join(', ')||'—'}\n`+section('Lição do texto',d.lesson)+section('Aplicação pessoal',d.application)+section('Oração',d.prayer); }
export function entityToMarkdown(type,e){ if(type==='sermons') return sermonToMarkdown(e); if(type==='studies') return studyToMarkdown(e); if(type==='devotionals') return devotionalToMarkdown(e); throw new Error('Tipo inválido.'); }
