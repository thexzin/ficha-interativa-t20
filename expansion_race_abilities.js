;(function(){
  const clean=text=>String(text||"").replace(/\s+/g," ").trim();
  const ability=(source,name,races,desc,cost="",action="")=>({
    name,
    type:"Raça",
    subtype:"Habilidade de Raça",
    source,
    desc:clean(desc),
    cost,
    action,
    races
  });

  const herois="Heróis de Arton";
  const ameacas="Ameaças de Arton";
  const powers=[
    ability(herois,"Natureza de Duende",["Duende"],`Você é uma criatura do tipo espírito. Escolha uma natureza: animal, vegetal ou mineral. Animal: corpo de carne e osso e +1 em um atributo a sua escolha. Vegetal: corpo de folhas, vinhas, cortiça ou madeira; recebe Natureza Vegetal e Florescer Feérico. Mineral: corpo inorgânico; recebe imunidade a efeitos de metabolismo e redução de corte, fogo e perfuração 5, mas não se beneficia de itens da categoria alimentação.`),
    ability(herois,"Natureza Vegetal",["Duende"],`Se escolheu natureza vegetal, você é imune a atordoamento e metamorfose, mas é afetado por efeitos que afetam plantas monstruosas. Se o efeito não tiver teste de resistência, você tem direito a um teste de Fortitude.`),
    ability(herois,"Florescer Feérico",["Duende"],`Se escolheu natureza vegetal, uma vez por rodada você pode gastar uma quantidade de PM limitada pela sua Constituição para curar 2d8 PV por PM gasto no início do seu próximo turno.`),
    ability(herois,"Tamanho de Duende",["Duende"],`Escolha seu tamanho. Minúsculo: +5 em Furtividade, -5 em manobras, usa armas reduzidas, deslocamento 6m e Força -1. Pequeno: +2 em Furtividade, -2 em manobras e deslocamento 6m. Médio: sem modificadores e deslocamento 9m. Grande: -2 em Furtividade, +2 em manobras, usa armas aumentadas, deslocamento 9m e Destreza -1.`),
    ability(herois,"Dons de Duende",["Duende"],`Escolha dois atributos diferentes e receba +1 em cada um. Se sua natureza for animal, um desses bônus pode ser aplicado no mesmo atributo escolhido pela natureza animal.`),
    ability(herois,"Presentes de Magia e Caos",["Duende"],`Escolha três presentes: Afinidade Elemental, Encantar Objetos, Enfeitiçar, Invisibilidade, Língua da Natureza, Maldição, Mais Lá do que Aqui, Metamorfose Animal, Sonhos Proféticos, Velocidade do Pensamento, Visão Feérica ou Voo. Todos são mágicos; quando permitirem resistência, a CD é Carisma, salvo indicação em contrário. Uma vez por patamar, você pode escolher um presente no lugar de um poder de classe.`),
    ability(herois,"Aversão a Ferro",["Duende"],`Você sofre 1 ponto de dano adicional por dado de dano de ataques com armas de ferro ou aço e sofre 1d6 pontos de dano por rodada se estiver empunhando ou vestindo um item de ferro ou aço.`),
    ability(herois,"Aversão a Sinos",["Duende"],`Se escutar o badalar de um sino, você fica alquebrado e esmorecido até o fim da cena. No início de qualquer cena em ambiente urbano com igreja ou templo, role 1d6; em resultado 1, você escuta um sino badalando.`),
    ability(herois,"Tabu",["Duende"],`Você possui um tabu criado junto com o mestre. Em regras, seu tabu impõe -5 em Diplomacia, Iniciativa, Luta ou Percepção, à sua escolha. Se desrespeitar o tabu, fica fatigado por um dia; se continuar desrespeitando no dia seguinte, fica exausto; no terceiro dia, morre.`),

    ability(herois,"Sabedoria +2, Carisma +1, Força -1",["Eiradaan"],"Modificadores de atributos de eiradaan."),
    ability(herois,"Essência Feérica",["Eiradaan"],"Você é uma criatura do tipo espírito, recebe visão na penumbra e pode falar com animais livremente."),
    ability(herois,"Magia Instintiva",["Eiradaan"],`Você pode usar Sabedoria no lugar do atributo-chave de magias arcanas e Misticismo. Além disso, quando lança uma magia, recebe +1 PM para gastar em aprimoramentos; este benefício não é cumulativo com outros efeitos que fornecem PM para aprimoramentos.`),
    ability(herois,"Sentidos Místicos",["Eiradaan"],"Você está sempre sob o efeito básico da magia Visão Mística."),
    ability(herois,"Canção da Melancolia",["Eiradaan"],"Quando faz um teste de Vontade contra efeitos mentais, você rola dois dados e usa o pior resultado."),

    ability(herois,"Força +1, Constituição +1, +1 em um atributo, Carisma -1",["Galokk"],"Modificadores de atributos de galokk."),
    ability(herois,"Força dos Titãs",["Galokk"],`Quando acerta um ataque corpo a corpo ou de arremesso, você pode gastar 1 PM. Se fizer isso, sempre que rolar o resultado máximo em um dado de dano da arma, role um dado extra, até um limite de dados extras igual à sua Força.`,"1 PM"),
    ability(herois,"Meio-Gigante",["Galokk"],"Você é uma criatura do tipo humanoide (gigante). Seu tamanho é Grande e você pode usar Força como atributo-chave de Intimidação."),
    ability(herois,"Infância entre os Pequenos",["Galokk"],"Você se torna treinado em uma perícia a sua escolha."),

    ability(herois,"Inteligência +1, +1 em dois atributos (exceto Constituição)",["Meio-Elfo"],"Modificadores de atributos de meio-elfo."),
    ability(herois,"Ambição Herdada",["Meio-Elfo"],"Você recebe um poder geral ou poder único de origem a sua escolha."),
    ability(herois,"Entre Dois Mundos",["Meio-Elfo"],"Você recebe +1 em perícias baseadas em Carisma."),
    ability(herois,"Sangue Élfico",["Meio-Elfo"],"Você recebe visão na penumbra e +1 PM a cada nível ímpar, incluindo o 1º. Além disso, é considerado um elfo para efeitos relacionados a raça."),

    ability(herois,"Carisma +2, Destreza +1, Sabedoria -1",["Sátiro"],"Modificadores de atributos de sátiro."),
    ability(herois,"Festeiro Feérico",["Sátiro"],"Você é uma criatura do tipo espírito, recebe visão na penumbra e +2 em Atuação e Fortitude."),
    ability(herois,"Instrumentista Mágico",["Sátiro"],"Se estiver empunhando um instrumento musical, você pode lançar Amedrontar, Enfeitiçar, Hipnotismo e Sono com Carisma como atributo-chave. Caso aprenda novamente uma dessas magias, seu custo diminui em -1 PM."),
    ability(herois,"Marrada",["Sátiro"],`Você possui uma arma natural de marrada (dano 1d6, crítico x2, impacto). Uma vez por rodada, quando usa a ação agredir para atacar com outra arma, pode gastar 1 PM para fazer um ataque corpo a corpo extra com a marrada.`,"1 PM"),
    ability(herois,"Pernas Caprinas",["Sátiro"],"Seu deslocamento é 12m e você pode usar Destreza como atributo-chave de Atletismo em vez de Força."),

    ability(ameacas,"Força +2, Destreza +1, Carisma -1",["Bugbear"],"Modificadores de atributos de bugbear."),
    ability(ameacas,"Empunhadura Poderosa",["Bugbear"],"Ao usar uma arma feita para uma categoria de tamanho maior que a sua, a penalidade que você sofre nos testes de ataque diminui para -2. Caso receba esta habilidade novamente, a penalidade diminui para 0 e você pode usar armas de até duas categorias maiores com -5 nos testes de ataque."),
    ability(ameacas,"Saborear Pavor",["Bugbear"],"Você pode usar Força como atributo-chave de Intimidação. Além disso, se estiver em alcance curto de outra criatura abalada ou apavorada, recebe em testes de ataque um bônus igual à penalidade causada pela condição."),
    ability(ameacas,"Sentidos de Predador",["Bugbear"],"Você recebe faro e visão no escuro."),

    ability(ameacas,"Sabedoria +2, Força +1, Inteligência -1",["Centauro"],"Modificadores de atributos de centauro."),
    ability(ameacas,"Avantajado",["Centauro"],"Seu tamanho é Grande e seu deslocamento é 12m."),
    ability(ameacas,"Cascos",["Centauro"],`Você possui uma arma natural de cascos (dano 1d8, crítico x2, impacto). Uma vez por rodada, quando usa a ação agredir para atacar com outra arma, pode gastar 1 PM para fazer um ataque corpo a corpo extra com os cascos.`,"1 PM"),
    ability(ameacas,"Ginete Natural",["Centauro"],"Você é considerado montado para investidas e benefícios das armas que empunha, e pode escolher Carga de Cavalaria sem cumprir seus pré-requisitos. Entretanto, não pode se beneficiar de montaria e, se estiver carregando um cavaleiro, sofre -2 em testes e é considerado em condição ruim para lançar magias."),
    ability(ameacas,"Medo de Altura",["Centauro","Ceratops"],"Se estiver adjacente a uma queda de 3m ou mais, como um buraco ou penhasco, você fica abalado."),

    ability(ameacas,"Constituição +2, Força +1, Destreza -1, Inteligência -1",["Ceratops"],"Modificadores de atributos de ceratops."),
    ability(ameacas,"Chifres",["Ceratops"],`Você possui uma arma natural de chifres (dano 1d8, crítico x2, perfuração). Uma vez por rodada, quando usa a ação agredir para atacar com outra arma, pode gastar 1 PM para fazer um ataque corpo a corpo extra com os chifres.`,"1 PM"),
    ability(ameacas,"Papel Tribal",["Ceratops"],"Você é treinado em uma perícia a sua escolha entre Cura, Intimidação, Ofício ou Sobrevivência."),
    ability(ameacas,"Paquidérmico",["Ceratops"],"Seu tamanho é Grande. Você recebe +1 na Defesa e pode usar Força como atributo-chave de Intimidação."),

    ability(ameacas,"Destreza +2, Constituição +1, Inteligência -1",["Elfo-do-mar"],"Modificadores de atributos de elfo-do-mar."),
    ability(ameacas,"Arsenal do Oceano",["Elfo-do-mar"],"Você recebe proficiência em arpão, rede e tridente e +2 em testes de ataque com essas armas. Se receber proficiência em uma dessas armas novamente, pode considerá-la uma arma leve."),
    ability(ameacas,"Cria das Águas",["Elfo-do-mar"],"Você possui deslocamento de natação igual ao seu deslocamento em terra e visão na penumbra. Quando está dentro d'água, recebe percepção às cegas, +2 na Defesa e +2 em Furtividade e Sobrevivência."),
    ability(ameacas,"Dependência de Água",["Elfo-do-mar"],"Se permanecer mais de um dia sem contato com água, você não recupera PM com descanso até voltar para a água ou tomar um bom banho."),

    ability(ameacas,"Inteligência +2, Constituição +1, Força -1",["Finntroll"],"Modificadores de atributos de finntroll."),
    ability(ameacas,"Corpo Vegetal",["Finntroll"],"Você é uma criatura do tipo monstro e recebe natureza vegetal e visão no escuro."),
    ability(ameacas,"Presença Arcana",["Finntroll"],"Você recebe +2 em Misticismo e resistência a magia +2."),
    ability(ameacas,"Regeneração Vegetal",["Finntroll"],"Uma vez por rodada, você pode gastar 1 PM para recuperar 5 PV. Esta habilidade não cura dano de ácido ou fogo.","1 PM"),
    ability(ameacas,"Intolerância a Luz",["Finntroll"],"Você recebe sensibilidade a luz e, quando exposto à luz do sol ou similar, não consegue ativar sua Regeneração Vegetal."),

    ability(ameacas,"Constituição +2, Sabedoria +1, Inteligência -1",["Gnoll"],"Modificadores de atributos de gnoll."),
    ability(ameacas,"Faro",["Gnoll","Minauro"],"Contra inimigos em alcance curto que não possa ver, você não fica desprevenido e camuflagem total causa apenas 20% de chance de falha."),
    ability(ameacas,"Mordida",["Gnoll"],`Você possui uma arma natural de mordida (dano 1d6, crítico x2, perfuração). Uma vez por rodada, quando usa a ação agredir para atacar com outra arma, pode gastar 1 PM para fazer um ataque corpo a corpo extra com a mordida.`,"1 PM"),
    ability(ameacas,"Oportunista",["Gnoll"],"Você recebe +2 nas rolagens de dano contra criaturas que tenham sofrido dano de outras criaturas desde seu último turno."),
    ability(ameacas,"Rendição",["Gnoll"],"Quando um inimigo se rende, você recebe 1d4 PM temporários cumulativos. Da mesma forma, quando é reduzido a um quarto de seus PV ou menos, seu instinto é se render; caso continue lutando, fica alquebrado."),

    ability(ameacas,"Força +1, Carisma -1, Chassi e Tamanho",["Golem"],"Modificadores de atributos de golens despertos: Força +1 e Carisma -1, cumulativos com Chassi e Tamanho."),
    ability(ameacas,"Chassi Expandido",["Golem"],`Você leva um dia para vestir ou remover armadura, pois precisa acoplá-la ao seu chassi; a armadura acoplada não conta no limite de itens vestidos. Escolha um material: barro, bronze, carne, espelhos, ferro, gelo eterno, pedra ou sucata. Cada material altera atributos e concede características próprias.`),
    ability(ameacas,"Criatura Artificial",["Golem"],"Você é uma criatura do tipo construto, recebe visão no escuro e imunidade a cansaço, efeitos metabólicos e veneno. Não precisa respirar, alimentar-se ou dormir, mas não se beneficia de cura mundana nem de alimentação. Precisa ficar inerte por 8 horas por dia para recuperar PV e PM em descanso normal. Cura não funciona em você, mas Ofício (artesão) pode substituí-la."),
    ability(ameacas,"Fonte de Energia",["Golem"],"Escolha alquímica, elemental, sagrada ou vapor. Alquímica permite ingerir item alquímico para recuperar 1 PM. Elemental concede imunidade e cura com dano mágico do elemento escolhido. Sagrada concede uma magia divina de 1º círculo com Sabedoria. Vapor concede imunidade a fogo, impulso de deslocamento com fogo, fraqueza a frio e sopro de vapor escaldante."),
    ability(ameacas,"Propósito de Criação",["Golem"],"Você não escolhe origem, mas recebe um poder geral a sua escolha."),
    ability(ameacas,"Tamanho de Golem",["Golem"],"Escolha seu tamanho. Pequeno concede Destreza +1. Médio não concede ajustes. Grande impõe Destreza -1."),

    ability(ameacas,"Destreza +2, Carisma +1, Inteligência -1",["Harpia"],"Modificadores de atributos de harpia."),
    ability(ameacas,"Asas de Abutre",["Harpia"],"Você possui asas no lugar dos braços e das mãos. Pode pairar a 1,5m do chão com deslocamento 12m, ignorando terreno difícil e ficando imune a dano por queda se estiver consciente. Se não estiver usando armadura pesada, pode gastar 1 PM por rodada para voar 12m.","1 PM/rodada"),
    ability(ameacas,"Cria de Masmorra",["Harpia"],"Você é uma criatura do tipo monstro, recebe visão no escuro e +2 em Intimidação e Sobrevivência."),
    ability(ameacas,"Grito Aterrorizante",["Harpia"],"Você pode gastar uma ação padrão e 1 PM para emitir um grito estridente. Criaturas em alcance curto ficam abaladas; Vontade CD Carisma evita.","1 PM","Padrão"),
    ability(ameacas,"Pés Rapinantes",["Harpia","Pteros"],"Seus pés podem ser usados como mãos ou como duas armas naturais de garras (dano 1d6 cada, crítico x2, corte). Uma vez por rodada, quando usa a ação agredir para atacar com uma arma, pode gastar 1 PM para fazer um ataque corpo a corpo extra com uma garra livre que ainda não tenha sido usada no turno. Também pode usar as garras para habilidades que exijam arma secundária.","1 PM"),

    ability(ameacas,"Constituição +2, Destreza +1, Carisma -1",["Hobgoblin"],"Modificadores de atributos de hobgoblin."),
    ability(ameacas,"Arte da Guerra",["Hobgoblin"],"Você é treinado em Guerra e recebe proficiência em armas marciais. Se receber essa proficiência novamente, recebe +2 em rolagens de dano com essas armas."),
    ability(ameacas,"Metalurgia Hobgoblin",["Hobgoblin"],"Você recebe +2 em Ofício (armeiro) e, se for treinado nesta perícia, pode fabricar armas e armaduras superiores com uma melhoria. Se aprender a fabricar itens superiores desses tipos por outra habilidade, gasta apenas 1/4 do preço das melhorias nesses itens."),
    ability(ameacas,"Táticas de Guerrilha",["Hobgoblin"],"Você recebe visão no escuro e +2 em Furtividade."),

    ability(ameacas,"+2 em um atributo ou +1 em dois atributos",["Kallyanach"],"Modificadores de atributos de kallyanach."),
    ability(ameacas,"Herança Dracônica",["Kallyanach"],"Você é uma criatura do tipo monstro e recebe redução 5 contra um tipo de dano a sua escolha entre ácido, eletricidade, fogo, frio, luz ou trevas."),
    ability(ameacas,"Bênção de Kallyadranoch",["Kallyanach"],`Escolha dois poderes: Armamento Kallyanach, Asas Dracônicas, Escamas Elementais, Prática Arcana, Sentidos Dracônicos ou Sopro de Dragão. Uma vez por patamar, você pode escolher uma bênção no lugar de um poder de classe.`),

    ability(ameacas,"Força +2, Constituição +1, Carisma -2",["Kaijin"],"Modificadores de atributos de kaijin."),
    ability(ameacas,"Couraça Rubra",["Kaijin"],"Você recebe redução de dano 2. Sua couraça conta como um poder da Tormenta, exceto para perda de Carisma."),
    ability(ameacas,"Cria da Tormenta",["Kaijin"],"Você é uma criatura do tipo monstro e recebe +5 em testes de resistência contra efeitos causados por lefeu e pela Tormenta. Além disso, efeitos da Tormenta que não afetem lefou também não afetam você."),
    ability(ameacas,"Disforme",["Kaijin"],"Por sua anatomia anômala, você não pode empunhar nem vestir itens, a menos que sejam mágicos ou especialmente adaptados para você. Adaptar um item demora um dia e custa 50% do preço do item, sem contar melhorias. Seus itens iniciais e os recebidos por origem ou habilidades já são adaptados. Esta habilidade conta como poder da Tormenta, exceto para perda de Carisma."),
    ability(ameacas,"Terror Vivo",["Kaijin"],"Você pode usar Força como atributo-chave de Intimidação e recebe um poder da Tormenta a sua escolha, que não conta para perda de Carisma."),

    ability(ameacas,"Destreza +2, Constituição +1, Carisma -1",["Kappa"],"Modificadores de atributos de kappa."),
    ability(ameacas,"Alma da Água",["Kappa"],"Você é uma criatura do tipo espírito e tem deslocamento de natação igual ao seu deslocamento terrestre."),
    ability(ameacas,"Carapaça Kappa",["Kappa"],"Você não pode ser flanqueado e recebe cobertura leve se estiver submerso ou caído. Você soma sua Constituição na Defesa, limitado pelo seu nível, mas apenas se não estiver usando armaduras pesadas. Se já faz isso por outra habilidade, recebe +2 na Defesa em vez disso."),
    ability(ameacas,"Cura das Águas",["Kappa"],"Você pode lançar Curar Ferimentos com Sabedoria como atributo-chave. Caso aprenda novamente essa magia, seu custo diminui em -1 PM. Você não pode usar esta habilidade se a água de sua cabeça estiver derramada."),
    ability(ameacas,"Tigela D'água",["Kappa"],"Sempre que falhar por 5 ou mais em um teste para evitar ser agarrado, derrubado ou empurrado, derrama a água da cabeça. Você fica enjoado até encher a tigela novamente, o que exige uma fonte de água e uma ação padrão."),

    ability(ameacas,"Destreza +2, Força -1",["Kobolds"],"Modificadores de atributos de kobolds."),
    ability(ameacas,"Ajuntamento Escamoso",["Kobolds"],"Embora sejam um grupo de kobolds, para todos os efeitos vocês são uma única criatura Média com dois braços. Contam como Pequenos para espaços por onde podem passar e, quando fazem resistência contra efeito que afeta apenas uma criatura e não causa dano, rolam dois dados e usam o melhor. Têm vulnerabilidade a dano de área."),
    ability(ameacas,"Praga Monstruosa",["Kobolds"],"Vocês são criaturas do tipo monstro e recebem visão no escuro e +2 em Sobrevivência."),
    ability(ameacas,"Sensibilidade a Luz",["Kobolds"],"Quando expostos à luz do sol ou similar, vocês ficam ofuscados."),
    ability(ameacas,"Talentos do Bando",["Kobolds"],`Escolham dois talentos: Amontoados, Armadilha Terrível, Diferentão, Ex-Familiar, O Ousado, Os do Fundo, Organizadinhos, Pestes Oportunistas, Somos Explosivos ou Tática de Enxame. Uma vez por patamar, podem escolher outro talento no lugar de um poder de classe.`),

    ability(ameacas,"Mashin (chassi)",["Mashin","Golem"],"Mashins são golens especiais criados com técnicas tamuranianas. Como chassi, você recebe +1 em dois atributos a sua escolha, torna-se treinado em duas perícias a sua escolha e pode substituir uma dessas perícias por uma maravilha mecânica. Você é sempre Médio."),
    ability(ameacas,"Maravilha Mecânica",["Mashin","Golem"],`Se escolher uma maravilha mecânica, recebe um dos poderes: Adaptação Elemental, Arma Acoplada, Arma Elemental, Auxílio de Mira, Caminho da Perfeição, Canalizar Reparos, Canhão Energético, Dínamo de Mana, Pernas Aprimoradas ou Reservatório Alquímico. Uma vez por patamar, pode escolher uma maravilha mecânica no lugar de um poder de classe.`),

    ability(ameacas,"Força +2, +1 em outro atributo (exceto Carisma)",["Meio-orc"],"Modificadores de atributos de meio-orc."),
    ability(ameacas,"Adaptável",["Meio-orc"],"Você recebe +2 em Intimidação e se torna treinado em uma perícia a sua escolha."),
    ability(ameacas,"Criatura das Profundezas",["Meio-orc"],"Você recebe visão no escuro e +2 em Percepção e Sobrevivência realizados no subterrâneo."),
    ability(ameacas,"Sangue Orc",["Meio-orc"],"Você recebe +1 em rolagens de dano com armas corpo a corpo e de arremesso e é considerado um orc para efeitos relacionados a raça."),

    ability(ameacas,"Força +1, +1 em dois atributos",["Minauro"],"Modificadores de atributos de minauro."),
    ability(ameacas,"Mente Aberta",["Minauro"],"Você recebe +2 em Diplomacia e Investigação."),
    ability(ameacas,"Plurivalente",["Minauro"],"Você recebe um poder geral a sua escolha."),

    ability(ameacas,"Herança Moreau",["Moreau"],"Escolha uma das heranças moreau. Ela representa sua ascendência e determina suas demais habilidades de raça. Além disso, você também é considerado humano para quaisquer fins."),
    ability(ameacas,"Moreau: Herança da Coruja",["Moreau"],"Sabedoria +1 e +1 em dois atributos. Você recebe Espreitador, Garras e Sapiência: visão no escuro, +2 em Percepção e Vontade, duas garras naturais e uma magia de adivinhação de 1º círculo com Sabedoria como atributo-chave."),
    ability(ameacas,"Moreau: Herança da Hiena",["Moreau"],"Sabedoria +1 e +1 em dois atributos. Você recebe Destemor, Faro e Mordida: +2 em dano e resistências contra criaturas maiores, faro e mordida natural 1d6."),
    ability(ameacas,"Moreau: Herança da Raposa",["Moreau"],"Inteligência +1 e +1 em dois atributos. Você recebe deslocamento 12m, visão na penumbra, +2 em duas perícias originalmente baseadas em Inteligência ou Carisma e faro."),
    ability(ameacas,"Moreau: Herança da Serpente",["Moreau"],"Inteligência +1 e +1 em dois atributos. Você recebe deslocamento de escalada 6m, +2 em Furtividade, +2 em agarrar e dano contra criaturas agarradas, visão no escuro, +2 em Diplomacia e +2 na CD de seus efeitos mentais."),
    ability(ameacas,"Moreau: Herança do Búfalo",["Moreau"],"Força +1 e +1 em dois atributos. Você recebe chifres naturais 1d6, faro e Marrada Impressionante: +2 em ataques em investida e testes para empurrar, e pode usar Força como atributo-chave de Intimidação."),
    ability(ameacas,"Moreau: Herança do Coelho",["Moreau"],"Destreza +1 e +1 em dois atributos. Você recebe deslocamento 12m, não precisa correr em linha reta em investidas ou testes de Atletismo para correr, pode gastar 1 PM para rolar dois dados em perícias de Destreza e usar o melhor, além de visão na penumbra e +2 em Percepção e Reflexos.","1 PM"),
    ability(ameacas,"Moreau: Herança do Crocodilo",["Moreau"],"Constituição +1 e +1 em dois atributos. Você recebe mordida natural 1d6 com +2 em agarrar, deslocamento de natação 6m, +1 na Defesa, +2 em Furtividade e, uma vez por cena, pode gastar 1 PM para realizar uma ação de movimento adicional.","1 PM"),
    ability(ameacas,"Moreau: Herança do Gato",["Moreau"],"Carisma +1 e +1 em dois atributos. Você soma Carisma em testes de Constituição para estabilizar sangramento e em Acrobacia, reduz dano de queda em 3d6 se consciente, recebe duas garras naturais e visão na penumbra com +2 em Furtividade e Percepção."),
    ability(ameacas,"Moreau: Herança do Leão",["Moreau"],"Força +1 e +1 em dois atributos. Você recebe mordida natural 1d8, pode gastar uma ação de movimento e 1 PM para impor -2 em dano de inimigos em alcance curto por 1 rodada, e recebe visão na penumbra e +2 em Intimidação e Percepção.","1 PM","Movimento"),
    ability(ameacas,"Moreau: Herança do Lobo",["Moreau"],"Carisma +1 e +1 em dois atributos. Você recebe faro, mordida natural 1d6 e +2 nas rolagens de dano e na margem de ameaça contra oponentes que esteja flanqueando."),
    ability(ameacas,"Moreau: Herança do Morcego",["Moreau"],"Destreza +1 e +1 em dois atributos. Você pode pairar com deslocamento 9m, gastar 1 PM por rodada para voar 12m se não estiver usando armadura pesada, recebe visão no escuro, +2 em Furtividade e Percepção e pode gastar 1 PM para receber percepção às cegas em alcance médio por 1 rodada.","1 PM"),
    ability(ameacas,"Moreau: Herança do Urso",["Moreau"],"Constituição +1 e +1 em dois atributos. Você é Grande, pode usar Constituição como atributo-chave de Intimidação, recebe faro e mordida natural 1d8."),

    ability(ameacas,"For +1, Des +1, Con +1 (macho); Int +1, Sab +1, Car +1 (fêmea)",["Nagah"],"Modificadores de atributos de nagah."),
    ability(ameacas,"Cauda",["Nagah"],`Você possui uma arma natural de cauda (dano 1d6, crítico x2, impacto). Uma vez por rodada, quando usa a ação agredir para atacar com outra arma, pode gastar 1 PM para fazer um ataque corpo a corpo extra com a cauda.`,"1 PM"),
    ability(ameacas,"Inocência Dissimulada",["Nagah"],"Você recebe +2 em Enganação e pode gastar 2 PM para substituir um teste de perícia originalmente baseada em Inteligência, Sabedoria ou Carisma por Enganação.","2 PM"),
    ability(ameacas,"Presentes de Sszzaas",["Nagah"],"Você recebe visão na penumbra, +1 na Defesa e resistência a veneno +5."),
    ability(ameacas,"Fraquezas Ofídicas",["Nagah"],"Você sofre 1 ponto de dano adicional por dado de dano de frio e -5 em testes de resistência contra Músicas de bardo."),

    ability(ameacas,"Constituição +2, Destreza +1, Inteligência -1",["Nezumi"],"Modificadores de atributos de nezumi."),
    ability(ameacas,"Empunhadura Poderosa",["Nezumi"],"Ao usar uma arma feita para uma categoria de tamanho maior que a sua, a penalidade nos testes de ataque diminui para -2. Caso receba esta habilidade novamente, a penalidade diminui para 0."),
    ability(ameacas,"Pequeno, Mas Não Metade",["Nezumi"],"Seu tamanho é Pequeno, mas seu deslocamento continua 9m. Você recebe resistência a medo +5 contra criaturas maiores que você e +2 em Intimidação."),
    ability(ameacas,"Roedor",["Nezumi"],`Você possui uma arma natural de mordida (dano 1d6, crítico x2, corte). Uma vez por rodada, quando usa a ação agredir para atacar com outra arma, pode gastar 1 PM para fazer um ataque corpo a corpo extra com a mordida. Quando faz um acerto crítico com a mordida, deixa a armadura da vítima avariada ou, se ela estiver sem armadura, aumenta em +1 o multiplicador desse crítico.`,"1 PM"),
    ability(ameacas,"Sentidos Murídeos",["Nezumi"],"Você recebe faro e visão na penumbra."),

    ability(ameacas,"Força +3, Constituição +2, Inteligência -1, Carisma -1",["Ogro"],"Modificadores de atributos de ogro."),
    ability(ameacas,"Quanto Maior o Tamanho...",["Ogro"],"Você é um humanoide do subtipo gigante; seu tamanho é Grande e você recebe visão na penumbra."),
    ability(ameacas,"...Maior a Porrada!",["Ogro"],"Quando acerta um ataque corpo a corpo, você pode gastar 1 PM para causar +1d8 pontos de dano do mesmo tipo.","1 PM"),
    ability(ameacas,"Camada de Ingenuidade",["Ogro"],"Você sofre -5 em Intuição e Vontade."),

    ability(ameacas,"Força +2, Constituição +1, Inteligência -1",["Orc"],"Modificadores de atributos de orc."),
    ability(ameacas,"Feroz",["Orc"],"Você recebe +2 em rolagens de dano com armas corpo a corpo e de arremesso. Quando sofre dano de um inimigo, esse bônus se torna +4 até o fim do seu próximo turno."),
    ability(ameacas,"Habitante das Cavernas",["Orc"],"Você recebe visão no escuro e +2 em Percepção e Sobrevivência realizados no subterrâneo. Entretanto, recebe sensibilidade a luz."),
    ability(ameacas,"Vigor Brutal",["Orc"],"Você recebe +2 em Fortitude e soma sua Força em seu total de PV."),

    ability(ameacas,"Sabedoria +2, Destreza +1, Inteligência -1",["Pteros"],"Modificadores de atributos de pteros."),
    ability(ameacas,"Ligação Natural",["Pteros"],"Você possui uma ligação mental com uma criatura inteligente. Vocês podem se comunicar mentalmente em alcance longo e sempre sabem em que direção e distância podem encontrar o outro. Você pode trocar a criatura vinculada no início de cada aventura."),
    ability(ameacas,"Mãos Rudimentares",["Pteros"],"Suas mãos não permitem que você empunhe itens, a menos que sejam mágicos ou especialmente adaptados para você. Adaptar item demora um dia e custa 50% do preço do item, sem contar melhorias. Seus itens iniciais e os recebidos por origem ou habilidades já são adaptados."),
    ability(ameacas,"Senhor dos Céus",["Pteros"],"Você pode pairar a 1,5m do chão com deslocamento 9m, ignorando terreno difícil e ficando imune a dano por queda se consciente. Se não estiver usando armadura pesada, pode gastar 1 PM por rodada para voar 12m. Ao abrir as asas para pairar ou voar, ocupa o espaço de uma criatura de uma categoria de tamanho maior.","1 PM/rodada"),
    ability(ameacas,"Sentidos Rapinantes",["Pteros"],"Você recebe visão na penumbra e +2 em Percepção e Sobrevivência."),

    ability(ameacas,"+1 em três atributos diferentes (exceto Constituição), Constituição -1",["Soterrado"],"Modificadores de atributos de soterrado."),
    ability(ameacas,"Natureza Esquelética",["Soterrado"],"Você é morto-vivo, recebe visão no escuro e imunidade a cansaço, efeitos metabólicos, trevas e veneno. Não respira, come ou dorme; cura de luz causa dano e dano de trevas recupera PV."),
    ability(ameacas,"Preço da Não Vida",["Soterrado"],"Você precisa passar oito horas sob luz de estrelas ou no subterrâneo para recuperar PV e PM em descanso normal. Caso contrário, sofre efeitos de fome."),
    ability(ameacas,"Abraço Gélido",["Soterrado"],"Você recebe +2 em testes para agarrar. Além disso, seus ataques desarmados e com armas naturais causam +2 pontos de dano de frio."),
    ability(ameacas,"Esquife de Gelo",["Soterrado"],"Você recebe redução de corte e perfuração 5 e redução de frio 10. Entretanto, sofre 1 ponto de dano adicional por dado de dano de fogo."),

    ability(ameacas,"Constituição +2, Força +1, Carisma -1",["Tabrachi"],"Modificadores de atributos de tabrachi."),
    ability(ameacas,"Batráquio",["Tabrachi"],"Você recebe visão na penumbra e deslocamento de natação igual ao seu deslocamento terrestre."),
    ability(ameacas,"Linguarudo",["Tabrachi"],`Sua língua é uma arma natural que pode atacar inimigos a até 3m (dano 1d4, crítico x2, impacto). Ela é versátil, fornecendo +2 em testes para desarmar e derrubar. Uma vez por rodada, quando usa a ação agredir com outra arma, pode gastar 1 PM para fazer um ataque corpo a corpo extra com a língua.`,"1 PM"),
    ability(ameacas,"Saltador",["Tabrachi"],"Você recebe +10 em testes de Atletismo para saltar."),

    ability(ameacas,"Destreza +2, Inteligência +1",["Tengu"],"Modificadores de atributos de tengu."),
    ability(ameacas,"Asas Desorientadoras",["Tengu"],"Quando estão livres, suas asas podem distrair oponentes. Se não estiver usando-as para voar, você recebe os benefícios de Finta Aprimorada. Se já tiver esse poder, o bônus em Enganação para fintar aumenta para +5."),
    ability(ameacas,"Caminhante do Céu",["Tengu"],"Você pode pairar a 1,5m do chão com deslocamento 9m, ignorando terreno difícil e ficando imune a dano por queda se consciente. Pode gastar 1 PM por rodada para voar 12m. Quando paira ou voa, ocupa o espaço de uma criatura de uma categoria de tamanho maior.","1 PM/rodada"),
    ability(ameacas,"Espírito Corvino",["Tengu"],"Você é uma criatura do tipo espírito e recebe visão no escuro e +2 em Percepção."),

    ability(ameacas,"Constituição +2, Força +1, Destreza -1, Inteligência -1",["Troganão","Trog Anão"],"Modificadores de atributos de trog anão."),
    ability(ameacas,"Mau Cheiro",["Troganão","Trog Anão"],"Você expele um gás fétido. Todas as criaturas, exceto trogs, em alcance curto ficam enjoadas por 1d6 rodadas; Fortitude evita. Uma criatura que passe fica imune por um dia. Veneno.","","Padrão"),
    ability(ameacas,"Sangue Frio",["Troganão","Trog Anão"],"Você sofre 1 ponto de dano adicional por dado de dano de frio."),
    ability(ameacas,"Quase Anão",["Troganão","Trog Anão"],"Você é uma criatura do tipo monstro, recebe visão no escuro e +1 PV por nível. Seu deslocamento é 6m, mas não é reduzido por armadura ou excesso de carga."),

    ability(ameacas,"Destreza +2, Sabedoria +1, Inteligência -1",["Velocis"],"Modificadores de atributos de velocis."),
    ability(ameacas,"Através de Espinheiros",["Velocis"],"Você recebe redução de corte e perfuração 2 e não sofre redução em seu deslocamento por terreno difícil natural."),
    ability(ameacas,"Sentidos Selvagens",["Velocis","Voracis"],"Você recebe +2 em Sobrevivência, visão na penumbra e faro. Contra inimigos em alcance curto que não possa ver, não fica desprevenido e camuflagem total causa apenas 20% de chance de falha."),
    ability(ameacas,"Velocista da Planície",["Velocis"],"Seu deslocamento é 12m. Você pode usar Destreza como atributo-chave de Atletismo e, quando faz testes de Atletismo para correr ou saltar, pode rolar dois dados e usar o melhor resultado."),

    ability(ameacas,"Destreza +2, Constituição +1, Inteligência -1",["Voracis"],"Modificadores de atributos de voracis."),
    ability(ameacas,"Garras",["Voracis"],`Suas mãos são duas armas naturais de garras (dano 1d6 cada, crítico x2, corte). Uma vez por rodada, quando usa a ação agredir para atacar com uma arma, pode gastar 1 PM para fazer um ataque corpo a corpo extra com uma garra livre que ainda não tenha sido usada no turno. Também pode usar as garras para habilidades que exijam arma secundária.`,"1 PM"),
    ability(ameacas,"Rainha da Selva",["Voracis"],"Você recebe deslocamento de escalada 9m, +2 em Atletismo e recupera +1 PV por nível quando descansa."),

    ability(ameacas,"+1 em três atributos diferentes (exceto Carisma), Carisma -2",["Yidishan"],"Modificadores de atributos de yidishan."),
    ability(ameacas,"Híbrido Mecânico",["Yidishan"],"Você é uma criatura do tipo construto, recebe visão no escuro e imunidade a cansaço, efeitos metabólicos e veneno. Não precisa respirar, alimentar-se ou dormir, mas não se beneficia de alimentação e efeitos de cura mundana são reduzidos pela metade em você. Precisa ficar inerte por 8 horas por dia para recuperar PV e PM em descanso normal."),
    ability(ameacas,"Natureza Orgânica",["Yidishan"],"Você se torna treinado em uma perícia ou recebe um poder geral a sua escolha. Como alternativa, pode ser yidishan de outra raça humanoide além de humano; nesse caso, ganha uma habilidade dessa raça a sua escolha. Se a raça era de tamanho diferente de Médio, você também possui essa categoria de tamanho."),
    ability(ameacas,"Peças Metálicas",["Yidishan"],"As partes mecânicas que complementam seu corpo fornecem +2 na Defesa, mas impõem penalidade de armadura -2.")
  ];

  const keys=new Set(powers.map(power=>`${power.source}|${power.name}|${power.races.join("/")}`));
  window.T20_POWER_CATALOG=(window.T20_POWER_CATALOG||[]).filter(power=>!keys.has(`${power.source}|${power.name}|${(power.races||[]).join("/")}`));
  window.T20_POWER_CATALOG.push(...powers);
})();
