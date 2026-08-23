(function(){
  if(!window.T20_DATA?.classes) return;

  const profiles={
    arcanista:[],
    barbaro:["Armas marciais","Escudos"],
    bardo:["Armas marciais"],
    bucaneiro:["Armas marciais"],
    cacador:["Armas marciais","Escudos"],
    cavaleiro:["Armas marciais","Armaduras pesadas","Escudos"],
    clerigo:["Armaduras pesadas","Escudos"],
    druida:["Escudos"],
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
    if(cls) cls.proficiencias=[...new Set(extras)];
  });

  const stoneAxe=window.T20_DATA.classes.machado_de_pedra;
  if(stoneAxe){
    stoneAxe.proficiencias=["Escudos"];
    stoneAxe.notaProficiencias="Machado de Pedra permite usar adaga, azagaia, clava, funda, lança, machadinha e tacape, mas isso faz parte da habilidade de classe, não das proficiências iniciais.";
  }

  const innovator=window.T20_DATA.classes.inovador;
  if(innovator) innovator.notaProficiencias="Do Bom e do Melhor restringe o uso proficiente a equipamentos superiores ou mágicos.";

  const vassal=window.T20_DATA.classes.vassalo;
  if(vassal) vassal.proficienciasPorNivel={3:["Armaduras pesadas"]};
})();
