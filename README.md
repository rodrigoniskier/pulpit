# Pulpit Ultimate

**Pulpit Ultimate** é um workspace pastoral local-first para preparação exegética, construção de sermões,
estudos bíblicos para ensino, devocionais, agenda de pregações, histórico de versões, apresentação e backup.

A aplicação roda inteiramente no navegador. Nenhum conteúdo pastoral é enviado para servidor por
padrão e não há dependências JavaScript externas em runtime.

## Destaques

- PWA instalável e offline.
- **Dois fluxos de estudo diferentes:** `Preparação do texto`, voltada ao contato exegético prévio ao sermão, e `Estudos para ensino/grupos`, voltada a EBD, células, pequenos grupos e aulas.
- Preparação do texto baseada no fluxo do projeto original, com diagramação, palavras-chave, termos relacionados, referências cruzadas, doutrinas, resumo, insights/dúvidas, FCD, relevância, ICT, tese, propósito e tema.
- Campos adicionais mudam conforme o gênero literário: narrativo, Evangelho, epistolar, poético, sabedoria, profético ou apocalíptico.
- Seletor visual de passagem com livro, capítulo e versículos, disponível nos sermões, estudos, devocionais e leitor bíblico.
- Sermões estruturados com pontos, explicação, ilustração, aplicação e referências.
- **Modo de púlpito/apresentação em tela cheia** para usar o sermão diretamente no tablet ou computador, com navegação por teclado e ajuste do tamanho da fonte.
- Impressão/PDF com tamanho de fonte configurável, incluindo **22 pt** como opção padrão para leitura no púlpito.
- Marcações nativas de texto em amarelo, azul, verde e rosa, preservadas na impressão/PDF e na apresentação.
- Devocionais e agenda pastoral integrada.
- Autosave com histórico de revisões.
- Busca global e filtros por tags/status.
- Exportação Markdown.
- Backup JSON e backup criptografado (`.pulpit`) com PBKDF2-SHA-256 + AES-256-GCM.
- Restauração de backup em transação atômica para evitar estado parcial em caso de falha.
- Backups antigos permanecem compatíveis mesmo antes da criação da coleção de preparações.
- Espelhamento opcional em pasta local usando File System Access API, incluindo uma pasta própria para `Preparacao-do-Texto`.
- **NVI Online licenciada via YouVersion Platform**, sem redistribuir ou persistir o texto da NVI.
- Importação opcional de outras traduções bíblicas em JSON, desde que o usuário tenha direito de utilizá-las.
- Barra lateral recolhível no desktop e gaveta móvel no celular.
- Tema claro/escuro/sistema, contraste revisado e opções de tamanho de leitura.
- Sem CDN e sem backend obrigatório.
- Testes e verificação sintática automatizados no GitHub Actions.
- Deploy estático automatizado para GitHub Pages.

## Preparação do texto x Estudos para ensino/grupos

### Preparação do texto

É o espaço para conhecer profundamente a passagem **antes de construir o sermão**. O formulário conduz o usuário por três movimentos: olhar atentamente para o texto; conectar e compreender; chegar à mensagem do texto. Os campos especializados aparecem de acordo com o gênero literário selecionado. Ao final, a preparação pode gerar um novo sermão já preenchido com parte das informações estudadas.

### Estudos para ensino/grupos

Mantém o fluxo de observação, interpretação, teologia/conexões canônicas, conexão cristocêntrica e aplicação. É pensado para materiais que serão efetivamente ministrados em EBD, células, pequenos grupos, classes ou outros encontros de ensino bíblico.

## Seletor de passagem

Os campos bíblicos voltaram a oferecer uma janela de seleção. O usuário escolhe livro, capítulo inicial, versículo inicial, capítulo final e versículo final. A estrutura contém os 66 livros e a quantidade real de versículos de cada capítulo, restaurando a experiência existente no projeto original sem voltar a embutir uma tradução bíblica protegida.

## Apresentação e PDF de sermão

No editor de sermões há um modo de uso voltado ao momento da pregação:

- escolha do tamanho de fonte para PDF/impressão, com 22 pt selecionado por padrão;
- realce de trechos em quatro cores;
- preservação dessas marcações na saída de impressão/PDF;
- modo `Apresentar sermão` em tela cheia;
- divisão automática em slides a partir da introdução, contexto, pontos, ilustrações, aplicações e conclusão;
- navegação por setas, espaço e Page Up/Page Down;
- ajuste do tamanho da fonte durante a apresentação.

## Privacidade e segurança

Os dados ficam no IndexedDB do navegador. Conteúdo do usuário é renderizado com `textContent` /
valores de formulário e não é injetado diretamente em `innerHTML`. Os trechos que precisam gerar
HTML para impressão escapam os valores fornecidos pelo usuário. Backups importados passam por
validação de estrutura e limites de tamanho. Chaves de criptografia são derivadas da senha do
usuário e nunca são persistidas.

A YouVersion App Key, quando configurada para leitura NVI dentro do Pulpit, é guardada em um
object store separado (`secrets`) e **não é incluída em backups ou exportações**. Requisições NVI
passam pelo service worker apenas como proxy local para preservar a CSP; a resposta é marcada
`no-store` e não entra no cache offline do Pulpit.

> Importante: dados locais podem ser apagados ao limpar dados do navegador. Use o backup e/ou o
> espelhamento Markdown regularmente.

## Bíblia, NVI e direitos autorais

O repositório **não inclui uma tradução bíblica integral**.

### NVI Online — YouVersion

A NVI brasileira pode ser acessada pelo módulo Bíblia por meio da **YouVersion Platform**, uma
fonte oficial/licenciada. Há dois modos:

1. **Abrir no YouVersion** — funciona imediatamente e abre a passagem na NVI hospedada pelo
   YouVersion/Biblica.
2. **Ler NVI aqui** — usa a API oficial da YouVersion para exibir o texto dentro do Pulpit. Para
   isso, configure uma YouVersion App Key associada ao seu aplicativo e aceite a licença aplicável
   à NVI no YouVersion Platform.

O Pulpit exibe a atribuição/copyright devolvida pela própria API junto ao texto. A App Key não é
commitada no repositório e não é enviada nos backups.

### Traduções locais

Também é possível importar um arquivo JSON que você tenha direito de utilizar (domínio público,
licença compatível ou uso pessoal autorizado). O formato está documentado em
`docs/bible-import-format.json`.

## Executar localmente

Como há service worker e módulos ES, sirva a pasta por HTTP(S). Por exemplo:

```bash
python3 -m http.server 8080
```

Abra `http://localhost:8080`.

## Testes

```bash
npm test
npm run check
```

Não há dependências npm de runtime.

## GitHub Pages

O workflow `.github/workflows/pages.yml` publica o site quando há `push` no branch `main` e também
pode ser executado manualmente por `workflow_dispatch`. Nas configurações do repositório, o GitHub
Pages deve usar **GitHub Actions** como fonte de publicação.

## Compatibilidade

- Chrome/Edge/Chromium: suporte completo, incluindo pasta de espelhamento, NVI Online inline e modo de apresentação em tela cheia.
- Firefox/Safari: recursos centrais funcionam; File System Access pode não estar disponível e o app
  oferece download Markdown como fallback. A leitura externa no YouVersion permanece disponível.

## Desenvolvimento e origem

**Desenvolvido por Genilson Felinto e Rodrigo Niskier.**

Pulpit Ultimate é uma revisão substancial do projeto GPLv3 original [`genilsonf/pulpit`](https://github.com/genilsonf/pulpit). A atribuição e as notas sobre as modificações estão em `NOTICE.md`.

GNU GPL v3. Consulte `LICENSE` e `NOTICE.md`.
