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
export function preparationToMarkdown(p){
  let md=`# ${line(p.title)||'Preparação do texto'}\n\n**Passagem:** ${line(p.passage)||'—'}  \n**Gênero:** ${line(p.genre)||'—'}  \n**Tema:** ${line(p.theme)||'—'}  \n**Tags:** ${(p.tags||[]).join(', ')||'—'}\n`;
  const fields=[
    ['Diagramação / estrutura',p.structure],['Palavras-chave',p.keywords],['Termos relacionados',p.relatedTerms],['Personagens',p.characters],['Cenário',p.setting],
    ['Conflito e desenvolvimento',p.plotConflict],['Ponto de virada',p.turningPoint],['Contexto no Evangelho',p.gospelContext],['Ênfase cristológica',p.christologicalFocus],
    ['Contexto da igreja',p.churchContext],['Propósito da epístola',p.epistlePurpose],['Ocasião',p.occasion],['Fluxo do argumento',p.argumentFlow],
    ['Estrutura poética',p.poeticStructure],['Imagens e figuras',p.imagery],['Paralelismos',p.parallelism],['Movimento emocional',p.emotion],
    ['Questão de sabedoria',p.wisdomQuestion],['Princípio de sabedoria',p.wisdomPrinciple],['Contrastes',p.contrasts],['Sabedoria prática',p.practicalWisdom],
    ['Contexto profético',p.propheticContext],['Questão de aliança',p.covenantIssue],['Estrutura do oráculo',p.oracleStructure],['Cumprimento / horizonte',p.fulfillment],
    ['Símbolos',p.symbols],['Visões',p.visions],['Contexto histórico',p.historicalContext],['Mensagem de esperança',p.hopeMessage],
    ['Referências cruzadas',p.crossReferences],['Doutrinas relacionadas',p.doctrines],['Conexão com Cristo',p.christConnection],['Resumo',p.summary],['Insights e dúvidas',p.insights],
    ['Foco da Condição Decaída (FCD)',p.fallenCondition],['Relevância',p.relevance],['ICT — Ideia Central do Texto',p.centralIdea],['Tese',p.thesis],
    ['Propósito básico',p.basicPurpose],['Propósitos específicos',p.specificPurposes]
  ];
  for(const [title,value] of fields) md+=section(title,value);
  return md+`\n---\nAtualizado: ${p.updatedAt||''}\n`;
}
export function devotionalToMarkdown(d){ return `# Devocional — ${line(d.passage)||'Sem passagem'}\n\n**Data:** ${line(d.date)||'—'}  \n**Tags:** ${(d.tags||[]).join(', ')||'—'}\n`+section('Lição do texto',d.lesson)+section('Aplicação pessoal',d.application)+section('Oração',d.prayer); }
export function entityToMarkdown(type,e){ if(type==='sermons') return sermonToMarkdown(e); if(type==='studies') return studyToMarkdown(e); if(type==='preparations') return preparationToMarkdown(e); if(type==='devotionals') return devotionalToMarkdown(e); throw new Error('Tipo inválido.'); }
