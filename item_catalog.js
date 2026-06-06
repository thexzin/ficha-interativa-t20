;(function(){
  const source="Jogo do Ano";
  const normalizeCategory=(category)=>{
    const text=String(category||"").toLowerCase();
    if(text.startsWith("alquímico")||text.startsWith("alquimico")||text==="veneno") return "Alquímico";
    return category;
  };
  const weaponCategory=(category)=>{
    const text=String(category||"").toLowerCase();
    if(text.includes("simples")) return "Armas simples";
    if(text.includes("marcial")) return "Armas marciais";
    if(text.includes("exótica")||text.includes("exotica")) return "Armas exóticas";
    if(text.includes("fogo")) return "Armas de fogo";
    return "Armas";
  };
  const entry=(name,category,price,spaces,notes="")=>({name,category:normalizeCategory(category),price,spaces,source,notes});
  const weapon=(name,category,price,spaces,damage,critical,range,type,extra="")=>{
    const details=[`Dano ${damage}`,`crítico ${critical}`];
    if(range) details.push(`alcance ${range}`);
    if(type) details.push(`tipo ${type}`);
    if(extra) details.push(extra);
    return entry(name,weaponCategory(category),price,spaces,details.join("; ")+".");
  };
  const armor=(name,category,price,defense,penalty,spaces)=>{
    return entry(name,category,price,spaces,`Defesa ${defense}; penalidade de armadura ${penalty}.`);
  };

  const catalog=[
    weapon("Adaga","simples leve","T$ 2",1,"1d4","19","curto","perfuração"),
    weapon("Espada curta","simples leve","T$ 10",1,"1d6","19","","perfuração"),
    weapon("Foice","simples leve","T$ 4",1,"1d6","x3","","corte"),
    weapon("Clava","simples uma mão","T$ 0",1,"1d6","x2","","impacto"),
    weapon("Lança","simples uma mão","T$ 2",1,"1d6","x2","curto","perfuração"),
    weapon("Maça","simples uma mão","T$ 12",1,"1d8","x2","","impacto"),
    weapon("Bordão","simples duas mãos","T$ 0",2,"1d6/1d6","x2","","impacto"),
    weapon("Pique","simples duas mãos","T$ 2",2,"1d8","x2","","perfuração"),
    weapon("Tacape","simples duas mãos","T$ 0",2,"1d10","x2","","impacto"),
    weapon("Azagaia","simples à distância","T$ 1",1,"1d6","x2","médio","perfuração"),
    weapon("Besta leve","simples à distância","T$ 35",1,"1d8","19","médio","perfuração"),
    weapon("Funda","simples à distância","T$ 0",1,"1d4","x2","médio","impacto"),
    weapon("Arco curto","simples à distância","T$ 30",2,"1d6","x3","médio","perfuração"),
    weapon("Machadinha","marcial leve","T$ 6",1,"1d6","x3","curto","corte"),
    weapon("Cimitarra","marcial leve","T$ 15",1,"1d6","18","","corte"),
    weapon("Espada longa","marcial uma mão","T$ 15",1,"1d8","19","","corte"),
    weapon("Florete","marcial uma mão","T$ 20",1,"1d6","18","","perfuração"),
    weapon("Machado de batalha","marcial uma mão","T$ 10",1,"1d8","x3","","corte"),
    weapon("Mangual","marcial uma mão","T$ 8",1,"1d8","x2","","impacto"),
    weapon("Martelo de guerra","marcial uma mão","T$ 12",1,"1d8","x3","","impacto"),
    weapon("Picareta","marcial uma mão","T$ 8",1,"1d6","x4","","perfuração"),
    weapon("Tridente","marcial uma mão","T$ 15",1,"1d8","x2","curto","perfuração"),
    weapon("Alabarda","marcial duas mãos","T$ 10",2,"1d10","x3","","corte/perfuração"),
    weapon("Alfange","marcial duas mãos","T$ 75",2,"2d4","18","","corte"),
    weapon("Gadanho","marcial duas mãos","T$ 18",2,"2d4","x4","","corte"),
    weapon("Lança montada","marcial duas mãos","T$ 10",2,"1d8","x3","","perfuração"),
    weapon("Machado de guerra","marcial duas mãos","T$ 20",2,"1d12","x3","","corte"),
    weapon("Marreta","marcial duas mãos","T$ 20",2,"3d4","x2","","impacto"),
    weapon("Montante","marcial duas mãos","T$ 50",2,"2d6","19","","corte"),
    weapon("Arco longo","marcial à distância","T$ 100",2,"1d8","x3","médio","perfuração"),
    weapon("Besta pesada","marcial à distância","T$ 50",2,"1d12","19","médio","perfuração"),
    weapon("Chicote","exótica leve","T$ 2",1,"1d3","x2","","corte"),
    weapon("Espada bastarda","exótica uma mão","T$ 35",1,"1d10/1d12","19","","corte"),
    weapon("Katana","exótica uma mão","T$ 100",1,"1d8/1d10","19","","corte"),
    weapon("Machado anão","exótica uma mão","T$ 30",1,"1d10","x3","","corte"),
    weapon("Corrente de espinhos","exótica duas mãos","T$ 25",2,"2d4/2d4","19","","corte"),
    weapon("Machado táurico","exótica duas mãos","T$ 50",2,"2d8","x3","","corte"),
    weapon("Rede","exótica à distância","T$ 20",1,"—","—","curto","—"),
    weapon("Pistola","arma de fogo","T$ 250",1,"2d6","19/x3","curto","perfuração"),
    weapon("Mosquete","arma de fogo","T$ 500",2,"2d8","19/x3","médio","perfuração"),

    entry("Balas (20)","Munição","T$ 20",1,"Munição para pistolas e mosquetes."),
    entry("Flechas (20)","Munição","T$ 1",1,"Munição para arcos."),
    entry("Pedras (20)","Munição","T$ 0,5",1,"Munição para funda."),
    entry("Virotes (20)","Munição","T$ 2",1,"Munição para bestas."),

    armor("Armadura acolchoada","Armadura leve","T$ 5","+1",0,2),
    armor("Armadura de couro","Armadura leve","T$ 20","+2",0,2),
    armor("Couro batido","Armadura leve","T$ 35","+3",1,2),
    armor("Gibão de peles","Armadura leve","T$ 25","+4",3,2),
    armor("Couraça","Armadura leve","T$ 500","+5",4,2),
    armor("Brunea","Armadura pesada","T$ 50","+5",2,5),
    armor("Cota de malha","Armadura pesada","T$ 150","+6",2,5),
    armor("Loriga segmentada","Armadura pesada","T$ 250","+7",3,5),
    armor("Meia armadura","Armadura pesada","T$ 600","+8",4,5),
    armor("Armadura completa","Armadura pesada","T$ 3.000","+10",5,5),
    armor("Escudo leve","Escudo","T$ 5","+1",1,1),
    armor("Escudo pesado","Escudo","T$ 15","+2",2,2),

    entry("Água benta","Equipamento de aventura","T$ 10",0.5),
    entry("Algemas","Equipamento de aventura","T$ 15",1),
    entry("Arpéu","Equipamento de aventura","T$ 5",1),
    entry("Bandoleira de poções","Equipamento de aventura","T$ 20",1),
    entry("Barraca","Equipamento de aventura","T$ 10",1),
    entry("Corda","Equipamento de aventura","T$ 1",1),
    entry("Espelho","Equipamento de aventura","T$ 10",1),
    entry("Lampião","Equipamento de aventura","T$ 7",1),
    entry("Mochila","Equipamento de aventura","T$ 2",0),
    entry("Mochila de aventureiro","Equipamento de aventura","T$ 50",0),
    entry("Óleo","Equipamento de aventura","T$ 0,1",0.5),
    entry("Organizador de pergaminhos","Equipamento de aventura","T$ 25",1),
    entry("Pé de cabra","Equipamento de aventura","T$ 2",1),
    entry("Saco de dormir","Equipamento de aventura","T$ 1",1),
    entry("Símbolo sagrado","Equipamento de aventura","T$ 5",1),
    entry("Tocha","Equipamento de aventura","T$ 0,1",1),
    entry("Vara de madeira (3m)","Equipamento de aventura","T$ 0,2",1),

    entry("Alaúde élfico","Ferramenta","T$ 300",1),
    entry("Coleção de livros","Ferramenta","T$ 75",1),
    entry("Equipamento de viagem","Ferramenta","T$ 10",1),
    entry("Estojo de disfarces","Ferramenta","T$ 50",1),
    entry("Flauta mística","Ferramenta","T$ 150",1),
    entry("Gazua","Ferramenta","T$ 5",1),
    entry("Instrumentos de ofício","Ferramenta","T$ 30",1),
    entry("Instrumento musical","Ferramenta","T$ 35",1),
    entry("Luneta","Ferramenta","T$ 100",1),
    entry("Maleta de medicamentos","Ferramenta","T$ 50",1),
    entry("Sela","Ferramenta","T$ 20",1),
    entry("Tambor das profundezas","Ferramenta","T$ 80",1),

    entry("Andrajos de aldeão","Vestuário","T$ 1",1),
    entry("Bandana","Vestuário","T$ 5",1),
    entry("Botas reforçadas","Vestuário","T$ 20",1),
    entry("Camisa bufante","Vestuário","T$ 25",1),
    entry("Capa esvoaçante","Vestuário","T$ 25",1),
    entry("Capa pesada","Vestuário","T$ 15",1),
    entry("Casaco longo","Vestuário","T$ 20",1),
    entry("Chapéu arcano","Vestuário","T$ 50",1),
    entry("Enfeite de elmo","Vestuário","T$ 15",1),
    entry("Farrapos de ermitão","Vestuário","T$ 1",1),
    entry("Gorro de ervas","Vestuário","T$ 75",1),
    entry("Luva de pelica","Vestuário","T$ 5",1),
    entry("Manopla","Vestuário","T$ 10",1),
    entry("Manto camuflado","Vestuário","T$ 12",1),
    entry("Manto eclesiástico","Vestuário","T$ 20",1),
    entry("Robe místico","Vestuário","T$ 50",1),
    entry("Sapatos de camurça","Vestuário","T$ 8",1),
    entry("Tabardo","Vestuário","T$ 10",1),
    entry("Traje da corte","Vestuário","T$ 100",1),
    entry("Traje de viajante","Vestuário","T$ 10",0),
    entry("Veste de seda","Vestuário","T$ 25",1),

    entry("Bolsa de pó","Esotérico","T$ 300",1),
    entry("Cajado arcano","Esotérico","T$ 1.000",2),
    entry("Cetro elemental","Esotérico","T$ 750",1),
    entry("Costela de lich","Esotérico","T$ 300",1),
    entry("Dedo de ente","Esotérico","T$ 200",1),
    entry("Luva de ferro","Esotérico","T$ 150",1),
    entry("Medalhão de prata","Esotérico","T$ 750",1),
    entry("Orbe cristalino","Esotérico","T$ 750",1),
    entry("Tomo hermético","Esotérico","T$ 1.500",1),
    entry("Varinha arcana","Esotérico","T$ 100",1),

    entry("Ácido","Alquímico - preparado","T$ 10",0.5),
    entry("Bálsamo restaurador","Alquímico - preparado","T$ 10",0.5),
    entry("Bomba","Alquímico - preparado","T$ 50",0.5),
    entry("Cosmético","Alquímico - preparado","T$ 30",0.5),
    entry("Elixir do amor","Alquímico - preparado","T$ 100",0.5),
    entry("Essência de mana","Alquímico - preparado","T$ 50",0.5),
    entry("Fogo alquímico","Alquímico - preparado","T$ 10",0.5),
    entry("Pó do desaparecimento","Alquímico - preparado","T$ 100",0.5),

    entry("Baga-de-fogo","Alquímico - catalisador","T$ 30",0.5),
    entry("Dente-de-dragão","Alquímico - catalisador","T$ 45",0.5),
    entry("Essência abissal","Alquímico - catalisador","T$ 150",0.5),
    entry("Líquen lilás","Alquímico - catalisador","T$ 30",0.5),
    entry("Musgo púrpura","Alquímico - catalisador","T$ 45",0.5),
    entry("Ossos de monstro","Alquímico - catalisador","T$ 45",0.5),
    entry("Pó de cristal","Alquímico - catalisador","T$ 30",0.5),
    entry("Pó de giz","Alquímico - catalisador","T$ 30",0.5),
    entry("Ramo verdejante","Alquímico - catalisador","T$ 45",0.5),
    entry("Saco de sal","Alquímico - catalisador","T$ 45",0.5),
    entry("Seixo de âmbar","Alquímico - catalisador","T$ 30",0.5),
    entry("Terra de cemitério","Alquímico - catalisador","T$ 30",0.5),

    entry("Beladona","Veneno","T$ 1.500",0.5),
    entry("Bruma sonolenta","Veneno","T$ 150",0.5),
    entry("Cicuta","Veneno","T$ 60",0.5),
    entry("Essência de sombra","Veneno","T$ 100",0.5),
    entry("Névoa tóxica","Veneno","T$ 30",0.5),
    entry("Peçonha comum","Veneno","T$ 15",0.5),
    entry("Peçonha concentrada","Veneno","T$ 90",0.5),
    entry("Peçonha potente","Veneno","T$ 600",0.5),
    entry("Pó de lich","Veneno","T$ 3.000",0.5),
    entry("Riso de Nimb","Veneno","T$ 150",0.5),

    entry("Batata valkariana","Alimentação","T$ 2",0.5),
    entry("Gorad quente","Alimentação","T$ 18",0.5),
    entry("Macarrão de Yuvalin","Alimentação","T$ 6",0.5),
    entry("Prato do aventureiro","Alimentação","T$ 1",0.5),
    entry("Ração de viagem (por dia)","Alimentação","T$ 0,5",0.5),
    entry("Refeição comum","Alimentação","T$ 0,3",0.5),
    entry("Sopa de peixe","Alimentação","T$ 1",0.5),

    entry("Alforje","Animal","T$ 30",0),
    entry("Cão de caça","Animal","T$ 150",0),
    entry("Cavalo","Animal","T$ 75",0),
    entry("Cavalo de guerra","Animal","T$ 400",0),
    entry("Estábulo (por dia)","Animal","T$ 0,1",0),
    entry("Pônei","Animal","T$ 5",0),
    entry("Pônei de guerra","Animal","T$ 30",0),
    entry("Trobo","Animal","T$ 60",0),

    entry("Balão goblin","Veículo","T$ 200",0),
    entry("Carroca","Veículo","T$ 150",0),
    entry("Carruagem","Veículo","T$ 500",0),
    entry("Canoa","Veículo","T$ 70",0),
    entry("Veleiro","Veículo","T$ 10.000",0),

    entry("Estadia comum","Serviço","T$ 0,5",0),
    entry("Estadia confortável","Serviço","T$ 4",0),
    entry("Estadia luxuosa","Serviço","T$ 20",0),
    entry("Condução terrestre","Serviço","T$ 0,5 por km",0),
    entry("Condução marítima","Serviço","T$ 0,1 por km",0),
    entry("Condução aérea","Serviço","T$ 10 por km",0),
    entry("Curandeiro","Serviço","T$ 5",0),
    entry("Magia de 1º círculo","Serviço","T$ 10",0),
    entry("Magia de 2º círculo","Serviço","T$ 90",0),
    entry("Magia de 3º círculo","Serviço","T$ 360",0),
    entry("Mensageiro","Serviço","T$ 0,5 por km",0)
  ];

  window.T20_ITEM_CATALOG=catalog.sort((a,b)=>a.category.localeCompare(b.category,"pt-BR")||a.name.localeCompare(b.name,"pt-BR"));
})();
