(function(){
  if(!window.T20_DATA?.classes) return;

  const standard=["Armas simples","Armaduras leves"];
  const profiles={
    arcanista:[],
    barbaro:["Armas marciais","Escudos"],
    bardo:["Armas marciais"],
    bucaneiro:["Armas marciais"],
    cacador:["Armas marciais","Escudos"],
    cavaleiro:["Armas marciais","Armaduras pesadas","Escudos"],
    clerigo:["Armaduras pesadas","Escudos"],
    druida:[],
    guerreiro:["Armas marciais","Armaduras pesadas","Escudos"],
    inventor:[],
    ladino:[],
    lutador:[],
    nobre:["Armas marciais","Armaduras pesadas","Escudos"],
    paladino:["Armas marciais","Armaduras pesadas","Escudos"],
    treinador:[],
    frade:[],
    alquimista:[],
    atleta:[],
    burgues:[],
    duelista:["Armas marciais"],
    ermitao:[],
    inovador:["Armas marciais","Armaduras pesadas","Escudos"],
    magimarcialista:["Armas marciais"],
    necromante:[],
    santo:["Armas marciais","Armaduras pesadas","Escudos"],
    seteiro:["Armas marciais"],
    usurpador:[],
    vassalo:["Armas marciais","Escudos"],
    ventanista:[],
    sentinela:["Armas marciais"],
    cartomante:[],
    quebra_escudos:["Armas marciais","Armaduras pesadas","Escudos"]
  };

  Object.entries(profiles).forEach(([classId,extras])=>{
    const cls=window.T20_DATA.classes[classId];
    if(cls) cls.proficiencias=[...new Set([...standard,...extras])];
  });

  const stoneAxe=window.T20_DATA.classes.machado_de_pedra;
  if(stoneAxe){
    stoneAxe.proficiencias=["Adaga","Azagaia","Clava","Funda","Lança","Machadinha","Tacape","Escudos"];
    stoneAxe.notaProficiencias="Não recebe proficiência com armas simples nem armaduras leves; aprende outra arma no 9º nível.";
  }

  const innovator=window.T20_DATA.classes.inovador;
  if(innovator) innovator.notaProficiencias="Do Bom e do Melhor restringe o uso proficiente a equipamentos superiores ou mágicos.";

  const vassal=window.T20_DATA.classes.vassalo;
  if(vassal) vassal.proficienciasPorNivel={3:["Armaduras pesadas"]};
})();
