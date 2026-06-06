# Ficha Interativa Tormenta20

Ficha virtual local para Tormenta20, com visual escuro clássico, abas organizadas e catálogos integrados para raças, classes, poderes, magias e inventário.

Abra `index.html` em um navegador moderno. Não é necessário instalar dependências, rodar servidor ou compilar nada.

## Atualizações recentes

- Habilidades de raça automáticas: ao selecionar uma raça, a aba Poderes recebe automaticamente as habilidades fixas daquela raça.
- Progressão de classe automática: habilidades recebidas por nível entram sozinhas na aba Poderes, com descrições completas.
- Poderes em sanfona, duas entradas por linha, mostrando nome e tipo mesmo recolhidos.
- Grimório, Poderes e Inventário usam cards recolhidos/expansíveis para manter a ficha mais limpa.
- PV aceita valores negativos e segue a regra de morte por metade dos PV máximos negativos, morrendo apenas 1 PV abaixo desse limite.
- PV e PM temporários substituem o antigo campo de bônus máximo e são consumidos antes dos pontos normais.
- PM máximo de Arcanista, Clérigo, Frade, Druida e Bardo soma o atributo-chave de magia quando aplicável.
- Atributos têm modificadores temporários; eles entram em perícias e CD de magias, mas não alteram todos os cálculos derivados.
- Perícias permitem trocar o atributo-chave, destacam treinadas, aplicam penalidade de armadura e indicam limitações de treinamento.
- Defesa possui campos para penalidade de armadura e resistência a dano.
- Inventário possui menu de itens mundanos e mágicos, com categorias simplificadas.
- Magias têm filtros por arcanas, divinas e universais.
- Aba Condições foi simplificada: foco em descrição e aplicação, sem campos de duração/origem.
- Nova aba Notas para anotações livres.

## Como usar

1. Abra `index.html`.
2. Preencha os dados principais no cabeçalho: raça, classe, nível, origem, divindade e atributos.
3. Use as abas para completar a ficha.
4. A ficha salva automaticamente no navegador.
5. Use `Exportar` para gerar um JSON da ficha e `Importar` para carregar esse JSON depois.

O botão `Salvar` força o salvamento local. O botão `Limpar` apaga a ficha salva no navegador atual.

## Abas

### Stats

Mostra o resumo principal do personagem: atributos, PV, PM, Defesa, RD, deslocamento, CD de magia, limite de PM e condições ativas.

PV e PM têm campos de pontos atuais, base calculada, temporários e ajuste livre. Os botões rápidos descontam primeiro os pontos temporários.

### Origem

Mostra origem, perícias sugeridas, poderes/benefícios, itens e descrição. A ficha possui origens do livro básico, Heróis de Arton e Atlas de Arton, incluindo origens regionais.

### Perícias

Lista as perícias com atributo-chave editável, treino, bônus e ajuste. Perícias treinadas ficam destacadas. Penalidade de armadura e exigências de treino são tratadas visualmente e nos cálculos.

### Poderes

Registra poderes e habilidades do personagem. A aba combina:

- habilidades automáticas de progressão de classe;
- habilidades automáticas de raça;
- poderes de classe;
- poderes gerais, incluindo Combate, Magia e Destino;
- poderes de raça;
- poderes de origem;
- poderes concedidos;
- poderes manuais.

Habilidades automáticas ficam bloqueadas para edição direta e são atualizadas quando raça, classe ou nível mudam. Entradas que exigem escolha, como herança de Moreau, presentes de Duende, talentos de Kobolds ou bênçãos de Kallyanach, aparecem como orientação, mas a escolha específica continua manual.

### Combate

Agrupa ataques e rolagens rápidas. Cada ataque pode ter bônus, dano, crítico, multiplicador e notas. O campo de dano aceita expressões como `1d6+1d12+4`.

### Grimório

Guarda as magias conhecidas pelo personagem. Magias podem ser adicionadas manualmente ou puxadas da aba Magias. Ao conjurar uma magia, a ficha desconta PM automaticamente, usando PM temporário antes do PM normal.

### Inventário

Controla itens, quantidade, espaço, preço, equipamento e notas. O botão de adicionar abre catálogo de itens mundanos; o botão de item mágico abre catálogo próprio. Os itens ficam em cards recolhidos, duas entradas por linha.

### Notas

Campo livre para anotações de campanha, efeitos temporários, lembretes e qualquer informação que não tenha lugar específico.

### Condições

Lista condições oficiais e personalizadas. Marcar uma condição aplica seus modificadores automáticos quando houver, como penalidades em Defesa, ataques, atributos e perícias.

### Magias

Catálogo de magias. Permite pesquisar, filtrar por círculo e tipo de magia, ver descrição e adicionar ao Grimório.

## Cálculos e automações

- PV base: usa os valores da classe, Constituição e nível.
- PM base: usa PM por nível da classe e, para conjuradores compatíveis, soma o atributo-chave de magia.
- CD de magia: `10 + metade do nível + atributo-chave + bônus`.
- Limite de PM: nível + bônus + ajuste livre.
- Defesa: base 10 + Destreza + armadura + escudo + bônus + ajuste + condições.
- Morte: quando os PV atuais ficam negativos, a barra passa a representar o limite negativo. Um personagem com 30 PV máximos tem limite em -15 e morre em -16.
- Perícias: usam metade do nível, atributo-chave selecionado, treino, ajustes, penalidade de armadura e condições.

## Catálogos incluídos

A ficha usa dados locais distribuídos em arquivos JavaScript:

- `data.js`: classes, raças básicas e perícias.
- `t20_expansions.js`: raças de Ameaças de Arton, classes variantes e progressões.
- `origins.js`: origens base.
- `origin_expansion_fixes.js`: correções e expansões de origens.
- `class_progression_features.js`: habilidades automáticas de progressão.
- `class_progression_full_texts.js`: descrições completas das habilidades de progressão.
- `class_powers.js`: poderes de classe.
- `class_power_details.js`: descrições e detalhes dos poderes de classe.
- `power_catalog.js`: poderes gerais, raciais, de origem e concedidos.
- `jda_catalog_fixes.js`: correções do catálogo do Jogo do Ano e habilidades raciais básicas.
- `expansion_race_abilities.js`: habilidades de raça de Heróis de Arton e Ameaças de Arton.
- `spells_catalog.js`: catálogo de magias.
- `item_catalog.js`: itens mundanos do livro básico.
- `magic_item_catalog.js`: itens mágicos.
- `expansion_item_catalog.js`: itens de suplementos.

## Salvamento

O salvamento usa `localStorage`, então a ficha fica gravada apenas no navegador e perfil atual. Para backup ou troca de computador, use `Exportar` e guarde o arquivo `.json`.

O projeto tenta migrar fichas antigas salvas com chaves anteriores. Ainda assim, exportar um backup antes de mudanças grandes é recomendado.

## Limitações

A ficha é uma ferramenta de apoio, não substitui os livros. Algumas opções que dependem de decisão do jogador ou do mestre aparecem como entradas orientadoras e devem ser preenchidas manualmente.

Exemplos: poder escolhido por Ambição Herdada, herança específica de Moreau, presentes de Duende, talentos de Kobolds, bênçãos de Kallyanach, maravilhas de Mashin e escolhas abertas de origem.
