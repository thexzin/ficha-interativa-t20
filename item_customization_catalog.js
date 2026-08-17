;(function(){
  const all=["weapon","armor","shield","tool","clothing","esoteric"];
  const improvement=(id,name,types,description,effects={},group="")=>({id,name,types,description,effects,group});
  const enchantment=(id,name,types,description,effects={},group="")=>({id,name,types,description,effects,group});

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

  const materials=[
    {id:"",name:"Sem material especial",types:all,description:""},
    {id:"adamante",name:"Adamante",types:["weapon","armor","shield"],description:"Aumenta o dano de armas; armaduras e escudos fornecem RD.",effects:{}},
    {id:"aco-rubi",name:"Aço-rubi",types:["weapon","armor","shield","esoteric"],description:"Material antimagia com efeitos que dependem do tipo de item.",effects:{}},
    {id:"gelo-eterno",name:"Gelo eterno",types:["weapon","armor","shield"],description:"Armas causam +2 de frio; proteções concedem resistência a fogo.",effects:{extraDamageFlat:2}},
    {id:"madeira-tollon",name:"Madeira Tollon",types:["weapon","shield","esoteric"],description:"Reduz custos de certas habilidades ou ajuda contra magia.",effects:{}},
    {id:"materia-vermelha",name:"Matéria vermelha",types:all,description:"Afeta perícias de Carisma; armas causam +1d6 de dano adicional.",effects:{extraDamage:"1d6"}},
    {id:"mitral",name:"Mitral",types:["weapon","armor","shield","esoteric"],description:"Ocupa menos espaço; melhora ameaça de armas e reduz penalidade de proteções.",effects:{spaces:-1}}
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
    enchantments:[...weaponEnchantments,...armorEnchantments],
    presetEffects,
    pricing:{
      improvements:[0,300,3000,9000,18000],
      enchantments:[0,18000,36000,72000],
      materials:{
        weapon:{"aco-rubi":6000,adamante:3000,"gelo-eterno":600,"madeira-tollon":1500,"materia-vermelha":1500,mitral:1500},
        lightArmor:{"aco-rubi":3000,adamante:6000,"gelo-eterno":1500,"materia-vermelha":6000,mitral:3000},
        heavyArmor:{"aco-rubi":6000,adamante:18000,"gelo-eterno":3000,"materia-vermelha":18000,mitral:12000},
        shield:{"aco-rubi":3000,adamante:6000,"gelo-eterno":1500,"madeira-tollon":1500,"materia-vermelha":6000,mitral:3000},
        esoteric:{"aco-rubi":6000,adamante:3000,"gelo-eterno":3000,"madeira-tollon":1500,"materia-vermelha":3000,mitral:3000}
      }
    }
  };
})();
