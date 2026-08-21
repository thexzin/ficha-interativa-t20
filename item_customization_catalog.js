;(function(){
  const JDA="Jogo do Ano",HDA="Heróis de Arton",DDA="Deuses de Arton",ADA="Ameaças de Arton";
  const all=["weapon","armor","shield","tool","clothing","esoteric","accessory"];
  const improvement=(id,name,types,description,effects={},group="",source=JDA,page="")=>({id,name,types,description,effects,group,source,page});
  const enchantment=(id,name,types,description,effects={},group="",source=JDA,page="")=>({id,name,types,description,effects,group,source,page});

  const improvements=[
    improvement("banhado-ouro","Banhado a ouro",all,"+2 em Diplomacia.",{skills:{Diplomacia:2}}),
    improvement("cravejado-gemas","Cravejado de gemas",all,"+2 em Enganação.",{skills:{Enganação:2}}),
    improvement("discreto","Discreto",all,"Ocupa 1 espaço a menos (mínimo 1) e é mais fácil de ocultar.",{spaces:-1}),
    improvement("macabro","Macabro",all,"+2 em Intimidação e -2 em Diplomacia.",{skills:{Intimidação:2,Diplomacia:-2}}),
    improvement("certeira","Certeira",["weapon"],"+1 em testes de ataque.",{attack:1},"weaponAttack"),
    improvement("pungente","Pungente",["weapon"],"+2 em testes de ataque; exige Certeira.",{attack:2},"weaponAttack"),
    improvement("cruel","Cruel",["weapon"],"+1 nas rolagens de dano.",{damage:1},"weaponDamage"),
    improvement("atroz","Atroz",["weapon"],"+2 nas rolagens de dano; exige Cruel.",{damage:2},"weaponDamage"),
    improvement("equilibrada","Equilibrada",["weapon"],"+2 em testes de manobra feitos com a arma."),
    improvement("harmonizada","Harmonizada",["weapon"],"Reduz em 1 PM o custo de uma habilidade de ataque escolhida."),
    improvement("injecao-alquimica","Injeção alquímica",["weapon"],"Permite carregar e aplicar um preparado alquímico ao acertar."),
    improvement("macica","Maciça",["weapon"],"Aumenta o multiplicador de crítico em 1.",{critMultiplier:1}),
    improvement("mira-telescopica","Mira telescópica",["weapon"],"Aumenta o alcance útil da arma e de certos ataques à distância."),
    improvement("precisa","Precisa",["weapon"],"Aumenta a margem de ameaça em 1.",{critRange:1}),
    improvement("ajustada","Ajustada",["armor","shield"],"Reduz a penalidade de armadura em 1.",{armorPenalty:-1},"armorPenalty"),
    improvement("sob-medida","Sob medida",["armor","shield"],"Reduz a penalidade de armadura em 2; exige Ajustada.",{armorPenalty:-2},"armorPenalty"),
    improvement("delicada","Delicada",["armor"],"Armadura pesada permite aplicar até 1 ponto de atributo na Defesa."),
    improvement("espinhosa","Espinhosa",["armor"],"Causa dano ao agarrar ou ser agarrado."),
    improvement("espinhoso","Espinhoso",["shield"],"Aumenta o dano de ataques feitos com o escudo."),
    improvement("polida","Polida",["armor","shield"],"Fornece +5 na Defesa na primeira rodada do combate."),
    improvement("reforcada","Reforçada",["armor","shield"],"+1 na Defesa e +1 na penalidade de armadura.",{defense:1,armorPenalty:1}),
    improvement("selada","Selada",["armor"],"+1 em testes de resistência.",{resistance:1}),
    improvement("canalizador","Canalizador",["esoteric"],"+1 no limite de PM de magias.",{pmLimit:1}),
    improvement("energetico","Energético",["esoteric"],"Magias de dano causam +1d6 de dano."),
    improvement("harmonizado","Harmonizado",["esoteric"],"Reduz em 1 PM o custo de uma magia escolhida."),
    improvement("poderoso","Poderoso",["esoteric"],"+1 na CD de magias.",{spellCd:1}),
    improvement("vigilante","Vigilante",["esoteric"],"+2 na Defesa.",{defense:2}),
    improvement("aprimorado","Aprimorado",["tool","clothing"],"+1 em uma perícia escolhida.",{chosenSkill:1})
  ];

  improvements.push(
    improvement("balistico","Balístico",["shield"],"Ao atacar com o escudo, gaste uma bala para causar +2d6 de dano. Armazena 2 balas; recarregar exige uma ação completa. Pré-requisito: Reforçado.",{},"",HDA,"p. 239"),
    improvement("brasonado","Brasonado",["tool","clothing","accessory"],"No primeiro teste de Diplomacia para mudar atitude na cena, pode usar outra perícia beneficiada pelo item. Incompatível com Discreto.",{},"",HDA,"p. 239"),
    improvement("deslumbrante","Deslumbrante",["armor","clothing"],"+1 na CD de habilidades baseadas em Carisma. Pré-requisito: Banhado a ouro ou Cravejado de gemas.",{},"",HDA,"p. 239"),
    improvement("farpada","Farpada",["weapon"],"Críticos com armas de corte ou perfuração causam sangramento e impõem -5 no teste para removê-lo. Pré-requisito: Cruel.",{},"",HDA,"p. 239"),
    improvement("fosforo","Fósforo",["weapon"],"Munição: reduz o dano em um passo e deixa o alvo ofuscado por 1 rodada ao acertar.",{},"",HDA,"p. 239"),
    improvement("guarda","Guarda",["weapon"],"Arma corpo a corpo: +1 na Defesa e em testes contra manobras.",{defense:1},"",HDA,"p. 239"),
    improvement("incendiaria","Incendiária",["weapon"],"Munição: causa +1 de fogo e deixa o alvo em chamas se o ataque acertar por 5 ou mais.",{extraDamageFlat:1},"",HDA,"p. 239"),
    improvement("injetora","Injetora",["armor"],"Permite gastar uma ação de movimento para ingerir uma poção ou preparado armazenado; comporta 1 dose.",{},"",HDA,"p. 240"),
    improvement("potencializador","Potencializador",["esoteric"],"+2 no limite de PM para lançar magias. Pré-requisito: Canalizador.",{pmLimit:2},"",HDA,"p. 240"),
    improvement("pressurizada","Pressurizada",["weapon"],"Após pressurizar com uma ação completa, concede +2 no próximo teste de ataque e na rolagem de dano.",{},"",HDA,"p. 240"),
    improvement("prudente","Prudente",["armor"],"Com a regra de falhas críticas, uma vez por dia permite rolar duas vezes na tabela e escolher o resultado.",{},"",HDA,"p. 240"),
    improvement("usado","Usado",["tool","clothing","accessory"],"Uma vez por dia, permite rolar novamente um 1 natural em teste de perícia feito com o item.",{},"",HDA,"p. 240"),

    improvement("canonico","Canônico",["weapon","armor","shield","tool","clothing","accessory"],"Se você for devoto da divindade inscrita, +1 na CD de suas habilidades mágicas.",{},"",DDA,"p. 54"),
    improvement("conduite","Conduíte",["weapon"],"Reduz em 1 PM o custo de Abençoar Arma usado nesta arma.",{},"",DDA,"p. 54"),
    improvement("devotado","Devotado",["weapon","armor","shield","tool","clothing","accessory"],"Reduz em 1 PM o custo de um poder concedido escolhido. Pré-requisito: Inscrito.",{},"",DDA,"p. 54"),
    improvement("diligente","Diligente",["armor","shield","tool","clothing","accessory"],"Reduz em 1 PM o custo de Prece de Combate.",{},"",DDA,"p. 54"),
    improvement("inscrito","Inscrito",["armor","shield","tool","clothing","accessory"],"Conta como símbolo sagrado da divindade inscrita e fornece +1 em testes de resistência.",{resistance:1},"",DDA,"p. 54"),

    improvement("multifuncional","Multifuncional",["tool","clothing"],"Um item que modifica uma perícia passa a funcionar também para outra perícia com o mesmo atributo-chave.",{},"",ADA,"p. 399"),
    improvement("penetrante","Penetrante",["weapon"],"A arma ignora 5 pontos de redução de dano. Pré-requisito: Cruel.",{},"",ADA,"p. 399")
  );

  const materials=[
    {id:"",name:"Sem material especial",types:all,description:"",source:JDA},
    {id:"adamante",name:"Adamante",types:["weapon","armor","shield"],description:"Aumenta o dano de armas; armaduras e escudos fornecem RD.",effects:{},source:JDA},
    {id:"aco-rubi",name:"Aço-rubi",types:["weapon","armor","shield","esoteric"],description:"Material antimagia com efeitos que dependem do tipo de item.",effects:{},source:JDA},
    {id:"gelo-eterno",name:"Gelo eterno",types:["weapon","armor","shield"],description:"Armas causam +2 de frio; proteções concedem resistência a fogo.",effects:{extraDamageFlat:2},source:JDA},
    {id:"madeira-tollon",name:"Madeira Tollon",types:["weapon","shield","esoteric"],description:"Reduz custos de certas habilidades ou ajuda contra magia.",effects:{},source:JDA},
    {id:"materia-vermelha",name:"Matéria vermelha",types:all,description:"Afeta perícias de Carisma; armas causam +1d6 de dano adicional.",effects:{extraDamage:"1d6"},source:JDA},
    {id:"mitral",name:"Mitral",types:["weapon","armor","shield","esoteric"],description:"Ocupa menos espaço; melhora ameaça de armas e reduz penalidade de proteções.",effects:{spaces:-1},source:JDA},
    {id:"casco-monstro",name:"Casco de monstro",types:["weapon","armor","shield","esoteric"],description:"Armas contam como primitivas. Proteções reduzem a penalidade em 1; armaduras pesadas permitem aplicar 1 ponto de Destreza. Esotéricos concedem RD 5 contra o próximo dano após lançar magia.",effectsByType:{armor:{armorPenalty:-1},shield:{armorPenalty:-1}},source:ADA,page:"p. 399"},
    {id:"couraca-kaiju",name:"Couraça de kaiju",types:["weapon","armor","shield","esoteric"],description:"Material raríssimo. Aumenta o dano de armas em um passo; proteções concedem RD/mágico; esotéricos ajudam magias a ignorar efeitos de redução de dano.",effectsByType:{shield:{rd:10}},effectsByArmorWeight:{light:{rd:10},heavy:{rd:20}},source:ADA,page:"p. 399"},
    {id:"couro-bulette",name:"Couro de bulette",types:["armor","esoteric"],description:"Armaduras concedem escavação e redução de ácido; esotéricos permitem repetir resultados 1 no dano de magias de ácido.",source:ADA,page:"p. 399"},
    {id:"cristal-sol",name:"Cristal de sol",types:["weapon","armor","shield","esoteric"],description:"Armas de corte ou perfuração causam +2 de fogo; proteções dão vantagem contra frio; esotéricos aprimoram magias de fogo.",effectsByType:{weapon:{extraDamageFlat:2}},source:ADA,page:"p. 400"},
    {id:"lanajuste",name:"Lanajuste",types:["weapon","armor","shield","esoteric"],description:"Armas ignoram penalidades submersas; proteções concedem redução de corte; esotéricos permitem repetir resultados 1 em dano mágico de corte.",source:ADA,page:"p. 400"},
    {id:"pena-kraken",name:"Pena de kraken",types:["weapon","armor","shield","esoteric"],description:"Críticos de armas aumentam o dano em dois passos; proteções ferem quem erra ataques corpo a corpo; em esotéricos, bônus numéricos aumentam em 1.",source:ADA,page:"p. 400"},
    {id:"prata",name:"Prata",types:["weapon","armor","shield","esoteric"],description:"Concede benefícios contra espíritos e mortos-vivos. Pode ser combinada com outro material, mas ambos contam como melhoria.",source:ADA,page:"p. 400"},
    {id:"quitina-razza",name:"Quitina razza",types:["weapon","armor","shield","esoteric"],description:"Armas e esotéricos explodem dados máximos. Proteções aumentam Defesa e Percepção.",effectsByType:{shield:{defense:1,skills:{Percepção:2}}},effectsByArmorWeight:{light:{defense:1,skills:{Percepção:2}},heavy:{defense:2,skills:{Percepção:5}}},source:ADA,page:"p. 401"}
  ];

  const weaponEnchantments=[
    enchantment("ameacadora","Ameaçadora",["weapon"],"Dobra a margem de ameaça da arma.",{doubleThreat:true}),
    enchantment("anticriatura","Anticriatura",["weapon"],"Efeito adicional contra um tipo de criatura escolhido."),
    enchantment("arremesso","Arremesso",["weapon"],"Pode ser arremessada e retorna ao usuário."),
    enchantment("assassina","Assassina",["weapon"],"Torna a arma especialmente letal contra alvos desprevenidos."),
    enchantment("cacadora","Caçadora",["weapon"],"Ajuda a localizar e ferir um tipo de criatura escolhido."),
    enchantment("congelante","Congelante",["weapon"],"Causa +1d6 de dano de frio.",{extraDamage:"1d6"}),
    enchantment("conjuradora","Conjuradora",["weapon"],"Armazena uma magia para ser descarregada ao acertar."),
    enchantment("corrosiva","Corrosiva",["weapon"],"Causa +1d6 de dano de ácido.",{extraDamage:"1d6"}),
    enchantment("dancarina","Dançarina",["weapon"],"Pode lutar sozinha por tempo limitado."),
    enchantment("defensora","Defensora",["weapon"],"+2 na Defesa enquanto empunhada.",{defense:2},"weaponDefense"),
    enchantment("destruidora","Destruidora",["weapon"],"Causa dano aumentado contra objetos."),
    enchantment("dilacerante","Dilacerante",["weapon"],"Críticos causam +10 de dano."),
    enchantment("drenante","Drenante",["weapon"],"Pode drenar energia vital em acertos críticos."),
    enchantment("eletrica","Elétrica",["weapon"],"Causa +1d6 de dano elétrico.",{extraDamage:"1d6"}),
    enchantment("energetica","Energética",["weapon"],"+4 em ataques e ignora redução de dano.",{attack:4},"magicAttack"),
    enchantment("excruciante","Excruciante",["weapon"],"Pode impor uma condição dolorosa ao alvo."),
    enchantment("flamejante","Flamejante",["weapon"],"Causa +1d6 de dano de fogo.",{extraDamage:"1d6"}),
    enchantment("formidavel","Formidável",["weapon"],"+2 em testes de ataque e rolagens de dano.",{attack:2,damage:2},"magicAttack"),
    enchantment("lancinante","Lancinante",["weapon"],"Aprimora o dano de acertos críticos; exige Dilacerante."),
    enchantment("magnifica","Magnífica",["weapon"],"+4 em testes de ataque e rolagens de dano; exige Formidável.",{attack:4,damage:4},"magicAttack"),
    enchantment("piedosa","Piedosa",["weapon"],"Causa +1d8 de dano não letal.",{extraDamage:"1d8"}),
    enchantment("profana","Profana",["weapon"],"Causa +2d8 de trevas contra certas criaturas.",{conditionalExtraDamage:"2d8"}),
    enchantment("sagrada","Sagrada",["weapon"],"Causa +2d8 de luz contra certas criaturas.",{conditionalExtraDamage:"2d8"}),
    enchantment("sanguinaria","Sanguinária",["weapon"],"Pode causar sangramento."),
    enchantment("trovejante","Trovejante",["weapon"],"Pode atordoar em acertos críticos."),
    enchantment("tumular","Tumular",["weapon"],"Causa +1d8 de dano de trevas.",{extraDamage:"1d8"}),
    enchantment("veloz","Veloz",["weapon"],"Permite realizar um ataque adicional."),
    enchantment("venenosa","Venenosa",["weapon"],"Produz e aplica veneno mágico.")
  ];

  const armorEnchantments=[
    enchantment("abascanto","Abascanto",["armor","shield"],"+5 em testes de resistência contra magia."),
    enchantment("abencoado","Abençoado",["armor","shield"],"Protege contra necromancia e dano de trevas."),
    enchantment("acrobatico","Acrobático",["armor"],"+5 em Acrobacia e ignora a penalidade do item nessa perícia.",{skills:{Acrobacia:5}}),
    enchantment("alado","Alado",["armor"],"Concede deslocamento de voo."),
    enchantment("animado","Animado",["shield"],"O escudo flutua, mantendo as mãos livres."),
    enchantment("assustador","Assustador",["armor","shield"],"Pode amedrontar inimigos."),
    enchantment("caustico","Cáustico",["armor","shield"],"Protege contra ácido e pode ferir atacantes."),
    enchantment("defensor","Defensor",["armor","shield"],"Aumenta a Defesa do item em +2.",{defense:2},"magicDefense"),
    enchantment("escorregadio","Escorregadio",["armor"],"+10 em testes de Acrobacia para escapar."),
    enchantment("esmagador","Esmagador",["shield"],"+2 em ataques com o escudo e aumenta seu dano."),
    enchantment("fantasmagorico","Fantasmagórico",["armor","shield"],"Pode assumir forma espectral."),
    enchantment("fortificado","Fortificado",["armor"],"Pode negar acertos críticos e ataques furtivos."),
    enchantment("gelido","Gélido",["armor","shield"],"Concede resistência a frio."),
    enchantment("guardiao","Guardião",["armor","shield"],"Aumenta a Defesa do item em +4; exige Defensor.",{defense:4},"magicDefense"),
    enchantment("hipnotico","Hipnótico",["armor","shield"],"Pode fascinar criaturas próximas."),
    enchantment("ilusorio","Ilusório",["armor","shield"],"Pode alterar sua aparência."),
    enchantment("incandescente","Incandescente",["armor","shield"],"Concede resistência a fogo."),
    enchantment("invulneravel","Invulnerável",["armor","shield"],"Fornece RD 5 em armadura ou RD 2 em escudo.",{}),
    enchantment("opaco","Opaco",["armor","shield"],"Protege contra luz e efeitos visuais."),
    enchantment("protetor","Protetor",["armor","shield"],"+2 em testes de resistência.",{resistance:2}),
    enchantment("refletor","Refletor",["shield"],"Pode refletir certos ataques e magias."),
    enchantment("relampejante","Relampejante",["armor","shield"],"Concede resistência a eletricidade."),
    enchantment("reluzente","Reluzente",["armor","shield"],"Pode emitir luz intensa."),
    enchantment("sombrio","Sombrio",["armor"],"+5 em Furtividade e ignora a penalidade do item nessa perícia.",{skills:{Furtividade:5}}),
    enchantment("zeloso","Zeloso",["armor","shield"],"Pode proteger um aliado próximo.")
  ];

  const heroWeaponEnchantments=[
    enchantment("alvorada","Alvorada",["weapon"],"+1d8 de luz contra mortos-vivos e criaturas sensíveis à luz; pode cegar uma criatura próxima.",{},"",HDA,"p. 256"),
    enchantment("anatema","Anátema",["weapon"],"Uma criatura atingida sofre -2 na CD de suas habilidades mágicas por 1 rodada.",{},"",HDA,"p. 256"),
    enchantment("brumosa","Brumosa",["weapon"],"Após acertar um ataque, você recebe camuflagem leve por 1 rodada.",{},"",HDA,"p. 256"),
    enchantment("cantante","Cantante",["weapon"],"+2 em Atuação; pode conceder +1 em ataques a você e aliados em alcance curto por 1 rodada.",{skills:{Atuação:2}},"",HDA,"p. 256"),
    enchantment("ciclonica","Ciclônica",["weapon"],"+2 contra manobras; pode criar uma rajada que empurra criaturas.",{},"",HDA,"p. 256"),
    enchantment("crescente","Crescente",["weapon"],"Arma corpo a corpo: por 2 PM, aumenta o dano em um passo e o alcance em 1,5m até o fim do turno.",{},"",HDA,"p. 256"),
    enchantment("cristalina","Cristalina",["weapon"],"Causa +1d6 de luz e pode deixar o alvo ofuscado.",{extraDamage:"1d6"},"",HDA,"p. 256"),
    enchantment("cronal","Cronal",["weapon"],"Por 3 PM, role dois dados no ataque e use o melhor; o próximo atacante rola dois e usa o pior. Pré-requisito: Formidável.",{},"",HDA,"p. 256"),
    enchantment("cuidadora","Cuidadora",["weapon"],"Errar concede +2 na Defesa por 1 rodada; pode gastar 2 PM para receber RD 10 contra um dano.",{},"",HDA,"p. 256"),
    enchantment("espreitadora","Espreitadora",["weapon"],"Por 2 PM, pode deixar o oponente desprevenido contra o ataque.",{},"",HDA,"p. 256"),
    enchantment("frenetica","Frenética",["weapon"],"Ao acertar, pode gastar 1 PM para receber +1 em ataque e dano com a arma na cena, cumulativo até +5.",{},"",HDA,"p. 256"),
    enchantment("gargula","Gárgula",["weapon"],"Por 2 PM, convoca uma gárgula como parceiro combatente iniciante até o fim da cena.",{},"",HDA,"p. 256"),
    enchantment("horrenda","Horrenda",["weapon"],"+2 em Intimidação e -1 PM no custo de habilidades de medo.",{skills:{Intimidação:2}},"",HDA,"p. 256"),
    enchantment("infestada","Infestada",["weapon"],"Ao acertar, pode liberar um enxame que causa dano de veneno e pode deixar o alvo enjoado.",{},"",HDA,"p. 256"),
    enchantment("manafaga","Manáfaga",["weapon"],"Ao acertar, pode drenar PM do alvo e receber 1 PM temporário. Pré-requisito: Formidável.",{},"",HDA,"p. 256"),
    enchantment("indignada","Indignada",["weapon"],"Errar concede +2 no próximo teste de ataque feito até o fim da cena.",{},"",HDA,"p. 256"),
    enchantment("rebote","Rebote",["weapon"],"Erros acumulam até 3 cargas; o próximo acerto causa +1d6 por carga.",{},"",HDA,"p. 256"),
    enchantment("reflexiva","Reflexiva",["weapon"],"Pode gastar PM para refletir uma magia que tenha você como alvo. Pré-requisito: Cristalina.",{},"",HDA,"p. 257"),
    enchantment("ressonante","Ressonante",["weapon"],"Ao acertar, pode causar metade do dano como dano psíquico a outra criatura em alcance curto.",{},"",HDA,"p. 257"),
    enchantment("sepulcral","Sepulcral",["weapon"],"Ao ativar Tumular e acertar, impede a recuperação de PV do alvo por 1d4 rodadas. Pré-requisito: Tumular.",{},"",HDA,"p. 257"),
    enchantment("sombria-arma","Sombria",["weapon"],"+2 em Furtividade enquanto empunhada e permite lançar Escuridão.",{skills:{Furtividade:2}},"",HDA,"p. 257"),
    enchantment("vampirica","Vampírica",["weapon"],"Por 1 PM, causa +2d6 de trevas e cura você na mesma quantidade.",{},"",HDA,"p. 257")
  ];

  const heroProtectionEnchantments=[
    enchantment("abissal","Abissal",["armor","shield"],"Redução de ácido e fogo 10; pode ferir uma criatura adjacente com um desses tipos.",{},"",HDA,"p. 258"),
    enchantment("ancorada","Ancorada",["armor"],"+5 em Atletismo para escalar e pode conceder deslocamento de escalada 12m.",{},"",HDA,"p. 258"),
    enchantment("anulador","Anulador",["armor","shield"],"Pode gastar 3 PM por círculo para anular uma magia que tenha você como alvo. Pré-requisito: Abascanto.",{},"",HDA,"p. 258"),
    enchantment("arboreo","Arbóreo",["armor","shield"],"Resistência a magia divina +5 e permite lançar Controlar Plantas.",{},"",HDA,"p. 258"),
    enchantment("astuto","Astuto",["armor","shield"],"+5 em Intuição e Percepção; pode detectar criaturas escondidas ou invisíveis.",{skills:{Intuição:5,Percepção:5}},"",HDA,"p. 258"),
    enchantment("densa","Densa",["armor"],"Reduz em 3m o deslocamento de inimigos próximos e pode deixá-los abalados e lentos.",{},"",HDA,"p. 258"),
    enchantment("egide","Égide",["armor","shield"],"+5 na Defesa do item contra ataques à distância e pode ignorar um desses ataques uma vez por cena.",{},"",HDA,"p. 258"),
    enchantment("enraizada","Enraizada",["armor"],"+5 contra derrubar e empurrar; pode receber +5 contra outros efeitos de movimento.",{},"",HDA,"p. 258"),
    enchantment("esmerico","Esmérico",["armor","shield"],"Redução de ácido 10 e resistência a veneno +5; pode estender a proteção a aliados.",{},"",HDA,"p. 258"),
    enchantment("estigio","Estígio",["armor","shield"],"Uma vez por cena, ao chegar a 0 PV, pode gastar 5 PM para ficar com 1 PV. Pré-requisito: Abençoado.",{},"",HDA,"p. 258"),
    enchantment("etereo","Etéreo",["armor","shield"],"Uma vez por cena, pode gastar 3 PM para ficar incorpóreo por 1 rodada.",{},"",HDA,"p. 259"),
    enchantment("geomantico","Geomântico",["armor","shield"],"RD 10/impacto, fortificação 25% e permite lançar Controlar Terra.",{},"",HDA,"p. 259"),
    enchantment("ligeira","Ligeira",["armor"],"Pode ser vestida ou removida com uma ação livre.",{},"",HDA,"p. 259"),
    enchantment("luminescente","Luminescente",["armor","shield"],"Permite lançar Luz e pode cegar criaturas com sensibilidade a luz.",{},"",HDA,"p. 259"),
    enchantment("pristino","Prístino",["armor","shield"],"Resistência a necromancia e veneno +5; pode remover doença, enjoo ou veneno.",{},"",HDA,"p. 259"),
    enchantment("purificador","Purificador",["armor","shield"],"Resistência a medo e efeitos mentais +5; ajuda aliados a repetir testes contra esses efeitos.",{},"",HDA,"p. 259"),
    enchantment("reanimador","Reanimador",["armor","shield"],"Permite lançar Curar Ferimentos; se já conhecer a magia, reduz o custo em 1 PM.",{},"",HDA,"p. 259"),
    enchantment("replicante","Replicante",["armor","shield"],"Ao sofrer ataque corpo a corpo, pode causar 2d6 do mesmo tipo ao atacante e reduzir o dano nessa quantidade.",{},"",HDA,"p. 259"),
    enchantment("resiliente","Resiliente",["armor","shield"],"Resistência a atordoamento, paralisia e petrificação +5; permite repetir testes contra essas condições.",{},"",HDA,"p. 259"),
    enchantment("vortice","Vórtice",["armor","shield"],"Por 1 PM, puxa uma criatura em alcance curto para um ponto adjacente.",{},"",HDA,"p. 259")
  ];

  const heroEsotericEnchantments=[
    enchantment("abafador","Abafador",["esoteric"],"Alvos que falham contra suas magias sofrem -2 na CD de suas habilidades por 1 rodada.",{},"",HDA,"p. 260"),
    enchantment("belico","Bélico",["esoteric"],"Magias de dano causam +1d10 de essência.",{},"",HDA,"p. 260"),
    enchantment("caridoso","Caridoso",["esoteric"],"Ao lançar magia em aliado, concede 1 PM temporário para aprimorar a próxima magia na cena.",{},"",HDA,"p. 260"),
    enchantment("chocante","Chocante",["esoteric"],"Magias elétricas causam um dado extra e deixam o alvo ofuscado.",{},"",HDA,"p. 260"),
    enchantment("clemente","Clemente",["esoteric"],"Magias de cura curam um dado extra do mesmo tipo.",{},"",HDA,"p. 260"),
    enchantment("contido","Contido",["esoteric"],"Por +1 PM, uma magia de dano passa a causar dano não letal.",{},"",HDA,"p. 260"),
    enchantment("embusteiro","Embusteiro",["esoteric"],"Permite usar Magia Discreta; se já possui o poder, reduz seu custo e melhora a ocultação da magia.",{},"",HDA,"p. 260"),
    enchantment("emergencial","Emergencial",["esoteric"],"Uma vez por rodada, pode lançar uma magia de cura como reação quando alguém próximo sofre dano.",{},"",HDA,"p. 260"),
    enchantment("encadeado","Encadeado",["esoteric"],"Uma vez por cena, ao reduzir um inimigo a 0 PV, causa metade do dano da magia a outro inimigo.",{},"",HDA,"p. 260"),
    enchantment("escultor","Escultor",["esoteric"],"Por 1 PM, troca a área de uma magia entre cone e linha.",{},"",HDA,"p. 260"),
    enchantment("frugal","Frugal",["esoteric"],"Pode reduzir a CD de uma magia em 2 para reduzir seu custo em 2 PM.",{},"",HDA,"p. 261"),
    enchantment("glacial","Glacial",["esoteric"],"Magias de frio causam um dado extra e deixam os alvos vulneráveis.",{},"",HDA,"p. 261"),
    enchantment("imperioso","Imperioso",["esoteric"],"Reduz em uma categoria a ação para comandar efeitos de magias.",{},"",HDA,"p. 261"),
    enchantment("implacavel","Implacável",["esoteric"],"Por +2 PM, permite afetar alvo visto sem linha de efeito. Pré-requisito: outro encanto.",{},"",HDA,"p. 261"),
    enchantment("incriminador","Incriminador",["esoteric"],"Uma vez por cena, cria a ilusão de que outra criatura lançou sua magia.",{},"",HDA,"p. 261"),
    enchantment("inflamavel","Inflamável",["esoteric"],"Magias de fogo causam um dado extra e deixam o alvo em chamas.",{},"",HDA,"p. 261"),
    enchantment("inquisidor","Inquisidor",["esoteric"],"Aumenta a CD de magias divinas contra não devotos da divindade marcada.",{},"",HDA,"p. 261"),
    enchantment("insistente","Insistente",["esoteric"],"Efeitos aplicados ao lançar uma magia de dano contínuo também valem na segunda rodada.",{},"",HDA,"p. 261"),
    enchantment("khalmyrita","Khalmyrita",["esoteric"],"Em efeitos variáveis, permite usar a média em vez de rolar. Incompatível com Nímbico.",{},"",HDA,"p. 261"),
    enchantment("majestoso","Majestoso",["esoteric"],"+1 na CD de magias arcanas, ou +2 se possuir a habilidade Magias. Pré-requisito: outro encanto.",{spellCd:1},"",HDA,"p. 261"),
    enchantment("nimbico","Nímbico",["esoteric"],"Permite rolar novamente dados de efeitos variáveis, com risco de perder PM. Incompatível com Khalmyrita.",{},"",HDA,"p. 261"),
    enchantment("pulverizante","Pulverizante",["esoteric"],"Pode desintegrar criaturas reduzidas a 0 PV. Incompatível com Contido; pré-requisito: outro encanto.",{},"",HDA,"p. 261"),
    enchantment("retaliador","Retaliador",["esoteric"],"Dano evitado por suas magias aumenta a CD da próxima magia de dano.",{},"",HDA,"p. 261"),
    enchantment("sanguessuga","Sanguessuga",["esoteric"],"Se um inimigo falhar contra sua magia, você recebe 10 PV temporários.",{},"",HDA,"p. 261"),
    enchantment("traicoeiro","Traiçoeiro",["esoteric"],"Ao incluir um aliado em magia hostil, impõe -2 nos testes de resistência de todos os afetados.",{},"",HDA,"p. 261"),
    enchantment("verdugo","Verdugo",["esoteric"],"Na primeira vez que reduz um inimigo a 0 PV na cena, suas magias causam +1 por dado até o fim da cena.",{},"",HDA,"p. 261")
  ];

  const heroAccessoryEnchantments=[
    enchantment("aconchegante","Aconchegante",["clothing"],"Melhora o descanso em uma categoria.",{},"",HDA,"p. 262"),
    enchantment("ajudante","Ajudante",["tool"],"O bônus de perícia fornecido pela ferramenta aumenta em +2.",{},"",HDA,"p. 262"),
    enchantment("autoritario","Autoritário",["clothing"],"+2 em Intimidação e +2 na CD de efeitos de medo.",{skills:{Intimidação:2}},"",HDA,"p. 262"),
    enchantment("compacto","Compacto",["tool","clothing","accessory"],"O item não ocupa espaços.",{setSpaces:0},"",HDA,"p. 262"),
    enchantment("imaculado","Imaculado",["clothing"],"+2 em Diplomacia e +2 na CD de Aparência Inofensiva, Presença Aristocrática e efeitos similares.",{skills:{Diplomacia:2}},"",HDA,"p. 262"),
    enchantment("insinuante","Insinuante",["clothing"],"+2 em Enganação e +2 na CD de efeitos mentais.",{skills:{Enganação:2}},"",HDA,"p. 262"),
    enchantment("ligeiro","Ligeiro",["clothing","accessory"],"Pode ser vestido ou removido com uma ação livre.",{},"",HDA,"p. 262"),
    enchantment("prontidao","Prontidão",["tool","clothing","accessory"],"Se estiver em alcance curto, pode ser empunhado ou guardado como ação livre, inclusive durante uma reação.",{},"",HDA,"p. 262")
  ];

  const presetEffects={
    "amuleto da robustez":{attrs:{CON:2}},
    "anel da energia":{pmMax:5},
    "anel da protecao":{defense:2},
    "anel da vitalidade":{pvMax:10},
    "braceletes de bronze":{defense:4},
    "braceletes de ouro":{defense:8},
    "brincos da sagacidade":{attrs:{INT:1}},
    "cinto da forca do gigante":{attrs:{FOR:2}},
    "cinto do campeao":{attrs:{FOR:1}},
    "colar guardiao":{defense:5},
    "coroa majestosa":{attrs:{CAR:2}},
    "estola da serenidade":{attrs:{SAB:2}},
    "luvas da delicadeza":{attrs:{DES:1}},
    "manoplas da forca do ogro":{attrs:{FOR:1}},
    "manto da resistencia":{resistance:2},
    "manto do fascinio":{attrs:{CAR:1}},
    "mochila de carga":{load:10},
    "pingente da sensatez":{attrs:{SAB:1}},
    "pulseiras da celeridade":{attrs:{DES:2}},
    "tiara da sapiencia":{attrs:{INT:2}},
    "torque do vigor":{attrs:{CON:1}},
    "couraca do comando":{attrs:{CAR:1}},
    "pira postera":{attrs:{SAB:1}},
    "botas inquietas":{attrs:{CON:1}},
    "a joia da alma":{attrs:{INT:3}}
  };

  window.T20_ITEM_CUSTOMIZATION={
    improvements,
    materials,
    enchantments:[...weaponEnchantments,...armorEnchantments,...heroWeaponEnchantments,...heroProtectionEnchantments,...heroEsotericEnchantments,...heroAccessoryEnchantments],
    presetEffects,
    pricing:{
      improvements:[0,300,3000,9000,18000],
      enchantments:[0,18000,36000,72000],
      materials:{
        weapon:{"aco-rubi":6000,adamante:3000,"gelo-eterno":600,"madeira-tollon":1500,"materia-vermelha":1500,mitral:1500,"casco-monstro":750,lanajuste:600,prata:600},
        lightArmor:{"aco-rubi":3000,adamante:6000,"gelo-eterno":1500,"materia-vermelha":6000,mitral:3000,"casco-monstro":750,lanajuste:1500,prata:1500},
        heavyArmor:{"aco-rubi":6000,adamante:18000,"gelo-eterno":3000,"materia-vermelha":18000,mitral:12000,"casco-monstro":6000,lanajuste:3000,prata:3000},
        shield:{"aco-rubi":3000,adamante:6000,"gelo-eterno":1500,"madeira-tollon":1500,"materia-vermelha":6000,mitral:3000,"casco-monstro":750,lanajuste:1500,prata:1500},
        esoteric:{"aco-rubi":6000,adamante:3000,"gelo-eterno":3000,"madeira-tollon":1500,"materia-vermelha":3000,mitral:3000,"casco-monstro":6000,lanajuste:3000,prata:400}
      }
    }
  };
})();
