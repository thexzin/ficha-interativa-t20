(function(){
  if(!window.T20_DATA?.classes) return;

  const source="Classe Cartomante (Iniciativa Tormenta20)";
  window.T20_DATA.classes.cartomante={
    nome:"Cartomante",
    pv1:8,
    pvNivel:2,
    pmNivel:6,
    fonte:source,
    pericias:["Jogatina","Vontade"],
    idBase:"arcanista",
    variante:true,
    classeBase:"Arcanista",
    progressao:{
      1:"Caminho do cartomante, magias (1º círculo)",
      2:"Poder de arcanista",
      3:"Mulligan, poder de arcanista",
      4:"Poder de arcanista",
      5:"Magias (2º círculo), poder de arcanista",
      6:"Poder de arcanista",
      7:"Carta Especial: Rara, poder de arcanista",
      8:"Poder de arcanista",
      9:"Magias (3º círculo), poder de arcanista",
      10:"Carta Especial: Épica, poder de arcanista",
      11:"Poder de arcanista",
      12:"Poder de arcanista",
      13:"Magias (4º círculo), poder de arcanista",
      14:"Poder de arcanista",
      15:"Destino Traçado, poder de arcanista",
      16:"Tutor Arcano, poder de arcanista",
      17:"Magias (5º círculo), poder de arcanista",
      18:"Poder de arcanista",
      19:"Poder de arcanista",
      20:"Exodia, poder de arcanista"
    }
  };

  window.T20_CARTOMANTE_CARDS={
    parceiro_arcano:{
      id:"parceiro_arcano",name:"Parceiro Arcano",rarity:"Rara",cost:3,action:"Movimento",range:"Curto",
      summary:"Invoca um parceiro de tipo escolhido até o fim da cena.",
      desc:"Você invoca uma criatura animal ou humanoide feita de energia para atuar como parceiro. Ela começa como parceiro Iniciante, torna-se Veterano no 12º nível de Cartomante e Mestre no 18º. A criatura usa as regras de parceiro vulnerável, não possui turno próprio e desaparece se for destruída ou quando a cena termina."
    },
    clone:{
      id:"clone",name:"Clone",rarity:"Rara",cost:1,action:"Reação",range:"Curto",
      summary:"Copia temporariamente uma habilidade de classe ativada por outra criatura.",
      desc:"Quando uma criatura em alcance curto ativa uma habilidade de classe que você também possui, você copia essa habilidade. Até o fim de seu próximo turno, pode usá-la como uma habilidade de raça; se ela usar um atributo, use Carisma. Magias individuais recebidas pela classe e habilidades chamadas Magias também podem ser copiadas."
    },
    super_trunfo:{
      id:"super_trunfo",name:"Super Trunfo",rarity:"Rara",cost:3,action:"Reação",range:"Curto",
      summary:"Você ou um aliado obtém sucesso automático em um teste de perícia.",
      desc:"Quando você ou um aliado em alcance curto faz um teste de perícia, jogue esta carta para obter sucesso automático, sem rolar o dado."
    },
    chamado_ancestral:{
      id:"chamado_ancestral",name:"Chamado Ancestral",rarity:"Épica",cost:1,action:"Livre",range:"Pessoal",
      summary:"Compre três cartas.",desc:"Você compra imediatamente três cartas de seu baralho."
    },
    lotus_negra:{
      id:"lotus_negra",name:"Lótus Negra",rarity:"Épica",cost:1,action:"Movimento",range:"Pessoal",
      summary:"Recupere 3d8 PM.",desc:"Você recupera 3d8 pontos de mana, sem ultrapassar seus PM máximos."
    }
  };

  window.T20_CARTOMANTE_DEITIES=[
    "Aharadak","Allihanna","Arsenal","Azgher","Hyninn","Kallyadranoch","Khalmyr","Lena","Lin-Wu","Marah",
    "Megalokk","Nimb","Oceano","Sszzaas","Tanna-Toh","Tenebra","Thwor","Thyatis","Valkaria","Wynna"
  ];

  const details=window.T20_CLASS_FEATURE_DETAILS=window.T20_CLASS_FEATURE_DETAILS||{};
  Object.assign(details,{
    "cartomante|caminhodocartomante":{
      name:"Caminho do Cartomante",cost:"1 PM para materializar",action:"Ação completa",
      desc:"Você lança magias através de um baralho mágico. Para materializá-lo, gasta 1 PM e uma ação completa; então compra uma mão que dura até o fim da cena. Cada magia aprendida corresponde a uma carta e apenas cartas em sua mão podem ser lançadas. Após resolver uma magia, sua carta retorna ao baralho. Você precisa das duas mãos livres, uma para segurar as cartas e outra para lançar, e ainda precisa falar, mas não precisa gesticular. A execução de suas magias se torna uma ação de movimento, exceto quando já seria livre ou reação. As cartas têm RD 5 e PV iguais a um quarto de seus PV totais. Se forem destruídas, você fica atordoado por uma rodada e precisa materializá-las novamente. Você começa com três magias adicionais, totalizando seis, e aprende uma magia adicional de cada novo círculo que alcançar. Seu atributo-chave é Carisma e você usa Jogatina no lugar de Misticismo em testes relacionados a magia."
    },
    "cartomante|magias":{
      name:"Magias",desc:"Você lança magias como um arcanista, usando Carisma como atributo-chave e Jogatina no lugar de Misticismo para testes relacionados a magia. Suas magias são representadas por cartas no baralho do Cartomante."
    },
    "cartomante|mulligan":{
      name:"Mulligan",action:"Movimento",cost:"1 vez por cena",
      desc:"Uma vez por cena, você pode devolver todas as cartas de sua mão ao baralho e comprar uma nova mão aleatória até seu limite."
    },
    "cartomante|cartaespecialrara":{
      name:"Carta Especial: Rara",desc:"Escolha Parceiro Arcano, Clone ou Super Trunfo. A carta escolhida é adicionada ao seu baralho e segue todas as regras de compra, mão e uso de uma carta de magia."
    },
    "cartomante|cartaespecialepica":{
      name:"Carta Especial: Épica",desc:"Escolha Chamado Ancestral ou Lótus Negra. Em vez disso, você pode escolher uma Carta Especial Rara que ainda não possua. A carta escolhida é adicionada ao seu baralho."
    },
    "cartomante|destinotracado":{
      name:"Destino Traçado",
      desc:"Escolha um dos vinte deuses maiores como referência para sua energia divina e para Exodia, sem receber suas obrigações e restrições. Aprenda quatro magias divinas, uma de cada círculo do 1º ao 4º, e receba um poder concedido desse deus. No 20º nível de Cartomante, aprenda também uma magia divina de 5º círculo. As magias escolhidas são adicionadas ao seu baralho."
    },
    "cartomante|tutorarcano":{
      name:"Tutor Arcano",cost:"15 PM",action:"Ação completa",
      desc:"Gaste uma ação completa e 15 PM para procurar uma carta específica no baralho e faça um teste de Jogatina (CD 20 + seu nível de Cartomante). Se passar, lance a carta imediatamente sem pagar seu custo normal, embora ainda possa pagar aprimoramentos. Se falhar, você fica confuso até o fim de seu próximo turno e ainda gasta a ação e os PM."
    },
    "cartomante|exodia":{
      name:"Exodia",
      desc:"Você recebe cinco Cartas Especiais Míticas que representam a cabeça, os braços e as pernas do Aspecto do deus escolhido em Destino Traçado. Cada parte custa 5 PM e uma ação de movimento para ser invocada. As partes permanecem no pentagrama em vez de voltar ao baralho. Quando as cinco forem invocadas na mesma cena, o Aspecto se manifesta. Escolha tratá-lo como uma criatura parceira ou controlá-lo diretamente; no controle direto, a cada turno apenas você ou o Aspecto age. Se a cena terminar antes da manifestação, as partes voltam ao baralho."
    }
  });
})();
