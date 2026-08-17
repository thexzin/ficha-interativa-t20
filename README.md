# Ficha Interativa Tormenta20

Ficha virtual local para Tormenta20, com visual escuro clássico, abas organizadas e catálogos integrados para raças, classes, poderes, magias e inventário.

Abra `index.html` em um navegador moderno. Não é necessário instalar dependências, rodar servidor ou compilar nada.

## Atualizações recentes

- Tela inicial com login/modo local e hub de `Fichas`/`Campanhas`. Uma conta ou navegador novo nao cria mais uma ficha local automaticamente; use o botao `+` para criar.
- Tela inicial com atalhos para continuar a ficha recente, abrir a campanha recente e alternar entre nuvem/fichas.
- Indicador discreto de salvamento no cabecalho da ficha: mostra quando esta salvando, salvo, em modo local, somente leitura ou com erro de nuvem.
- Pop-ups de rolagem de pericias e ataques ficam mais tempo na tela para facilitar leitura durante a sessao.
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
- Suporte a multiclasse: marque `Multiclasse` junto ao seletor de classe para abrir o bloco que adiciona classes extras e controla o nível de cada uma. O nível de personagem é calculado pela soma das classes.
- Poderes em sanfona, duas entradas por linha, mostrando nome e tipo mesmo recolhidos.
- Grimório, Poderes, Inventário, Parceiros e Ataques usam cards recolhidos/expansíveis para manter a ficha mais limpa.
- PV aceita valores negativos e segue a regra de morte por metade dos PV máximos negativos, morrendo apenas 1 PV abaixo desse limite.
- PV e PM temporários substituem o antigo campo de bônus máximo e são consumidos antes dos pontos normais.
- PV e PM possuem campo de aplicação por valor para dano/cura ou gasto/recuperação, consumindo temporarios antes dos pontos normais quando o valor reduz o recurso.
- PM máximo de Arcanista, Clérigo, Frade, Druida e Bardo soma o atributo-chave de magia quando aplicável.
- A aba Modificadores reúne atributos temporários e bônus globais de Testes, Ataques, Perícias, Resistências, Dano e Defesa.
- Perícias permitem trocar o atributo-chave, destacam treinadas, aplicam penalidade de armadura e indicam limitações de treinamento.
- Defesa possui campos para penalidade de armadura e resistência a dano.
- Inventário possui menu de itens mundanos e mágicos, melhorias, materiais especiais e encantos estruturados. Itens equipados alimentam automaticamente os cálculos compatíveis da ficha.
- Nova aba Parceiros com os 12 tipos gerais e as 6 montarias do Jogo do Ano, benefícios por graduação e limites automáticos por patamar.
- Parceiros ativos agora aplicam automaticamente bônus passivos compatíveis com a ficha, com indicação na própria opção e sem acumular bônus de múltiplos parceiros.
- Magias têm filtros por arcanas, divinas, universais e escola de magia.
- Aba Condições foi simplificada: foco em descrição e aplicação, sem campos de duração/origem.
- Nova aba Notas para anotações livres.

## Como usar

1. Abra `index.html`.
2. Preencha os dados principais no cabeçalho: raça, classe principal, nível, origem, divindade e atributos. Para multiclasse, marque `Multiclasse`, use `+ Classe` no bloco aberto e informe o nível de cada classe.
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
- O mestre pode remover fichas de jogadores da campanha sem apagar a ficha do jogador.
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
- `supabase_campaign_character_management.sql`: funcao curta para o mestre remover fichas de jogadores da campanha sem editar/apagar a ficha.

## Abas

### Stats

Mostra o resumo principal do personagem: atributos, PV, PM, Defesa, RD, deslocamento, CD de magia, limite de PM e condições ativas.

PV e PM têm campos de pontos atuais, base calculada, temporários e ajuste livre. Os botões rápidos e o campo de aplicar valor descontam primeiro os pontos temporários quando reduzem o recurso.

Um resumo clicável indica os modificadores temporários ativos e abre diretamente a aba Modificadores.

### Modificadores

Reúne os modificadores temporários dos seis atributos e os bônus globais. Os atributos temporários continuam entrando apenas em perícias e CD de magia. `Testes` afeta ataques e perícias; `Ataques` afeta apenas ataques; `Perícias` afeta todas as perícias; `Resistências` acrescenta em Fortitude, Reflexos e Vontade; `Dano` é somado uma vez sem multiplicação de crítico; `Defesa` entra no cálculo de Defesa. O botão `Limpar temporários` zera todos esses campos.

### Origem

Mostra origem, perícias sugeridas, poderes/benefícios, itens e descrição. A ficha possui origens do livro básico, Heróis de Arton e Atlas de Arton, incluindo origens regionais.

### Perícias

Lista as perícias com atributo-chave editável, treino, bônus e ajuste. O campo `Modificador geral` soma em todas as perícias e Ofícios, útil para efeitos de cena. Perícias treinadas ficam destacadas. Penalidade de armadura e exigências de treino são tratadas visualmente e nos cálculos.

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

Habilidades automáticas ficam bloqueadas para edição direta e são atualizadas quando raça, classes ou níveis de classe mudam. Em personagens multiclasse, a progressão e o catálogo de poderes consideram todas as classes; perícias e proficiências iniciais continuam vindo apenas da classe principal. Modificadores raciais de atributos aparecem no resumo da raça, não como poderes. Entradas que exigem escolha, como herança de Moreau, presentes de Duende, talentos de Kobolds ou bênçãos de Kallyanach, aparecem como orientação, mas a escolha específica continua manual. As setas nos cards permitem reorganizar poderes manuais e automáticos, e a ordem escolhida é preservada nas próximas sincronizações.

### Combate

Agrupa ataques e rolagens rápidas. Cada ataque fica recolhido por padrão em uma linha com nome, bônus final, dano base, dano extra, crítico e dados usados; clique no resumo para editar os detalhes. O teste pode continuar `Manual` ou usar Luta/Pontaria, com escolha independente do atributo e um `Bônus de ataque` adicional. Os checks `Melhor dado` (`+1d20`) e `Pior dado` (`-1d20`) fazem conservar, respectivamente, o maior ou o menor resultado; se ambos estiverem marcados, anulam-se. Também é possível registrar tipo de dano, alcance e um atributo no dano.

Todos os termos de dados do dano base recebem a multiplicação do crítico; dano extra, atributo no dano e bônus global são somados uma única vez. Bônus numéricos do dano base normalmente não são multiplicados, mas o check `Bônus numérico: Crita` permite multiplicá-los em efeitos como o encanto Lancinante. Os campos aceitam expressões como `2d6`, `1d8+1d6` ou `1d6+3`. Ataques criados antes desta atualização permanecem em modo manual, preservando o bônus já configurado.

### Grimório

Guarda as magias conhecidas pelo personagem. Magias podem ser adicionadas manualmente ou puxadas da aba Magias. Ao conjurar uma magia, a ficha desconta PM automaticamente, usando PM temporário antes do PM normal.

### Inventário

Controla itens, quantidade, espaço, preço, equipamento e notas. O botão de adicionar abre o catálogo de itens mundanos; o botão de item mágico abre catálogo próprio. Os itens ficam em cards recolhidos, duas entradas por linha, com setas para reorganizar a ordem do inventário.

Armas, armaduras, escudos, esotéricos, ferramentas e vestuário recebem uma área de `Modificações`. Nela é possível escolher melhorias, material especial e encantos do Jogo do Ano. Pré-requisitos diretos, como Certeira para Pungente e Defensor para Guardião, são adicionados em conjunto; o material especial conta no limite de quatro melhorias e cada item aceita até três encantos.

Os efeitos numéricos inequívocos são aplicados apenas com `Equipado: Sim`: atributos, perícias, resistências, Defesa, RD, penalidade de armadura, CD de magia, limite de PM, PV/PM máximos e capacidade de carga. Itens mágicos conhecidos, como Amuleto da Robustez, Tiara da Sapiência e Anel da Proteção, já trazem seus efeitos automáticos; bônus diretos e incondicionais presentes nas descrições também são reconhecidos. O quadro de Atributos exibe o total com equipamento, mas revela o valor-base durante a edição para não gravar o bônus duas vezes. Bônus de item para a mesma característica usam o maior valor aplicável, enquanto armadura e escudo mantêm seus grupos próprios de Defesa. Armaduras e escudos também carregam seus valores-base de Defesa e penalidade de armadura: ao equipá-los, ambos passam automaticamente para a ficha e para as perícias afetadas. Esses valores continuam editáveis no item para equipamentos personalizados.

Para armas, selecione um `Ataque associado` no Inventário ou uma `Arma associada` dentro do próprio ataque. Melhorias e encantos passam a alterar somente esse ataque: Certeira/Pungente modificam o acerto, Cruel/Atroz modificam o dano e outros efeitos podem acrescentar dados, margem de ameaça ou multiplicador. O resumo do ataque mostra a arma, suas modificações e os bônus efetivamente aplicados; uma arma não equipada permanece vinculada, mas não concede seus efeitos. Efeitos condicionais continuam descritos no item para serem aplicados apenas quando sua condição ocorrer. A sanfona `Ajustes automáticos manuais` cobre itens personalizados e opções de outros livros sem forçar bônus condicionais o tempo todo.

O limite normal de carga é calculado automaticamente pela regra do Jogo do Ano: 10 espaços, aumentado em 2 por ponto positivo de Força ou reduzido em 1 por ponto negativo. Força concedida por item equipado e efeitos como Mochila de Carga entram nesse total; itens Discretos ou de mitral ocupam menos espaço. O máximo carregável, exibido ao lado, é o dobro do limite normal. Editar o limite desativa o check `Auto`, preservando ajustes de poderes e outros efeitos; reativá-lo restaura o cálculo pela Força. Ultrapassar o limite normal deixa o personagem sobrecarregado, com penalidade de armadura -5 e deslocamento -3m.

### Parceiros

Registra parceiros em cards sanfonados, duas entradas por linha. O catálogo inclui Adepto, Ajudante, Assassino, Atirador, Combatente, Destruidor, Fortão, Guardião, Magivocador, Médico, Perseguidor e Vigilante, além das montarias Cavalo, Cão de Caça, Lobo-das-Cavernas, Grifo, Gorlogg e Trobo. Cada opção mostra a descrição do livro e os benefícios completos de Iniciante, Veterano e Mestre conforme o Jogo do Ano, p. 260-262.

Quando o parceiro está ativo, a ficha aplica automaticamente os efeitos passivos que possuem um destino inequívoco: bônus em perícias, resistências, ataques, Defesa e CD de magias. O Adepto também reduz o custo mostrado e descontado ao conjurar magias elegíveis, respeitando o custo mínimo de 1 PM. O Ajudante possui seletores para as duas ou três perícias escolhidas. Bônus vindos de parceiros não se acumulam entre si; a ficha usa o maior valor aplicável. Efeitos condicionais ou de uso limitado, como dano uma vez por rodada, flanqueamento e ações especiais, permanecem descritos no card para aplicação no momento correto.

A ficha usa o nível total, inclusive em multiclasse, para determinar o patamar e os limites:

- níveis 1 a 4: patamar Iniciante, até 1 parceiro ativo e graduação máxima Iniciante;
- níveis 5 a 10: patamar Veterano, até 2 parceiros ativos e graduação máxima Veterano;
- níveis 11 a 16: patamar Campeão, até 2 parceiros ativos e graduação máxima Mestre;
- níveis 17 a 20: patamar Lenda, até 3 parceiros ativos e graduação máxima Mestre.

Parceiros acima da graduação permitida são ajustados ao diminuir o nível do personagem. O check `Conta no limite` permite registrar familiares, pajens, escudeiros e outros parceiros especiais que uma habilidade diga não consumir o limite normal. Benefícios e notas continuam editáveis para misturas aprovadas pelo mestre ou opções de outros livros.

### Notas

Campo livre para anotações de campanha, efeitos temporários, lembretes e qualquer informação que não tenha lugar específico.

### Condições

Lista condições oficiais e personalizadas. Marcar uma condição aplica seus modificadores automáticos quando houver, como penalidades em Defesa, ataques, atributos e perícias.

### Magias

Catálogo de magias. Permite pesquisar, filtrar por círculo, tipo e escola de magia, ver descrição e adicionar ao Grimório.

## Cálculos e automações

- PV base: a classe principal usa os PV do 1º nível; cada nível de uma classe extra usa os PV de nível subsequente dessa classe. Constituição entra em todos os níveis.
- PM base: soma os PM por nível de todas as classes e, para conjuradores compatíveis, soma o atributo-chave de magia uma vez.
- Nível de personagem: soma dos níveis de todas as classes; é usado em metade do nível, bônus de treinamento, CD e limite de PM.
- CD de magia: `10 + metade do nível + atributo-chave + bônus`.
- Limite de PM: nível + bônus + ajuste livre.
- Defesa: base 10 + atributo opcional + armadura + escudo + bônus + ajuste + modificador global + itens equipados + condições. Desmarque “Somar atributo” quando a armadura ou efeito não permitir esse bônus.
- Morte: quando os PV atuais ficam negativos, a barra passa a representar o limite negativo. Um personagem com 30 PV máximos tem limite em -15 e morre em -16.
- Perícias: usam metade do nível, atributo-chave selecionado, treino, ajustes, modificadores globais, penalidade de armadura e condições.

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
- `item_customization_catalog.js`: melhorias, materiais, encantos e efeitos automáticos de itens mágicos.

## Salvamento

O salvamento local usa `localStorage`, então a ficha fica gravada apenas no navegador e perfil atual. Para backup ou troca de computador, use `Exportar` e guarde o arquivo `.json`.

Quando conectado ao Supabase, a ficha salva na nuvem por padrao. O hub mostra fichas locais, fichas sincronizadas e fichas de campanhas que sua conta pode visualizar. Fichas compartilhadas por campanha abrem em modo somente leitura quando pertencem a outro usuario. O backup manual recomendado e `Exportar JSON`; `Importar JSON` restaura uma ficha a partir desse arquivo.

O projeto tenta migrar fichas antigas salvas com chaves anteriores. Navegadores novos nao criam mais uma ficha vazia automaticamente; a lista pode ficar vazia ate voce clicar em `+`. Ainda assim, exportar um backup antes de mudanças grandes é recomendado.

## Limitações

A ficha é uma ferramenta de apoio, não substitui os livros. Algumas opções que dependem de decisão do jogador ou do mestre aparecem como entradas orientadoras e devem ser preenchidas manualmente.

Exemplos: poder escolhido por Ambição Herdada, herança específica de Moreau, presentes de Duende, talentos de Kobolds, bênçãos de Kallyanach, maravilhas de Mashin e escolhas abertas de origem.
