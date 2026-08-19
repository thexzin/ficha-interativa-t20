# Ficha Interativa Tormenta20

Ficha digital não oficial para **Tormenta20**, feita para uso durante sessões. Funciona como aplicação web estática, sem etapa de compilação, e reúne ficha de personagem, catálogos, rolagens, inventário e campanhas em uma única interface.

## Visão geral

- Criação e gerenciamento de múltiplos personagens.
- Uso offline pelo navegador ou sincronização opcional com Supabase.
- Campanhas compartilhadas, fichas vinculadas e Escudo do Mestre.
- Cálculos automáticos de atributos, PV, PM, Defesa, RD, perícias, CD e carga.
- Suporte a multiclasse, progressão de nível e habilidades raciais automáticas.
- Importação e exportação de fichas em JSON.
- Interface responsiva com cards recolhíveis e organização em abas.
- Endereços próprios para início, fichas, campanhas e abas da ficha, com suporte aos botões voltar e avançar do navegador.

## Funcionalidades

### Personagem

A ficha controla raça, classes e níveis, origem, divindade, atributos, tamanho e deslocamento. Progressões de classe e habilidades fixas de raça são adicionadas automaticamente em `Poderes`.

PV aceita valores negativos e pontos temporários. PM também possui pontos temporários, gasto e recuperação. A aba `Modificadores` concentra bônus globais e alterações temporárias de atributos.

### Perícias e combate

Perícias permitem trocar o atributo-chave, marcar treinamento e aplicar automaticamente penalidade de armadura, condições, parceiros e modificadores globais. Resultados naturais 1 e 20 recebem destaque visual.

Ataques calculam acerto e dano em uma única rolagem, incluindo crítico, dano extra, atributo no dano, melhor/pior d20 e bônus vindos da arma equipada.

### Poderes, magias e parceiros

- Poderes de classe, raça, origem, gerais e concedidos possuem catálogos integrados.
- Grimório e catálogo de magias incluem filtros por círculo, tipo e escola.
- Parceiros possuem graduação limitada pelo patamar e aplicam bônus passivos compatíveis.
- Poderes, magias, parceiros, ataques e itens usam cards expansíveis.

### Inventário

O Inventário reúne itens mundanos e mágicos dos catálogos incluídos. Itens equipados podem aplicar atributos, Defesa, RD, penalidade de armadura, perícias, resistências, PV, PM, CD, carga e bônus de ataque ou dano.

Armas, armaduras, escudos e esotéricos aceitam melhorias, materiais especiais e encantos. O preço final pode ser calculado automaticamente: o card recolhido mostra somente o total e o card expandido apresenta a composição do valor. Preços manuais continuam disponíveis.

### Nuvem e campanhas

Com Supabase configurado, cada usuário pode salvar fichas na nuvem, criar ou entrar em campanhas por convite e vincular personagens. O mestre pode gerenciar fichas da campanha, criar fichas ocultas e acompanhar PV, PM, Defesa, condições e rolagens pelo Escudo do Mestre.

As permissões usam Row-Level Security. O dono edita sua ficha, outros jogadores acessam fichas permitidas em modo somente leitura e recursos do mestre ficam restritos ao criador da campanha.

## Como executar

Abra [index.html](./index.html) em um navegador moderno. Também é possível servir a pasta em qualquer hospedagem estática, como GitHub Pages ou Netlify.

Não há dependências para instalar nem processo de build. Para testar com servidor local:

```powershell
python -m http.server 8765
```

Depois, acesse `http://127.0.0.1:8765/`.

No Netlify, o arquivo `_redirects` já encaminha endereços como `/fichas/...` e `/campanhas/...` para a aplicação. Assim, links internos também funcionam quando abertos diretamente ou após atualizar a página.

## Salvamento

- **Offline:** os personagens ficam no armazenamento do navegador.
- **Nuvem:** após o login, o Supabase se torna o destino principal.
- **Backup:** `Exportar JSON` e `Importar JSON` funcionam nos dois modos.

Os arquivos `supabase_*.sql` contêm o esquema, funções e políticas usados pelas campanhas. Em uma instalação nova, aplique primeiro a criação das tabelas e funções e deixe `supabase_permissions.sql` por último.

## Arquivos principais

- `index.html`: estrutura da interface.
- `style.css`: aparência e responsividade.
- `script.js`: estado, cálculos, rolagens, salvamento e integração com Supabase.
- `data.js` e `t20_expansions.js`: raças, classes, perícias e progressões.
- `class_*.js` e `power_catalog.js`: progressões e poderes.
- `spells_catalog.js`: magias.
- `item_catalog.js`, `magic_item_catalog.js` e `expansion_item_catalog.js`: itens.
- `item_customization_catalog.js`: melhorias, materiais, encantos, preços e efeitos automáticos.

## Últimas alterações

Esta seção mantém **somente as três mudanças mais recentes**. Ao registrar uma nova, remova a mais antiga.

1. **Navegação por endereço:** início, listas, campanhas e fichas possuem URLs próprias; voltar e avançar no navegador agora percorrem essas telas normalmente.
2. **Salvamento durante a navegação:** alterações pendentes são preservadas localmente e enviadas à nuvem antes de trocar de tela pelo histórico.
3. **Reordenação por arraste:** poderes e itens podem ser movidos livremente pela alça de três linhas, inclusive em telas de toque.

## Aviso

Projeto não oficial de apoio a jogo. Tormenta20 e seus conteúdos pertencem à Jambô Editora. A ficha não substitui os livros.
