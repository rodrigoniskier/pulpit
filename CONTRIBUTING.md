# Contributing to Pulpit Ultimate

Obrigado por contribuir.

## Princípios do projeto

1. Preserve o modelo local-first e a privacidade por padrão.
2. Não introduza telemetria, backend obrigatório ou envio de conteúdo pastoral sem uma decisão explícita e documentada.
3. Não inclua traduções bíblicas ou outros conteúdos protegidos sem licença compatível e documentação adequada.
4. Dados fornecidos pelo usuário nunca devem ser inseridos como HTML executável sem sanitização rigorosa.
5. Mudanças de persistência devem preservar compatibilidade, integridade e possibilidade de backup/restauração.
6. Recursos offline devem continuar funcionando após instalação da PWA.

## Antes de abrir um pull request

Execute:

```bash
npm test
npm run check
```

Explique no PR o problema resolvido, o comportamento esperado e qualquer impacto sobre dados locais, backup, segurança ou compatibilidade de navegadores.
