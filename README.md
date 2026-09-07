# Pulpit Ultimate

**Pulpit Ultimate** é um workspace pastoral local-first para estudo bíblico, preparação de sermões,
devocionais, agenda de pregações, histórico de versões, exportação e backup.

A aplicação roda inteiramente no navegador. Nenhum conteúdo pastoral é enviado para servidor por
padrão e não há dependências JavaScript externas em runtime.

## Destaques

- PWA instalável e offline.
- Sermões estruturados com pontos, explicação, ilustração, aplicação e referências.
- Estudos bíblicos com observação, interpretação, teologia, conexão cristocêntrica e aplicação.
- Devocionais e agenda pastoral integrada.
- Autosave com histórico de revisões.
- Busca global e filtros por tags/status.
- Exportação Markdown e impressão/PDF nativa do navegador.
- Backup JSON e backup criptografado (`.pulpit`) com PBKDF2-SHA-256 + AES-256-GCM.
- Restauração de backup em transação atômica para evitar estado parcial em caso de falha.
- Espelhamento opcional em pasta local usando File System Access API.
- **NVI Online licenciada via YouVersion Platform**, sem redistribuir ou persistir o texto da NVI.
- Importação opcional de outras traduções bíblicas em JSON, desde que o usuário tenha direito de utilizá-las.
- Tema claro/escuro/sistema e opções de leitura.
- Sem CDN e sem backend obrigatório.
- Testes e verificação sintática automatizados no GitHub Actions.
- Deploy estático automatizado para GitHub Pages.

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

- Chrome/Edge/Chromium: suporte completo, incluindo pasta de espelhamento e NVI Online inline.
- Firefox/Safari: recursos centrais funcionam; File System Access pode não estar disponível e o app
  oferece download Markdown como fallback. A leitura externa no YouVersion permanece disponível.

## Origem e licença

Esta versão é uma revisão substancial do projeto GPLv3 `genilsonf/pulpit`. A atribuição e as notas
sobre as modificações estão em `NOTICE.md`.

GNU GPL v3. Consulte `LICENSE` e `NOTICE.md`.
