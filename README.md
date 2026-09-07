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
- Importação de traduções bíblicas em JSON, sem redistribuir textos protegidos.
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

> Importante: dados locais podem ser apagados ao limpar dados do navegador. Use o backup e/ou o
> espelhamento Markdown regularmente.

## Bíblia e direitos autorais

O repositório **não inclui uma tradução bíblica integral**. Para usar o módulo Bíblia, importe um
arquivo JSON que você tenha direito de utilizar (domínio público, licença compatível ou uso
pessoal autorizado). O formato está documentado em `docs/bible-import-format.json`.

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

- Chrome/Edge/Chromium: suporte completo, incluindo pasta de espelhamento.
- Firefox/Safari: recursos centrais funcionam; File System Access pode não estar disponível e o app
  oferece download Markdown como fallback.

## Origem e licença

Esta versão é uma revisão substancial do projeto GPLv3 `genilsonf/pulpit`. A atribuição e as notas
sobre as modificações estão em `NOTICE.md`.

GNU GPL v3. Consulte `LICENSE` e `NOTICE.md`.
