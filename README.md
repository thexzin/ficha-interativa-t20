# Ficha Tormenta20 v3

Abra `index.html` no navegador. Não é necessário instalar nada.

## Principais mudanças

- Classes básicas, Treinador, Frade e todas as classes variantes de Heróis de Arton.
- Raças básicas e novas raças de Heróis de Arton.
- PV e PM com valor calculado, bônus máximo, ajuste livre e valor atual editável.
- Abas separadas para:
  - Resumo
  - Progressão
  - Perícias
  - Poderes e habilidades
  - Magias
  - Inventário
  - Combate
- Magias podem descontar PM ao serem conjuradas.
- Inventário calcula espaços utilizados.
- Exportação e importação em JSON.
- Salvamento local.

## Observação

As classes variantes usam a estrutura numérica de sua classe básica. Os textos completos dos poderes e magias devem ser cadastrados pelo usuário, evitando reprodução integral dos livros.

## Novidades da versão 4

- Seleção de origens por livro.
- Aplicação automática das perícias sugeridas pela origem.
- Campos para os dois benefícios de origens comuns.
- Suporte a origens especiais, regionais e personalizadas.
- Barras visuais de PV e PM.
- Limite de PM editável: nível + bônus + ajuste livre.
- Aba completa de condições oficiais e personalizadas.
- Resumo das condições ativas na página principal.

A base de origens é expansível no arquivo `origins.js`. Algumas origens já possuem benefícios detalhados; as demais continuam aceitando preenchimento manual para não prender a ficha a uma interpretação específica.


## Correção v4.1
- Migração automática de fichas salvas na versão 3.
- Correção do travamento dos botões ao carregar dados antigos.

## Versão 5

- Atributos movidos para o topo da página de resumo.
- Condições aplicam automaticamente penalidades numéricas em Defesa, ataques e perícias.
- Resumo das penalidades ativas no Resumo e no Combate.
- Lista completa das 30 origens especiais de Heróis de Arton.
- Lista completa das 66 origens regionais do Atlas de Arton.
- Benefícios de origem agora são uma lista sem limite fixo.
- Migração automática das fichas antigas.


## Versão 6

- Aba de Origem separada do Resumo.
- Resumo mantém apenas dados principais, atributos, recursos, Defesa e condições.
- Origens agrupadas por livro e ordenadas alfabeticamente dentro de cada grupo.
- Ofício aceita múltiplas especializações nomeadas.
- Dano de ataques aceita múltiplos dados, como `1d6+1d12+4`.


## Correção v6.2 estável

- Restaurada a biblioteca de condições que impedia a inicialização do JavaScript.
- Nova chave de salvamento, com tentativa de migração automática das versões antigas.
- Inicialização protegida por mensagem de erro visível.
- Arquivo JavaScript validado antes de gerar o ZIP.


## Versão 7 — Catálogo de Magias + Grimório

- Nova aba **Magias** com catálogo completo das 275 magias listadas no Grimório T20, separadas por círculo.
- Nova aba **Grimório** para armazenar apenas as magias aprendidas pelo personagem.
- Botão **Adicionar ao Grimório** em cada magia do catálogo.
- Busca por nome e filtro por círculo no catálogo.
- Estética revisada para ficar mais próxima da paleta e da temática visual de Tormenta20.


## Versão 7.1 — Descrições + visual escuro

- O catálogo de Magias agora mostra **descrições** quando disponíveis.
- Ao adicionar uma magia ao Grimório, sua descrição também é levada junto.
- Base local enriquecida automaticamente a partir dos livros enviados: **189 de 275 magias** com descrição e/ou metadados preenchidos.
- Restante das magias continua funcional e pode ser completado depois.
- Tema visual reformulado para um **modo escuro com acentos vermelhos**, inspirado na ficha de Tormenta20 mostrada como referência.


## Versão 7.2
- Retorno ao visual original escuro, agora com acentos vermelhos.
- Logotipo oficial fornecido pelo usuário usado no cabeçalho.
- Origem selecionada aparece nas informações do personagem.
- Botão visível **Ver descrição** em cada magia.
- Descrição aberta em uma janela própria, com metadados e botão para adicionar ao Grimório.
