# Ficha Interativa Tormenta20

Ficha virtual local para Tormenta20, com visual escuro clássico, abas organizadas e catálogos integrados para raças, classes, poderes, magias e inventário.

Abra `index.html` em um navegador moderno. Não é necessário instalar dependências, rodar servidor ou compilar nada.

## Atualizações recentes

- Tela inicial com login/modo local e hub de `Fichas`/`Campanhas`. Uma conta ou navegador novo nao cria mais uma ficha local automaticamente; use o botao `+` para criar.
- Integracao opcional com Supabase para salvar fichas na nuvem, criar campanhas, entrar por codigo de convite e vincular fichas a campanhas.
- Quando conectado, a ficha usa a nuvem como salvamento principal. Para backup manual, use `Exportar JSON` e `Importar JSON`.
- Dashboard de campanha com lista de fichas, jogadores e `Escudo do Mestre`.
- Escudo do Mestre com resumo das fichas da campanha, alertas de PV/condicoes, historico de rolagens, filtro por personagem, ordenacao por risco/PV e limpeza de rolagens. O painel recarrega dados da nuvem periodicamente para refletir mudancas de PV/PM salvas pelos jogadores.
- O `Escudo do Mestre`, fichas ocultas, renomear e excluir campanhas ficam disponiveis apenas para o usuario que criou a campanha.
- Permissoes de nuvem em `supabase_permissions.sql`: dono edita a propria ficha, membros da campanha podem visualizar fichas publicas da campanha, o mestre visualiza fichas ocultas e o criador gerencia campanha/rolagens.

- Habilidades de raça automáticas: ao selecionar uma raça, a aba Poderes recebe automaticamente as habilidades fixas daquela raça.
- Gerenciador de personagens no cabeçalho: permite criar, trocar, duplicar, renomear e excluir várias fichas salvas no mesmo navegador.
- O resumo da raça mostra modificadores de atributos; tamanho e deslocamento base aparecem em campos editáveis logo abaixo. Quando a raça não informa esses dados, a ficha assume tamanho Médio e deslocamento 9m.
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
- Magias têm filtros por arcanas, divinas, universais e escola de magia.
- Aba Condições foi simplificada: foco em descrição e aplicação, sem campos de duração/origem.
- Nova aba Notas para anotações livres.

## Como usar

1. Abra `index.html`.
2. Preencha os dados principais no cabeçalho: raça, classe, nível, origem, divindade e atributos.
3. Use o seletor de personagem no cabeçalho para criar novas fichas, duplicar, renomear, excluir ou alternar entre personagens.
4. Use as abas para completar a ficha.
5. Se estiver conectado, a ficha salva automaticamente na nuvem. No modo offline, ela salva no navegador.
6. Use o menu `...` no canto superior direito da ficha para salvar na nuvem, abrir/vincular campanha, exportar/importar JSON ou limpar a ficha.

O botão `Salvar` usa o destino principal do momento: nuvem quando conectado, navegador quando offline. Para backup manual, use `Exportar JSON`. O botão `Limpar` limpa a ficha do personagem atual, sem apagar os demais personagens salvos.

## Personagens

O gerenciador de personagens salva várias fichas no `localStorage` do navegador. Você não precisa exportar/importar para alternar entre personagens no mesmo dispositivo: basta escolher pelo seletor no cabeçalho.

- `Novo` cria uma ficha limpa.
- `Duplicar` copia a ficha atual.
- `Renomear` muda o nome do personagem ativo.
- `Excluir` remove o personagem ativo. Se era a ultima ficha local, o hub fica vazio ate voce criar outra com `+`.
- `Exportar` e `Importar` continuam úteis para backup, transferência entre navegadores/dispositivos ou envio para outra pessoa.

Como o salvamento local fica no navegador, GitHub Pages/Netlify nao sincronizam automaticamente entre computadores ou celulares. Para sincronizar, entre na nuvem e use o salvamento via Supabase.

## Nuvem e campanhas

A ficha pode funcionar so localmente ou conectada ao Supabase. Quando ha login, o fluxo principal e a nuvem; o local fica como backup opcional.

- `Fichas` lista personagens locais e personagens da nuvem que pertencem a sua conta.
- `Campanhas` lista campanhas criadas ou acessadas pela sua conta.
- `Nova campanha` cria uma campanha e gera um codigo de convite.
- `Entrar com codigo` vincula sua conta a uma campanha existente.
- No dashboard de campanha, o seletor `Ficha para vincular` permite escolher qual ficha da sua conta sera associada a campanha.
- No dashboard de campanha, o mestre pode criar e excluir `Ficha oculta`; jogadores nao veem essas fichas, e elas aparecem apenas dentro da campanha/escudo do mestre, nao no menu pessoal de `Fichas`.
- O jogador pode sair de uma campanha; suas fichas vinculadas ficam sem campanha.
- `Excluir campanha` remove a campanha apenas para o mestre/criador; as fichas vinculadas nao sao apagadas.
- O `Escudo do Mestre` aparece apenas para quem criou a campanha.
- Fichas de outros jogadores em uma campanha podem ser abertas em modo somente leitura; apenas o dono salva alteracoes na nuvem. A permissao real usa o `id` da conta Supabase (`auth.uid()`), nao o nome exibido.
- O Escudo atualiza rolagens e dados das fichas periodicamente; alteracoes de PV/PM aparecem depois que o jogador salva na nuvem.

Arquivos SQL auxiliares:

- `supabase_campaign_create.sql`: funcao segura para criar campanha e registrar o mestre como membro.
- `supabase_campaign_rolls.sql`: tabela e policies basicas para historico de rolagens do Escudo.
- `supabase_permissions.sql`: camada principal de RLS/policies para campanhas, membros, fichas e rolagens. Execute este arquivo depois dos outros SQLs.
- `supabase_private_characters.sql`: migracao curta para bancos ja configurados, adicionando fichas ocultas sem precisar rerodar tudo.

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

Habilidades automáticas ficam bloqueadas para edição direta e são atualizadas quando raça, classe ou nível mudam. Modificadores raciais de atributos aparecem no resumo da raça, não como poderes. Entradas que exigem escolha, como herança de Moreau, presentes de Duende, talentos de Kobolds ou bênçãos de Kallyanach, aparecem como orientação, mas a escolha específica continua manual.

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

Catálogo de magias. Permite pesquisar, filtrar por círculo, tipo e escola de magia, ver descrição e adicionar ao Grimório.

## Cálculos e automações

- PV base: usa os valores da classe, Constituição e nível.
- PM base: usa PM por nível da classe e, para conjuradores compatíveis, soma o atributo-chave de magia.
- CD de magia: `10 + metade do nível + atributo-chave + bônus`.
- Limite de PM: nível + bônus + ajuste livre.
- Defesa: base 10 + Destreza opcional + armadura + escudo + bônus + ajuste + condições. Desmarque “Somar Destreza” quando usar armaduras pesadas ou qualquer efeito que remova esse bônus.
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

O salvamento local usa `localStorage`, então a ficha fica gravada apenas no navegador e perfil atual. Para backup ou troca de computador, use `Exportar` e guarde o arquivo `.json`.

Quando conectado ao Supabase, a ficha salva na nuvem por padrao. O hub mostra fichas locais, fichas sincronizadas e fichas de campanhas que sua conta pode visualizar. Fichas compartilhadas por campanha abrem em modo somente leitura quando pertencem a outro usuario. O backup manual recomendado e `Exportar JSON`; `Importar JSON` restaura uma ficha a partir desse arquivo.

O projeto tenta migrar fichas antigas salvas com chaves anteriores. Navegadores novos nao criam mais uma ficha vazia automaticamente; a lista pode ficar vazia ate voce clicar em `+`. Ainda assim, exportar um backup antes de mudanças grandes é recomendado.

## Limitações

A ficha é uma ferramenta de apoio, não substitui os livros. Algumas opções que dependem de decisão do jogador ou do mestre aparecem como entradas orientadoras e devem ser preenchidas manualmente.

Exemplos: poder escolhido por Ambição Herdada, herança específica de Moreau, presentes de Duende, talentos de Kobolds, bênçãos de Kallyanach, maravilhas de Mashin e escolhas abertas de origem.
