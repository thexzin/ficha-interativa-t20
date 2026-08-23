(function(){
  if(!window.T20_DATA?.classes) return;

  const classId="quebra_escudos";
  const source="Homebrew";

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
      1:"Brecha na Guarda, Golpe de Impacto (+1d6)",
      2:"Poder de Quebra-Escudos",
      3:"Poder de Quebra-Escudos, Ruptura de Armadura (RD 2)",
      4:"Poder de Quebra-Escudos",
      5:"Poder de Quebra-Escudos, Golpe de Impacto (+2d6)",
      6:"Poder de Quebra-Escudos, Onda de Choque",
      7:"Poder de Quebra-Escudos, Ruptura de Armadura (RD 4)",
      8:"Poder de Quebra-Escudos",
      9:"Poder de Quebra-Escudos, Golpe de Impacto (+3d6)",
      10:"Poder de Quebra-Escudos",
      11:"Poder de Quebra-Escudos, Ruptura de Armadura (RD 6), Despedaçar Defesas",
      12:"Poder de Quebra-Escudos",
      13:"Poder de Quebra-Escudos, Golpe de Impacto (+4d6)",
      14:"Poder de Quebra-Escudos",
      15:"Poder de Quebra-Escudos, Ruptura de Armadura (RD 8), Impacto Cataclísmico",
      16:"Poder de Quebra-Escudos",
      17:"Poder de Quebra-Escudos, Golpe de Impacto (+5d6)",
      18:"Poder de Quebra-Escudos, Fissura Tectônica",
      19:"Poder de Quebra-Escudos, Ruptura de Armadura (RD 10)",
      20:"Poder de Quebra-Escudos, Mestre Demolidor"
    }
  };

  const details=window.T20_CLASS_FEATURE_DETAILS=window.T20_CLASS_FEATURE_DETAILS||{};
  Object.assign(details,{
    [`${classId}|brechanaguarda`]:{
      name:"Brecha na Guarda",
      cost:"1 PM",
      action:"Ao acertar um ataque",
      desc:"Quando você acerta um ataque corpo a corpo usando uma arma de impacto (martelo de guerra, marreta, maça, bordão ou mangual), pode gastar 1 PM para aplicar 1 Brecha no alvo, no máximo uma vez por rodada por esta habilidade. Uma criatura acumula um máximo de Brechas igual ao seu modificador de Força (mínimo 1). Cada Brecha impõe uma penalidade cumulativa de -1 na Defesa e -1 em testes de manobras da vítima contra você e seus aliados. As Brechas duram até o fim da cena ou até o alvo gastar uma ação completa para se recompor."
    },
    [`${classId}|golpedeimpacto`]:{
      name:"Golpe de Impacto",
      cost:"1 PM",
      action:"Ao acertar um ataque",
      desc:"Quando acerta um ataque corpo a corpo com uma arma de impacto, você pode gastar 1 PM para causar dano extra de impacto e escolher um efeito: Repelir empurra o alvo 1,5m em linha reta, se ele for de tamanho até uma categoria superior à sua; Desestabilizar reduz o deslocamento do alvo em 3m até o início do seu próximo turno; Abertura concede +2 no próximo teste de manobra contra o alvo antes do fim da rodada. O dano extra é +1d6 no 1º nível, +2d6 no 5º, +3d6 no 9º, +4d6 no 13º e +5d6 no 17º. Em um acerto crítico, você aplica dois efeitos táticos sem custo adicional de PM."
    },
    [`${classId}|rupturadearmadura`]:{
      name:"Ruptura de Armadura",
      desc:"Seus ataques com armas de impacto contra criaturas com pelo menos 1 Brecha ignoram 2 pontos de RD no 3º nível. A RD ignorada aumenta para 4 no 7º nível, 6 no 11º, 8 no 15º e 10 no 19º."
    },
    [`${classId}|ondadechoque`]:{
      name:"Onda de Choque",
      cost:"+1 PM",
      action:"Ao usar Golpe de Impacto",
      desc:"Ao realizar um Golpe de Impacto, você pode gastar +1 PM. O alvo e todas as criaturas adjacentes a ele devem passar em um teste de Reflexos (CD Força) ou ficam Caídas."
    },
    [`${classId}|despedacardefesas`]:{
      name:"Despedaçar Defesas",
      cost:"2 PM para dissipar",
      action:"Ao aplicar uma Brecha",
      desc:"Sempre que você aplica uma Brecha, o alvo perde qualquer imunidade ou resistência a dano de impacto e manobras de combate até o fim da cena. Se estiver sob uma magia defensiva que conceda bônus na Defesa ou RD, você pode gastar 2 PM ao acertá-lo para dissipar esse efeito imediatamente."
    },
    [`${classId}|impactocataclismico`]:{
      name:"Impacto Cataclísmico",
      cost:"3 PM",
      action:"Uma vez por rodada",
      desc:"Uma vez por rodada, ao acertar um Golpe de Impacto em um oponente com 3 ou mais Brechas, você pode gastar 3 PM. O alvo faz um teste de Fortitude (CD 10 + metade do seu nível + modificador de Força). Se falhar, fica Atordoado por 1 rodada e sofre -5 em todos os testes e ataques até o fim do combate. Se passar, fica Desprevenido e é arremessado 6m para trás."
    },
    [`${classId}|fissuratectonica`]:{
      name:"Fissura Tectônica",
      cost:"4 PM",
      action:"Ação padrão",
      desc:"Você golpeia o solo para abrir uma fissura em uma linha de até 15m ou um cone de 9m. Todas as criaturas na área sofrem dano de impacto igual ao seu Golpe de Impacto máximo, incluindo todos os dados e bônus de Força, e ficam Caídas. Reflexos (CD Força) reduz o dano à metade e evita a queda. O terreno afetado se torna difícil e intransponível para investidas até o fim da cena."
    },
    [`${classId}|mestredemolidor`]:{
      name:"Mestre Demolidor",
      desc:"O máximo de Brechas em um alvo passa a ser seu modificador de Força +3. A margem de ameaça de seus ataques com armas de impacto aumenta em +2. Além disso, esses ataques causam dano dobrado contra alvos com o número máximo de Brechas."
    }
  });

  const powers=[
    {
      name:"Abalo Sísmico",
      desc:"Quando consegue um acerto crítico usando uma arma de impacto, todas as criaturas inimigas adjacentes ao alvo sofrem dano de impacto igual ao seu modificador de Força."
    },
    {
      name:"Aumento de Atributo",
      desc:"Você recebe +1 em um atributo a sua escolha. Você pode escolher este poder várias vezes, mas apenas uma vez por patamar para o mesmo atributo: Iniciante (níveis 1 a 4), Veterano (5 a 10), Campeão (11 a 16) e Lenda (17 a 20)."
    },
    {
      name:"Contra-Impacto",
      cost:"2 PM",
      action:"Reação",
      desc:"Quando uma criatura erra um ataque corpo a corpo contra você, você pode gastar 2 PM para desferir um contra-ataque imediato com sua arma de impacto. Pré-requisito: 6º nível de Quebra-Escudos."
    },
    {
      name:"Demolidor",
      desc:"Você recebe +2 em testes de Luta para as manobras Desarmar, Derrubar e Empurrar. Seus ataques com armas de impacto causam dano dobrado contra objetos, portas, construções e construtos."
    },
    {
      name:"Golpe Devastador",
      desc:"Ao usar Golpe de Impacto, os dados de dano extra passam de d6 para d10. Se o alvo tiver 3 ou mais Brechas, você soma seu modificador de Força duas vezes no dano final do ataque. Pré-requisito: 10º nível de Quebra-Escudos."
    },
    {
      name:"Golpe Interceptador",
      cost:"2 PM",
      action:"Reação",
      desc:"Uma vez por rodada, quando um inimigo entra no seu alcance corpo a corpo, você pode gastar 2 PM para realizar um ataque com sua arma de impacto. Se acertar, o deslocamento da criatura é imediatamente interrompido. Pré-requisito: 6º nível de Quebra-Escudos."
    },
    {
      name:"Impacto Esmagador",
      cost:"3 PM",
      action:"Ao acertar um ataque",
      desc:"Ao acertar um ataque corpo a corpo em uma criatura com 3 ou mais Brechas, você pode gastar 3 PM para maximizar todos os dados de dano da arma, tratando cada dado como seu maior valor. Você pode usar este poder uma vez por cena contra o mesmo alvo. Pré-requisito: 8º nível de Quebra-Escudos."
    },
    {
      name:"Martelo Pesado",
      desc:"Ao empunhar uma arma de impacto com as duas mãos, você soma o dobro do seu modificador de Força nas rolagens de dano, em vez de uma vez e meia."
    },
    {
      name:"Pancada Precisa",
      cost:"1 PM",
      action:"Livre",
      desc:"Você pode gastar 1 PM para receber +2 no teste de ataque com armas de impacto até o fim do seu turno."
    },
    {
      name:"Postura: Carrasco Implacável",
      desc:"Você recebe +2 nas rolagens de dano contra criaturas com 2 ou mais Brechas. Se o alvo estiver sangrando, com menos da metade dos PV totais, seus acertos críticos aumentam o multiplicador em +1."
    },
    {
      name:"Postura: Guardião da Muralha",
      cost:"1 PM para proteger aliado",
      action:"Reação",
      desc:"Enquanto estiver empunhando um escudo e usando armadura pesada, você recebe RD 3 e pode gastar 1 PM como reação para conceder +2 na Defesa de um aliado adjacente até o início do próximo turno dele. Pré-requisitos: proficiência com armaduras pesadas e escudos."
    },
    {
      name:"Quebra-Armaduras",
      cost:"2 PM",
      action:"Ao aplicar uma Brecha",
      desc:"Ao aplicar uma Brecha em um alvo de armadura, você pode gastar 2 PM para impor uma penalidade adicional de -2 na Defesa dele até o fim da cena. Esta penalidade não se acumula no mesmo alvo. Pré-requisito: 6º nível de Quebra-Escudos."
    },
    {
      name:"Quebra-Braço",
      cost:"1 PM",
      action:"Ao aplicar uma Brecha",
      desc:"Ao aplicar uma Brecha, você pode gastar 1 PM. O alvo sofre -2 em todos os testes de ataque até o início do seu próximo turno."
    },
    {
      name:"Quebra-Escudo",
      cost:"1 PM",
      action:"Ao acertar um ataque",
      desc:"Ao acertar um inimigo que esteja usando escudo, você pode gastar 1 PM para fazê-lo perder o bônus de Defesa do escudo até o início do seu próximo turno. Se usar a manobra Quebrar contra o escudo, causa dano dobrado."
    },
    {
      name:"Quebra-Pernas",
      action:"Ao aplicar uma Brecha",
      desc:"Ao aplicar uma Brecha, o deslocamento do alvo é reduzido à metade até o fim do próximo turno dele."
    },
    {
      name:"Ruptura de Guarda",
      cost:"2 PM",
      action:"Reação",
      desc:"Quando uma criatura com 2 ou mais Brechas acerta você, pode gastar 2 PM para reduzir o dano em 1d10 + seu modificador de Força e deixar o atacante Vulnerável contra o seu próximo ataque. Pré-requisito: 6º nível de Quebra-Escudos."
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
