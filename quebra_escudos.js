(function(){
  if(!window.T20_DATA?.classes) return;

  const classId="quebra_escudos";
  const source="Homebrew";

  window.T20_CLASS_PROGRESSION_REVISIONS=window.T20_CLASS_PROGRESSION_REVISIONS||{};
  window.T20_CLASS_PROGRESSION_REVISIONS[classId]={
    version:2,
    resetSuppressions:[`${classId}|golpedeimpacto`]
  };

  window.T20_DATA.classes[classId]={
    nome:"Quebra-Escudos",
    pv1:20,
    pvNivel:5,
    pmNivel:3,
    fonte:source,
    pericias:["Luta","Fortitude"],
    idBase:classId,
    variante:false,
    atributoChave:"FOR",
    proficiencias:["Armas marciais","Armaduras pesadas","Escudos"],
    progressao:{
      1:"Brecha na Guarda",
      2:"Poder de Quebra-Escudos, Golpe de Impacto (+1d6)",
      3:"Poder de Quebra-Escudos, Ruptura de Armadura (RD 2)",
      4:"Poder de Quebra-Escudos",
      5:"Poder de Quebra-Escudos, Golpe de Impacto (+2d6)",
      6:"Poder de Quebra-Escudos",
      7:"Poder de Quebra-Escudos, Ruptura de Armadura (RD 4)",
      8:"Poder de Quebra-Escudos, Impacto Esmagador",
      9:"Poder de Quebra-Escudos, Golpe de Impacto (+3d6)",
      10:"Poder de Quebra-Escudos",
      11:"Poder de Quebra-Escudos, Ruptura de Armadura (RD 6)",
      12:"Poder de Quebra-Escudos",
      13:"Poder de Quebra-Escudos, Golpe de Impacto (+4d6)",
      14:"Poder de Quebra-Escudos",
      15:"Poder de Quebra-Escudos, Ruptura de Armadura (RD 8)",
      16:"Poder de Quebra-Escudos",
      17:"Poder de Quebra-Escudos, Golpe de Impacto (+5d6)",
      18:"Poder de Quebra-Escudos",
      19:"Poder de Quebra-Escudos, Ruptura de Armadura (RD 10)",
      20:"Poder de Quebra-Escudos, Mestre Demolidor"
    }
  };

  const details=window.T20_CLASS_FEATURE_DETAILS=window.T20_CLASS_FEATURE_DETAILS||{};
  ["ondadechoque","despedacardefesas","impactocataclismico","fissuratectonica"].forEach(key=>delete details[`${classId}|${key}`]);
  Object.assign(details,{
    [`${classId}|brechanaguarda`]:{
      name:"Brecha na Guarda",
      action:"Ao acertar um ataque",
      desc:"Sempre que você acerta um ataque corpo a corpo usando uma arma de impacto (martelo de guerra, marreta, maça, bordão ou mangual), você aplica automaticamente 1 Brecha no alvo (máximo 1 Brecha por rodada através desta habilidade). Uma criatura pode acumular até um número máximo de Brechas igual ao seu modificador de Força (mínimo 1). Cada Brecha impõe uma penalidade cumulativa de -1 na Defesa e -1 em testes de manobras da vítima contra você e seus aliados. As Brechas permanecem até o fim da cena ou até o alvo gastar uma ação completa para se recompor."
    },
    [`${classId}|golpedeimpacto`]:{
      name:"Golpe de Impacto",
      cost:"1 PM",
      action:"Ao acertar um ataque",
      desc:"A partir do 2º nível, quando desfere um golpe com uma arma de impacto, você concentra massa e aceleração. Você pode gastar 1 PM ao acertar um ataque corpo a corpo para causar +1d6 de dano de impacto e aplicar uma manobra tática. Repelir empurra o alvo 3m em linha reta, se ele for de tamanho até uma categoria superior à sua. Desestabilizar reduz o deslocamento do alvo em 6m até o início do seu próximo turno. Abertura concede +1 no próximo teste de manobra realizado contra o alvo antes do fim da rodada. A cada 4 níveis além do 1º (5º, 9º, 13º e 17º níveis), o dano extra aumenta em +1d6, mantendo o custo fixo de 1 PM. Em acerto crítico, os efeitos táticos aplicados são dobrados sem custo adicional."
    },
    [`${classId}|rupturadearmadura`]:{
      name:"Ruptura de Armadura",
      desc:"A partir do 3º nível, todos os seus ataques com armas de impacto contra criaturas com pelo menos 1 Brecha ignoram passivamente 2 pontos de Redução de Dano (RD) do alvo. A cada 4 níveis além do 3º (7º, 11º, 15º e 19º níveis), o valor de RD ignorada aumenta em +2."
    },
    [`${classId}|impactoesmagador`]:{
      name:"Impacto Esmagador",
      cost:"2 PM",
      action:"Ao acertar um ataque",
      desc:"No 8º nível, ao acertar um ataque corpo a corpo com arma de impacto em uma criatura com 3 ou mais Brechas, você pode gastar 2 PM para maximizar todos os dados de dano da sua arma (trate cada dado como seu maior valor possível). Este efeito pode ser utilizado uma vez por cena contra a mesma criatura."
    },
    [`${classId}|mestredemolidor`]:{
      name:"Mestre Demolidor",
      desc:"No 20º nível, o controle de impacto atinge a perfeição. Cada Brecha aplicada conta como 2 pontos de Brecha. O limite de Brechas que você pode acumular em um mesmo alvo passa a ser seu modificador de Força +3. Seus ataques com armas de impacto passam a causar dano em dobro contra alvos com o número máximo de Brechas."
    }
  });

  const powers=[
    {
      name:"Abalo Profundo",
      desc:"Quando uma criatura falha no teste de Reflexos contra Onda de Choque, ela também fica Vulnerável (-2 na Defesa e resistências) até o início do seu próximo turno. Pré-requisitos: 10º nível, Onda de Choque."
    },
    {
      name:"Abalo Sísmico",
      desc:"Quando acerta um acerto crítico usando uma arma de impacto, todas as criaturas inimigas adjacentes ao alvo sofrem dano de impacto igual ao seu modificador de Força."
    },
    {
      name:"Alavanca de Demolição",
      cost:"1 PM",
      action:"Teste de manobra de combate",
      desc:"Você utiliza o peso de sua arma e os desequilíbrios do adversário a seu favor. Pode gastar 1 PM para receber +1 em testes de manobra de combate para cada Brecha acumulada no alvo. Além disso, se vencer o teste de manobra por 5 ou mais, o alvo sofre dano de impacto igual ao seu modificador de Força. Pré-requisitos: Força 3, treinado em Luta, 6º nível."
    },
    {
      name:"Aproveitar Brecha",
      desc:"Você recebe +1 na margem de ameaça e +2 no dano em ataques com armas de impacto contra criaturas que possuam pelo menos 2 Brechas. Pré-requisito: 5º nível."
    },
    {
      name:"Aumento de Atributo",
      desc:"Você recebe +1 em um atributo a sua escolha. Você pode escolher este poder várias vezes, mas apenas uma vez por patamar para o mesmo atributo: Iniciante (níveis 1 a 4), Veterano (5 a 10), Campeão (11 a 16) e Lenda (17 a 20)."
    },
    {
      name:"Contra-Impacto",
      cost:"1 PM",
      action:"Reação",
      desc:"Quando uma criatura erra um ataque corpo a corpo contra você, você pode gastar 1 PM como reação para desferir um contra-ataque imediato com sua arma de impacto. Pré-requisitos: Força 3, 6º nível."
    },
    {
      name:"Demolidor",
      desc:"Você recebe +2 em testes de Luta para Desarmar, Derrubar e Empurrar. Seus ataques com armas de impacto causam dano dobrado contra objetos, portas, construções e construtos."
    },
    {
      name:"Despedaçar Defesas",
      cost:"2 PM para dissipar",
      action:"Ao aplicar uma Brecha",
      desc:"Sempre que você aplicar uma Brecha em um alvo, ele perde qualquer imunidade ou resistência a dano de impacto e manobras de combate até o fim da cena. Além disso, ao acertar um alvo sob efeito de magias defensivas que concedam bônus na Defesa ou RD, você pode gastar 2 PM para dissipar esse efeito imediatamente. Pré-requisito: 10º nível."
    },
    {
      name:"Eco Sísmico",
      action:"Ao obter um crítico ou derrotar um inimigo",
      desc:"Sempre que você obtiver um acerto crítico com uma arma de impacto ou nocautear ou matar um inimigo, você recupera 1 PM imediatamente."
    },
    {
      name:"Fissura Tectônica",
      cost:"3 PM",
      action:"Ação padrão",
      desc:"Você pode gastar uma ação padrão e 3 PM para bater sua arma no solo e abrir uma fissura em uma linha de 15m ou cone de 9m. Todas as criaturas na área sofrem dano de impacto igual ao seu Golpe de Impacto máximo e ficam Caídas. Reflexos (CD Força) reduz o dano à metade e evita a queda. A área afetada se torna terreno difícil e intransponível para investidas até o fim da cena. Pré-requisito: 14º nível."
    },
    {
      name:"Golpe Devastador",
      cost:"1 PM",
      action:"Ao usar Golpe de Impacto",
      desc:"Ao usar Golpe de Impacto, você pode gastar 1 PM para aumentar um dado de dano da habilidade de d6 para d10. Pré-requisito: 10º nível."
    },
    {
      name:"Golpe Interceptador",
      cost:"1 PM",
      action:"Reação",
      desc:"Uma vez por rodada, quando um inimigo entra no seu alcance corpo a corpo, você pode gastar 1 PM como reação para realizar um ataque. Se acertar, o deslocamento da criatura se encerra. Pré-requisitos: 6º nível, Contra-Impacto."
    },
    {
      name:"Impacto Cataclísmico",
      cost:"2 PM",
      action:"Ao acertar um Golpe de Impacto",
      desc:"Uma vez por rodada, ao acertar um Golpe de Impacto em um alvo com 3 ou mais Brechas, você pode gastar 2 PM para forçar um teste de Fortitude (CD 10 + metade do seu nível + modificador de Força). Se falhar, o alvo fica Atordoado por 1 rodada e sofre -5 em todos os testes até o fim da cena. Se passar, fica Desprevenido e é arremessado 6m para trás. Pré-requisito: 12º nível."
    },
    {
      name:"Impacto Esmaga-Mente",
      desc:"Quando você atinge um conjurador com uma arma de impacto enquanto ele possui pelo menos 1 Brecha ativa, a CD do teste de Misticismo ou Vontade dele para manter a concentração ou lançar magias em combate corpo a corpo aumenta em +2 por Brecha acumulada. Pré-requisito: 8º nível."
    },
    {
      name:"Investida Demolidora",
      cost:"1 PM",
      action:"Durante uma investida",
      desc:"Ao realizar uma investida empunhando uma arma de impacto, você não sofre a penalidade padrão de -2 na Defesa e pode gastar 1 PM para realizar uma manobra Derrubar ou Empurrar como parte do mesmo ataque caso acerte o golpe. Pré-requisito: treinado em Atletismo."
    },
    {
      name:"Martelo Pesado",
      desc:"Ao empunhar uma arma de impacto com as duas mãos, quando ataca um alvo com 3 Brechas, você soma o dobro do seu modificador de Força nas rolagens de dano, em vez de 1,5 vez seu modificador de Força. Pré-requisitos: Força 3, Estilo de Duas Mãos."
    },
    {
      name:"Onda de Choque",
      cost:"+1 PM",
      action:"Ao usar Golpe de Impacto",
      desc:"Ao realizar um Golpe de Impacto, você pode gastar +1 PM para fazer o choque ecoar. O alvo e todas as criaturas adjacentes a ele devem passar em um teste de Reflexos (CD Força) ou ficam Caídas. Pré-requisito: 6º nível."
    },
    {
      name:"Pancada Precisa",
      desc:"Você recebe +2 no teste de ataque com armas de impacto."
    },
    {
      name:"Ponto de Ruptura",
      action:"Ao atingir o máximo de Brechas",
      desc:"Quando uma criatura atingir o máximo de Brechas que você pode aplicar nela, seu próximo ataque contra ela recebe +2 na margem de ameaça e +2d6 de dano de impacto. Usável uma vez por cena por criatura. Pré-requisitos: 12º nível, Aproveitar Brecha."
    },
    {
      name:"Postura Inabalável",
      cost:"1 PM",
      action:"Teste de Vontade ou reação",
      desc:"Sua firmeza corporal protege sua mente contra intimidações e encantamentos. Você pode gastar 1 PM para somar o seu modificador de Força, em vez de Sabedoria, em um teste de Vontade, ou como reação para ignorar os efeitos de uma condição de abalo ou medo até o fim do seu próximo turno. Pré-requisitos: 6º nível, Fortitude."
    },
    {
      name:"Postura: Carrasco Implacável",
      desc:"Você recebe +2 em todas as rolagens de dano contra criaturas com 2 ou mais Brechas. Se o alvo estiver derrubado, seus acertos críticos com armas de impacto aumentam o multiplicador em +1."
    },
    {
      name:"Quebra-Armaduras",
      cost:"2 PM",
      action:"Ao aplicar 2 Brechas",
      desc:"Ao aplicar 2 Brechas em um alvo, você pode gastar 2 PM para impor 2 Brechas permanentes nele até o fim da cena. Este efeito não é cumulativo no mesmo alvo. Pré-requisito: 8º nível."
    },
    {
      name:"Quebra-Braço",
      action:"Ao aplicar uma Brecha",
      desc:"Quando você aplica uma Brecha, o alvo também sofre -2 em todos os testes de ataque até o início do seu próximo turno."
    },
    {
      name:"Quebra-Pernas",
      action:"Ao aplicar uma Brecha",
      desc:"Ao aplicar uma Brecha, o deslocamento do alvo é reduzido pela metade até o fim do próximo turno dele."
    },
    {
      name:"Quebra-Ritmo",
      action:"Quando o alvo erra um ataque",
      desc:"Quando uma criatura com pelo menos 2 Brechas errar um ataque contra você, você recebe +2 na Defesa contra ela até o início do seu próximo turno. Pré-requisito: 6º nível."
    },
    {
      name:"Ruptura de Guarda",
      cost:"1 PM",
      action:"Reação",
      desc:"Quando uma criatura com 2 ou mais Brechas acerta você, gaste 1 PM como reação para reduzir o dano em 1d10 + seu modificador de Força e deixar o atacante Vulnerável contra o seu próximo ataque. Pré-requisito: 6º nível."
    },
    {
      name:"Triturar Fortificações",
      cost:"1 PM para maximizar",
      action:"Ao atacar uma barreira ou escudo",
      desc:"Seus ataques com armas de impacto ignoram totalmente a Redução de Dano e dureza de objetos inanimados, portas, barreiras mágicas (como Muralha de Energia) e construtos. Quando ataca uma barreira ou escudo, você pode gastar 1 PM para causar o dano máximo da arma sem rolar dados. Pré-requisitos: 6º nível, Demolidor."
    }
  ];

  window.T20_CLASS_POWERS=window.T20_CLASS_POWERS||{};
  window.T20_CLASS_POWERS[classId]=powers.map(power=>({name:power.name,type:"Classe",source}));

  window.T20_CLASS_POWER_DETAILS=window.T20_CLASS_POWER_DETAILS||{};
  powers.forEach(power=>{
    window.T20_CLASS_POWER_DETAILS[`${classId}|${source}|${power.name}`]={
      desc:power.desc||"",
      cost:power.cost||"",
      action:power.action||""
    };
  });
})();
