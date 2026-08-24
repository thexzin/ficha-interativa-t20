(function(){
  const types=[
    {id:"centro_poder",name:"Centro de Poder",summary:"+1 PM para cada residente.",description:"Erguida sobre uma fonte de energia magica, sagrada ou feerica.",effects:{pmMax:1}},
    {id:"empreendimento",name:"Empreendimento",summary:"Pode gerar renda entre aventuras.",description:"A base tambem funciona como negocio. Um residente pode administra-la entre aventuras para gerar tibares."},
    {id:"esconderijo",name:"Esconderijo",summary:"+1 em testes de resistencia.",description:"Uma base oculta ou disfarcada, longe de olhos indiscretos.",effects:{resistance:1}},
    {id:"fortificacao",name:"Fortificacao",summary:"Seguranca +5 e +1 na Defesa.",description:"Uma estrutura fortificada ou localizada em um ponto de dificil acesso.",effects:{security:5,defense:1}},
    {id:"movel",name:"Movel",summary:"Deslocamento da base 12m e +1,5m de deslocamento aos residentes.",description:"Um veiculo terrestre ou aquatico que pode transportar o grupo.",effects:{movement:1.5}},
    {id:"residencia",name:"Residencia",summary:"+3 PV e um prato especial por aventura.",description:"Um lugar confortavel para repousar. Cada residente recebe +3 PV e pode obter um prato especial uma vez por aventura.",effects:{pvMax:3},uses:["Prato especial"]}
  ];

  const sizes=[
    {id:"minima",name:"Minima",cost:1000,maintenance:100,rooms:0},
    {id:"modesta",name:"Modesta",cost:3000,maintenance:300,rooms:3},
    {id:"basica",name:"Basica",cost:6000,maintenance:600,rooms:6},
    {id:"formidavel",name:"Formidavel",cost:10000,maintenance:1000,rooms:9},
    {id:"grandiosa",name:"Grandiosa",cost:15000,maintenance:1500,rooms:12},
    {id:"suprema",name:"Suprema",cost:21000,maintenance:2100,rooms:15}
  ];

  const rooms=[
    {id:"adega",name:"Adega",summary:"Preparados e pocoes ingeridos aumentam o efeito em +1 por dado.",description:"Um espaco subterraneo repleto de barris e garrafas que aprimora o uso de bebidas, preparados e pocoes.",tags:["situational"]},
    {id:"ala_criados",name:"Ala dos Criados",summary:"1d4 PM temporarios por patamar no inicio da aventura.",description:"Servicais ajudam cada residente a partir em boas condicoes. Os PM temporarios duram ate serem gastos.",minSize:"formidavel",uses:["Receber PM temporarios"]},
    {id:"armorial",name:"Armorial",summary:"Concede proficiencia com um item escolhido.",description:"Uma sala de armas e armaduras. A escolha de proficiencia pode ser trocada no inicio de cada aventura.",choice:"proficiency"},
    {id:"biblioteca",name:"Biblioteca",summary:"+1 em Conhecimento.",description:"Estantes recheadas de livros e pergaminhos.",effects:{skills:{"Conhecimento":1}}},
    {id:"calabouco",name:"Calabouco",summary:"+1 em Intimidacao e na CD de efeitos de medo.",description:"Um local para manter inimigos e criminosos trancafiados.",effects:{skills:{"Intimidacao":1}},special:["CD de efeitos de medo +1"]},
    {id:"camara_meditacao",name:"Camara de Meditacao",summary:"+1 em Vontade.",description:"Aposento isolado para meditacao e concentracao.",effects:{skills:{"Vontade":1}}},
    {id:"casa_guarda",name:"Casa da Guarda",summary:"Aumenta a Seguranca da Guarita em +4 e fornece capangas.",description:"Abriga uma guarnicao. Os guardas podem acompanhar um residente como pelotao de infantaria veterano.",minSize:"formidavel",requires:["guarita"],effects:{security:4},special:["Parceiro capanga veterano"]},
    {id:"chapelaria",name:"Chapelaria",summary:"Permite vestir um item adicional.",description:"Organiza chapeus, casacos e outras pecas para facilitar seu uso.",minSize:"formidavel",effects:{extraWorn:1}},
    {id:"cozinha",name:"Cozinha",summary:"Dois pratos especiais para viagem por aventura.",description:"No inicio de cada aventura, cada residente recebe os dois pratos escolhidos, que duram ate o fim da aventura ou ate serem consumidos.",uses:["Preparar refeicoes"]},
    {id:"domo_protetor",name:"Domo Protetor",summary:"Seguranca +2 e protecao contra ambientes inospitos.",description:"Uma cupula fisica ou magica que tambem permite que uma base movel entre em ambientes inospitos.",requires:["gabinete_mistico"],effects:{security:2}},
    {id:"despensa",name:"Despensa",summary:"Limite de carga +2 espacos.",description:"Armazena de forma organizada as provisoes do grupo.",effects:{load:2}},
    {id:"enfermaria",name:"Enfermaria",summary:"+1 em Cura, estancar sangramento e testes de morte.",description:"Um espaco preparado para curativos e tratamento de doencas.",effects:{skills:{"Cura":1}},special:["Testes para estancar sangramento +1","Testes de morte +1"]},
    {id:"estabulo",name:"Estabulo",summary:"Melhora um bonus de parceiro animal ou monstro em +1.",description:"Uma montaria pode receber +3m de deslocamento em vez do aumento de bonus.",choice:"partner"},
    {id:"estufa",name:"Estufa",summary:"+1 na CD de preparados e pocoes.",description:"Construcao envidracada para cultivar plantas e ervas raras.",special:["CD de preparados e pocoes +1"]},
    {id:"gabinete_mistico",name:"Gabinete Mistico",summary:"+1 em Misticismo.",description:"Escritorio isolado equipado para estudos arcanos.",effects:{skills:{"Misticismo":1}}},
    {id:"forjaria",name:"Forjaria",summary:"+1 no dano com um ataque escolhido.",description:"A escolha pode ser trocada no inicio de cada aventura.",requires:["oficina_trabalho"],choice:"damageAttack"},
    {id:"ginasio",name:"Ginasio",summary:"+1 em Atletismo e no dano desarmado ou com armas naturais.",description:"Sala equipada para treinos fisicos intensos.",effects:{skills:{"Atletismo":1},unarmedDamage:1}},
    {id:"guarita",name:"Guarita",summary:"Seguranca +4.",description:"Uma acomodacao de onde um guarda controla a entrada e a saida.",effects:{security:4}},
    {id:"jardim_ornamental",name:"Jardim Ornamental",summary:"+1 em Enganacao.",description:"Um ambiente propicio para conversas discretas.",effects:{skills:{"Enganacao":1}}},
    {id:"laboratorio_arcano",name:"Laboratorio Arcano",summary:"Reduz em 1 PM uma magia arcana escolhida.",description:"A magia e escolhida no inicio da aventura e recebe reducao de custo ate seu fim.",requires:["gabinete_mistico"],choice:"arcaneSpell"},
    {id:"lavanderia",name:"Lavanderia",summary:"Um item de vestuario fornece +1 adicional em sua pericia.",description:"A escolha pode ser trocada no inicio de cada aventura e acumula com melhorias.",choice:"clothingSkill"},
    {id:"memorial",name:"Memorial",summary:"O proximo personagem do jogador recebe +1 em um atributo se um residente morrer.",description:"Retratos e pertences preservam a memoria de companheiros caidos.",choice:"memorialAttribute"},
    {id:"observatorio",name:"Observatorio",summary:"Uma vez por aventura, role dois dados em um teste de pericia.",description:"Exige treinamento em Misticismo. O residente usa o melhor resultado.",uses:["Observar os astros"]},
    {id:"oficina_trabalho",name:"Oficina de Trabalho",summary:"+1 em um Oficio escolhido.",description:"Ferramentas e bancadas auxiliam o trabalho artesanal. A escolha pode ser trocada no inicio da aventura.",choice:"office"},
    {id:"oratorio",name:"Oratorio",summary:"+1 em Religiao.",description:"Um comodo preparado para oracoes e meditacao.",effects:{skills:{"Religiao":1}}},
    {id:"patio_treinamento",name:"Patio de Treinamento",summary:"+1 no teste de um ataque escolhido.",description:"Alvos e bonecos de palha permitem treinar com uma arma. A escolha pode ser trocada no inicio da aventura.",choice:"attack"},
    {id:"quarto_capitao",name:"Quarto do Capitao",summary:"Seguranca +2 e um parceiro veterano.",description:"Amplia a Casa da Guarda com aposentos para um oficial, elevando o total defensivo do conjunto.",requires:["casa_guarda"],effects:{security:2},special:["Parceiro veterano escolhido ao construir"]},
    {id:"sacada",name:"Sacada",summary:"+1 em Diplomacia.",description:"Uma area aberta que estimula a conversa.",effects:{skills:{"Diplomacia":1}}},
    {id:"sala_estar",name:"Sala de Estar",summary:"Pode receber ate tres mobilias.",description:"O coracao da base, usado para convivencia e descanso.",furnitureSlots:3},
    {id:"sala_guerra",name:"Sala de Guerra",summary:"+1 em Guerra e Iniciativa.",description:"Mapas, miniaturas e instrumentos permitem estudar batalhas.",effects:{skills:{"Guerra":1,"Iniciativa":1}}},
    {id:"sala_jogos",name:"Sala de Jogos",summary:"+1 em Jogatina e recupera 1 PM em resultados 1 relevantes.",description:"Jogos de azar e habilidade ensinam os residentes a lidar com reveses.",effects:{skills:{"Jogatina":1}},special:["Recupera 1 PM em um resultado 1 natural relevante"]},
    {id:"sala_mapas",name:"Sala de Mapas",summary:"+2 em buscas e perigos complexos de viagem.",description:"Mapas e instrumentos de navegacao auxiliam jornadas e exploracao.",special:["Buscas e perigos complexos de viagem +2"]},
    {id:"sala_perigo",name:"Sala de Perigo",summary:"+2 em testes da acao treinamento.",description:"Obstaculos, bonecos e construtos criam um espaco de pratica aventuresca.",requires:["sistema_seguranca"],special:["Acao treinamento +2"]},
    {id:"sala_tesouro",name:"Sala do Tesouro",summary:"+5% nas rolagens para definir tesouros aleatorios.",description:"Um aposento protegido para guardar os espolios do grupo.",special:["Rolagens de tesouro +5%"]},
    {id:"salao_baile",name:"Salao de Baile",summary:"+1 em Nobreza.",description:"Um aposento para festas elegantes e eventos formais.",effects:{skills:{"Nobreza":1}}},
    {id:"sauna",name:"Sauna",summary:"Uma vez por aventura, role dois dados em um teste de resistencia.",description:"Salas de vapor, piscinas e massagens ajudam os residentes a se recuperar.",minSize:"formidavel",uses:["Relaxar na sauna"]},
    {id:"sistema_seguranca",name:"Sistema de Seguranca",summary:"Seguranca +4 e +2 em resistencias contra armadilhas.",description:"Armadilhas mundanas ou magicas protegem a base e treinam seus residentes.",effects:{security:4},special:["Resistencias contra armadilhas +2"]},
    {id:"suite",name:"Suite",summary:"Ate dois residentes recebem +3 PV e descanso confortavel.",description:"Pode ser construida varias vezes. Cada unidade acomoda ate dois residentes.",minSize:"basica",repeatable:true,choice:"suite",effects:{assignedPvMax:3}},
    {id:"tabernaculo",name:"Tabernaculo",summary:"Reduz em 1 PM uma magia divina escolhida.",description:"Uma ampliacao do Oratorio para estudo de textos sacros.",requires:["oratorio"],choice:"divineSpell"},
    {id:"tablado",name:"Tablado",summary:"+1 em Atuacao.",description:"Um palco para ensaiar pecas, musicas e outras manifestacoes artisticas.",effects:{skills:{"Atuacao":1}}},
    {id:"vergel",name:"Vergel",summary:"+1 em Sobrevivencia.",description:"Um ambiente externo repleto de arvores e vegetacao.",effects:{skills:{"Sobrevivencia":1}}}
  ];

  const furniture=[
    {id:"armadura_decorativa",name:"Armadura Decorativa",price:2000,summary:"+1 na Defesa.",description:"Uma armadura em exposicao que lembra aos residentes dos perigos do mundo.",effects:{defense:1}},
    {id:"armario_remedios",name:"Armario de Remedios",price:2000,summary:"Preparados e pocoes de cura recuperam +1 PV por dado.",description:"Armazena e conserva medicamentos e suprimentos.",rooms:["enfermaria","estufa"],special:["Cura de preparados e pocoes +1 por dado"]},
    {id:"banheira",name:"Banheira",price:300,summary:"Uma vez por aventura, role dois dados em Fortitude.",description:"Afeta apenas os residentes que dormem na Suite em que esta instalada.",rooms:["suite"],uses:["Usar a banheira"]},
    {id:"bar",name:"Bar",price:1000,summary:"+1 PM.",description:"Um balcao para beber, conversar e relaxar.",rooms:["sala_estar","salao_baile","sala_jogos"],effects:{pmMax:1}},
    {id:"bau_reforcado",name:"Bau Reforcado",price:300,summary:"O bonus de carga da Despensa aumenta para +3.",description:"Uma caixa reforcada para provisoes e equipamento.",rooms:["despensa"],effects:{load:1}},
    {id:"bigorna",name:"Bigorna",price:500,summary:"Oficina fornece +3 em Oficio ou Forjaria fornece +2 no dano.",description:"Uma ferramenta basica e pesada para ferreiros.",rooms:["oficina_trabalho","forjaria"],effects:{contextUpgrade:2}},
    {id:"colchao_penas",name:"Colchao de Penas Exoticas",price:500,summary:"Os PV extras da Suite aumentam em +3.",description:"Um colchao de seda e penas raras que garante um sono reparador.",rooms:["suite"],effects:{assignedPvMax:3}},
    {id:"colmeia_pergaminhos",name:"Colmeia de Pergaminhos",price:2500,summary:"Conjuradores arcanos aprendem uma magia.",description:"Uma estante de pergaminhos de diversas tradicoes arcanas.",rooms:["biblioteca","gabinete_mistico"],choice:"arcaneSpellKnown"},
    {id:"criatura_empalhada",name:"Criatura Empalhada",price:1000,summary:"Dano adicional contra criaturas do tipo escolhido.",description:"O bonus e igual ao patamar da criatura cuja carcaca foi fornecida.",choice:"creatureType"},
    {id:"engenho_automatizado",name:"Engenho Automatizado",price:3000,summary:"Reduz pela metade o tempo de fabricar itens mundanos nao consumiveis.",description:"Uma maquina grande e barulhenta que otimiza processos de manufatura.",rooms:["oficina_trabalho"]},
    {id:"espelho_corpo",name:"Espelho de Corpo",price:2000,summary:"Mais vestuario ou +1 em pericias de Carisma.",description:"Na Chapelaria aumenta o limite de itens vestidos; na Suite fornece +1 em pericias baseadas em Carisma.",rooms:["chapelaria","suite"],effects:{contextualCharismaSkills:1}},
    {id:"gargula_animada",name:"Gargula Animada",price:10000,summary:"Seguranca +2 e parceiro fortao/guardiao veterano.",description:"Instalada no exterior, nao ocupa comodo. O limite depende do porte da base.",exterior:true,effects:{security:2},special:["Parceiro fortao e guardiao veterano"]},
    {id:"idolo_dourado",name:"Idolo Dourado",price:1200,summary:"Aumenta em +1 um bonus de pericia do comodo.",description:"Uma estatueta de ouro de grande importancia para o grupo.",choice:"roomSkill"},
    {id:"lareira",name:"Lareira",price:2500,summary:"+1 na CD de fogo e reducao de fogo 2.",description:"Habitua os moradores ao calor e fortalece efeitos de fogo.",rooms:["sala_estar","cozinha","suite"],special:["CD de efeitos de fogo +1","Reducao de fogo 2"]},
    {id:"lustre_cristal",name:"Lustre de Cristal",price:2500,summary:"Uma vez por aventura, um efeito de luz aumenta em +1 por dado.",description:"Um elaborado conjunto de lampioes ou gemas magicas.",rooms:["sala_estar","salao_baile"],uses:["Intensificar efeito de luz"]},
    {id:"mapa_mundi",name:"Mapa-Mundi",price:1500,summary:"Aumenta em +1 os bonus da Sala de Guerra ou Sala de Mapas.",description:"Um mapa enorme de todas as regioes conhecidas de Arton.",rooms:["sala_guerra","sala_mapas"],effects:{contextUpgrade:1}},
    {id:"mesa_reunioes",name:"Mesa de Reunioes",price:2000,summary:"Permite que os personagens troquem seus resultados de Iniciativa.",description:"Uma mesa para discutir taticas e agir como uma unidade coesa.",rooms:["sala_guerra","sala_estar"],special:["Trocar iniciativas no inicio do combate"]},
    {id:"obra_arte",name:"Obra de Arte",price:2000,summary:"Uma vez por aventura, recupera PM igual ao patamar por obra.",description:"Uma peca unica que lembra aos residentes por que vale a pena lutar.",uses:["Contemplar obra de arte"]},
    {id:"planetario",name:"Planetario",price:1500,summary:"Concede um uso adicional do Observatorio.",description:"Um modelo tridimensional de Arton e dos mundos dos deuses.",rooms:["observatorio"]},
    {id:"prataria",name:"Prataria",price:2000,summary:"A Cozinha prepara uma refeicao adicional para viagem.",description:"Talheres e pratos sofisticados para as refeicoes do grupo.",rooms:["cozinha"]},
    {id:"prateleiras_reforcadas",name:"Prateleiras Reforcadas",price:2000,summary:"Concede treinamento em uma pericia escolhida.",description:"Prateleiras repletas de livros do chao ao teto.",rooms:["biblioteca"],choice:"trainedSkill"},
    {id:"quadro_diagramas",name:"Quadro de Diagramas",price:3000,summary:"Reduz custos de fabricacao e conserto de itens mundanos.",description:"Esquemas permitem consultar o conhecimento de outros artifices.",rooms:["oficina_trabalho"]},
    {id:"reliquia_abencoada",name:"Reliquia Abencoada",price:2500,summary:"Ensina uma magia divina ou fornece +1 em resistencias.",description:"No Oratorio ensina uma magia divina; na Sala de Estar fortalece os testes de resistencia.",rooms:["oratorio","sala_estar"],effects:{contextualResistance:1},choice:"divineSpellKnown"},
    {id:"retratos",name:"Retratos",price:1750,summary:"+5 em testes para ajudar outros residentes.",description:"Pinturas do grupo penduradas em um comodo de uso comum.",special:["Testes para ajudar residentes +5"]},
    {id:"roleta_ahleniense",name:"Roleta Ahleniense",price:2000,summary:"Permite rolar novamente um teste de pericia por aventura.",description:"Uma peca que recorda a influencia do caos em Arton.",rooms:["sala_jogos"],uses:["Girar a roleta"]}
  ];

  window.T20_BASE_CATALOG={source:"Herois de Arton",pages:"244-251",types,sizes,rooms,furniture};
})();
