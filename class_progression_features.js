;(function(){
  const D={
    "*|magias":{
      cost:"Variável",
      action:"Conforme a magia",
      desc:"Você aprende e lança magias conforme a lista e o atributo-chave da classe. A progressão registrada indica o maior círculo de magia liberado até o nível atual."
    },
    "arcanista|magias":{
      cost:"Variável",
      action:"Conforme a magia",
      desc:"Você lança magias arcanas. Seu caminho de arcanista define a forma de aprendizado e conjuração, e a progressão indica o maior círculo liberado."
    },
    "bardo|magias":{
      cost:"Variável",
      action:"Conforme a magia",
      desc:"Você escolhe três escolas de magia e lança magias arcanas dessas escolas usando Carisma como atributo-chave. Soma Carisma aos PM e aprende novas magias em níveis pares."
    },
    "clerigo|magias":{
      cost:"Variável",
      action:"Conforme a magia",
      desc:"Você lança magias divinas usando Sabedoria como atributo-chave, soma Sabedoria aos PM e aprende novas magias conforme avança de nível."
    },
    "druida|magias":{
      cost:"Variável",
      action:"Conforme a magia",
      desc:"Você lança magias divinas de druida usando Sabedoria como atributo-chave. A progressão indica o maior círculo de magia liberado."
    },
    "frade|magias":{
      cost:"Variável",
      action:"Conforme a magia",
      desc:"Você lança magias divinas usando Sabedoria como atributo-chave, soma Sabedoria aos PM e aprende uma magia por nível. Pode lançar com armadura leve, mas armadura pesada exige teste de Misticismo."
    },
    "ermitao|magias":{
      cost:"Variável",
      action:"Conforme a magia",
      desc:"Você lança magias como o druida básico. A progressão indica o maior círculo liberado para suas magias divinas."
    },
    "magimarcialista|magias":{
      cost:"Variável",
      action:"Conforme a magia",
      desc:"Você lança magias como o bardo básico, integrando conjuração e combate por meio das cargas de Cadência Magimarcial."
    },
    "necromante|magias":{
      cost:"Variável",
      action:"Conforme a magia",
      desc:"Você lança magias como o arcanista básico, mas seu Caminho do Necromante altera sua lista e exige foco em necromancia."
    },
    "usurpador|magias":{
      cost:"Variável",
      action:"Conforme a magia",
      desc:"Você lança magias divinas com Carisma como atributo-chave e soma Carisma aos PM, mas não aprende magias automaticamente; usa Usurpar para lançar magias divinas acessíveis."
    },
    "*|devotofiel":{
      cost:"-",
      action:"-",
      desc:"Você se torna devoto de uma divindade maior e recebe dois poderes concedidos, seguindo as Obrigações & Restrições da devoção. Como alternativa, pode cultuar o Panteão conforme as regras da classe."
    },
    "*|abencoado":{
      cost:"-",
      action:"-",
      desc:"Você soma seu Carisma aos PM no 1º nível e recebe a devoção apropriada da classe, normalmente com dois poderes concedidos em vez de um."
    },
    "*|codigodoheroi":{
      cost:"-",
      action:"-",
      desc:"Você deve manter sua palavra, ajudar inocentes e não pode mentir, trapacear ou roubar. Se violar o código, perde todos os PM e só volta a recuperá-los no próximo dia."
    },
    "*|codigodehonra":{
      cost:"-",
      action:"-",
      desc:"Você segue o código de conduta da cavalaria: não se beneficia de flanquear nem ataca oponentes caídos, desprevenidos ou incapazes de lutar. Se violar o código, perde todos os PM até o próximo dia."
    },
    "*|baluarte":{
      cost:"1 PM+",
      action:"Reação",
      desc:"Quando sofre um ataque ou faz um teste de resistência, recebe bônus na Defesa e em resistências até o início do próximo turno. O bônus e o alcance para proteger aliados evoluem com o nível."
    },
    "*|duelo":{
      cost:"2 PM+",
      action:"Movimento",
      desc:"Você escolhe um oponente em alcance curto e recebe bônus em ataques e dano contra ele até o fim da cena. O bônus aumenta com o nível; atacar outro alvo encerra o duelo."
    },
    "*|evasao":{
      cost:"-",
      action:"-",
      desc:"Quando sofre um efeito que permite Reflexos para reduzir dano à metade, não sofre dano se passar. Requer liberdade de movimentos e não funciona com armadura pesada ou imóvel."
    },
    "*|evasaoaprimorada":{
      cost:"-",
      action:"-",
      desc:"Quando sofre um efeito que permite Reflexos para reduzir dano à metade, não sofre dano se passar e sofre apenas metade se falhar. Requer liberdade de movimentos."
    },
    "*|esquivasobrenatural":{
      cost:"-",
      action:"-",
      desc:"Seus instintos reagem antes do perigo ficar claro. Você nunca fica surpreendido ou desprevenido por não perceber uma ameaça."
    },
    "*|olhosnascostas":{
      cost:"-",
      action:"-",
      desc:"Você está sempre atento aos arredores e não pode ser flanqueado."
    },
    "*|empatiaselvagem":{
      cost:"-",
      action:"-",
      desc:"Você se comunica com animais por linguagem corporal e sons, podendo usar Adestramento para mudar atitude e persuadir animais."
    },
    "*|briga":{
      cost:"-",
      action:"-",
      desc:"Seus ataques desarmados causam dano maior, conforme a progressão da classe, e contam como armas naturais para efeitos relevantes."
    },
    "*|cascagrossa":{
      cost:"-",
      action:"-",
      desc:"Você soma Constituição na Defesa, limitado pelo nível e apenas se não estiver de armadura pesada. Em níveis mais altos, recebe bônus adicional na Defesa."
    },
    "*|engenhosidade":{
      cost:"2 PM",
      action:"-",
      desc:"Quando faz um teste de perícia, pode somar sua Inteligência ao resultado. Esta habilidade não se aplica a testes de ataque."
    },
    "*|orgulho":{
      cost:"Variável",
      action:"-",
      desc:"Quando faz um teste de perícia, pode gastar PM limitados pelo Carisma; para cada PM gasto, recebe +2 no teste."
    },
    "*|insolencia":{
      cost:"-",
      action:"-",
      desc:"Você soma seu Carisma na Defesa, limitado pelo nível. Requer liberdade de movimentos e não funciona com armadura pesada ou imóvel."
    },
    "*|esquivasagaz":{
      cost:"-",
      action:"-",
      desc:"Você recebe bônus crescente na Defesa e em Reflexos enquanto estiver com liberdade de movimentos, sem armadura pesada e não imóvel."
    },
    "*|marcadapresa":{
      cost:"1 PM+",
      action:"Movimento",
      desc:"Você analisa uma criatura em alcance curto. Até o fim da cena, causa dano extra contra ela; o dado de dano evolui com o nível e pode exigir PM adicionais."
    },
    "*|rastreador":{
      cost:"-",
      action:"-",
      desc:"Você recebe +2 em Sobrevivência e pode rastrear se movendo com deslocamento normal sem sofrer penalidade no teste."
    },
    "*|explorador":{
      cost:"-",
      action:"-",
      desc:"Escolha terrenos de exploração. Neles, você soma Sabedoria na Defesa e em Acrobacia, Atletismo, Furtividade, Percepção e Sobrevivência; a progressão adiciona terrenos ou melhora bônus."
    },
    "*|instintoselvagem":{
      cost:"-",
      action:"-",
      desc:"Você recebe bônus em Percepção, Reflexos e Sobrevivência, representando instintos cada vez mais apurados."
    },

    "arcanista|caminhodoarcanista":{
      cost:"-",
      action:"-",
      desc:"Escolha a origem de sua magia, como bruxo, feiticeiro ou mago. Essa escolha define regras importantes de conjuração, aprendizado e relação com focos ou grimórios."
    },
    "arcanista|altaarcana":{
      cost:"-",
      action:"-",
      desc:"Você atinge o ápice da prática arcana. Suas magias têm custo reduzido pela metade depois de aprimoramentos e demais reduções."
    },
    "sentinela|magias":{
      cost:"Variável",
      action:"Conforme a magia",
      desc:"Você lança magias como o arcanista básico, usando Inteligência como atributo-chave e liberando novos círculos pela progressão do sentinela."
    },
    "sentinela|caminhodosentinela":{
      cost:"-",
      action:"-",
      desc:"Você mistura combate e feitiçaria. Em combate, precisa empunhar uma arma proficiente ou fazer Misticismo para lançar magias; armadura leve não exige esse teste."
    },
    "sentinela|gladiomancia":{
      cost:"2 PM",
      action:"Movimento",
      desc:"Imbui uma arma leve ou ágil com essência arcana. Enquanto a empunhar, usa Inteligência para Defesa, Luta e dano dentro dos limites da habilidade."
    },
    "sentinela|magodecombate":{
      cost:"-",
      action:"Ao atacar",
      desc:"Ao atacar com uma arma sob Gladiomancia, soma o círculo máximo de magia ao dano e considera a mão da arma livre para lançar magias."
    },
    "sentinela|ataqueextra":{
      cost:"2 PM",
      action:"Ao agredir",
      desc:"Quando usa a ação agredir, pode realizar um ataque adicional uma vez por rodada."
    },
    "sentinela|mestrearcanocombatente":{
      cost:"-",
      action:"-",
      desc:"No auge da classe, usa Gladiomancia como ação livre e reduz pela metade o custo de suas habilidades de sentinela enquanto a arma estiver imbuída."
    },

    "barbaro|furia":{
      cost:"2 PM+",
      action:"Livre",
      desc:"Você entra em fúria e recebe bônus em ataques e dano corpo a corpo, mas não pode realizar ações que exijam calma ou concentração. O bônus aumenta com o nível e a fúria exige agressão ou ameaça para continuar."
    },
    "barbaro|reducaodedano":{
      cost:"-",
      action:"-",
      desc:"Sua resistência física reduz dano sofrido. O valor de RD aumenta conforme indicado na progressão."
    },
    "barbaro|furiatitanica":{
      cost:"-",
      action:"-",
      desc:"No ápice da selvageria, sua Fúria se torna devastadora, ampliando seus benefícios de combate e tornando seus ataques ainda mais perigosos."
    },

    "bardo|inspiracao":{
      cost:"2 PM+",
      action:"Padrão",
      desc:"Você inspira aliados em alcance curto com sua arte. Você e seus aliados recebem bônus em testes de perícia até o fim da cena; o bônus aumenta com o nível."
    },
    "bardo|ecletico":{
      cost:"1 PM",
      action:"-",
      desc:"Quando faz um teste de perícia, pode receber os benefícios de ser treinado nessa perícia para aquele teste."
    },
    "bardo|artistacompleto":{
      cost:"-",
      action:"-",
      desc:"Você pode usar Inspiração como ação livre. Enquanto estiver inspirado, suas habilidades de bardo, incluindo magias, têm custo em PM reduzido pela metade."
    },

    "bucaneiro|audacia":{
      cost:"2 PM",
      action:"-",
      desc:"Quando faz um teste de perícia, pode somar seu Carisma ao resultado. Esta habilidade não se aplica a testes de ataque."
    },
    "bucaneiro|panache":{
      cost:"-",
      action:"-",
      desc:"Quando realiza feitos ousados e vence desafios de perícia adequados ao seu estilo, recupera PM conforme as regras de Panache."
    },
    "bucaneiro|sortedenimb":{
      cost:"-",
      action:"-",
      desc:"A sorte absurda de Nimb favorece suas ousadias, permitindo resultados improváveis e reforçando seu estilo arriscado no fim da progressão."
    },

    "cacador|caminhodoexplorador":{
      cost:"-",
      action:"-",
      desc:"Nos terrenos escolhidos por Explorador, você atravessa terreno difícil sem reduzir deslocamento e fica muito mais difícil de rastrear."
    },
    "cacador|mestrecacador":{
      cost:"5 PM opcional",
      action:"Livre",
      desc:"Você usa Marca da Presa como ação livre. Ao marcá-la, pode pagar PM para aumentar sua margem de ameaça contra a presa e recupera PM ao reduzi-la a 0 PV."
    },

    "cavaleiro|caminhodocavaleiro":{
      cost:"-",
      action:"-",
      desc:"Escolha Bastião ou Montaria. Bastião melhora sua resistência com armadura pesada; Montaria fornece um cavalo de guerra/parceiro que evolui com o nível."
    },
    "cavaleiro|resoluto":{
      cost:"1 PM",
      action:"-",
      desc:"Você pode refazer um teste de resistência contra uma condição que esteja afetando você, com bônus no segundo teste. Só pode tentar uma vez por efeito."
    },
    "cavaleiro|bravurafinal":{
      cost:"3 PM",
      action:"Livre",
      desc:"Se for reduzido a 0 PV ou menos, pode continuar consciente e de pé com duração sustentada. Quando o efeito acaba, seus PV atuais voltam a causar suas consequências normais."
    },

    "clerigo|maodadivindade":{
      cost:"-",
      action:"-",
      desc:"Você se torna um canal direto da vontade divina, ampliando o impacto de suas bênçãos, milagres e ligação com a divindade no ápice da classe."
    },

    "druida|caminhodosermos":{
      cost:"-",
      action:"-",
      desc:"Escolha um caminho ligado aos ermos e à natureza. Essa escolha define benefícios naturais e limitações temáticas para seu avanço como druida."
    },
    "druida|forcadanatureza":{
      cost:"-",
      action:"-",
      desc:"Você manifesta o ápice da conexão com a natureza, ampliando seus poderes naturais e sua capacidade de agir como avatar dos ermos."
    },

    "guerreiro|ataqueespecial":{
      cost:"1 PM+",
      action:"Ao atacar",
      desc:"Quando faz um ataque, recebe bônus no teste de ataque, na rolagem de dano ou dividido entre ambos. A cada quatro níveis pode gastar mais PM para aumentar o bônus."
    },
    "guerreiro|durao":{
      cost:"3 PM",
      action:"Reação",
      desc:"Sempre que sofre dano, pode reduzir esse dano à metade."
    },
    "guerreiro|ataqueextra":{
      cost:"2 PM",
      action:"Livre",
      desc:"Quando usa a ação agredir, pode realizar um ataque adicional uma vez por rodada."
    },
    "guerreiro|campeao":{
      cost:"-",
      action:"-",
      desc:"O dano de todos os seus ataques aumenta em um passo. Quando acerta usando Ataque Especial ou Golpe Pessoal, recupera metade dos PM gastos."
    },

    "inventor|prototipo":{
      cost:"-",
      action:"-",
      desc:"Você começa com um item superior ou um conjunto de itens alquímicos de valor definido, representando suas primeiras criações."
    },
    "inventor|fabricaritemsuperior":{
      cost:"-",
      action:"Entre aventuras",
      desc:"Você recebe e passa a fabricar itens superiores. A quantidade de melhorias disponíveis aumenta nos níveis indicados pela progressão."
    },
    "inventor|comerciante":{
      cost:"-",
      action:"-",
      desc:"Você vende itens por 10% a mais que o normal. Este benefício não se acumula com barganha."
    },
    "inventor|encontrarfraqueza":{
      cost:"2 PM",
      action:"Movimento",
      desc:"Você analisa um objeto em alcance curto para ignorar sua RD. Também pode analisar inimigos de armadura ou construtos para receber bônus em ataques contra eles até o fim da cena."
    },
    "inventor|fabricaritemmagico":{
      cost:"-",
      action:"Entre aventuras",
      desc:"Você recebe e passa a fabricar itens mágicos. A categoria liberada evolui de menor para médio e maior conforme a progressão."
    },
    "inventor|olhododragao":{
      cost:"-",
      action:"Completa",
      desc:"Ao analisar um item, descobre automaticamente se ele é mágico, quais propriedades possui e como utilizá-las."
    },
    "inventor|obraprima":{
      cost:"-",
      action:"Entre aventuras",
      desc:"Você cria sua obra-prima, um item único aprovado pelo mestre, com benefícios equivalentes a um item extremamente aprimorado."
    },

    "ladino|ataquefurtivo":{
      cost:"-",
      action:"1/rodada",
      desc:"Uma vez por rodada, ao atingir uma criatura desprevenida, flanqueada ou com ataque em alcance curto adequado, causa dano extra. O dano aumenta a cada dois níveis."
    },
    "ladino|especialista":{
      cost:"1 PM",
      action:"-",
      desc:"Escolha perícias treinadas com base em sua Inteligência. Ao fazer teste com uma delas, pode dobrar o bônus de treinamento. Não se aplica a ataques."
    },
    "ladino|apessoacertaparaotrabalho":{
      cost:"-",
      action:"-",
      desc:"No ápice da carreira, você sempre tem o contato, truque ou competência certa para a situação, reforçando sua versatilidade lendária."
    },

    "lutador|golperelampago":{
      cost:"1 PM",
      action:"Livre",
      desc:"Quando usa a ação agredir para fazer um ataque desarmado, pode realizar um ataque desarmado adicional."
    },
    "lutador|golpecruel":{
      cost:"-",
      action:"-",
      desc:"Sua margem de ameaça com ataques desarmados aumenta em +1."
    },
    "lutador|golpeviolento":{
      cost:"-",
      action:"-",
      desc:"Seu multiplicador de crítico com ataques desarmados aumenta em +1."
    },
    "lutador|donodarua":{
      cost:"-",
      action:"-",
      desc:"Seu dano desarmado atinge o ápice e, ao usar a ação agredir para atacar desarmado, faz dois ataques em vez de um, ainda podendo combinar com Golpe Relâmpago."
    },

    "nobre|autoconfianca":{
      cost:"-",
      action:"-",
      desc:"Você pode usar Carisma no lugar de Destreza na Defesa, respeitando as restrições normais de armadura pesada."
    },
    "nobre|espolio":{
      cost:"-",
      action:"-",
      desc:"Você recebe um item à sua escolha com preço até o limite definido pela classe."
    },
    "nobre|palavrasafiadas":{
      cost:"-",
      action:"Padrão",
      desc:"Você fere a confiança dos inimigos com palavras e presença social, causando dano psíquico que aumenta conforme a progressão."
    },
    "nobre|riqueza":{
      cost:"-",
      action:"-",
      desc:"Você recebe rendimentos e recursos associados à sua posição social, aumentando sua capacidade de sustentar equipamentos e influência."
    },
    "nobre|gritarordens":{
      cost:"-",
      action:"-",
      desc:"Sua autoridade permite comandar aliados em combate, concedendo coordenação tática conforme as regras da habilidade."
    },
    "nobre|presencaaristocratica":{
      cost:"-",
      action:"-",
      desc:"Sua presença impõe respeito e dificulta que criaturas inteligentes ajam livremente contra você."
    },
    "nobre|realeza":{
      cost:"-",
      action:"-",
      desc:"Você atinge o auge da autoridade nobre, ampliando sua influência, recursos e capacidade de comandar aliados e súditos."
    },

    "paladino|golpedivino":{
      cost:"2 PM+",
      action:"Ao atacar",
      desc:"Quando faz um ataque corpo a corpo, soma Carisma ao teste de ataque e causa dano extra de luz. O dano aumenta com PM adicionais liberados pela progressão."
    },
    "paladino|curapelasmaos":{
      cost:"1 PM+",
      action:"Movimento",
      desc:"Você cura um alvo em alcance corpo a corpo por luz, incluindo você mesmo. A cura aumenta com PM adicionais e pode remover condições em níveis mais altos."
    },
    "paladino|aurasagrada":{
      cost:"1 PM",
      action:"Movimento",
      desc:"Você gera uma aura sustentada de 9m. Você e aliados dentro dela somam seu Carisma em testes de resistência."
    },
    "paladino|bencaodajustica":{
      cost:"2 PM+",
      action:"Movimento",
      desc:"Escolha Égide Sagrada ou Montaria Sagrada. A Égide protege com energia divina; a Montaria invoca ou mantém uma montaria sagrada conforme a campanha."
    },
    "paladino|vingadorsagrado":{
      cost:"10 PM",
      action:"Completa",
      desc:"Você assume forma de vingador sagrado até o fim da cena, recebendo voo, RD elevada e Golpe Divino mais eficiente e poderoso."
    },

    "santo|abencoado":{
      cost:"-",
      action:"-",
      desc:"Como o paladino básico, você soma Carisma aos PM e recebe devoção apropriada, mas não pode escolher ser um santo do bem."
    },

    "treinador|direcionar":{
      cost:"1 PM+",
      action:"Movimento",
      desc:"Você orienta seu melhor amigo ou criatura treinada, concedendo bônus em testes e ataques conforme a relação de treinamento."
    },
    "treinador|melhoramigo":{
      cost:"-",
      action:"-",
      desc:"Você possui uma criatura companheira especial que aprende truques e evolui com seu nível, sem funcionar como um parceiro comum."
    },
    "treinador|domarcriatura":{
      cost:"Variável",
      action:"Completa",
      desc:"Você tenta controlar uma criatura com Adestramento. A quantidade de dados e o limite de ND evoluem com o nível."
    },
    "treinador|treinoespecializado":{
      cost:"-",
      action:"-",
      desc:"Seu melhor amigo recebe treinamento mais refinado, melhorando truques e benefícios de combate."
    },
    "treinador|sincroniadecombate":{
      cost:"-",
      action:"-",
      desc:"Você e seu melhor amigo agem de forma coordenada em combate, reforçando ataques, posicionamento e uso de truques."
    },
    "treinador|sincroniaperfeita":{
      cost:"-",
      action:"-",
      desc:"No ápice da classe, a coordenação com seu melhor amigo se torna perfeita, melhorando drasticamente a eficiência conjunta."
    },

    "frade|erudicao":{
      cost:"Variável",
      action:"-",
      desc:"Quando faz um teste de perícia, exceto ataque, pode gastar PM limitados pela Inteligência; para cada PM gasto, recebe +2 no teste."
    },
    "frade|versiculario":{
      cost:"1 hora/dia",
      action:"Entre cenas",
      desc:"Você estuda seu versiculário e escolhe magias em quantidade limitada por Inteligência e nível. Até o próximo dia, recebe +1 PM para aprimoramentos ao lançar essas magias."
    },
    "frade|dadivadafe":{
      cost:"Variável",
      action:"Movimento",
      desc:"Você recebe Proteção Sagrada ou Cólera Divina conforme a energia canalizada por sua divindade, fortalecendo símbolo sagrado e aliados ou punição divina."
    },
    "frade|solosantificado":{
      cost:"-",
      action:"-",
      desc:"Você consagra plenamente sua presença e seus sacrários, transformando o campo de atuação do frade em terreno de forte influência divina."
    },

    "alquimista|laboratoriopessoal":{
      cost:"-",
      action:"-",
      desc:"Você começa com instrumentos de alquimista aprimorados e uma seleção inicial de itens alquímicos dentro do valor definido pela classe."
    },
    "alquimista|alquimistainiciado":{
      cost:"-",
      action:"-",
      desc:"Você recebe o poder Alquimista Iniciado, ganhando livro de fórmulas e acesso à fabricação de poções conforme as regras do inventor."
    },
    "alquimista|misturabasica":{
      cost:"-",
      action:"Ao usar item",
      desc:"Você pode usar catalisadores em itens alquímicos como se fossem magias."
    },
    "alquimista|aplicacaorapida":{
      cost:"2 PM",
      action:"Completa",
      desc:"Você usa dois preparados alquímicos ao mesmo tempo, desde que tenha ambos nas mãos ou consiga sacá-los como ação livre."
    },
    "alquimista|magiaengarrafada":{
      cost:"-",
      action:"-",
      desc:"Você pode aplicar Mistura Básica e Aplicação Rápida também em poções."
    },
    "alquimista|odoresalquimicos":{
      cost:"-",
      action:"Completa",
      desc:"Você detecta itens alquímicos e poções em alcance médio, identificando tipo, uso geral ou magia emulada e custo de fabricação."
    },
    "alquimista|fabricaremulsao":{
      cost:"-",
      action:"Entre aventuras",
      desc:"Você aprende a fabricar emulsões. A quantidade de encantos disponíveis aumenta nos níveis indicados pela progressão."
    },
    "alquimista|mestrealquimista":{
      cost:"-",
      action:"-",
      desc:"Você recebe o poder Mestre Alquimista."
    },
    "alquimista|bombardeioeficiente":{
      cost:"1 PM",
      action:"Ao usar item",
      desc:"Ao usar preparado alquímico ou poção que cause dano, pode fazer o item ignorar parte da RD das criaturas atingidas."
    },
    "alquimista|pedrafilosofal":{
      cost:"Sacrifício da pedra",
      action:"Reação",
      desc:"Enquanto possui a pedra filosofal, recebe Cura Acelerada e melhora testes de Fortitude. Pode sacrificá-la para salvar uma criatura em alcance curto reduzida a 0 PV ou morta."
    },

    "atleta|arremessoatletico":{
      cost:"-",
      action:"-",
      desc:"Você usa seu treinamento físico com armas de arremesso e pode aplicar o dano de Briga ao dano básico dessas armas. Em níveis altos, elas contam como ataques desarmados para suas habilidades."
    },
    "atleta|poderiomuscular":{
      cost:"Conforme magia",
      action:"Conforme magia",
      desc:"Você aprende e pode lançar Primor Atlético apenas em si mesmo. Não é uma habilidade mágica; representa treinamento físico extremo."
    },
    "atleta|maisaltoemaisrapido":{
      cost:"-",
      action:"-",
      desc:"Seu deslocamento aumenta, você recebe escalada e natação parciais e soma seu nível no tempo que consegue prender a respiração."
    },
    "atleta|disciplinaatletica":{
      cost:"2 PM",
      action:"-",
      desc:"Quando falha em um teste de resistência, pode rolar novamente usando Atletismo no lugar da perícia original."
    },
    "atleta|corpoideal":{
      cost:"-",
      action:"-",
      desc:"Você recebe imunidade a cansaço, condições de metabolismo e veneno, RD 10 e seu dano desarmado e com arremesso atinge 2d10 para criaturas Médias."
    },
    "atleta|facanhaatletica":{
      cost:"-",
      action:"-",
      desc:"Seu treinamento permite feitos físicos extraordinários, melhorando o uso de Atletismo e manobras corporais conforme a classe."
    },

    "burgues|meiosdeproducao":{
      cost:"-",
      action:"Início da aventura",
      desc:"No início de cada aventura, recebe dinheiro, itens mundanos ou poções. O valor aumenta por patamar."
    },
    "burgues|podermonetario":{
      cost:"TO",
      action:"Ao usar habilidade",
      desc:"Ao usar habilidade com custo em PM, pode consumir tibares de ouro, limitados pelo Carisma, para pagar parte do custo. O limite diário aumenta com o nível."
    },
    "burgues|desmoralizar":{
      cost:"Conforme magia",
      action:"Conforme magia",
      desc:"Você aprende e pode lançar Perdição apenas contra criaturas inteligentes. Não é magia; representa sua capacidade de abalar a autoconfiança dos outros."
    },
    "burgues|negociantenato":{
      cost:"1 dia",
      action:"Entre cenas",
      desc:"Ao chegar a uma comunidade, pode fazer contatos comerciais para vender itens por porcentagem maior, conforme o resultado de Diplomacia."
    },
    "burgues|suborno":{
      cost:"Conforme magia",
      action:"Conforme magia",
      desc:"Você aprende e pode lançar Enfeitiçar com Carisma. A CD aumenta se você usou dinheiro para pagar parte do custo."
    },
    "burgues|ostentacao":{
      cost:"-",
      action:"-",
      desc:"Você se beneficia de um item vestido adicional e pode aumentar a CD de habilidades de burguês por ostentar itens luxuosos específicos."
    },
    "burgues|novorico":{
      cost:"-",
      action:"-",
      desc:"Para cada item mágico vestido por pelo menos um dia, recebe PM adicionais conforme o nível de poder do item."
    },
    "burgues|magnata":{
      cost:"-",
      action:"-",
      desc:"Desmoralizar também reduz a CD das habilidades dos afetados. Além disso, consumir dinheiro para pagar PM reforça ainda mais sua pressão econômica."
    },

    "duelista|escoladeduelo":{
      cost:"-",
      action:"-",
      desc:"Escolha uma escola de duelo: ambidestra, clássica ou tiro. Ela define seus bônus defensivos, ofensivos ou proficiências e não pode ser mudada."
    },
    "duelista|truquesdecapa":{
      cost:"2 PM",
      action:"Variável",
      desc:"Usando uma capa ou item semelhante, você realiza truques dramáticos para fintar, resistir, impulsionar-se, reduzir queda, reforçar perícias de Carisma ou cortar dano."
    },
    "duelista|tecnicaavancada":{
      cost:"1 PM",
      action:"Variável",
      desc:"Sua escola de duelo ganha uma técnica avançada: contra-ataque ambidestro, crítico com ataque adicional ou melhoria de armas de fogo, conforme a escola escolhida."
    },
    "duelista|duelistalendario":{
      cost:"1 PM",
      action:"Ao atacar ou ser atacado",
      desc:"Quando usa sua escola de duelo, pode rolar novamente seus ataques ou forçar um oponente a rolar novamente um ataque contra você."
    },

    "ermitao|sitiosagrado":{
      cost:"-",
      action:"Entre aventuras",
      desc:"Você assume um local sagrado para sua divindade. Ele funciona como refúgio, base e origem de terrenos associados com benefícios próprios."
    },
    "ermitao|empatiaselvagem":{
      cost:"-",
      action:"-",
      desc:"Como o druida básico, mas você também pode se comunicar com criaturas vegetais não inteligentes e espíritos."
    },
    "ermitao|vinculocomaterra":{
      cost:"-",
      action:"-",
      desc:"Quando está em terreno associado ao sítio sagrado, suas magias custam menos PM, cumulativo com outras reduções."
    },
    "ermitao|temperadopeloclima":{
      cost:"-",
      action:"-",
      desc:"Você recebe RD contra tipos de dano ligados aos terrenos associados ao seu sítio sagrado."
    },
    "ermitao|eixodepedras":{
      cost:"1/aventura",
      action:"Livre",
      desc:"Você prepara magias no eixo de pedras de seu sítio sagrado. Em terrenos associados, pode descarregar uma dessas magias por rodada sem pagar o custo."
    },

    "inovador|dobomedomelhor":{
      cost:"-",
      action:"-",
      desc:"Você começa com uma arma, armadura ou escudo superior de valor definido, mas é considerado não proficiente com equipamento que não seja superior ou mágico."
    },
    "inovador|sequenciaespecial":{
      cost:"2 PM+",
      action:"Livre",
      desc:"Você inicia uma sequência de movimentos. Cada vez que ataca com uma arma ainda não usada na sequência, acumula bônus em ataque e dano até o limite indicado pela progressão."
    },
    "inovador|bombardeiosequencial":{
      cost:"-",
      action:"Ao usar item",
      desc:"Você pode aplicar Sequência Especial a itens alquímicos ou poções; o bônus acumulado melhora a CD para resistir ao item."
    },
    "inovador|acrobaciadefensiva":{
      cost:"2 PM",
      action:"Reação",
      desc:"Quando sofre dano, faz um teste de Acrobacia e subtrai o resultado do dano sofrido."
    },
    "inovador|dominioexcentrico":{
      cost:"-",
      action:"Após 1 semana",
      desc:"Depois de uma semana carregando uma arma exótica ou de fogo superior ou mágica, você recebe proficiência com ela."
    },
    "inovador|tecnicaexcentrica":{
      name:"Técnica Excêntrica",
      cost:"2 PM",
      action:"Livre",
      desc:"Até o fim do combate, armas empunhadas funcionam como se tivessem uma habilidade escolhida, como adaptável, ágil, alongada, dupla ou versátil."
    },
    "inovador|estilounico":{
      cost:"-",
      action:"-",
      desc:"Escolha dois poderes de guerreiro ou combate que possua. Para eles, ignora requisitos e restrições relacionados a armas, com aprovação do mestre para interações."
    },

    "machado_de_pedra|grunhidos":{
      cost:"-",
      action:"-",
      desc:"Você conhece apenas o idioma rústico de sua comunidade, mas aprende uma palavra em valkar por nível de machado de pedra."
    },
    "machado_de_pedra|machadodepedra":{
      cost:"-",
      action:"-",
      desc:"Você usa apenas armas simples e rústicas específicas. Com armas naturais, ataques desarmados ou essas armas, recebe bônus em ataque e dano."
    },
    "machado_de_pedra|tangadepeles":{
      cost:"-",
      action:"-",
      desc:"Sem armadura, você soma Constituição na Defesa e recebe bônus adicional crescente na Defesa conforme a progressão."
    },
    "machado_de_pedra|furiaprimitiva":{
      cost:"-1 PM na Fúria",
      action:"Ao entrar em fúria",
      desc:"Se estiver sem armadura e empunhando arma de Machado de Pedra, o custo da Fúria diminui. Uma vez por cena, ao entrar em fúria, recebe PV temporários iguais ao nível + Constituição."
    },
    "machado_de_pedra|resilienciaprimal":{
      cost:"-",
      action:"-",
      desc:"Você recebe RD crescente graças a vigor e força de vontade. O valor aumenta até o máximo indicado pela progressão."
    },
    "machado_de_pedra|furiarustica":{
      cost:"5 PM",
      action:"Ao entrar em fúria",
      desc:"Durante a fúria, recebe Cura Acelerada 10 cumulativa e pode fazer um ataque desarmado adicional ao usar a ação agredir."
    },

    "magimarcialista|cadenciamagimarcial":{
      cost:"-",
      action:"-",
      desc:"Ao lançar magia de bardo, ganha carga arcana; ao usar a ação agredir, ganha carga marcial. Você acumula cargas até seu Carisma e elas duram até o fim da cena."
    },
    "magimarcialista|magificacao":{
      cost:"-",
      action:"-",
      desc:"Com pelo menos uma carga arcana e uma marcial, recebe bônus em ataques e dano e conta como sob Inspiração. O bônus aumenta com o nível."
    },
    "magimarcialista|bravadomagimarcial":{
      cost:"1 carga",
      action:"Ao lançar magia ou atacar",
      desc:"Gaste carga marcial para reduzir o custo de uma magia ou carga arcana para causar dano extra em um ataque."
    },
    "magimarcialista|dancadefensiva":{
      cost:"1 carga",
      action:"Reação",
      desc:"Gaste carga marcial para melhorar um teste de resistência ou carga arcana para receber RD contra dano sofrido."
    },
    "magimarcialista|artesublime":{
      cost:"+1 carga",
      action:"Ao usar habilidade",
      desc:"Ao usar Bravado Magimarcial ou Dança Defensiva, pode gastar uma carga adicional do tipo exigido para dobrar o efeito."
    },
    "magimarcialista|crescendovitorioso":{
      cost:"-",
      action:"Início do combate",
      desc:"No início de cada combate, recebe uma carga arcana e uma marcial. Cargas marciais aumentam CDs de bardo; cargas arcanas melhoram ataques e dano."
    },

    "necromante|caminhodonecromante":{
      cost:"-",
      action:"-",
      desc:"Você aprende necromancia divina como arcana, não aprende encantamento e deve manter ao menos metade de suas magias conhecidas como necromancia."
    },
    "necromante|falarcommortos":{
      cost:"1 PM",
      action:"Padrão",
      desc:"Você se comunica com mortos-vivos por poderes arcanos e usa Misticismo para interação social com eles. A partir do 3º nível, pode conversar com cadáver em alcance curto."
    },
    "necromante|animarcadaver":{
      cost:"3/6/9 PM",
      action:"Completa",
      desc:"Você anima um cadáver Pequeno, Médio ou Grande como parceiro cadáver. Pode sacrificá-lo para reduzir dano sofrido e criar parceiros mais fortes em níveis maiores."
    },
    "necromante|necrologia":{
      cost:"-",
      action:"-",
      desc:"Você recebe bônus em Cura, Fortitude e na CD de suas magias de necromancia. O bônus aumenta conforme a progressão."
    },
    "necromante|distorcaonecrotica":{
      cost:"-",
      action:"-",
      desc:"Escolha uma magia conhecida de 1º círculo que não seja necromancia. A escola dela passa a ser necromancia e sua aparência/natureza muda de acordo."
    },
    "necromante|necropotencia":{
      cost:"PV dobrado",
      action:"Ao lançar magia",
      desc:"Ao estabelecer conexão com a morte e gastar mais PV, recebe PM temporários quando reduz inimigos vivos a 0 PV ou menos com magia de necromancia, até limite por cena."
    },
    "necromante|dominiosobreamorte":{
      cost:"2 PM opcional",
      action:"Ao matar com necromancia",
      desc:"Suas magias de necromancia custam menos. Quando mata criatura viva com necromancia, pode erguer o cadáver como morto-vivo sob seu controle sem componente material."
    },

    "santo|ladainhadecombate":{
      cost:"2 PM+",
      action:"Padrão",
      desc:"Você cria uma aura sustentada de 9m que concede bônus a ataques, dano e Defesa. Em níveis maiores, adiciona dano de luz contra alvos apropriados e o encanto veloz às armas."
    },
    "santo|santocurandeiro":{
      cost:"Variável",
      action:"Movimento",
      desc:"Cura o aliado em alcance médio com maior perda de PV. Em níveis maiores, também remove uma condição selecionada."
    },
    "santo|vasosagrado":{
      name:"Vaso do Espírito",
      cost:"1 PM",
      action:"-",
      desc:"Quando faz um teste de resistência, pode somar seu Carisma ao resultado."
    },
    "santo|martir":{
      cost:"1 PM",
      action:"Reação",
      desc:"Quando aliado em alcance médio faz teste de resistência, concede bônus igual ao seu Carisma. A partir do 12º nível, pode sofrer o efeito no lugar dele uma vez por cena."
    },
    "santo|pirasanta":{
      cost:"Variável",
      action:"Movimento",
      desc:"Enquanto está sob Ladainha de Combate, gasta PM para causar dano de luz ao inimigo de maior ND em alcance médio e deixá-lo ofuscado; Fortitude reduz o dano."
    },
    "santo|vingadorsantificado":{
      cost:"+5 PM",
      action:"Ao usar Ladainha",
      desc:"Ao usar Ladainha de Combate, pode dobrar seus bônus numéricos e conceder imunidade a críticos e RD aos aliados dentro da aura."
    },

    "seteiro|caminhodoatirador":{
      cost:"-",
      action:"-",
      desc:"Suas habilidades de seteiro relacionadas a ataques e armas funcionam apenas com arcos e bestas."
    },
    "seteiro|tirodesupressao":{
      cost:"-",
      action:"Ao causar dano",
      desc:"Quando causa dano com arco ou besta em criatura sob Marca da Presa, ela sofre penalidade cumulativa em dano até o limite de PM gasto na marca."
    },
    "seteiro|disparoconstritor":{
      cost:"2 PM",
      action:"Ao mirar",
      desc:"Ao usar a ação mirar, pode preparar um ataque à distância que executa manobra de desarmar, empurrar ou quebrar até o fim do turno."
    },
    "seteiro|rajadadeflechas":{
      cost:"-",
      action:"Ataque à distância",
      desc:"Você dispara contra uma área, comparando um ataque à Defesa de inimigos próximos e aplicando dano com bônus cumulativo por acerto."
    },
    "seteiro|sentinela":{
      cost:"1 PM",
      action:"Reação",
      desc:"Uma vez por rodada, quando criatura sob Marca da Presa acerta um aliado, você pode fazer um ataque contra ela."
    },
    "seteiro|mestredodisparo":{
      cost:"-",
      action:"Livre",
      desc:"Você usa Marca da Presa como ação livre e, uma vez por rodada, faz ataque adicional contra alvo marcado com arco ou besta."
    },

    "usurpador|inimigodosdeuses":{
      cost:"-",
      action:"-",
      desc:"Por roubar o poder dos deuses, você não pode ter devoção."
    },
    "usurpador|usurpar":{
      cost:"Conforme magia",
      action:"Conforme magia",
      desc:"Você pode lançar qualquer magia divina de círculo acessível se passar em Enganação contra CD baseada no custo da magia. Falha gasta PM e perde a magia."
    },
    "usurpador|canalizacaofalsa":{
      cost:"-",
      action:"-",
      desc:"Você pode canalizar tanto energia positiva quanto negativa."
    },
    "usurpador|discricaodivina":{
      cost:"-",
      action:"-",
      desc:"Você recebe bônus em Furtividade e testes de resistência. O bônus aumenta conforme a progressão."
    },
    "usurpador|podercapturado":{
      cost:"1 hora",
      action:"Entre cenas",
      desc:"Escolha deuses e poderes concedidos. Com teste de Enganação, torna-se temporariamente considerado devoto para usar o poder sem seguir Obrigações & Restrições."
    },
    "usurpador|roubodivino":{
      cost:"-",
      action:"Ao usar Usurpar",
      desc:"Ao lançar magia com Usurpar, seu resultado de Enganação reduz o custo em PM e aumenta a CD para resistir à magia."
    },

    "vassalo|suserano":{
      cost:"-",
      action:"-",
      desc:"Você serve a um suserano e recebe status, abrigo e influência nas terras dele. Se deixar de servi-lo, perde seus PM até ser aceito por outro."
    },
    "vassalo|jovempajem":{
      cost:"-",
      action:"-",
      desc:"Você inicia sua vida de serviço nobre como pajem, com acesso às responsabilidades e benefícios iniciais da progressão de vassalo."
    },
    "vassalo|valete":{
      cost:"-",
      action:"-",
      desc:"Você se torna treinado em Diplomacia ou Nobreza e recebe um poder de cavaleiro."
    },
    "vassalo|escudeiroaprendiz":{
      cost:"-",
      action:"-",
      desc:"Você se torna treinado em Cavalgar e recebe proficiência com armaduras pesadas; se já a tiver, recebe bônus na Defesa usando armadura pesada."
    },
    "vassalo|guardadocastelo":{
      cost:"-",
      action:"-",
      desc:"Você se torna treinado em Intuição e recebe um poder de cavaleiro."
    },
    "vassalo|vigilantedasestradas":{
      cost:"-",
      action:"-",
      desc:"Você recebe a habilidade Montaria e se torna treinado em Percepção."
    },
    "vassalo|cavaleirodoreino":{
      cost:"-",
      action:"-",
      desc:"Você recebe uma arma, armadura ou escudo superior com duas melhorias e um poder de cavaleiro."
    },
    "vassalo|sargentodoreino":{
      cost:"-",
      action:"-",
      desc:"Você recebe um poder de cavaleiro ou guerreiro, tratando seu nível de vassalo como nível de guerreiro para pré-requisitos."
    },
    "vassalo|capitaodoreino":{
      cost:"-",
      action:"-",
      desc:"Você recebe o poder Escudeiro e a habilidade Golpe Divino como um paladino de nível igual ao seu."
    },
    "vassalo|lorde":{
      cost:"-",
      action:"-",
      desc:"Você recebe Autoridade Feudal ou melhora seus convocados e escolhe Caminho do Soldado ou do Governante, definindo benefícios futuros."
    },
    "vassalo|barao":{
      cost:"-",
      action:"-",
      desc:"Seu título aumenta e aprofunda os benefícios do caminho escolhido, reforçando seu papel militar ou governante."
    },
    "vassalo|visconde":{
      cost:"-",
      action:"-",
      desc:"Sua posição nobre cresce, trazendo mais prestígio, influência narrativa e benefícios de classe associados ao caminho escolhido."
    },
    "vassalo|conde":{
      cost:"-",
      action:"-",
      desc:"Você alcança um grau mais alto da nobreza e reforça os benefícios de status e comando da progressão de vassalo."
    },
    "vassalo|marques":{
      cost:"-",
      action:"-",
      desc:"Se escolheu Caminho do Soldado, recebe RD e Defesa; se escolheu Caminho do Governante, soma Carisma em testes de resistência."
    },
    "vassalo|duque":{
      cost:"-",
      action:"-",
      desc:"Autoridade Feudal convoca parceiro de nível maior e você recebe um poder de cavaleiro."
    },
    "vassalo|arquiduque":{
      cost:"5 PM",
      action:"Reação",
      desc:"Uma vez por rodada, quando uma criatura inteligente causa dano a você, pode reduzir esse dano a 0."
    },
    "vassalo|conselheiroreal":{
      cost:"-",
      action:"-",
      desc:"Você recebe um poder de cavaleiro e aprende uma magia divina de até 4º círculo com Carisma como atributo-chave."
    },
    "vassalo|reimercenario":{
      cost:"-",
      action:"-",
      desc:"O caminho escolhido concede pontos de atributo para distribuir entre atributos físicos ou mentais apropriados."
    },
    "vassalo|rei":{
      cost:"-",
      action:"-",
      desc:"Você recebe +1 em Carisma e um poder de cavaleiro."
    },
    "vassalo|altorei":{
      cost:"-",
      action:"-",
      desc:"Você comanda um domínio ainda maior, com seguidores e recursos à disposição conforme a progressão narrativa do vassalo."
    },
    "vassalo|imperador":{
      cost:"-",
      action:"-",
      desc:"Você atinge o ápice do status de vassalo, tornando-se uma figura de autoridade máxima dentro da progressão da classe."
    },

    "ventanista|charme":{
      cost:"Variável",
      action:"-",
      desc:"Você soma Carisma aos PM. Em testes de perícia, exceto ataques, pode gastar PM limitados pelo Carisma para receber +2 por PM gasto."
    },
    "ventanista|truquesdooficio":{
      cost:"Conforme magia",
      action:"Conforme magia",
      desc:"Você lança magias arcanas de encantamento e ilusão como habilidades simuladas, aprende novas magias em níveis pares e usa Inteligência como atributo-chave."
    },
    "ventanista|disfarceelaborado":{
      cost:"-3 PM por poder",
      action:"Ao se disfarçar",
      desc:"Ao fazer disfarce com Enganação, pode escolher poderes relacionados ao disfarce cujos pré-requisitos cumpra. Enquanto estiver disfarçado, pode usá-los."
    },
    "ventanista|viraracasaca":{
      cost:"1 PM",
      action:"Livre",
      desc:"Se estiver disfarçado, remove o disfarce e faz teste para se esconder usando Enganação no lugar de Furtividade, mesmo sem camuflagem ou cobertura."
    },
    "ventanista|provocacaoousada":{
      cost:"-",
      action:"Completa",
      desc:"No primeiro turno de cada cena, provoca inimigos, usando sua ousadia para atrair atenção e abrir oportunidades conforme a habilidade."
    },
    "ventanista|ograndegolpe":{
      cost:"-",
      action:"-",
      desc:"Você prepara o golpe perfeito do ventanista, combinando disfarce, truques e oportunidade para alcançar um resultado decisivo no ápice da classe."
    }
  };

  window.T20_CLASS_FEATURE_DETAILS=D;
})();
