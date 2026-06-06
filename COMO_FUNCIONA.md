# Como o repositório funciona

Este repositório contém uma ficha virtual local para Tormenta20. Ele é uma aplicação web estática: não possui backend, empacotador, servidor obrigatório ou etapa de instalação. Para usar, basta abrir `index.html` em um navegador moderno.

## Visão geral

A aplicação é composta por uma página HTML, um arquivo CSS, um arquivo JavaScript de comportamento e três arquivos JavaScript de dados.

O fluxo geral é:

1. `index.html` define a interface, abas, campos fixos e contêineres vazios para listas dinâmicas.
2. `data.js`, `origins.js` e `spells_catalog.js` carregam dados globais em `window`.
3. `script.js` lê esses dados globais, preenche seletores, carrega uma ficha salva no navegador e renderiza as abas.
4. Ao alterar campos, o script recalcula valores derivados e salva automaticamente no `localStorage`.
5. O gerenciador de personagens permite manter várias fichas no mesmo navegador.
6. Os botões de exportar e importar permitem mover a ficha atual em formato JSON.

## Estrutura dos arquivos

| Arquivo | Função |
| --- | --- |
| `index.html` | Estrutura da página, campos principais, abas e botões. Também define a ordem de carregamento dos scripts. |
| `style.css` | Tema visual e layout responsivo. O arquivo contém camadas de estilo de versões anteriores e termina com o tema escuro da v7.1, que prevalece por vir por último. |
| `script.js` | Núcleo da aplicação. Controla estado, cálculos, renderização, rolagens, condições, grimório, inventário, importação, exportação e salvamento local. |
| `data.js` | Base de classes, raças e perícias em `window.T20_DATA`. |
| `origins.js` | Base de origens em `window.T20_ORIGINS`. |
| `spells_catalog.js` | Catálogo de magias em `window.T20_SPELL_CATALOG`. |
| `README.md` | Histórico resumido das versões e instrução básica de uso. |

## Dados disponíveis

Pela análise dos arquivos de dados, a base atual contém:

| Tipo | Quantidade |
| --- | ---: |
| Classes | 30 |
| Raças | 22 |
| Perícias | 29 |
| Origens | 132 |
| Magias | 275 |

As classes, raças e perícias ficam em `data.js`. As origens ficam em `origins.js`, agrupadas por fonte, tipo e, quando aplicável, região. As magias ficam em `spells_catalog.js`, como uma lista de objetos com nome, círculo, custo, escola, execução, alcance, resistência, publicação e descrição quando disponível.

## Como abrir e usar

Abra `index.html` diretamente no navegador.

Não é necessário rodar `npm install`, iniciar servidor local ou compilar arquivos. A única dependência externa declarada é a importação de fontes do Google Fonts em `style.css`; se o usuário estiver offline, o app ainda abre, mas usa fontes alternativas do sistema.

## Ordem de carregamento

A ordem dos scripts no final de `index.html` é importante:

```html
<script src="data.js"></script>
<script src="origins.js"></script>
<script src="spells_catalog.js"></script>
<script src="script.js"></script>
```

`script.js` depende das variáveis globais criadas pelos três arquivos anteriores:

| Variável global | Criada por | Usada para |
| --- | --- | --- |
| `window.T20_DATA` | `data.js` | Classes, raças e perícias. |
| `window.T20_ORIGINS` | `origins.js` | Seleção e aplicação de origens. |
| `window.T20_SPELL_CATALOG` | `spells_catalog.js` | Catálogo da aba Magias e adição ao Grimório. |

Se `script.js` for carregado antes desses arquivos, a inicialização falha. O próprio script envolve a inicialização em `try/catch` e mostra uma faixa de erro na tela por meio de `showFatalError`.

## Estado da ficha

O estado da aplicação é dividido em duas partes:

1. Campos fixos do HTML marcados com `data-save`.
2. Coleções dinâmicas mantidas no objeto `state`.

### Campos `data-save`

Campos como nome, jogador, raça, classe, nível, atributos, PV, PM, defesa, dinheiro e parâmetros de magia são lidos diretamente do DOM. O salvamento coleta todos os elementos com `data-save` usando seus `id`.

Exemplo conceitual do que é salvo:

```json
{
  "fields": {
    "nome": "Personagem",
    "nivel": "3",
    "FOR": "2"
  },
  "state": {}
}
```

### Objeto `state`

O `state` guarda listas e estruturas que não existem como campos fixos no HTML:

| Chave | Conteúdo |
| --- | --- |
| `powers` | Poderes e habilidades cadastrados pelo usuário. |
| `spells` | Magias aprendidas no Grimório. |
| `items` | Itens do inventário. |
| `attacks` | Ataques da aba Combate. |
| `skillData` | Treinamento e ajuste das perícias comuns. |
| `conditions` | Condições oficiais marcadas. |
| `customConditions` | Condições personalizadas. |
| `originBenefits` | Benefícios de origem registrados manualmente. |
| `offices` | Especializações de Ofício. |

A função `normalizeState()` garante que essas chaves existam e tenham o tipo esperado quando uma ficha antiga ou incompleta é carregada.

## Salvamento local e migração

O salvamento usa `localStorage` com um índice de personagens e uma chave por ficha:

```js
const CHARACTER_INDEX_KEY = "t20_characters_index_v1";
const CHARACTER_PREFIX = "t20_character_v1_";
```

O índice guarda o personagem ativo e metadados simples:

```json
{
  "activeId": "char_...",
  "characters": [
    { "id": "char_...", "name": "Personagem", "updatedAt": "..." }
  ]
}
```

Cada ficha completa fica em uma chave própria, como `t20_character_v1_char_...`, contendo:

```json
{
  "fields": {},
  "state": {}
}
```

A chave antiga continua sendo atualizada como compatibilidade/backup da ficha ativa:

```js
const KEY = "t20_sheet_v6_2";
```

Também existem chaves legadas para migração:

```js
const LEGACY_KEYS = ["t20_sheet_v3", "t20_sheet_v4", "t20_sheet_v5", "t20_sheet_v6"];
```

Ao carregar, `load()` procura primeiro o índice de personagens. Se não encontrar, tenta a chave antiga atual e depois as chaves legadas. Quando encontra uma ficha antiga, cria automaticamente o primeiro personagem do gerenciador e salva os dados no novo formato.

O botão `Salvar` chama `save(true)` e mostra uma notificação. Muitas alterações chamam `save(false)`, salvando em silêncio após recalcular ou renderizar o personagem ativo.

O gerenciador usa:

| Função | Papel |
| --- | --- |
| `newCharacter()` | Cria uma ficha limpa e a torna ativa. |
| `duplicateCharacter()` | Copia a ficha atual para um novo personagem. |
| `switchCharacter(id)` | Salva a ficha atual, carrega outra e atualiza a interface. |
| `renameCharacter()` | Renomeia o personagem ativo e atualiza o índice. |
| `deleteCharacter()` | Remove o personagem ativo; se for o único, limpa seus dados. |

## Importação e exportação

O botão `Exportar` executa `exportSheet()`. Ele cria um arquivo JSON com:

```json
{
  "fields": {},
  "state": {}
}
```

O nome do arquivo segue o padrão:

```text
ficha-nome-do-personagem.json
```

O botão `Importar` lê um arquivo `.json` com `FileReader`. O usuário escolhe se quer importar como novo personagem ou substituir o personagem atual. Se o JSON for inválido, o app mostra um alerta.

## Inicialização

No final de `script.js`, a aplicação executa:

1. `fillSelects()`
2. `load()`
3. `renderAll()`

`fillSelects()` monta os seletores de origem, raça e classe com base nos arquivos de dados.

`load()` recupera a ficha salva.

`renderAll()` normaliza o estado, renderiza listas dinâmicas e chama `recalc()`.

Depois disso, o script registra eventos de input, mudança, clique, importação e troca de abas.

## Cálculos principais

A função central é `recalc()`. Ela recalcula recursos, defesa, CDs e resumos sempre que campos importantes mudam.

### Nível e bônus de treino

O nível é limitado conceitualmente entre 1 e 20:

```js
const lvl = Math.max(1, Math.min(20, num("nivel") || 1));
```

O bônus de treinamento é:

| Nível | Bônus |
| ---: | ---: |
| 1 a 6 | +2 |
| 7 a 14 | +4 |
| 15 a 20 | +6 |

A metade do nível usa arredondamento para baixo.

### PV e PM

Os dados de classe possuem:

| Campo | Uso |
| --- | --- |
| `pv1` | PV inicial da classe. |
| `pvNivel` | PV por nível adicional. |
| `pmNivel` | PM por nível. |

O PV base é calculado assim:

```text
pvBase = pv1 + CON + (nivel - 1) * (pvNivel + CON)
```

O PM base é:

```text
pmBase = nivel * pmNivel
```

O total máximo soma bônus e ajuste livre:

```text
pvMax = pvBase + pvBonus + pvAjuste
pmMax = pmBase + pmBonus + pmAjuste
```

Os campos `pvAtual` e `pmAtual` são editáveis e também podem ser alterados pelos botões rápidos de `-5`, `-1`, `+1` e `+5`.

### Defesa

A Defesa exibida é:

```text
10 + DES + armadura + escudo + defBonus + defAjuste + penalidadesDeCondicao
```

### Perícias

Cada perícia usa:

```text
metade do nível + atributo + treino + ajuste + penalidades de condição
```

As perícias padrão vêm de `T20_DATA.pericias`. A perícia Ofício tem tratamento especial: em vez de uma linha única, pode ter várias especializações em `state.offices`.

### Magias

A CD estimada de magia é:

```text
10 + metade do nível + atributo-chave + bônus de CD
```

O limite final de PM por magia é:

```text
nivel + pmLimitBonus + pmLimitAdjust
```

Ao conjurar uma magia pelo Grimório, o botão reduz `pmAtual` pelo custo da magia, sem deixar o valor ficar abaixo de zero.

## Condições

As condições oficiais ficam dentro de `CONDITION_LIBRARY` em `script.js`. Cada condição possui:

| Campo | Função |
| --- | --- |
| `desc` | Texto resumido exibido na aba Condições. |
| `effects` | Penalidades automáticas aplicadas em defesa, ataques, perícias ou grupos de atributos. |

`activeConditionEffects()` percorre as condições ativas e aplica a pior penalidade de cada tipo, respeitando a regra de que condições com os mesmos efeitos não se acumulam. Essas penalidades são usadas em `recalc()`, `renderSkills()` e rolagens de ataque.

Condições personalizadas ficam em `state.customConditions`. Elas aparecem no resumo de condições ativas, mas não aplicam penalidades automáticas.

## Abas da interface

| Aba | Como funciona |
| --- | --- |
| Resumo | Mostra atributos, PV, PM, Defesa, resumo de raça/classe e condições ativas. |
| Origem | Permite escolher origem, consultar fonte, tipo, benefícios, itens e aplicar perícias sugeridas. |
| Progressão | Gera uma linha de 1 a 20 com destaque até o nível atual. |
| Perícias | Renderiza todas as perícias, treinamento, ajuste, total e botão de rolagem. |
| Poderes | Lista dinâmica editável de poderes e habilidades. |
| Magias | Catálogo filtrável por busca e círculo. Permite adicionar magias ao Grimório. |
| Grimório | Lista de magias aprendidas, cálculo de CD e limite de PM, edição manual e botão de conjurar. |
| Inventário | Lista de itens, quantidades, espaços, preço, equipamento e observações. |
| Condições | Biblioteca de condições oficiais e condições personalizadas. |
| Combate | Lista de ataques com rolagem de ataque e dano. |

A troca de abas usa botões com `data-tab`. O script alterna a classe `active` no botão e na seção correspondente `#tab-nome`.

## Renderização de listas dinâmicas

As listas dinâmicas são renderizadas por funções específicas:

| Função | Renderiza |
| --- | --- |
| `renderProgress()` | Progressão da classe. |
| `renderSkills()` | Perícias e especializações de Ofício. |
| `renderPowers()` | Poderes. |
| `renderSpellCatalog()` | Catálogo de magias. |
| `renderSpells()` | Grimório. |
| `renderItems()` | Inventário. |
| `renderAttacks()` | Ataques. |
| `renderConditions()` | Condições oficiais. |
| `renderCustomConditions()` | Condições personalizadas. |
| `renderOriginBenefits()` | Benefícios da origem. |

Para poderes, magias, itens e ataques, a função genérica `bindCollection(prefix, arr, rerender)` liga inputs renderizados dinamicamente ao item correto da lista. O vínculo é feito por atributos como `data-p`, `data-s`, `data-i` e `data-a`.

## Rolagens

`rollD20(bonus, title)` rola 1d20, soma o bônus e mostra o resultado em uma notificação.

`rollDice(expr)` interpreta expressões simples de dano, como:

```text
1d8
2d6+4
1d6+1d12+3
```

Ela aceita somas, subtrações e múltiplos grupos de dados. Há limites de segurança para quantidade de dados e faces.

## Como adicionar ou alterar dados

### Adicionar classe

Edite `data.js` em `window.T20_DATA.classes`. Uma classe precisa seguir o formato:

```js
"id_da_classe": {
  "nome": "Nome",
  "pv1": 12,
  "pvNivel": 3,
  "pmNivel": 4,
  "fonte": "Fonte",
  "pericias": ["Perícia 1", "Perícia 2"],
  "idBase": "id_da_classe",
  "variante": false
}
```

Para variantes, use `variante: true` e informe `classeBase`.

### Adicionar raça

Edite `window.T20_DATA.racas` em `data.js`:

```js
"id_da_raca": {
  "nome": "Nome",
  "fonte": "Fonte",
  "tamanho": "Médio",
  "deslocamento": 9
}
```

### Adicionar perícia

Edite `window.T20_DATA.pericias`:

```js
"Nome da Perícia": "ATR"
```

O atributo deve ser uma das siglas usadas nos inputs do HTML: `FOR`, `DES`, `CON`, `INT`, `SAB` ou `CAR`.

### Adicionar origem

Edite `origins.js`:

```js
"id_da_origem": {
  "nome": "Nome",
  "fonte": "Jogo do Ano",
  "tipo": "comum",
  "pericias": ["Perícia"],
  "poderes": ["Poder"],
  "itens": "Itens iniciais.",
  "beneficio": "Descrição resumida."
}
```

As fontes usadas por `fillSelects()` aparecem na ordem:

1. `Jogo do Ano`
2. `Heróis de Arton`
3. `Atlas de Arton`
4. `Personalizada`

Se uma nova fonte for adicionada, ela pode não aparecer na ordem desejada sem ajuste em `sourceOrder`.

### Adicionar magia

Edite `spells_catalog.js` e adicione um item em `window.T20_SPELL_CATALOG`:

```js
{
  "name": "Nome da Magia",
  "circle": 1,
  "cost": 1,
  "type": "Arcana",
  "school": "Evocação",
  "execution": "padrão",
  "range": "curto",
  "resistance": "Reflexos reduz à metade",
  "publication": "Grimório T20",
  "desc": "Descrição resumida."
}
```

Ao adicionar a magia pelo catálogo, esses dados são copiados para `state.spells`.

## Pontos de atenção

- O projeto não possui testes automatizados.
- O valor da chave de salvamento é `t20_sheet_v6_2`, mesmo a interface e o README indicando versão 7.1.
- O catálogo de magias possui descrições em vários itens, e essas descrições são copiadas para o Grimório. No renderizador atual da aba Magias, o card do catálogo mostra nome, círculo, custo e fonte, mas não mostra a descrição no próprio card.
- `style.css` tem blocos de temas antigos e novos. Como CSS é aplicado em cascata, as regras finais do tema v7.1 sobrescrevem muitas regras anteriores.
- O app depende de `localStorage`, portanto o salvamento fica preso ao navegador e perfil usados. Exportar JSON é a forma mais segura de backup.
- As condições personalizadas são apenas informativas; elas não alteram automaticamente Defesa, ataques ou perícias.

## Caminho mental para manutenção

Para alterar aparência, comece por `style.css`.

Para alterar campos fixos ou criar uma nova aba, comece por `index.html` e depois ligue os eventos em `script.js`.

Para alterar cálculos, comece por `recalc()`, `renderSkills()` e `activeConditionEffects()`.

Para alterar listas editáveis, procure a função `render...` correspondente e veja qual prefixo de `data-*` ela usa em `bindCollection`.

Para alterar bases de conteúdo, prefira mexer nos arquivos de dados:

- `data.js` para classes, raças e perícias.
- `origins.js` para origens.
- `spells_catalog.js` para magias.
