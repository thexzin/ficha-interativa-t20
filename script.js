
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const KEY="t20_sheet_v6_2";
const CHARACTER_INDEX_KEY="t20_characters_index_v1";
const CHARACTER_PREFIX="t20_character_v1_";
const LEGACY_KEYS=["t20_sheet_v3","t20_sheet_v4","t20_sheet_v5","t20_sheet_v6"];
const LEGACY_MIGRATED_KEY="t20_legacy_sheet_migrated_v1";
const SUPABASE_URL="https://kcknkxczcczsyoljugcb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_2v5KyyfqIEm446I7w8Y83Q_LD-Jv5QK";
const CLOUD_CHARACTER_MAP_KEY="t20_cloud_character_map_v1";
const AUTH_MODE_KEY="t20_auth_mode_v1";
const PORTRAIT_BUCKET="character-portraits";
const PORTRAIT_MAX_SOURCE_BYTES=12*1024*1024;

let supabaseClient=null;
let cloudUser=null;
let cloudCharacters=[];
let cloudCampaigns=[];
let cloudCampaignRolls=[];
let cloudCampaignEncounters=[];
let cloudInitiativeEntries=[];
let campaignInitiativeAvailable=true;

function makeEntryId(prefix="entry"){
  if(globalThis.crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
}

function defaultCartomanteState(){
  return {
    materialized:false,hand:[],cardHp:0,mulliganUsed:false,
    rareChoice:"",epicChoice:"",deity:"",grantedPower:"",
    divineSpells:{1:"",2:"",3:"",4:"",5:""},
    exodiaParts:[],exodiaMode:"partner",exodiaSummoned:false,exodiaNotes:"",
    partnerType:"combatente",cloneAbility:"",tutorCard:"",tutorExtraPm:0
  };
}
function normalizeCartomanteState(value){
  const base=defaultCartomanteState();
  const source=value&&typeof value==="object"?value:{};
  const normalized={...base,...source};
  normalized.materialized=source.materialized===true;
  normalized.hand=Array.isArray(source.hand)?[...new Set(source.hand.map(String))]:[];
  normalized.cardHp=Math.max(0,Number(source.cardHp||0));
  normalized.mulliganUsed=source.mulliganUsed===true;
  normalized.divineSpells={...base.divineSpells,...(source.divineSpells||{})};
  normalized.exodiaParts=Array.isArray(source.exodiaParts)?[...new Set(source.exodiaParts.map(String))]:[];
  normalized.exodiaSummoned=source.exodiaSummoned===true;
  normalized.tutorExtraPm=Math.max(0,Number(source.tutorExtraPm||0));
  return normalized;
}
function defaultState(){
  return {powers:[],spells:[],items:[],partners:[],attacks:[defaultAttack({name:"Ataque desarmado",damage:"1d3"})],skillData:{},conditions:{},customConditions:[],originBenefits:[],offices:[{name:"",trained:false,adjust:0}],suppressedAutoPowers:[],classLevels:[],multiclassEnabled:false,cartomante:defaultCartomanteState()};
}
function defaultAttack(overrides={}){
  return {
    id:makeEntryId("attack"),
    name:"Novo ataque",attackSkill:"Manual",attackAttr:"",bonus:0,
    damage:"1d6",extraDamage:"",damageAttr:"",damageType:"",range:"",
    bestDice:0,worstDice:0,critFlat:false,crit:"20",mult:"x2",notes:"",
    ...overrides
  };
}
function normalizeAttack(attack){
  attack=attack&&typeof attack==="object"?attack:{};
  const normalized=defaultAttack(attack);
  if(!String(normalized.id||"").trim()) normalized.id=makeEntryId("attack");
  if(!["Manual","Luta","Pontaria"].includes(normalized.attackSkill)) normalized.attackSkill="Manual";
  if(!ATTR_KEYS.includes(normalized.attackAttr)) normalized.attackAttr="";
  if(!ATTR_KEYS.includes(normalized.damageAttr)) normalized.damageAttr="";
  normalized.bestDice=Number(normalized.bestDice)>0;
  normalized.worstDice=Number(normalized.worstDice)>0;
  normalized.critFlat=normalized.critFlat===true;
  return normalized;
}
function normalizeState(){
  const defaults=defaultState();
  state={...defaults,...(state||{})};
  for(const k of Object.keys(defaults)){
    if(Array.isArray(defaults[k])){
      if(!Array.isArray(state[k])) state[k]=[];
      continue;
    }
    if(defaults[k]&&typeof defaults[k]==="object"){
      if(!state[k]||typeof state[k]!=="object"||Array.isArray(state[k])) state[k]={};
      continue;
    }
    if(typeof state[k]!==typeof defaults[k]) state[k]=defaults[k];
  }
  if(!state.attacks.length) state.attacks=defaultState().attacks;
  state.attacks=state.attacks.map(normalizeAttack);
  state.powers=state.powers.map(power=>{
    power=power&&typeof power==="object"?power:{};
    const attributeIncrease=ATTR_KEYS.includes(power.attributeIncrease)?power.attributeIncrease:"";
    return {...power,attributeIncrease,attributeIncreasePower:isAttributeIncreasePower({...power,attributeIncrease})};
  });
  if(!state.offices.length) state.offices=defaultState().offices;
  state.classLevels=Array.isArray(state.classLevels)?state.classLevels:[];
  state.spells=state.spells.map(spell=>{
    const normalized=normalizeSpellDetailFields({...spell});
    if(!String(normalized.id||"").trim()) normalized.id=makeEntryId("spell");
    return normalized;
  });
  state.items=state.items.map(item=>normalizeInventoryItemDescription(item));
  state.partners=state.partners.map(normalizePartner);
  state.cartomante=normalizeCartomanteState(state.cartomante);
}

let state=defaultState();
let currentCharacterId="";
let expandedSpellCards=new Set();
let expandedPowerCards=new Set();
let expandedItemCards=new Set();
let expandedAttackCards=new Set();
let expandedPartnerCards=new Set();
let activeHubSection="fichas";
let activeHubCampaignId="";
let activeCampaignDashboardTab="fichas";
let campaignRollPollTimer=null;
let shieldCharacterFilter="";
let shieldSortMode="risco";
let currentCloudReadOnly=false;
let cloudAutosaveTimers=new Map();
let saveStatusTimer=null;
let browserRoutingReady=false;
let applyingBrowserRoute=false;
let browserRouteRequest=0;
let publicViewCharacter=null;
let portraitCropState={source:null,minScale:1,scale:1,x:0,y:0,dragging:false,pointerId:null,lastX:0,lastY:0};

const ATTR_KEYS=["FOR","DES","CON","INT","SAB","CAR"];
const ATTR_NAMES={FOR:"Força",DES:"Destreza",CON:"Constituição",INT:"Inteligência",SAB:"Sabedoria",CAR:"Carisma"};
const RESISTANCE_SKILLS=new Set(["Fortitude","Reflexos","Vontade"]);
const GLOBAL_MODIFIER_FIELDS=[
  {id:"globalTestBonus",label:"Testes"},
  {id:"globalAttackBonus",label:"Ataques"},
  {id:"skillGlobalBonus",label:"Perícias"},
  {id:"globalResistanceBonus",label:"Resistências"},
  {id:"globalDamageBonus",label:"Dano"},
  {id:"globalDefenseBonus",label:"Defesa"}
];
const PARTNER_RANKS=["Iniciante","Veterano","Mestre"];
const PARTNER_CATALOG={
  adepto:{name:"Adepto",group:"Tipos de parceiro",page:"Jogo do Ano, p. 260",summary:"Conjurador que reduz o custo de magias.",description:"Um conjurador capaz de ajudá-lo a lançar suas magias.",levels:[
    "O custo para lançar magias de 1º círculo diminui em 1 PM.",
    "Como Iniciante; também reduz em 1 PM o custo de magias de 2º círculo.",
    "Como Veterano; a redução fornecida pelo parceiro passa a acumular com outras reduções."
  ]},
  ajudante:{name:"Ajudante",group:"Tipos de parceiro",page:"Jogo do Ano, p. 260",summary:"Especialista que concede bônus em perícias.",description:"Um bardo, nobre ou sábio que ajuda com palavras firmes ou encorajadoras.",levels:[
    "+2 em duas perícias definidas pelo parceiro.",
    "+2 em três perícias definidas pelo parceiro.",
    "+4 em três perícias definidas pelo parceiro. Ajudantes não fornecem bônus em Luta ou Pontaria."
  ]},
  assassino:{name:"Assassino",group:"Tipos de parceiro",page:"Jogo do Ano, p. 260",summary:"Aliado furtivo que fornece Ataque Furtivo.",description:"Um ladino ou outro tipo furtivo e letal.",note:"Além do bônus de +2 em testes de ataque corpo a corpo, flanquear permite que você use Ataque Furtivo contra o inimigo flanqueado.",levels:[
    "Você pode usar Ataque Furtivo +1d6; se já possui a habilidade, o bônus é cumulativo.",
    "Como Iniciante; também fornece o bônus por flanquear contra um inimigo por rodada.",
    "Como Veterano; o dano fornecido pelo Ataque Furtivo aumenta para +2d6."
  ]},
  atirador:{name:"Atirador",group:"Tipos de parceiro",page:"Jogo do Ano, p. 261",summary:"Combatente que aumenta dano à distância.",description:"Um arqueiro, besteiro ou outro combatente à distância.",levels:[
    "Uma vez por rodada, +1d6 em uma rolagem de dano à distância.",
    "Uma vez por rodada, +1d10 em uma rolagem de dano à distância.",
    "Uma vez por rodada, +2d8 em uma rolagem de dano à distância."
  ]},
  combatente:{name:"Combatente",group:"Tipos de parceiro",page:"Jogo do Ano, p. 261",summary:"Aliado marcial que melhora seus ataques.",description:"Um bucaneiro, guerreiro, paladino ou animal de caça.",levels:[
    "+2 em testes de ataque.",
    "+3 em testes de ataque.",
    "+4 em testes de ataque; uma vez por rodada, você pode gastar 5 PM para fazer um ataque extra."
  ]},
  destruidor:{name:"Destruidor",group:"Tipos de parceiro",page:"Jogo do Ano, p. 261",summary:"Especialista que causa dano elemental.",description:"Um arcanista ou inventor.",levels:[
    "Uma vez por rodada, como ação livre, gaste 1 PM para causar 2d6 de ácido, eletricidade, fogo ou frio em um alvo em alcance curto.",
    "Como Iniciante; também pode gastar 2 PM para causar 4d6 do mesmo tipo de dano.",
    "Como Veterano; também pode gastar 4 PM para causar 6d6 em uma área de 6m de raio em alcance médio."
  ]},
  fortao:{name:"Fortão",group:"Tipos de parceiro",page:"Jogo do Ano, p. 261",summary:"Brutamontes que aumenta dano corpo a corpo.",description:"Um bárbaro, lutador ou outro tipo que bate primeiro e pensa depois.",levels:[
    "Uma vez por rodada, +1d8 em uma rolagem de dano corpo a corpo.",
    "Uma vez por rodada, +1d12 em uma rolagem de dano corpo a corpo.",
    "Uma vez por rodada, +3d6 em uma rolagem de dano corpo a corpo."
  ]},
  guardiao:{name:"Guardião",group:"Tipos de parceiro",page:"Jogo do Ano, p. 261",summary:"Protetor que aumenta Defesa e resistências.",description:"Um cavaleiro, cão de guarda ou outro NPC cuja função primária é proteger.",levels:[
    "+2 na Defesa.",
    "+3 na Defesa.",
    "+4 na Defesa e +2 em testes de resistência."
  ]},
  magivocador:{name:"Magivocador",group:"Tipos de parceiro",page:"Jogo do Ano, p. 261",summary:"Conjurador que fortalece magias ofensivas.",description:"Um conjurador especializado em magias ofensivas.",levels:[
    "O dano de suas magias aumenta em +1 dado do mesmo tipo.",
    "Como Iniciante; a CD para resistir a suas magias também aumenta em +1.",
    "O dano aumenta em +2 dados do mesmo tipo e a CD das magias aumenta em +2."
  ]},
  medico:{name:"Médico",group:"Tipos de parceiro",page:"Jogo do Ano, p. 261",summary:"Curandeiro que recupera PV e remove condições.",description:"Um clérigo, druida, herbalista ou outro NPC com capacidades curativas.",levels:[
    "Uma vez por rodada, gaste 1 PM para curar 1d8+1 PV de uma criatura adjacente.",
    "Como Iniciante; também pode gastar 3 PM para curar 3d8+3 PV ou remover uma condição prejudicial.",
    "Como Veterano; também pode gastar 5 PM para curar 6d8+6 PV."
  ]},
  perseguidor:{name:"Perseguidor",group:"Tipos de parceiro",page:"Jogo do Ano, p. 261",summary:"Rastreador que melhora percepção e sobrevivência.",description:"Um caçador, animal farejador ou outro especialista em localizar alvos.",levels:[
    "+2 em Percepção e Sobrevivência.",
    "Você pode usar Sentidos Aguçados.",
    "Você pode usar Percepção às Cegas."
  ]},
  vigilante:{name:"Vigilante",group:"Tipos de parceiro",page:"Jogo do Ano, p. 261",summary:"Sentinela que percebe ameaças e evita surpresas.",description:"Um vigia ou animal de guarda, sempre atento aos arredores.",levels:[
    "+2 em Percepção e Iniciativa.",
    "Você pode usar Esquiva Sobrenatural.",
    "Você pode usar Olhos nas Costas."
  ]},
  cavalo:{name:"Cavalo",group:"Montarias",page:"Jogo do Ano, p. 262",summary:"Montaria Grande veloz e versátil.",description:"A montaria mais comum do Reinado.",note:"Estas estatísticas também se aplicam a pôneis (tamanho Médio).",size:"Grande",mount:true,levels:[
    "Deslocamento 12m e uma ação de movimento extra por turno, apenas para deslocamento.",
    "Como Iniciante; deslocamento 15m e +2 em ataques corpo a corpo.",
    "Como Veterano; recebe uma segunda ação de movimento extra por turno, apenas para deslocamento."
  ]},
  cao_caca:{name:"Cão de caça",group:"Montarias",page:"Jogo do Ano, p. 262",summary:"Montaria Média ou Pequena, ágil e farejadora.",description:"Cães de porte adequado são montarias comuns para personagens Pequenos ou Minúsculos.",size:"Médio ou Pequeno",mount:true,levels:[
    "Deslocamento 9m, pode usar faro e recebe uma ação de movimento extra por turno, apenas para deslocamento.",
    "Como Iniciante; deslocamento 12m e +2 na Defesa.",
    "Como Veterano; uma vez por rodada, ao acertar um ataque corpo a corpo, pode derrubar como ação livre."
  ]},
  lobo_cavernas:{name:"Lobo-das-cavernas",group:"Montarias",page:"Jogo do Ano, p. 262",summary:"Montaria Grande veloz e agressiva.",description:"Primos primitivos e maiores dos lobos comuns, lobos-das-cavernas são usados como montaria por goblinoides e aventureiros selvagens.",note:"Estas estatísticas também se aplicam a lobos comuns (tamanho Médio).",size:"Grande",mount:true,levels:[
    "Deslocamento 12m e uma ação de movimento extra por turno, apenas para deslocamento.",
    "Como Iniciante; deslocamento 15m e, uma vez por rodada, +1d8 em dano corpo a corpo.",
    "Como Veterano; uma vez por rodada, ao acertar um ataque corpo a corpo, pode derrubar como ação livre."
  ]},
  grifo:{name:"Grifo",group:"Montarias",page:"Jogo do Ano, p. 262",summary:"Fera Grande que se torna uma montaria voadora.",description:"Esta fera majestosa é muito cobiçada por heróis.",size:"Grande",mount:true,levels:[
    "Uma vez por rodada, +1d8 em dano corpo a corpo. Nesta graduação é um filhote e não pode ser montado.",
    "Como Iniciante; pode ser montado e seu deslocamento muda para voo 18m.",
    "Como Veterano; recebe uma ação de movimento extra por turno, apenas para deslocamento."
  ]},
  gorlogg:{name:"Gorlogg",group:"Montarias",page:"Jogo do Ano, p. 262",summary:"Montaria Grande primitiva e brutal.",description:"Esta besta primitiva é usada como montaria pelos mais selvagens.",size:"Grande",mount:true,levels:[
    "Deslocamento 12m e, uma vez por rodada, +1d6 em dano corpo a corpo.",
    "Como Iniciante; o bônus de dano corpo a corpo aumenta para +1d10.",
    "Deslocamento 15m e o bônus de dano corpo a corpo aumenta para +2d8."
  ]},
  trobo:{name:"Trobo",group:"Montarias",page:"Jogo do Ano, p. 262",summary:"Montaria Grande resistente, usada para carga e tração.",description:"Usados como animais de carga e tração, trobos também servem como montarias.",size:"Grande",mount:true,levels:[
    "Deslocamento 9m, uma ação de movimento extra por turno apenas para deslocamento e +1 em testes de resistência.",
    "Como Iniciante; deslocamento 12m e o bônus em resistências aumenta para +2.",
    "Como Veterano; o bônus em testes de resistência aumenta para +5."
  ]}
};
function partnerTierForLevel(level=totalClassLevel()){
  const total=Math.max(1,Math.min(20,Number(level)||1));
  if(total<=4) return {name:"Iniciante",rank:"Iniciante",limit:1};
  if(total<=10) return {name:"Veterano",rank:"Veterano",limit:2};
  if(total<=16) return {name:"Campeão",rank:"Mestre",limit:2};
  return {name:"Lenda",rank:"Mestre",limit:3};
}
function partnerRankIndex(rank){
  const index=PARTNER_RANKS.indexOf(rank);
  return index<0?0:index;
}
function allowedPartnerRank(rank,level=totalClassLevel()){
  const maxIndex=partnerRankIndex(partnerTierForLevel(level).rank);
  return PARTNER_RANKS[Math.min(partnerRankIndex(rank),maxIndex)];
}
function partnerCatalogEntry(type){return PARTNER_CATALOG[type]||null}
function partnerBenefit(type,rank){
  const entry=partnerCatalogEntry(type);
  return entry?.levels?.[partnerRankIndex(rank)]||"";
}
function defaultPartner(overrides={}){
  const type=PARTNER_CATALOG[overrides.type]?overrides.type:"combatente";
  const rank=allowedPartnerRank(overrides.rank||"Iniciante");
  const entry=partnerCatalogEntry(type);
  return {
    name:overrides.name||entry?.name||"Novo parceiro",
    type,rank,active:overrides.active!==false,countsTowardLimit:overrides.countsTowardLimit!==false,
    source:overrides.source||entry?.page||"Jogo do Ano",
    benefit:overrides.benefit||partnerBenefit(type,rank),benefitCustomized:overrides.benefitCustomized===true,
    skills:Array.isArray(overrides.skills)?overrides.skills:[],
    notes:overrides.notes||""
  };
}
function normalizePartner(partner){
  partner=partner&&typeof partner==="object"?partner:{};
  const type=PARTNER_CATALOG[partner.type]?partner.type:"custom";
  const rank=PARTNER_RANKS.includes(partner.rank)?partner.rank:"Iniciante";
  const entry=partnerCatalogEntry(type);
  const normalized={
    name:String(partner.name||entry?.name||"Parceiro"),type,rank,
    active:partner.active!==false,countsTowardLimit:partner.countsTowardLimit!==false,
    source:String(partner.source||entry?.page||"Manual"),
    benefit:String(partner.benefit||partnerBenefit(type,rank)||""),
    benefitCustomized:partner.benefitCustomized===true,
    skills:(Array.isArray(partner.skills)?partner.skills:[]).slice(0,3).map(skill=>skill in T20_DATA.pericias&&!['Luta','Pontaria'].includes(skill)?skill:""),
    notes:String(partner.notes||"")
  };
  if(entry&&!normalized.benefitCustomized) normalized.benefit=partnerBenefit(type,rank);
  return normalized;
}
function activePartnerRows(partners=state?.partners||[]){
  return (Array.isArray(partners)?partners:[]).filter(partner=>partner?.active!==false);
}
function partnerEffectMax(partners,getValue){
  return activePartnerRows(partners).reduce((largest,partner)=>Math.max(largest,Number(getValue(partner)||0)),0);
}
function partnerSkillSlots(partner){
  if(partner?.type!=="ajudante") return 0;
  return partnerRankIndex(partner.rank)===0?2:3;
}
function partnerSkillValue(partner){
  return partnerRankIndex(partner?.rank)>=2?4:2;
}
function partnerSkillBonus(skillName,partners=state?.partners||[]){
  return partnerEffectMax(partners,partner=>{
    if(partner.type==="ajudante"&&partner.skills?.slice(0,partnerSkillSlots(partner)).includes(skillName)) return partnerSkillValue(partner);
    if(partner.type==="perseguidor"&&partner.rank==="Iniciante"&&["Percepção","Sobrevivência"].includes(skillName)) return 2;
    if(partner.type==="vigilante"&&partner.rank==="Iniciante"&&["Percepção","Iniciativa"].includes(skillName)) return 2;
    if(partner.type==="guardiao"&&partner.rank==="Mestre"&&RESISTANCE_SKILLS.has(skillName)) return 2;
    if(partner.type==="trobo"&&RESISTANCE_SKILLS.has(skillName)) return [1,2,5][partnerRankIndex(partner.rank)];
    return 0;
  });
}
function partnerAttackBonus(attack,partners=state?.partners||[]){
  const melee=attackSkillName(attack)==="Luta"||/corpo a corpo|adjacente/i.test(String(attack?.range||""));
  return partnerEffectMax(partners,partner=>{
    if(partner.type==="combatente") return [2,3,4][partnerRankIndex(partner.rank)];
    if(partner.type==="cavalo"&&melee&&partnerRankIndex(partner.rank)>=1) return 2;
    return 0;
  });
}
function partnerDefenseBonus(partners=state?.partners||[]){
  return partnerEffectMax(partners,partner=>{
    if(partner.type==="guardiao") return [2,3,4][partnerRankIndex(partner.rank)];
    if(partner.type==="cao_caca"&&partnerRankIndex(partner.rank)>=1) return 2;
    return 0;
  });
}
function partnerSpellCdBonus(partners=state?.partners||[]){
  return partnerEffectMax(partners,partner=>partner.type==="magivocador"?[0,1,2][partnerRankIndex(partner.rank)]:0);
}
function partnerSpellCost(spell,partners=state?.partners||[]){
  const base=Math.max(0,Number(spell?.cost||0));
  const circle=Math.max(1,Math.min(5,Number(spell?.circle||1)));
  const reduction=partnerEffectMax(partners,partner=>{
    if(partner.type!=="adepto") return 0;
    if(circle===1) return 1;
    if(circle===2&&partnerRankIndex(partner.rank)>=1) return 1;
    return 0;
  });
  return Math.max(base>0?1:0,base-reduction);
}
function partnerAutomationText(partner){
  if(partner.active===false) return "Inativo: nenhum benefício entra nos cálculos.";
  const skillList=(partner.skills||[]).slice(0,partnerSkillSlots(partner));
  if(partner.type==="adepto") return partnerRankIndex(partner.rank)>=1
    ? "-1 PM no custo de magias de 1º e 2º círculos (custo mínimo 1 PM)."
    : "-1 PM no custo de magias de 1º círculo (custo mínimo 1 PM).";
  if(partner.type==="ajudante") return skillList.length
    ? `${signedNumber(partnerSkillValue(partner))} em ${skillList.join(", ")} (sem acumular com outro parceiro).`
    : "Escolha as perícias abaixo para aplicar o bônus automaticamente.";
  if(partner.type==="perseguidor"&&partner.rank==="Iniciante") return "+2 em Percepção e Sobrevivência.";
  if(partner.type==="vigilante"&&partner.rank==="Iniciante") return "+2 em Percepção e Iniciativa.";
  if(partner.type==="combatente") return `${signedNumber([2,3,4][partnerRankIndex(partner.rank)])} em todos os testes de ataque.`;
  if(partner.type==="guardiao") return `${signedNumber([2,3,4][partnerRankIndex(partner.rank)])} na Defesa${partner.rank==="Mestre"?" e +2 em Fortitude, Reflexos e Vontade":""}.`;
  if(partner.type==="magivocador"&&partner.rank!=="Iniciante") return `${signedNumber(partnerSpellCdBonus([partner]))} na CD de magias; o dano adicional permanece indicado no benefício.`;
  if(partner.type==="cao_caca"&&partnerRankIndex(partner.rank)>=1) return "+2 na Defesa.";
  if(partner.type==="cavalo"&&partnerRankIndex(partner.rank)>=1) return "+2 em ataques configurados com Luta ou alcance corpo a corpo.";
  if(partner.type==="trobo") return `${signedNumber([1,2,5][partnerRankIndex(partner.rank)])} em Fortitude, Reflexos e Vontade.`;
  return "Efeito condicional ou ativado: consulte o benefício atual durante o uso.";
}
function refreshPartnerCalculations(){
  recalc();
  renderSpells();
}
function foldItemText(text){
  return String(text||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
}
function itemCustomizationData(){
  return window.T20_ITEM_CUSTOMIZATION||{improvements:[],materials:[],enchantments:[],presetEffects:{}};
}
function inventoryItemType(item){
  if(["weapon","armor","shield","esoteric","tool","clothing","accessory","other"].includes(item?.customizationType)) return item.customizationType;
  const category=foldItemText(item?.category);
  if(category.includes("armadura")&&category.includes("escudo")){
    const identity=foldItemText(`${item?.name||""} ${item?.notes||""}`);
    if(identity.startsWith("escudo")||identity.includes(" escudo ")) return "shield";
    return "armor";
  }
  if(category.includes("escudo")) return "shield";
  if(category.includes("armadura")) return "armor";
  if(category.includes("arma")&&!category.includes("armadura")) return "weapon";
  if(category.includes("esoter")) return "esoteric";
  if(category.includes("ferrament")) return "tool";
  if(category.includes("vestuario")) return "clothing";
  if(category.includes("acessor")) return "accessory";
  return "other";
}
function itemIsHeavyArmor(item){
  const text=foldItemText(`${item?.category||""} ${item?.name||""} ${item?.notes||""}`);
  return text.includes("pesada")||["armadura completa","brunea","cota de malha","loriga segmentada","meia armadura"].some(name=>text.includes(name));
}
function itemPriceNumber(price){
  const original=String(price??"").trim();
  if(/\bbase\b/i.test(original)) return null;
  const raw=original.replace(/T\$/gi,"").trim();
  if(!/\d/.test(raw)) return null;
  let numeric=raw.replace(/[^\d,.-]/g,"");
  if(numeric.includes(",")) numeric=numeric.replace(/\./g,"").replace(",",".");
  else if(/^\d{1,3}(?:\.\d{3})+$/.test(numeric)) numeric=numeric.replace(/\./g,"");
  const parsed=Number(numeric);
  return Number.isFinite(parsed)?parsed:null;
}
function formatItemPrice(amount){
  if(!Number.isFinite(Number(amount))) return "";
  return `T$ ${Number(amount).toLocaleString("pt-BR",{minimumFractionDigits:0,maximumFractionDigits:2})}`;
}
function itemSuperiorSlots(item){
  return new Set(Array.isArray(item?.improvements)?item.improvements:[]).size+(item?.material?1:0);
}
function itemEnchantmentSlots(item){
  const ids=new Set(Array.isArray(item?.enchantments)?item.enchantments:[]);
  const prerequisites={energetica:"formidavel",lancinante:"dilacerante",magnifica:"formidavel",guardiao:"defensor"};
  let slots=ids.size;
  Object.entries(prerequisites).forEach(([id,prerequisite])=>{if(ids.has(id)&&!ids.has(prerequisite)) slots++});
  return slots;
}
function materialPriceCategory(item){
  const type=inventoryItemType(item);
  if(type==="armor") return itemIsHeavyArmor(item)?"heavyArmor":"lightArmor";
  return type;
}
function customizationPriceParts(item){
  const pricing=itemCustomizationData().pricing||{},improvementTable=pricing.improvements||[0],enchantmentTable=pricing.enchantments||[0];
  const superiorSlots=itemSuperiorSlots(item),enchantmentSlots=itemEnchantmentSlots(item);
  const improvementCost=Number(improvementTable[Math.min(superiorSlots,improvementTable.length-1)]||0);
  const enchantmentCost=Number(enchantmentTable[Math.min(enchantmentSlots,enchantmentTable.length-1)]||0);
  const materialCost=Number(pricing.materials?.[materialPriceCategory(item)]?.[item?.material]||0);
  return {superiorSlots,enchantmentSlots,improvementCost,materialCost,enchantmentCost};
}
function catalogPricingBaseline(item){
  const catalogItem=catalogInventoryItem(item);
  const magicCatalog=[
    ...(Array.isArray(window.T20_MAGIC_ITEM_CATALOG)?window.T20_MAGIC_ITEM_CATALOG:[]),
    ...(Array.isArray(window.T20_EXPANSION_MAGIC_ITEM_CATALOG)?window.T20_EXPANSION_MAGIC_ITEM_CATALOG:[])
  ];
  if(!catalogItem||!magicCatalog.includes(catalogItem)) return customizationPriceParts({});
  const inferred=inferItemCustomizations(catalogItem);
  return customizationPriceParts({...catalogItem,...inferred});
}
function itemPriceDetails(item){
  const registered=itemPriceNumber(item?.price),automatic=item?.priceAuto!==false&&registered!==null;
  const current=customizationPriceParts(item),baseline=catalogPricingBaseline(item);
  const improvementAdjustment=Math.max(0,current.improvementCost-baseline.improvementCost);
  const materialAdjustment=Math.max(0,current.materialCost-baseline.materialCost);
  const enchantmentAdjustment=Math.max(0,current.enchantmentCost-baseline.enchantmentCost);
  const totalAdjustment=improvementAdjustment+materialAdjustment+enchantmentAdjustment;
  const final=registered===null?null:(automatic?Math.max(0,registered+totalAdjustment):registered);
  return {registered,automatic,current,baseline,improvementAdjustment,materialAdjustment,enchantmentAdjustment,totalAdjustment,final,display:final===null?String(item?.price||""):formatItemPrice(final)};
}
function itemPriceBreakdownHtml(item){
  const details=itemPriceDetails(item);
  if(details.registered===null) return `<div class="itemPriceBreakdown manual"><small>Preço automático indisponível para este valor.</small><strong>${escapeHtml(String(item?.price||"Sem preço"))}</strong></div>`;
  if(!details.automatic) return `<div class="itemPriceBreakdown manual"><small>Preço manual</small><strong>${escapeHtml(details.display)}</strong></div>`;
  return `<div class="itemPriceBreakdown">
    <div><small>Preço base/listado</small><strong>${formatItemPrice(details.registered)}</strong></div>
    <span aria-hidden="true">${details.improvementAdjustment<0?"-":"+"}</span>
    <div><small>Melhorias</small><strong>${formatItemPrice(Math.abs(details.improvementAdjustment))}</strong></div>
    <span aria-hidden="true">${details.materialAdjustment<0?"-":"+"}</span>
    <div><small>Material</small><strong>${formatItemPrice(Math.abs(details.materialAdjustment))}</strong></div>
    <span aria-hidden="true">${details.enchantmentAdjustment<0?"-":"+"}</span>
    <div><small>Encantos</small><strong>${formatItemPrice(Math.abs(details.enchantmentAdjustment))}</strong></div>
    <span aria-hidden="true">=</span>
    <div class="itemPriceTotal"><small>Preço final</small><strong>${formatItemPrice(details.final)}</strong></div>
  </div>`;
}
function allInventoryCatalogEntries(){
  return [
    ...(Array.isArray(window.T20_ITEM_CATALOG)?window.T20_ITEM_CATALOG:[]),
    ...(Array.isArray(window.T20_EXPANSION_ITEM_CATALOG)?window.T20_EXPANSION_ITEM_CATALOG:[]),
    ...(Array.isArray(window.T20_MAGIC_ITEM_CATALOG)?window.T20_MAGIC_ITEM_CATALOG:[]),
    ...(Array.isArray(window.T20_EXPANSION_MAGIC_ITEM_CATALOG)?window.T20_EXPANSION_MAGIC_ITEM_CATALOG:[])
  ];
}
function parseProtectionRules(text){
  const normalized=String(text||"").replace(/[−–—]/g,"-");
  const defenseMatch=normalized.match(/(?:^|[.;\n]\s*)Defesa\s*([+-]?\d+|-)(?=\s|[.;]|$)/i);
  const penaltyMatch=normalized.match(/penalidade de armadura\s*([+-]?\d+|-)(?=\s|[.;]|$)/i);
  const numberFrom=match=>{
    if(!match) return null;
    if(match[1]==="-") return 0;
    const parsed=Number(match[1]);
    return Number.isFinite(parsed)?Math.abs(parsed):null;
  };
  return {defense:numberFrom(defenseMatch),armorPenalty:numberFrom(penaltyMatch)};
}
function inferredProtectionBase(item){
  const type=inventoryItemType(item);
  if(type!=="armor"&&type!=="shield") return {defense:0,armorPenalty:0};
  const direct=parseProtectionRules(itemDescription(item));
  if(direct.defense!==null||direct.armorPenalty!==null){
    return {defense:direct.defense??0,armorPenalty:direct.armorPenalty??0};
  }
  const identity=foldItemText(`${item?.name||""} ${itemDescription(item)}`);
  const candidates=allInventoryCatalogEntries()
    .filter(entry=>inventoryItemType(entry)===type)
    .map(entry=>({entry,rules:parseProtectionRules(itemDescription(entry)),name:foldItemText(entry.name)}))
    .filter(candidate=>candidate.name&&(candidate.rules.defense!==null||candidate.rules.armorPenalty!==null)&&identity.includes(candidate.name))
    .sort((a,b)=>b.name.length-a.name.length);
  const match=candidates[0];
  if(!match) return {defense:0,armorPenalty:0};
  return {
    defense:match.rules.defense??0,
    armorPenalty:/sem penalidade/.test(identity)?0:(match.rules.armorPenalty??0)
  };
}
function baseProtectionStats(item){
  const inferred=inferredProtectionBase(item);
  const storedDefense=Number(item?.baseDefense),storedPenalty=Number(item?.baseArmorPenalty);
  return {
    defense:Number.isFinite(storedDefense)?Math.max(0,storedDefense):inferred.defense,
    armorPenalty:Number.isFinite(storedPenalty)?Math.max(0,Math.abs(storedPenalty)):inferred.armorPenalty
  };
}
function emptyItemEffects(){
  return {attrs:{},skills:{},attack:0,damage:0,extraDamage:[],defense:0,rd:0,resistance:0,armorPenalty:0,spellCd:0,pmLimit:0,pvMax:0,pmMax:0,load:0,spaces:0,critRange:0,critMultiplier:0,doubleThreat:false};
}
function normalizedManualItemEffects(value){
  const source=value&&typeof value==="object"?value:{};
  const attrs={};
  ATTR_KEYS.forEach(attr=>attrs[attr]=Number(source.attrs?.[attr]||0));
  return {
    attrs,
    skill:String(source.skill||""),skillBonus:Number(source.skillBonus||0),
    defense:Number(source.defense||0),rd:Number(source.rd||0),resistance:Number(source.resistance||0),
    spellCd:Number(source.spellCd||0),pmLimit:Number(source.pmLimit||0),pvMax:Number(source.pvMax||0),pmMax:Number(source.pmMax||0),load:Number(source.load||0)
  };
}
function mergeEffectInto(target,effect={}){
  for(const attr of ATTR_KEYS) if(effect.attrs?.[attr]) target.attrs[attr]=Number(target.attrs[attr]||0)+Number(effect.attrs[attr]);
  for(const [skill,bonus] of Object.entries(effect.skills||{})) if(bonus) target.skills[skill]=Number(target.skills[skill]||0)+Number(bonus);
  for(const key of ["attack","damage","defense","rd","resistance","armorPenalty","spellCd","pmLimit","pvMax","pmMax","load","spaces","critRange","critMultiplier"]){
    if(effect[key]) target[key]=Number(target[key]||0)+Number(effect[key]);
  }
  if(effect.extraDamage) target.extraDamage.push(...(Array.isArray(effect.extraDamage)?effect.extraDamage:[effect.extraDamage]));
  if(effect.extraDamageFlat) target.extraDamage.push(String(effect.extraDamageFlat));
  if(effect.doubleThreat) target.doubleThreat=true;
  return target;
}
function mergeDistinctItemEffectInto(target,effect={}){
  for(const attr of ATTR_KEYS) if(effect.attrs?.[attr]&&!target.attrs[attr]) target.attrs[attr]=Number(effect.attrs[attr]);
  for(const [skill,bonus] of Object.entries(effect.skills||{})) if(bonus&&!target.skills[skill]) target.skills[skill]=Number(bonus);
  for(const key of ["defense","rd","resistance","spellCd","pmLimit","pvMax","pmMax","load"]){
    if(effect[key]&&!target[key]) target[key]=Number(effect[key]);
  }
  return target;
}
function describedItemEffects(item){
  const result=emptyItemEffects(),description=itemDescription(item);
  if(!description) return result;
  const category=foldItemText(item?.category);
  if(/aliment|alquim|pocao|consum|pergaminho|servico|veiculo|municao/.test(category)) return result;
  const attrNames={forca:"FOR",destreza:"DES",constituicao:"CON",inteligencia:"INT",sabedoria:"SAB",carisma:"CAR"};
  const clauses=description.replace(/\r/g,"").replace(/,\s*(?=(?:mas|porém|permite|pode)\b)/gi,";").split(/[.;\n]+/).map(text=>text.trim()).filter(Boolean);
  const stronger=(current,next)=>!current||Math.abs(next)>Math.abs(current)?next:current;
  const isConditional=folded=>/(?:\bse\b|\bcaso\b|\bquando\b|\bdurante\b|\benquanto\b|\bcontra\b|\bpara\b|\bapenas\b|\bpode\b|\bpermite\b|\bdevotos?\b|\bclerigos?\b|\bfrades?\b|\bdesde que\b|\buma vez por\b|\bescolhid|\ba escolha\b|\ba criterio\b|\bao (?:fazer|realizar|usar|atacar|acertar|conjurar|rolar)\b|\bem (?:ambientes?|terrenos?|situacoes?)\b|no terreno|com o capuz|na primeira rodada|apos (?:a )?leitura|depois de ler)/.test(folded);
  for(const clause of clauses){
    const folded=foldItemText(clause);
    if(!folded||isConditional(folded)) continue;
    if(!/^[+-]\d+\b/.test(folded)&&!/(?:\bfornec\w*|\bconced\w*|\breceb\w*|\bgarant\w*|\boferec\w*)/.test(folded)) continue;
    for(const [name,attr] of Object.entries(attrNames)){
      const signedFirst=folded.match(new RegExp(`([+-]\\d+)\\s+(?:em\\s+)?${name}\\b`));
      const nameFirst=folded.match(new RegExp(`\\b${name}\\s*([+-]\\d+)`));
      const bonus=Number(signedFirst?.[1]||nameFirst?.[1]||0);
      if(bonus) result.attrs[attr]=stronger(Number(result.attrs[attr]||0),bonus);
    }
    const directValues=[
      ["defense",[/([+-]\d+)\s+(?:na\s+)?defesa\b/,/\bdefesa\s*([+-]\d+)/]],
      ["resistance",[/([+-]\d+)\s+(?:em\s+)?(?:testes? de\s+)?resistencia\b/,/\bresistencia\s*([+-]\d+)/]],
      ["spellCd",[/([+-]\d+)\s+(?:na\s+)?cd(?: de magia| das? magias?)?\b/]],
      ["pmLimit",[/limite de pm[^\d+-]*([+-]\d+)/]],
      ["pvMax",[/([+-]\d+)\s+pv\b/]],
      ["pmMax",[/([+-]\d+)\s+pm\b/]],
      ["load",[/(?:capacidade de carga|limite de carga)[^\d+]*\+(?:(\d+))\s+espacos?/,/aumenta (?:sua )?capacidade de carga em (\d+) espacos?/]]
    ];
    directValues.forEach(([key,patterns])=>{
      const match=patterns.map(pattern=>folded.match(pattern)).find(Boolean),bonus=Number(match?.[1]||0);
      if(bonus) result[key]=stronger(Number(result[key]||0),bonus);
    });
    Object.keys(T20_DATA.pericias||{}).forEach(skill=>{
      const skillName=foldItemText(skill).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
      const signedFirst=folded.match(new RegExp(`([+-]\\d+)\\s+(?:em\\s+)?(?:testes? de\\s+)?${skillName}\\b`));
      const nameFirst=folded.match(new RegExp(`\\b${skillName}\\s*([+-]\\d+)`));
      const bonus=Number(signedFirst?.[1]||nameFirst?.[1]||0);
      if(bonus) result.skills[skill]=stronger(Number(result.skills[skill]||0),bonus);
    });
  }
  return result;
}
function groupedCustomizationEntries(ids,catalog){
  const selected=(Array.isArray(ids)?ids:[]).map(id=>catalog.find(entry=>entry.id===id)).filter(Boolean);
  const grouped=new Map(),plain=[];
  selected.forEach(entry=>{
    if(!entry.group){plain.push(entry);return}
    const current=grouped.get(entry.group);
    const magnitude=Object.values(entry.effects||{}).filter(value=>typeof value==="number").reduce((sum,value)=>sum+Math.abs(value),0);
    const currentMagnitude=current?Object.values(current.effects||{}).filter(value=>typeof value==="number").reduce((sum,value)=>sum+Math.abs(value),0):-1;
    if(magnitude>=currentMagnitude) grouped.set(entry.group,entry);
  });
  return [...plain,...grouped.values()];
}
function inferItemCustomizations(item){
  const empty={improvements:[],enchantments:[],material:""};
  const catalogItem=catalogInventoryItem(item);
  const magicCatalogs=[
    window.T20_MAGIC_ITEM_CATALOG,
    window.T20_EXPANSION_MAGIC_ITEM_CATALOG
  ].filter(Array.isArray);
  const isMagicCatalogItem=!!catalogItem&&magicCatalogs.some(catalog=>catalog.includes(catalogItem));
  if(!isMagicCatalogItem) return empty;

  const hasExplicitImprovements=Array.isArray(catalogItem.improvements);
  const hasExplicitEnchantments=Array.isArray(catalogItem.enchantments);
  const hasExplicitMaterial=Object.prototype.hasOwnProperty.call(catalogItem,"material");
  if(hasExplicitImprovements||hasExplicitEnchantments||hasExplicitMaterial){
    return {
      improvements:hasExplicitImprovements?[...catalogItem.improvements]:[],
      enchantments:hasExplicitEnchantments?[...catalogItem.enchantments]:[],
      material:hasExplicitMaterial?String(catalogItem.material||""):""
    };
  }

  const sentences=itemDescription(catalogItem).split(/\.(?:\s|$)/).map(sentence=>sentence.trim()).filter(Boolean);
  const formula=sentences[0]?.length<20?sentences.slice(0,2).join(". "):sentences[0];
  const data=itemCustomizationData(),text=foldItemText(formula);
  if(!text) return empty;
  const includesName=entry=>{
    const name=foldItemText(entry.name);
    const aliases={
      "banhado-ouro":["banhada a ouro"],
      "cravejado-gemas":["cravejada de gemas"],
      macabro:["macabra"],
      precisa:["preciso"],
      ajustada:["ajustado"],
      defensor:["defensora"],
      defensora:["defensor"],
      guardiao:["guardia"],
      protetor:["protetora"],
      zeloso:["zelosa"],
      gelido:["gelida"],
      caustico:["caustica"],
      acrobatico:["acrobatica"],
      ameacadora:["ameacador"],
      magnifica:["magnifico"]
    };
    if(entry.id==="precisa"&&/(?:\bnao\s+precisa\b|\bnunca\s+precisa\b|\bprecisa\s+de\b)/.test(text)) return false;
    return [name,...(aliases[entry.id]||[])].some(candidate=>candidate.length>4&&new RegExp(`(^|[^a-z])${candidate.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}([^a-z]|$)`).test(text));
  };
  const type=inventoryItemType(item);
  const withPrerequisites=(ids,prerequisites)=>{
    const result=new Set(ids);
    let changed=true;
    while(changed){
      changed=false;
      [...result].forEach(id=>{
        const prerequisite=prerequisites[id];
        if(prerequisite&&!result.has(prerequisite)){result.add(prerequisite);changed=true}
      });
    }
    return [...result];
  };
  const improvements=data.improvements.filter(entry=>entry.types.includes(type)&&includesName(entry)).map(entry=>entry.id);
  const enchantments=data.enchantments.filter(entry=>entry.types.includes(type)&&includesName(entry)).map(entry=>entry.id);
  return {
    improvements:withPrerequisites(improvements,{pungente:"certeira",atroz:"cruel","sob-medida":"ajustada"}),
    enchantments:withPrerequisites(enchantments,{energetica:"formidavel",magnifica:"formidavel",lancinante:"dilacerante",guardiao:"defensor"}),
    material:data.materials.find(entry=>entry.id&&entry.types.includes(type)&&includesName(entry))?.id||""
  };
}
function repairLegacyCatalogCustomization(item){
  if(Number(item?.customizationInferenceVersion||0)>=2) return item;
  const key=`${foldItemText(item?.source)}|${foldItemText(item?.name)}`;
  const falseDefaults={
    "jogo do ano|couro batido":{improvements:["reforcada"]},
    "jogo do ano|armadura completa":{improvements:["sob-medida"]},
    "jogo do ano|meia armadura":{improvements:["reforcada"]},
    "jogo do ano|florete":{improvements:["precisa"]},
    "jogo do ano|azagaia":{enchantments:["arremesso"]},
    "herois de arton|armadura de justa":{improvements:["reforcada"]},
    "herois de arton|boleadeira":{enchantments:["arremesso"]},
    "herois de arton|montante cinetico":{material:"adamante"},
    "herois de arton|rapieira":{improvements:["precisa"]},
    "herois de arton|martelo leve":{enchantments:["arremesso"]},
    "herois de arton|bastao ludico":{enchantments:["arremesso"]},
    "herois de arton|escudo torre":{improvements:["reforcada"]}
  };
  const legacy=falseDefaults[key];
  const sameIds=(current,expected)=>{
    const a=[...(Array.isArray(current)?current:[])].sort(),b=[...(expected||[])].sort();
    return a.length===b.length&&a.every((id,index)=>id===b[index]);
  };
  if(legacy?.improvements&&sameIds(item.improvements,legacy.improvements)) item.improvements=[];
  if(legacy?.enchantments&&sameIds(item.enchantments,legacy.enchantments)) item.enchantments=[];
  if(legacy?.material&&item.material===legacy.material) item.material="";
  item.customizationInferenceVersion=2;
  return item;
}
function itemOwnEffects(item){
  const result=emptyItemEffects(),data=itemCustomizationData(),type=inventoryItemType(item);
  const protection=baseProtectionStats(item);
  result.defense+=protection.defense;
  result.armorPenalty+=protection.armorPenalty;
  groupedCustomizationEntries(item?.improvements,data.improvements).filter(entry=>entry.types.includes(type)).forEach(entry=>mergeEffectInto(result,entry.effects));
  groupedCustomizationEntries(item?.enchantments,data.enchantments).filter(entry=>entry.types.includes(type)).forEach(entry=>mergeEffectInto(result,entry.effects));
  const material=data.materials.find(entry=>entry.id===item?.material);
  if(material) mergeEffectInto(result,material.effects);
  if(item?.material==="adamante"){
    if(type==="armor") result.rd+=itemIsHeavyArmor(item)?5:2;
    if(type==="shield") result.rd+=2;
  }
  if(item?.material==="gelo-eterno"&&type!=="weapon") result.extraDamage=[];
  if(item?.material==="materia-vermelha"){
    if(type!=="weapon") result.extraDamage=[];
    Object.entries(T20_DATA.pericias||{}).forEach(([skill,attr])=>{if(attr==="CAR"&&skill!=="Intimidação") result.skills[skill]=Number(result.skills[skill]||0)-2});
  }
  if(item?.material==="mitral"){
    if(type==="weapon") result.critRange+=1;
    if(type==="armor"||type==="shield") result.armorPenalty-=2;
  }
  if((item?.enchantments||[]).includes("invulneravel")) result.rd+=type==="shield"?2:5;
  if((item?.improvements||[]).includes("aprimorado")&&item.chosenSkill) result.skills[item.chosenSkill]=Number(result.skills[item.chosenSkill]||0)+1;
  const preset=data.presetEffects[foldItemText(item?.name)];
  if(preset) mergeEffectInto(result,preset);
  mergeDistinctItemEffectInto(result,describedItemEffects(item));
  const manual=normalizedManualItemEffects(item?.manualEffects);
  mergeEffectInto(result,manual);
  if(manual.skill&&manual.skillBonus) result.skills[manual.skill]=Number(result.skills[manual.skill]||0)+manual.skillBonus;
  return result;
}
function equippedInventoryItems(items=state?.items||[]){
  return (items||[]).filter(item=>item?.equipped===true);
}
function equippedItemAttributeContributions(inventory=state?.items||[]){
  const result=Object.fromEntries(ATTR_KEYS.map(attr=>[attr,[]]));
  equippedInventoryItems(inventory).forEach(item=>{
    const effects=itemOwnEffects(item);
    ATTR_KEYS.forEach(attr=>{
      const value=Number(effects.attrs[attr]||0);
      if(value) result[attr].push({name:String(item.name||"Item sem nome"),value});
    });
  });
  return result;
}
function isAttributeIncreasePower(power){
  const descriptionKey=powerCatalogKey(power?.desc);
  return power?.attributeIncreasePower===true
    || ATTR_KEYS.includes(power?.attributeIncrease)
    || (normalizePowerType(power?.type)==="Classe"&&powerCatalogKey(power?.name)==="aumentodeatributo")
    || (descriptionKey.includes("vocerecebe1emumatributo")&&descriptionKey.includes("umavezporpatamar"));
}
function powerAttributeContributions(powers=state?.powers||[]){
  const result=Object.fromEntries(ATTR_KEYS.map(attr=>[attr,[]]));
  (powers||[]).forEach(power=>{
    if(!isAttributeIncreasePower(power)||!ATTR_KEYS.includes(power.attributeIncrease)) return;
    result[power.attributeIncrease].push({name:String(power.name||"Aumento de Atributo"),value:1});
  });
  return result;
}
function powerAttributeBonus(attr){
  return (powerAttributeContributions()[attr]||[]).reduce((sum,source)=>sum+source.value,0);
}
function strongestItemValue(values){
  const numeric=values.map(Number).filter(Number.isFinite);
  return Math.max(0,...numeric)+Math.min(0,...numeric);
}
function equippedItemEffects(inventory=state?.items||[]){
  const result=emptyItemEffects(),items=equippedInventoryItems(inventory).map(item=>({item,effects:itemOwnEffects(item),type:inventoryItemType(item)}));
  for(const attr of ATTR_KEYS) result.attrs[attr]=items.reduce((sum,entry)=>sum+Number(entry.effects.attrs[attr]||0),0);
  const skillNames=new Set(items.flatMap(entry=>Object.keys(entry.effects.skills||{})));
  skillNames.forEach(skill=>result.skills[skill]=strongestItemValue(items.map(entry=>entry.effects.skills[skill]||0)));
  for(const key of ["rd","resistance","spellCd","pmLimit","pvMax","pmMax"]){
    result[key]=strongestItemValue(items.map(entry=>entry.effects[key]||0));
  }
  result.load=items.reduce((sum,entry)=>sum+Number(entry.effects.load||0),0);
  const defenseGroups={armor:[],shield:[],other:[]};
  items.forEach(entry=>(defenseGroups[entry.type]||defenseGroups.other).push(entry.effects.defense||0));
  result.defense=strongestItemValue(defenseGroups.armor)+strongestItemValue(defenseGroups.shield)+strongestItemValue(defenseGroups.other);
  const penaltyGroups={armor:[],shield:[],other:[]};
  items.forEach(entry=>(penaltyGroups[entry.type]||penaltyGroups.other).push(Math.max(0,Number(entry.effects.armorPenalty||0))));
  result.armorPenalty=Math.max(0,...penaltyGroups.armor)+Math.max(0,...penaltyGroups.shield)+Math.max(0,...penaltyGroups.other);
  return result;
}
function equippedProtectionBreakdown(){
  const groups={armor:[],shield:[],other:[]};
  equippedInventoryItems().forEach(item=>{
    const type=inventoryItemType(item),effects=itemOwnEffects(item);
    (groups[type]||groups.other).push(effects);
  });
  const strongestDefense=type=>strongestItemValue(groups[type].map(effect=>effect.defense||0));
  const strongestPenalty=type=>Math.max(0,...groups[type].map(effect=>Math.max(0,Number(effect.armorPenalty||0))));
  return {
    armorDefense:strongestDefense("armor"),
    shieldDefense:strongestDefense("shield"),
    otherDefense:strongestDefense("other"),
    armorPenalty:strongestPenalty("armor"),
    shieldPenalty:strongestPenalty("shield"),
    otherPenalty:strongestPenalty("other")
  };
}
function linkedAttackItems(attack,{equippedOnly=false}={}){
  const attackId=String(attack?.id||"");
  if(!attackId) return [];
  return (state?.items||[]).filter(item=>
    inventoryItemType(item)==="weapon" &&
    item.linkedAttackId===attackId &&
    (!equippedOnly||item.equipped===true)
  );
}
function equippedItemAttackEffects(attack){
  const result=emptyItemEffects();
  linkedAttackItems(attack,{equippedOnly:true}).forEach(item=>mergeEffectInto(result,itemOwnEffects(item)));
  return result;
}
function attackItemEffectLabels(item){
  const fx=itemOwnEffects(item),labels=[];
  if(fx.attack) labels.push(`${signedNumber(fx.attack)} ataque`);
  if(fx.damage) labels.push(`${signedNumber(fx.damage)} dano`);
  if(fx.extraDamage?.length) labels.push(`${fx.extraDamage.join(" + ")} extra`);
  if(fx.critRange) labels.push(`${signedNumber(fx.critRange)} margem`);
  if(fx.critMultiplier) labels.push(`${signedNumber(fx.critMultiplier)} multiplicador`);
  if(fx.doubleThreat) labels.push("margem dobrada");
  return labels;
}
function attackItemModificationNames(item){
  const data=itemCustomizationData();
  const genericImprovements=new Set(["banhado-ouro","cravejado-gemas","discreto","macabro"]);
  return [
    ...(item?.improvements||[]).filter(id=>!genericImprovements.has(id)).map(id=>data.improvements.find(entry=>entry.id===id)?.name),
    item?.material?data.materials.find(entry=>entry.id===item.material)?.name:"",
    ...(item?.enchantments||[]).map(id=>data.enchantments.find(entry=>entry.id===id)?.name)
  ].filter(Boolean);
}
function attackLinkedItemSummary(item){
  const modifications=attackItemModificationNames(item),effects=attackItemEffectLabels(item);
  if(!item.equipped) return `${item.name||"Arma sem nome"} (não equipada)`;
  const details=[modifications.join(", "),effects.join(" • ")].filter(Boolean).join(" — ");
  return `${item.name||"Arma sem nome"}${details?`: ${details}`:""}`;
}
function itemAttributeBonus(attr){return Number(equippedItemEffects().attrs[attr]||0)}
function itemSkillBonus(skill){return Number(equippedItemEffects().skills[skill]||0)+((RESISTANCE_SKILLS.has(skill))?Number(equippedItemEffects().resistance||0):0)}
function itemEffectiveSpaces(item){
  const base=Math.max(0,Number(item?.spaces||0)),adjustment=Number(itemOwnEffects(item).spaces||0);
  if(adjustment<0&&base>0) return Math.max(1,base+adjustment);
  return Math.max(0,base+adjustment);
}
function itemAutomaticEffectLabels(item){
  const fx=itemOwnEffects(item),labels=[];
  ATTR_KEYS.forEach(attr=>{if(fx.attrs[attr]) labels.push(`${attr} ${signedNumber(fx.attrs[attr])}`)});
  Object.entries(fx.skills).forEach(([skill,bonus])=>{if(bonus) labels.push(`${skill} ${signedNumber(bonus)}`)});
  [["Ataque",fx.attack],["Dano",fx.damage],["Defesa",fx.defense],["RD",fx.rd],["Resistências",fx.resistance],["CD",fx.spellCd],["Limite de PM",fx.pmLimit],["PV máx.",fx.pvMax],["PM máx.",fx.pmMax],["Carga",fx.load],["Espaços",fx.spaces]].forEach(([label,bonus])=>{if(bonus) labels.push(`${label} ${signedNumber(bonus)}`)});
  if(fx.armorPenalty>0) labels.push(`Penalidade de armadura -${fx.armorPenalty}`);
  if(fx.extraDamage.length) labels.push(`Dano extra ${fx.extraDamage.join(" + ")}`);
  if(fx.critRange) labels.push(`Margem ${signedNumber(fx.critRange)}`);
  if(fx.critMultiplier) labels.push(`Multiplicador ${signedNumber(fx.critMultiplier)}`);
  if(fx.doubleThreat) labels.push("Margem dobrada");
  return labels;
}
const rawNum=id=>Number($("#"+id)?.value||0);
const num=id=>rawNum(id);
const permanentAttrNum=id=>ATTR_KEYS.includes(id)?rawNum(id)+itemAttributeBonus(id)+powerAttributeBonus(id):rawNum(id);
const attrNum=id=>ATTR_KEYS.includes(id)?permanentAttrNum(id)+rawNum(`${id}Temp`):rawNum(id);
const value=id=>$("#"+id)?.value||"";
const DELETE_ICON_HTML='<span class="deleteIconGlyph" aria-hidden="true"></span>';
const ROLL_ICON_HTML='<img src="attack-roll-icon.png" alt="" draggable="false" aria-hidden="true">';
function notify(html,duration=3500){const t=$("#toast");t.innerHTML=html;t.classList.remove("hidden");clearTimeout(window.__to);window.__to=setTimeout(()=>t.classList.add("hidden"),duration)}
function setSaveStatus(text,type="idle",timeout=0){
  const el=$("#saveStatus");
  if(!el) return;
  el.className=`saveStatus ${type}`;
  el.innerHTML=`<span>${escapeHtml(text)}</span>`;
  clearTimeout(saveStatusTimer);
  if(timeout) saveStatusTimer=setTimeout(()=>setSaveStatus(cloudFirstMode()?"Nuvem pronta":"Modo local","idle"),timeout);
}
function markSaving(text="Salvando..."){setSaveStatus(text,"saving")}
function markSaved(text="Salvo",timeout=2800){setSaveStatus(text,"saved",timeout)}
function markSaveWarning(text,timeout=4200){setSaveStatus(text,"warning",timeout)}
function markSaveError(text="Erro ao salvar"){setSaveStatus(text,"error")}
function rollD20(bonus,title){
  const d=Math.floor(Math.random()*20)+1,total=d+Number(bonus||0);
  const totalColor=d===20?"#72d372":(d===1?"#ff5b52":"var(--gold)");
  const naturalLabel=d===20?"20 natural":(d===1?"1 natural":"");
  notify(`<b>${title}</b><br><span style="font-size:2rem;color:${totalColor}">${total}</span>${naturalLabel?`<br><strong style="color:${totalColor}">${naturalLabel}</strong>`:""}<br>1d20 (${d}) + ${bonus}`,8000);
  recordCampaignRoll({
    type:"d20",
    title,
    d20:d,
    bonus:Number(bonus||0),
    totalAttack:total,
    totalDamage:null,
    damageDetails:"",
    isCritical:d===20,
    isFumble:d===1,
    rollLabel:d===1?"Falha":(d===20?"20 natural":"Teste")
  }).catch(error=>console.warn("Falha ao registrar rolagem:",error));
  return {d20:d,total};
}
function rollDice(expr){
  const clean=String(expr).toLowerCase().replace(/\s/g,"");
  if(!clean) throw Error("Informe uma expressão de dano.");
  const normalized=clean.replace(/-/g,"+-");
  const parts=normalized.split("+").filter(Boolean);
  let total=0;
  const details=[];
  for(const part of parts){
    const dice=part.match(/^(-?)(\d+)d(\d+)$/);
    if(dice){
      const sign=dice[1]==="-"?-1:1,q=Number(dice[2]),faces=Number(dice[3]);
      if(q<1||q>100||faces<2||faces>1000) throw Error("Expressão de dados inválida.");
      const rolls=Array.from({length:q},()=>Math.floor(Math.random()*faces)+1);
      total+=rolls.reduce((a,b)=>a+b,0)*sign;
      details.push(`${sign<0?"-":""}${q}d${faces} [${rolls.join(", ")}]`);
    }else if(/^-?\d+$/.test(part)){
      const flat=Number(part); total+=flat; details.push(String(flat));
    }else{
      throw Error("Use formatos como 1d8, 2d6+4 ou 1d6+1d12+3.");
    }
  }
  return {total,details};
};

function rollDamageExpression(expr,critMultiplier=1,multiplyFlat=false){
  const clean=String(expr).toLowerCase().replace(/\s/g,"");
  if(!clean) throw Error("Informe uma expressao de dano.");
  const normalized=clean.replace(/-/g,"+-");
  const parts=normalized.split("+").filter(Boolean);
  let total=0;
  const details=[];
  const multiplier=Math.max(1,Math.floor(Number(critMultiplier)||1));
  for(const part of parts){
    const dice=part.match(/^(-?)(\d+)d(\d+)$/);
    if(dice){
      const sign=dice[1]==="-"?-1:1,q=Number(dice[2]),faces=Number(dice[3]);
      const finalQty=q*multiplier;
      if(q<1||finalQty>100||faces<2||faces>1000) throw Error("Expressao de dados invalida.");
      const rolls=Array.from({length:finalQty},()=>Math.floor(Math.random()*faces)+1);
      total+=rolls.reduce((a,b)=>a+b,0)*sign;
      const critNote=multiplier>1?` (${q}d${faces} x${multiplier})`:"";
      details.push(`${sign<0?"-":""}${finalQty}d${faces} [${rolls.join(", ")}]${critNote}`);
    }else if(/^-?\d+$/.test(part)){
      const flat=Number(part);
      const finalFlat=multiplyFlat?flat*multiplier:flat;
      total+=finalFlat;
      const critNote=multiplyFlat&&multiplier>1?` (${flat} x${multiplier})`:"";
      details.push(`${finalFlat}${critNote}`);
    }else{
      throw Error("Use formatos como 1d8, 2d6+4 ou 1d6+1d12+3.");
    }
  }
  return {total,details};
}
function parseCritical(crit,mult){
  const critText=String(crit||"").toLowerCase();
  const multText=String(mult||"").toLowerCase();
  const thresholdMatch=critText.match(/\d+/);
  const inlineMultMatch=critText.match(/x\s*(\d+)/);
  const explicitMultMatch=multText.match(/\d+/);
  const threshold=Math.max(2,Math.min(20,Number(thresholdMatch?.[0]||20)));
  const multiplier=Math.max(1,Math.min(10,Number(inlineMultMatch?.[1]||explicitMultMatch?.[0]||2)));
  return {threshold,multiplier};
}
function signedNumber(n){return `${Number(n)>=0?"+":""}${Number(n)||0}`}
function attackSkillName(attack){
  return ["Luta","Pontaria"].includes(attack?.attackSkill)?attack.attackSkill:"Manual";
}
function attackAttribute(attack,skillName=attackSkillName(attack)){
  if(skillName==="Manual") return "";
  const defaultAttr=T20_DATA.pericias[skillName]||"FOR";
  const skillAttr=state.skillData?.[skillName]?.attr;
  return ATTR_KEYS.includes(attack?.attackAttr)?attack.attackAttr:validSkillAttr(skillAttr,defaultAttr);
}
function attackBonusBreakdown(attack){
  const skillName=attackSkillName(attack);
  const manual=Number(attack?.bonus||0);
  const fx=activeConditionEffects();
  const partnerBonus=partnerAttackBonus(attack);
  const itemFx=equippedItemAttackEffects(attack);
  const itemBonus=Number(itemFx.attack||0);
  const attackOnly=num("globalAttackBonus")+Number(fx.attack||0)+partnerBonus+itemBonus;
  if(skillName==="Manual"){
    const total=manual+num("globalTestBonus")+attackOnly;
    return {total,skillName,attr:"",manual,partnerBonus,itemBonus,itemFx};
  }
  const cls=primaryClass()||{pericias:[]};
  const defaultAttr=T20_DATA.pericias[skillName]||"FOR";
  const data=state.skillData?.[skillName]||{};
  const trained=data.trained===true || (data.trained===undefined&&(cls.pericias||[]).includes(skillName));
  const attr=attackAttribute(attack,skillName);
  const skillBase=halfLevel()+attrNum(attr)+(trained?trainingBonus():0)+Number(data.adjust||0)
    +num("globalTestBonus")+num("skillGlobalBonus")
    +Number(fx.allSkills||0)+Number(fx.attrs?.[attr]||0)+Number(fx.skills?.[skillName]||0);
  return {total:skillBase+attackOnly+manual,skillName,attr,manual,trained,skillBase,partnerBonus,itemBonus,itemFx};
}
function rollAttackD20(attack){
  const best=Math.max(0,Math.min(5,Math.floor(Number(attack?.bestDice)||0)));
  const worst=Math.max(0,Math.min(5,Math.floor(Number(attack?.worstDice)||0)));
  const balance=best-worst;
  const count=1+Math.abs(balance);
  const rolls=Array.from({length:count},()=>Math.floor(Math.random()*20)+1);
  const selected=balance>0?Math.max(...rolls):(balance<0?Math.min(...rolls):rolls[0]);
  const mode=balance>0?`melhor de ${count}`:(balance<0?`pior de ${count}`:"normal");
  return {selected,rolls,mode,balance};
}
function rollAttackDamage(attack){
  const attackBreakdown=attackBonusBreakdown(attack);
  const bonus=attackBreakdown.total;
  const attackDice=rollAttackD20(attack);
  const d20=attackDice.selected;
  const totalAttack=d20+bonus;
  const itemFx=attackBreakdown.itemFx||emptyItemEffects();
  const parsedCritical=parseCritical(attack.crit,attack.mult);
  const originalMargin=21-parsedCritical.threshold;
  const itemMargin=Number(itemFx.critRange||0)+(itemFx.doubleThreat?originalMargin:0);
  const critical={threshold:Math.max(2,parsedCritical.threshold-itemMargin),multiplier:Math.max(1,parsedCritical.multiplier+Number(itemFx.critMultiplier||0))};
  const isCritical=d20>=critical.threshold;
  const isFumble=d20===1;
  const baseDamage=rollDamageExpression(attack.damage,isCritical?critical.multiplier:1,isCritical&&attack.critFlat===true);
  const extraExpressions=[String(attack.extraDamage||"").trim(),...(itemFx.extraDamage||[])].filter(Boolean);
  const extraDamage=extraExpressions.reduce((total,expression)=>{
    const rolled=rollDamageExpression(expression,1);
    total.total+=rolled.total;total.details.push(...rolled.details);return total;
  },{total:0,details:[]});
  const damageAttr=ATTR_KEYS.includes(attack.damageAttr)?attack.damageAttr:"";
  const damageAttrBonus=damageAttr?permanentAttrNum(damageAttr):0;
  const globalDamage=num("globalDamageBonus");
  const itemDamage=Number(itemFx.damage||0);
  const damage={
    total:baseDamage.total+extraDamage.total+damageAttrBonus+globalDamage+itemDamage,
    details:[...baseDamage.details,...extraDamage.details,...(damageAttr?[`${damageAttr} ${signedNumber(damageAttrBonus)}`]:[]),...(globalDamage?[signedNumber(globalDamage)]:[]),...(itemDamage?[`Item ${signedNumber(itemDamage)}`]:[])]
  };
  const attackTotalClass=isFumble?"fumbleTotal":isCritical?"criticalTotal":"";
  const rollLabel=isFumble?"Falha":isCritical?"Cr&iacute;tico":"Ataque";
  const title=escapeHtml(attack.name||"Ataque");
  const baseDamageLine=escapeHtml(baseDamage.details.join(" + "));
  const extraDamageLine=extraDamage.details.length?`<br>Dano extra: ${escapeHtml(extraDamage.details.join(" + "))}`:"";
  const damageAttrLine=damageAttr?`<br>Atributo no dano: ${damageAttr} (${signedNumber(damageAttrBonus)})`:"";
  const globalDamageLine=globalDamage?`<br>Dano global: ${signedNumber(globalDamage)}`:"";
  const itemDamageLine=itemDamage?`<br>Item equipado: ${signedNumber(itemDamage)} dano`:"";
  const itemAttackLine=attackBreakdown.itemBonus?`<br>Bônus do item: ${signedNumber(attackBreakdown.itemBonus)} ataque`:"";
  const diceLine=attackDice.rolls.length>1?` [${attackDice.rolls.join(", ")}] (${attackDice.mode})`:` [${d20}]`;
  const skillLine=attackBreakdown.skillName==="Manual"?"Manual":`${attackBreakdown.skillName} (${attackBreakdown.attr})`;
  notify(`<div class="combatRollToast">
    <div class="combatRollTop"><strong>${title}</strong><span>${rollLabel}</span></div>
    <div class="combatRollFormula">Ataque: ${attackDice.rolls.length}d20${diceLine} ${signedNumber(bonus)}<br>Per&iacute;cia: ${skillLine}${itemAttackLine}<br>Dano base: ${baseDamageLine}${extraDamageLine}${damageAttrLine}${globalDamageLine}${itemDamageLine}${isCritical?`<br>Cr&iacute;tico: ${critical.threshold}/x${critical.multiplier}`:""}</div>
    <div class="combatRollTotals">
      <div><strong class="${attackTotalClass}">${totalAttack}</strong><small>Ataque</small></div>
      <div><strong>${damage.total}</strong><small>Dano</small></div>
    </div>
  </div>`,9000);
  return {
    type:"attack",
    title:attack.name||"Ataque",
    d20,
    bonus,
    totalAttack,
    totalDamage:damage.total,
    damageDetails:`Ataque ${attackDice.mode}: [${attackDice.rolls.join(", ")}] | Base: ${baseDamage.details.join(" + ")}${extraDamage.details.length?` | Extra: ${extraDamage.details.join(" + ")}`:""}${damageAttr?` | ${damageAttr} (${signedNumber(damageAttrBonus)})`:""}${globalDamage?` | Global: ${signedNumber(globalDamage)}`:""}`,
    isCritical,
    isFumble,
    critical,
    rollLabel:rollLabel.replace(/&iacute;/g,"i")
  };
}

const CONDITION_LIBRARY={
"Abalado":{desc:"–2 em testes de perícia. Se ficar abalado novamente, em vez disso fica apavorado.",effects:{allSkills:-2}},
"Agarrado":{desc:"Fica desprevenido e imóvel, sofre –2 em testes de ataque e só pode atacar com armas leves.",effects:{attack:-2,defense:-5,skills:{Reflexos:-5}}},
"Alquebrado":{desc:"O custo em PM das habilidades aumenta em +1.",effects:{}},
"Apavorado":{desc:"–5 em testes de perícia e não pode se aproximar voluntariamente da fonte do medo.",effects:{allSkills:-5}},
"Atordoado":{desc:"Fica desprevenido e não pode fazer ações.",effects:{defense:-5,skills:{Reflexos:-5}}},
"Caído":{desc:"–5 na Defesa contra ataques corpo a corpo, +5 contra ataques à distância, –5 em ataques corpo a corpo e deslocamento reduzido a 1,5m. A ficha aplica a Defesa –5 como alerta geral.",effects:{defense:-5,stackDefense:true}},
"Cego":{desc:"Fica desprevenido e lento, não pode observar com Percepção, sofre –5 em perícias baseadas em Força ou Destreza e seus alvos recebem camuflagem total.",effects:{defense:-5,attrs:{FOR:-5,DES:-5},skills:{Reflexos:-5}}},
"Confuso":{desc:"Age aleatoriamente no início de seus turnos; sem penalidade numérica global automática.",effects:{}},
"Debilitado":{desc:"–5 em testes de Força, Destreza e Constituição e em perícias baseadas nesses atributos. Se ficar debilitado novamente, fica inconsciente.",effects:{attrs:{FOR:-5,DES:-5,CON:-5}}},
"Desprevenido":{desc:"–5 na Defesa e em Reflexos.",effects:{defense:-5,skills:{Reflexos:-5}}},
"Doente":{desc:"Sob efeito de uma doença; efeitos variam conforme a doença.",effects:{}},
"Em Chamas":{desc:"No início de seus turnos, sofre 1d6 de dano de fogo. Pode gastar uma ação padrão para apagar as chamas.",effects:{}},
"Enfeitiçado":{desc:"Torna-se prestativo em relação à fonte; a fonte recebe +10 em Diplomacia com o personagem.",effects:{}},
"Enjoado":{desc:"Só pode realizar uma ação padrão ou de movimento por rodada. Pode fazer investida como ação padrão, mas avança no máximo seu deslocamento.",effects:{}},
"Enredado":{desc:"Fica lento, vulnerável e sofre –2 em testes de ataque.",effects:{defense:-2,attack:-2}},
"Envenenado":{desc:"Os efeitos variam conforme o veneno, podendo incluir perda de vida recorrente ou outras condições.",effects:{}},
"Esmorecido":{desc:"–5 em testes de Inteligência, Sabedoria e Carisma e em perícias baseadas nesses atributos.",effects:{attrs:{INT:-5,SAB:-5,CAR:-5}}},
"Exausto":{desc:"Fica debilitado, lento e vulnerável. Se ficar exausto novamente, fica inconsciente.",effects:{defense:-2,attrs:{FOR:-5,DES:-5,CON:-5}}},
"Fascinado":{desc:"–5 em Percepção e não pode fazer ações, exceto observar o que o fascinou.",effects:{skills:{Percepção:-5}}},
"Fatigado":{desc:"Fica fraco e vulnerável. Se ficar fatigado novamente, fica exausto.",effects:{defense:-2,attrs:{FOR:-2,DES:-2,CON:-2}}},
"Fraco":{desc:"–2 em testes de Força, Destreza e Constituição e em perícias baseadas nesses atributos.",effects:{attrs:{FOR:-2,DES:-2,CON:-2}}},
"Frustrado":{desc:"–2 em testes de Inteligência, Sabedoria e Carisma e em perícias baseadas nesses atributos.",effects:{attrs:{INT:-2,SAB:-2,CAR:-2}}},
"Imóvel":{desc:"Todas as formas de deslocamento são reduzidas a 0m.",effects:{}},
"Inconsciente":{desc:"Fica indefeso e não pode fazer ações, incluindo reações.",effects:{defense:-10}},
"Indefeso":{desc:"Fica desprevenido, sofre –10 na Defesa, falha automaticamente em Reflexos e pode sofrer golpes de misericórdia.",effects:{defense:-10}},
"Lento":{desc:"Todas as formas de deslocamento são reduzidas à metade, arredondando para baixo para o primeiro incremento de 1,5m. Não pode correr ou fazer investidas.",effects:{}},
"Ofuscado":{desc:"–2 em testes de ataque e de Percepção.",effects:{attack:-2,skills:{Percepção:-2}}},
"Paralisado":{desc:"Fica imóvel e indefeso e só pode realizar ações puramente mentais.",effects:{defense:-10}},
"Pasmo":{desc:"Não pode fazer ações.",effects:{}},
"Petrificado":{desc:"Fica inconsciente e recebe RD 8.",effects:{defense:-10}},
"Sangrando":{desc:"No início de seu turno, faz Constituição CD 15; se falhar, perde 1d6 PV e continua sangrando; se passar, remove a condição.",effects:{}},
"Sobrecarregado":{desc:"Sofre penalidade de armadura –5 e deslocamento –3m.",effects:{skills:{Acrobacia:-5,Furtividade:-5,Ladinagem:-5}}},
"Surdo":{desc:"Não pode fazer Percepção para ouvir, sofre –5 em Iniciativa e fica em condição ruim para lançar magias.",effects:{skills:{Iniciativa:-5}}},
"Surpreendido":{desc:"Fica desprevenido e não pode fazer ações.",effects:{defense:-5,skills:{Reflexos:-5}}},
"Vulnerável":{desc:"–2 na Defesa.",effects:{defense:-2}}
};

function fillSelects(){
  const sourceOrder=["Jogo do Ano","Heróis de Arton","Ameaças de Arton","Deuses de Arton","Atlas de Arton","Personalizada"];
  const groupedOptions=(entries,renderOption)=>{
    const grouped={};
    entries.forEach(([k,v])=>(grouped[v.fonte||"Outras fontes"]??=[]).push([k,v]));
    const ordered=[...sourceOrder.filter(src=>grouped[src]),...Object.keys(grouped).filter(src=>!sourceOrder.includes(src)).sort((a,b)=>a.localeCompare(b,"pt-BR"))];
    return ordered.map(src=>{
      const items=grouped[src].sort((a,b)=>String(a[1].nome).localeCompare(String(b[1].nome),"pt-BR"));
      return `<optgroup label="${escapeHtml(src)}">${items.map(renderOption).join("")}</optgroup>`;
    }).join("");
  };
  const groupedOrigins={};
  Object.entries(T20_ORIGINS).forEach(([k,v])=>(groupedOrigins[v.fonte]??=[]).push([k,v]));
  const originOptions=sourceOrder.filter(src=>groupedOrigins[src]).map(src=>{
    const items=groupedOrigins[src].sort((a,b)=>a[1].nome.localeCompare(b[1].nome,"pt-BR"));
    return `<optgroup label="${src}">${items.map(([k,v])=>`<option value="${k}">${v.nome}</option>`).join("")}</optgroup>`;
  }).join("");
  $("#origem").innerHTML=originOptions;
  $("#origemTab").innerHTML=originOptions;
  $("#raca").innerHTML=groupedOptions(Object.entries(T20_DATA.racas),([k,v])=>`<option value="${k}">${escapeHtml(v.nome)}</option>`);
  const groups={};
  Object.entries(T20_DATA.classes).forEach(([k,v])=>{(groups[v.fonte]??=[]).push([k,v])});
  $("#classe").innerHTML=Object.entries(groups).map(([source,arr])=>`<optgroup label="${source}">${arr.map(([k,v])=>`<option value="${k}">${v.nome}${v.variante?` (variante de ${v.classeBase})`:""}</option>`).join("")}</optgroup>`).join("");
  fillSpellSchoolFilter();
}
function fillSpellSchoolFilter(){
  const select=$("#spellSchoolFilter");
  if(!select) return;
  const current=select.value;
  const schools=[...new Set((window.T20_SPELL_CATALOG||[]).map(spell=>spell.school).filter(Boolean))]
    .sort((a,b)=>String(a).localeCompare(String(b),"pt-BR"));
  select.innerHTML=`<option value="">Todas</option>${schools.map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("")}`;
  if(schools.includes(current)) select.value=current;
}
function firstClassId(){return Object.keys(T20_DATA.classes||{})[0]||""}
function clampClassLevel(level){
  const n=Math.floor(Number(level)||1);
  return Math.max(1,Math.min(20,n));
}
function sanitizeClassLevels(levels,options={}){
  const fallbackId=T20_DATA.classes[options.fallbackId]?options.fallbackId:(T20_DATA.classes[value("classe")]?value("classe"):firstClassId());
  const fallbackLevel=clampClassLevel(options.fallbackLevel||num("nivel")||1);
  const rows=(Array.isArray(levels)?levels:[])
    .map(entry=>({
      id:T20_DATA.classes[entry?.id||entry?.classe]?String(entry.id||entry.classe):"",
      level:clampClassLevel(entry?.level||entry?.nivel||1)
    }))
    .filter(entry=>entry.id);
  if(!rows.length&&fallbackId) rows.push({id:fallbackId,level:fallbackLevel});
  return rows;
}
function classLevelsForSheet(fields={},savedState={}){
  const fallbackId=T20_DATA.classes[fields.classe]?fields.classe:firstClassId();
  const fallbackLevel=clampClassLevel(fields.nivel||1);
  return sanitizeClassLevels(savedState.classLevels,{fallbackId,fallbackLevel});
}
function currentClassLevels(){
  state.classLevels=sanitizeClassLevels(state.classLevels);
  return state.classLevels;
}
function totalClassLevel(levels=currentClassLevels()){
  return Math.max(1,levels.reduce((sum,entry)=>sum+clampClassLevel(entry.level),0));
}
function classListLabel(levels=currentClassLevels()){
  return levels.map(entry=>{
    const cls=T20_DATA.classes[entry.id];
    return `${cls?.nome||"Classe"} ${clampClassLevel(entry.level)}`;
  }).join(" / ");
}
function primaryClassEntry(){
  return currentClassLevels()[0]||{id:firstClassId(),level:1};
}
function primaryClass(){
  const entry=primaryClassEntry();
  return T20_DATA.classes[entry.id]||T20_DATA.classes[firstClassId()];
}
function syncPrimaryFieldsFromClassLevels(){
  const levels=currentClassLevels();
  const main=levels[0];
  if(main&&$("#classe")) $("#classe").value=main.id;
  const levelInput=$("#nivel");
  if(levelInput){
    levelInput.value=totalClassLevel(levels);
    levelInput.readOnly=levels.length>1;
    levelInput.title=levels.length>1?"Nível total calculado pela soma das classes.":"Nível do personagem.";
  }
}
function setClassLevels(levels,{render=true}={}){
  state.classLevels=sanitizeClassLevels(levels);
  syncPrimaryFieldsFromClassLevels();
  syncClassSpellAttr();
  if(render) renderClassLevels();
}
function classSelectOptions(selected){
  const grouped={};
  Object.entries(T20_DATA.classes||{}).forEach(([id,cls])=>(grouped[cls.fonte||"Outras fontes"]??=[]).push([id,cls]));
  return Object.entries(grouped).map(([source,items])=>{
    const options=items
      .sort((a,b)=>String(a[1].nome).localeCompare(String(b[1].nome),"pt-BR"))
      .map(([id,cls])=>`<option value="${escapeHtml(id)}" ${id===selected?"selected":""}>${escapeHtml(cls.nome)}${cls.variante?` (variante de ${escapeHtml(cls.classeBase)})`:""}</option>`)
      .join("");
    return `<optgroup label="${escapeHtml(source)}">${options}</optgroup>`;
  }).join("");
}
function syncClassLevelsFromPrimaryFields(){
  const levels=currentClassLevels();
  levels[0]={id:T20_DATA.classes[value("classe")]?value("classe"):levels[0].id,level:levels.length===1?clampClassLevel(num("nivel")||levels[0].level):levels[0].level};
  setClassLevels(levels);
}
function renderClassLevels(){
  const list=$("#classLevelsList");
  if(!list) return;
  const levels=currentClassLevels();
  const enabled=levels.length>1||state.multiclassEnabled===true;
  state.multiclassEnabled=enabled;
  if($("#multiclassEnabled")) $("#multiclassEnabled").checked=enabled;
  if($("#multiclassEditor")) $("#multiclassEditor").classList.toggle("hidden",!enabled);
  syncPrimaryFieldsFromClassLevels();
  const total=totalClassLevel(levels);
  const meta=$("#multiclassMeta");
  if(meta) meta.textContent=`Nível total ${total}${levels.length>1?` • ${levels.length} classes`:""}`;
  list.innerHTML=levels.map((entry,index)=>{
    const cls=T20_DATA.classes[entry.id];
    return `<div class="classLevelRow ${index===0?"primary":""}">
      <span class="classLevelRole">${index===0?"Principal":"Extra"}</span>
      <label>Classe<select data-classlevel-id="${index}">${classSelectOptions(entry.id)}</select></label>
      <label>Nível de classe<input data-classlevel-level="${index}" type="number" min="1" max="20" value="${clampClassLevel(entry.level)}"></label>
      <span class="classLevelSource">${escapeHtml(cls?.fonte||"Fonte")}</span>
      ${index===0?`<span class="classLevelLocked">PV inicial</span>`:`<button type="button" class="remove deleteIconButton classLevelRemove" data-classlevel-remove="${index}" title="Remover classe" aria-label="Remover classe">${DELETE_ICON_HTML}</button>`}
    </div>`;
  }).join("");
  $$("[data-classlevel-id]").forEach(element=>element.onchange=()=>{
    const levels=currentClassLevels();
    const idx=Number(element.dataset.classlevelId);
    if(levels.some((entry,entryIndex)=>entryIndex!==idx&&entry.id===element.value)){
      notify("Essa classe já foi adicionada ao personagem.");
      renderClassLevels();
      return;
    }
    levels[idx].id=element.value;
    if(idx===0) state.skillData={};
    setClassLevels(levels);
    syncClassDefenseAttr();
    syncClassSpellAttr();
    renderPowers();renderPartners();renderSpells();refreshPowerPickerIfOpen();recalc();save(false);
  });
  $$("[data-classlevel-level]").forEach(element=>element.onchange=()=>{
    const levels=currentClassLevels();
    const idx=Number(element.dataset.classlevelLevel);
    const otherLevels=levels.reduce((sum,entry,entryIndex)=>sum+(entryIndex===idx?0:clampClassLevel(entry.level)),0);
    levels[idx].level=Math.min(clampClassLevel(element.value),Math.max(1,20-otherLevels));
    setClassLevels(levels);
    renderPowers();renderPartners();renderSpells();refreshPowerPickerIfOpen();recalc();save(false);
  });
  $$("[data-classlevel-remove]").forEach(element=>element.onclick=()=>{
    const levels=currentClassLevels();
    const idx=Number(element.dataset.classlevelRemove);
    if(idx<=0) return;
    levels.splice(idx,1);
    setClassLevels(levels);
    renderPowers();renderPartners();renderSpells();refreshPowerPickerIfOpen();recalc();save(false);
  });
}
function addClassLevel(){
  const levels=currentClassLevels();
  if(totalClassLevel(levels)>=20){notify("O nível total já está em 20.");return}
  const used=new Set(levels.map(entry=>entry.id));
  const id=Object.keys(T20_DATA.classes).find(classId=>!used.has(classId))||firstClassId();
  levels.push({id,level:1});
  setClassLevels(levels);
  renderPowers();renderPartners();renderSpells();refreshPowerPickerIfOpen();recalc();save(false);
}
function trainingBonus(){const l=totalClassLevel();return l>=15?6:l>=7?4:2}
function halfLevel(){return Math.floor(totalClassLevel()/2)}
function deathLimitFromPvMax(pvMax){return Math.min(-10,-Math.ceil(Math.max(1,pvMax)/2))}
function setNumberField(id,value){$("#"+id).value=Number.isFinite(value)?value:0}
function applyResourceDelta(currentId,tempId,delta,allowNegative=false){
  if(delta>=0){setNumberField(currentId,num(currentId)+delta);return}
  let remaining=Math.abs(delta);
  const temp=Math.max(0,num(tempId));
  if(temp>0){
    const spent=Math.min(temp,remaining);
    setNumberField(tempId,temp-spent);
    remaining-=spent;
  }
  if(remaining>0){
    const next=num(currentId)-remaining;
    setNumberField(currentId,allowNegative?next:Math.max(0,next));
  }
}
function applyQuickResourceChange(id,delta){
  if(id==="pvAtual") applyResourceDelta("pvAtual","pvBonus",delta,true);
  else if(id==="pmAtual") applyResourceDelta("pmAtual","pmBonus",delta,false);
  else setNumberField(id,Math.max(0,num(id)+delta));
}
function applyResourceAmount(kind,direction){
  const resource=kind==="pm"?"pm":"pv";
  const amountInput=$(`#${resource}Delta`);
  const amount=Math.abs(Number(amountInput?.value||0));
  if(!amount){
    notify(`Informe um valor para aplicar em ${resource.toUpperCase()}.`);
    amountInput?.focus();
    return;
  }
  const delta=amount*(Number(direction)<0?-1:1);
  if(resource==="pv") applyResourceDelta("pvAtual","pvBonus",delta,true);
  else applyResourceDelta("pmAtual","pmBonus",delta,false);
  if(amountInput) amountInput.value="";
  recalc();
  save(false);
}
const SPELL_ATTR_PM_CLASSES=new Set(["arcanista","bardo","clerigo","druida","frade"]);
function classUsesSpellAttrForPm(cls){return SPELL_ATTR_PM_CLASSES.has(cls?.idBase)}
function spellAttrPmBonus(cls){return classUsesSpellAttrForPm(cls)?num(value("spellAttr")):0}
function classLevelsUseSpellAttrForPm(levels){return levels.some(entry=>classUsesSpellAttrForPm(T20_DATA.classes[entry.id]))}
function classResourceBases(levels,{con=0,spellAttrValue=0}={}){
  const rows=sanitizeClassLevels(levels);
  let pvBase=0,pmBase=0;
  rows.forEach((entry,index)=>{
    const cls=T20_DATA.classes[entry.id];
    if(!cls) return;
    const level=clampClassLevel(entry.level);
    const pvPerLevel=Number(cls.pvNivel||0)+Number(con||0);
    pvBase+=index===0?Number(cls.pv1||0)+Number(con||0)+Math.max(0,level-1)*pvPerLevel:level*pvPerLevel;
    pmBase+=level*Number(cls.pmNivel||0);
  });
  if(classLevelsUseSpellAttrForPm(rows)) pmBase+=Number(spellAttrValue||0);
  return {pvBase,pmBase};
}

function activeConditionEffects(){
  const result={defense:0,attack:0,allSkills:0,attrs:{},skills:{}};
  const stacked={defense:0,attack:0,allSkills:0,attrs:{},skills:{}};
  const addPenalty=(target,key,value,{stack=false,stackTarget=null}={})=>{
    const n=Number(value||0);
    if(!n) return;
    if(stack&&stackTarget) stackTarget[key]=Number(stackTarget[key]||0)+n;
    else target[key]=Math.min(Number(target[key]||0),n);
  };
  for(const [name,status] of Object.entries(state.conditions||{})){
    if(!status?.active) continue;
    const e=CONDITION_LIBRARY[name]?.effects||{};
    addPenalty(result,"defense",e.defense,{stack:!!e.stackDefense,stackTarget:stacked});
    addPenalty(result,"attack",e.attack,{stack:!!e.stackAttack,stackTarget:stacked});
    addPenalty(result,"allSkills",e.allSkills,{stack:!!e.stackAllSkills,stackTarget:stacked});
    for(const [a,v] of Object.entries(e.attrs||{})) addPenalty(result.attrs,a,v,{stack:!!e.stackAttrs,stackTarget:stacked.attrs});
    for(const [s,v] of Object.entries(e.skills||{})) addPenalty(result.skills,s,v,{stack:!!e.stackSkills,stackTarget:stacked.skills});
  }
  result.defense+=stacked.defense;
  result.attack+=stacked.attack;
  result.allSkills+=stacked.allSkills;
  for(const [a,v] of Object.entries(stacked.attrs)) result.attrs[a]=Number(result.attrs[a]||0)+v;
  for(const [s,v] of Object.entries(stacked.skills)) result.skills[s]=Number(result.skills[s]||0)+v;
  return result;
}
function activeGlobalModifiers(){
  const attributes=ATTR_KEYS.map(attr=>({label:attr,value:num(`${attr}Temp`)})).filter(entry=>entry.value);
  const globals=GLOBAL_MODIFIER_FIELDS.map(field=>({label:field.label,value:num(field.id)})).filter(entry=>entry.value);
  return [...attributes,...globals];
}
function renderGlobalModifierSummary(){
  const active=activeGlobalModifiers();
  const text=active.length?active.map(entry=>`${entry.label} ${signedNumber(entry.value)}`).join(" • "):"Nenhum modificador ativo";
  const summaryText=$("#activeModifiersSummaryText");
  if(summaryText) summaryText.textContent=text;
  const summaryButton=$("#activeModifiersSummary");
  if(summaryButton) summaryButton.classList.toggle("active",active.length>0);
  const list=$("#globalModifierActiveList");
  if(list) list.innerHTML=active.length
    ? active.map(entry=>`<span>${escapeHtml(entry.label)} <strong>${signedNumber(entry.value)}</strong></span>`).join("")
    : '<span class="emptyModifierState">Nenhum modificador ativo</span>';
}
function recalc(){
  const itemFx=equippedItemEffects();
  const itemAttributeSources=equippedItemAttributeContributions();
  const powerAttributeSources=powerAttributeContributions();
  const classLevels=currentClassLevels(), cls=primaryClass()||{nome:"Classe",pv1:0,pvNivel:0,pmNivel:0}, race=T20_DATA.racas[value("raca")], lvl=totalClassLevel(classLevels), con=permanentAttrNum("CON");
  syncPrimaryFieldsFromClassLevels();
  const bases=classResourceBases(classLevels,{con,spellAttrValue:permanentAttrNum(value("spellAttr"))});
  const pvBase=bases.pvBase, pmBase=bases.pmBase;
  $("#pvBase").value=pvBase;$("#pmBase").value=pmBase;
  const pvTemp=Math.max(0,num("pvBonus")),pmTemp=Math.max(0,num("pmBonus"));
  const pvMax=pvBase+num("pvAjuste")+itemFx.pvMax,pmMax=pmBase+num("pmAjuste")+itemFx.pmMax;
  const pvAtual=num("pvAtual"),deathLimit=deathLimitFromPvMax(pvMax),deathThreshold=deathLimit-1,isDying=pvAtual<0,isDead=pvAtual<deathLimit;
  $("#pvMaxView").textContent=isDying?deathLimit:pvMax;$("#pvMaxView").dataset.max=pvMax;$("#pmMaxView").textContent=pmMax;$("#pmMaxView").dataset.max=pmMax;$("#pvAtualView").textContent=pvAtual;$("#pmAtualView").textContent=num("pmAtual");
  $("#pvTempView").textContent=pvTemp?` +${pvTemp} temp`:"";$("#pmTempView").textContent=pmTemp?` +${pmTemp} temp`:"";
  const conditionFx=activeConditionEffects();
  const defenseAttr=ATTR_KEYS.includes(value("defAttr"))?value("defAttr"):"DES";
  const defenseAttrBonus=$("#defUseDex")?.checked!==false?permanentAttrNum(defenseAttr):0;
  if($("#defUseDexState")) $("#defUseDexState").textContent=$("#defUseDex")?.checked!==false?"Sim":"Não";
  $("#defView").textContent=10+defenseAttrBonus+num("armadura")+num("escudo")+num("defBonus")+num("defAjuste")+num("globalDefenseBonus")+partnerDefenseBonus()+itemFx.defense+conditionFx.defense;
  const protection=equippedProtectionBreakdown();
  if($("#armorItemBonus")) $("#armorItemBonus").textContent=protection.armorDefense?`Item ${signedNumber(protection.armorDefense)}`:"";
  if($("#shieldItemBonus")) $("#shieldItemBonus").textContent=protection.shieldDefense?`Item ${signedNumber(protection.shieldDefense)}`:"";
  const equippedPenalty=protection.armorPenalty+protection.shieldPenalty+protection.otherPenalty;
  if($("#armorPenaltyItemBonus")) $("#armorPenaltyItemBonus").textContent=equippedPenalty?`Item -${equippedPenalty}`:"";
  const penalties=[];
  if(conditionFx.defense) penalties.push(`Defesa ${conditionFx.defense}`);
  if(conditionFx.attack) penalties.push(`Ataques ${conditionFx.attack}`);
  if(conditionFx.allSkills) penalties.push(`Todas as perícias ${conditionFx.allSkills}`);
  for(const [a,v] of Object.entries(conditionFx.attrs)) if(v) penalties.push(`Testes de ${a} ${v}`);
  for(const [s,v] of Object.entries(conditionFx.skills)) if(v) penalties.push(`${s} ${v}`);
  const penaltyHtml=penalties.length?`<strong>Condições aplicadas:</strong> ${penalties.join(" • ")}`:"";
  $("#conditionPenaltySummary").innerHTML=penaltyHtml;
  $("#combatPenaltySummary").innerHTML=penaltyHtml;
  $("#spellCd").textContent=10+halfLevel()+attrNum(value("spellAttr"))+num("spellCdBonus")+partnerSpellCdBonus()+itemFx.spellCd;
  $("#pmLimit").textContent=Math.max(0,lvl+num("pmLimitBonus")+num("pmLimitAdjust")+itemFx.pmLimit);
  ATTR_KEYS.forEach(attr=>{
    const indicator=$(`[data-itemattr="${attr}"]`),total=$(`[data-attrtotal="${attr}"]`),itemBonus=Number(itemFx.attrs[attr]||0),powerBonus=(powerAttributeSources[attr]||[]).reduce((sum,source)=>sum+source.value,0),bonus=itemBonus+powerBonus;
    const itemSources=(itemAttributeSources[attr]||[]).map(source=>({...source,kind:"Item"}));
    const powerSources=(powerAttributeSources[attr]||[]).map(source=>({...source,kind:"Poder"}));
    const sources=[...itemSources,...powerSources];
    if(total) total.textContent=rawNum(attr)+bonus;
    if(indicator){
      const detail=sources.map(source=>`${source.kind}: ${source.name} ${signedNumber(source.value)}`).join("; ");
      const originLabel=itemSources.length&&powerSources.length?"Bônus":powerSources.length?"Poderes":"Itens";
      indicator.textContent=sources.length?`${originLabel} ${signedNumber(bonus)}`:"";
      indicator.classList.toggle("active",sources.length>0);
      indicator.title=detail;
      indicator.setAttribute("aria-label",sources.length?`Origem do modificador de ${attr}: ${detail}`:"");
      indicator.onclick=sources.length?event=>{
        event.preventDefault();event.stopPropagation();
        notify(`<strong>Origens de ${attr}:</strong> ${sources.map(source=>`${source.kind}: ${escapeHtml(source.name)} ${signedNumber(source.value)}`).join(" • ")}`,5500);
      }:null;
      indicator.onkeydown=sources.length?event=>{
        if(event.key==="Enter"||event.key===" "){event.preventDefault();indicator.click()}
      }:null;
    }
  });
  if($("#rdItemBonus")) $("#rdItemBonus").textContent=itemFx.rd?`Item ${signedNumber(itemFx.rd)}`:"";
  const pvScaleMax=Math.max(1,pvMax+(isDying?0:pvTemp)),pmScaleMax=Math.max(1,pmMax+pmTemp);
  const pvPct=isDying?Math.max(0,Math.min(100,Math.abs(pvAtual)/Math.abs(deathLimit)*100)):Math.max(0,Math.min(100,Math.min(Math.max(pvAtual,0),pvMax)/pvScaleMax*100));
  const pvTempPct=!isDying&&pvTemp?Math.max(0,Math.min(100-pvPct,pvTemp/pvScaleMax*100)):0;
  const pmPct=Math.max(0,Math.min(100,Math.min(Math.max(num("pmAtual"),0),pmMax)/pmScaleMax*100));
  const pmTempPct=pmTemp?Math.max(0,Math.min(100-pmPct,pmTemp/pmScaleMax*100)):0;
  $("#pvBar").style.width=pvPct+"%";$("#pmBar").style.width=pmPct+"%";
  $("#pvTempBar").style.left=pvPct+"%";$("#pvTempBar").style.width=pvTempPct+"%";
  $("#pmTempBar").style.left=pmPct+"%";$("#pmTempBar").style.width=pmTempPct+"%";
  $("#pvBar").classList.toggle("dying",isDying);$("#pvBar").classList.toggle("dead",isDead);
  $("#pvDeathStatus").textContent=isDying?(isDead?`Morto: chegou a ${deathThreshold} PV ou menos.`:`Morrendo: morte em ${deathThreshold} PV.`):"";
  const origin=T20_ORIGINS[value("origem")]||T20_ORIGINS.custom;
  if($("#origemTab")) $("#origemTab").value=value("origem");
  $("#originName").textContent=origin.nome; if($("#originSummary")) $("#originSummary").value=origin.nome;
  $("#originBook").textContent=origin.fonte;
  $("#originType").textContent=origin.tipo;
  const originSkills=(origin.pericias||[]).join(", ")||"nenhuma automática";
  const originPowers=(origin.poderes||[]).join(", ")||"consulte a descrição";
  const originDesc=origin.beneficio?`<br><b>Descrição:</b> ${escapeHtml(origin.beneficio)}`:"";
  $("#originInfo").innerHTML=`<b>Perícias sugeridas:</b> ${escapeHtml(originSkills)}.<br><b>Poderes/benefícios:</b> ${escapeHtml(originPowers)}.${originDesc}<br><b>Itens:</b> ${escapeHtml(origin.itens||"registre manualmente")}.${origin.regiao?`<br><b>Região:</b> ${escapeHtml(origin.regiao)}.`:""}`;
  const raceSummary=raceSummaryText(value("raca"),race);
  const baseSize=raceBaseSize(race);
  const customSize=value("tamanho");
  const sizeValue=customSize||baseSize;
  const baseSizeText=`Base ${baseSize}`;
  const baseMove=raceBaseMove(race);
  const customMove=value("deslocamento");
  const moveValue=customMove!==""?customMove:baseMove;
  const baseMoveText=`Base ${baseMove}m`;
  const classSummary=classListLabel(classLevels);
  const classSources=[...new Set(classLevels.map(entry=>T20_DATA.classes[entry.id]?.fonte).filter(Boolean))].join(" • ");
  const classDetails=classLevels.map((entry,index)=>{
    const rowCls=T20_DATA.classes[entry.id]||cls;
    const variant=rowCls.variante?` (${escapeHtml(rowCls.classeBase)})`:"";
    const pvText=index===0
      ? `${rowCls.pv1}+CON no 1º nível, ${rowCls.pvNivel}+CON nos demais`
      : `${rowCls.pvNivel}+CON por nível`;
    const pmText=`${rowCls.pmNivel} PM por nível`;
    return `<p><b>${escapeHtml(rowCls.nome)} ${clampClassLevel(entry.level)}${variant}:</b> PV ${pvText}; PM ${pmText}.</p>`;
  }).join("");
  const multiclassNote=classLevels.length>1?`<p><b>Multiclasse:</b> a primeira classe usa PV inicial; classes extras usam PV de nível subsequente.</p>`:"";
  const pmAttrNote=classLevelsUseSpellAttrForPm(classLevels)?`<p><b>PM:</b> soma atributo-chave de magia uma vez.</p>`:"";
  $("#summaryText").innerHTML=`<article class="summaryCard">
    <small>Raça</small>
    <strong>${escapeHtml(race.nome)}</strong>
    <span>${escapeHtml(race.fonte)}</span>
    <p>${raceSummary}</p>
    <div class="summaryRaceControls">
      <label class="summaryMove summarySize"><span>Tamanho</span><select id="summarySizeInput">${sizeSelectOptions(sizeValue)}</select><small>${escapeHtml(baseSizeText)}</small></label>
      <label class="summaryMove"><span>Deslocamento</span><input id="summaryMoveInput" type="number" min="0" step="1" value="${escapeHtml(moveValue)}"><small>${escapeHtml(baseMoveText)}</small></label>
    </div>
  </article>
  <article class="summaryCard">
    <small>Classes</small>
    <strong>${escapeHtml(classSummary)}</strong>
    <span>${escapeHtml(classSources||"Fonte não informada")}</span>
    ${classDetails}${multiclassNote}${pmAttrNote}
  </article>`;
  const sizeInput=$("#summarySizeInput");
  if(sizeInput) sizeInput.onchange=()=>{const sizeField=$("#tamanho");if(sizeField) sizeField.value=sizeInput.value===baseSize?"":sizeInput.value;save(false)};
  const moveInput=$("#summaryMoveInput");
  if(moveInput) moveInput.oninput=()=>{const moveField=$("#deslocamento");if(moveField) moveField.value=moveInput.value;save(false)};
  renderProgress();renderSkills();renderInventorySummary();renderGlobalModifierSummary();refreshAttackSummaries();renderCartomantePanel();
}
function classProgressionForClassId(classId){
  const cls=T20_DATA.classes[classId];
  if(!cls) return {classId:"",cls:null,progression:{}};
  const baseProgress=T20_DATA.classes[cls.idBase]?.progressao;
  return {classId,cls,progression:cls.progressao||baseProgress||{}};
}
function renderProgress(){
  const classLevels=currentClassLevels(),rows=[];
  classLevels.forEach((entry,index)=>{
    const {cls,progression}=classProgressionForClassId(entry.id);
    if(!cls) return;
    const lvl=clampClassLevel(entry.level);
    rows.push(`<div class="progressClassTitle"><strong>${escapeHtml(cls.nome)} ${lvl}</strong><span>${index===0?"Classe principal":"Multiclasse"}</span></div>`);
    rows.push(`<div class="progressHeader"><strong>Nível</strong><span>Habilidades de Classe</span></div>`);
    for(let i=1;i<=20;i++){
      let text=progression[i]||(i===1?`Características iniciais de ${cls.nome}`:`Escolhas e habilidades do ${i}º nível`);
      if(!progression[i]&&i>=2) text+=` • poder/avanço de classe conforme tabela`;
      rows.push(`<div class="level ${i<=lvl?"active":""}"><strong>${i}º</strong><span>${escapeHtml(text)}</span></div>`);
    }
  });
  if($("#progressSummaryMeta")) $("#progressSummaryMeta").textContent=`${classListLabel(classLevels)} • nível total ${totalClassLevel(classLevels)}`;
  if($("#progressList")) $("#progressList").innerHTML=rows.join("");
}
function renderSkillsLegacy(){
  const cls=T20_DATA.classes[value("classe")], fx=activeConditionEffects();
  const rows=[];
  for(const [name,attr] of Object.entries(T20_DATA.pericias)){
    if(name==="Ofício"){
      state.offices=Array.isArray(state.offices)&&state.offices.length?state.offices:[{name:"",trained:false,adjust:0}];
      state.offices.forEach((office,idx)=>{
        const total=halfLevel()+attrNum(attr)+(office.trained?trainingBonus():0)+Number(office.adjust||0)+itemSkillBonus(name)+Number(fx.allSkills||0)+Number(fx.attrs[attr]||0)+Number(fx.skills[name]||0);
        rows.push(`<div class="skill office-skill">
          <span>Ofício <small>(${attr})</small></span>
          <input class="officeName" data-officename="${idx}" value="${office.name||""}" placeholder="Ex.: Alquimia">
          <label><input type="checkbox" data-officetrain="${idx}" ${office.trained?"checked":""}> Treino</label>
          <input type="number" data-officeadj="${idx}" value="${office.adjust||0}">
          <span class="total">${total>=0?"+":""}${total}</span>
          <span class="skillActions"><button type="button" class="skillRollButton iconImageButton" data-officeroll="${idx}" data-bonus="${total}" title="Rolar Ofício" aria-label="Rolar Ofício">${ROLL_ICON_HTML}</button> <button type="button" class="remove deleteIconButton" data-officedel="${idx}" title="Excluir Ofício" aria-label="Excluir Ofício">${DELETE_ICON_HTML}</button></span>
        </div>`);
      });
      rows.push(`<div><button id="addOffice">+ Adicionar Ofício</button></div>`);
      continue;
    }
    const d=state.skillData[name]||{trained:cls.pericias.includes(name),adjust:0};state.skillData[name]=d;
    const total=halfLevel()+attrNum(attr)+(d.trained?trainingBonus():0)+Number(d.adjust||0)+itemSkillBonus(name)+Number(fx.allSkills||0)+Number(fx.attrs[attr]||0)+Number(fx.skills[name]||0);
    rows.push(`<div class="skill"><span>${name} <small>(${attr})</small></span><label><input type="checkbox" data-sktrain="${name}" ${d.trained?"checked":""}> Treino</label><input type="number" data-skadj="${name}" value="${d.adjust||0}"><span class="total">${total>=0?"+":""}${total}</span><button type="button" class="skillRollButton iconImageButton" data-skroll="${name}" data-bonus="${total}" title="Rolar ${name}" aria-label="Rolar ${name}">${ROLL_ICON_HTML}</button></div>`);
  }
  $("#skillsList").innerHTML=rows.join("");
  $$("[data-sktrain]").forEach(e=>e.onchange=()=>{state.skillData[e.dataset.sktrain].trained=e.checked;renderSkills();save(false)});
  $$("[data-skadj]").forEach(e=>e.oninput=()=>{state.skillData[e.dataset.skadj].adjust=Number(e.value||0);renderSkills();save(false)});
  $$("[data-skroll]").forEach(e=>e.onclick=()=>rollD20(e.dataset.bonus,e.dataset.skroll));
  $$("[data-officename]").forEach(e=>e.oninput=()=>{state.offices[+e.dataset.officename].name=e.value;save(false)});
  $$("[data-officetrain]").forEach(e=>e.onchange=()=>{state.offices[+e.dataset.officetrain].trained=e.checked;renderSkills();save(false)});
  $$("[data-officeadj]").forEach(e=>e.oninput=()=>{state.offices[+e.dataset.officeadj].adjust=Number(e.value||0);renderSkills();save(false)});
  $$("[data-officeroll]").forEach(e=>e.onclick=()=>{const o=state.offices[+e.dataset.officeroll];rollD20(e.dataset.bonus,`Ofício${o.name?": "+o.name:""}`)});
  $$("[data-officedel]").forEach(e=>e.onclick=()=>{if(state.offices.length>1)state.offices.splice(+e.dataset.officedel,1);else state.offices[0]={name:"",trained:false,adjust:0};renderSkills();save(false)});
  if($("#addOffice"))$("#addOffice").onclick=()=>{state.offices.push({name:"",trained:false,adjust:0});renderSkills();save(false)};
}
const TRAINED_ONLY_SKILLS=new Set(["Adestramento","Atuação","Conhecimento","Guerra","Jogatina","Ladinagem","Misticismo","Nobreza","Ofício","Pilotagem","Religião"]);
const ARMOR_PENALTY_SKILLS=new Set(["Acrobacia","Furtividade","Ladinagem"]);
function skillAttrOptions(selected){
  return ATTR_KEYS.map(attr=>`<option value="${attr}" ${attr===selected?"selected":""}>${attr}</option>`).join("");
}
function validSkillAttr(attr, fallback){
  return ATTR_KEYS.includes(attr)?attr:fallback;
}
function armorPenaltyValue(){return -Math.max(0,Math.abs(num("armorPenalty"))+Number(equippedItemEffects().armorPenalty||0))}
function skillIsLocked(name, trained){return TRAINED_ONLY_SKILLS.has(name)&&!trained}
function skillTotalText(total, locked){return locked?"—":`${total>=0?"+":""}${total}`}
function skillBadges(name){
  const badges=[];
  if(TRAINED_ONLY_SKILLS.has(name)) badges.push(`<span class="skillBadge trainedOnly">Só treinada</span>`);
  if(ARMOR_PENALTY_SKILLS.has(name)) badges.push(`<span class="skillBadge armorPenalty">Armadura</span>`);
  return badges.length?`<span class="skillBadges">${badges.join("")}</span>`:"";
}
function partnerSkillBadge(bonus){
  return bonus?`<span class="skillBadge partnerBonus">Parceiro ${signedNumber(bonus)}</span>`:"";
}
function renderSkills(){
  const cls=primaryClass()||{pericias:[]}, fx=activeConditionEffects();
  const globalSkillBonus=num("skillGlobalBonus");
  const globalTestBonus=num("globalTestBonus");
  const globalResistanceBonus=num("globalResistanceBonus");
  const rows=[];
  for(const [name,defaultAttr] of Object.entries(T20_DATA.pericias)){
    if(name==="Ofício"){
      state.offices=Array.isArray(state.offices)&&state.offices.length?state.offices:[{name:"",trained:false,adjust:0}];
      state.offices.forEach((office,idx)=>{
        const attr=validSkillAttr(office.attr,defaultAttr);
        office.attr=attr;
        const locked=skillIsLocked(name,office.trained);
        const partnerBonus=partnerSkillBonus(name);
        const total=halfLevel()+attrNum(attr)+(office.trained?trainingBonus():0)+Number(office.adjust||0)+globalTestBonus+globalSkillBonus+partnerBonus+itemSkillBonus(name)+Number(fx.allSkills||0)+Number(fx.attrs[attr]||0)+Number(fx.skills[name]||0);
        rows.push(`<div class="skill office-skill ${office.trained?"trained":""} ${locked?"locked":""}">
          <span class="skillName">Ofício <select class="skillAttrSelect" data-officeattr="${idx}" title="Atributo-chave">${skillAttrOptions(attr)}</select>${skillBadges(name)}${partnerSkillBadge(partnerBonus)}</span>
          <input class="officeName" data-officename="${idx}" value="${escapeHtml(office.name||"")}" placeholder="Ex.: Alquimia">
          <label><input type="checkbox" data-officetrain="${idx}" ${office.trained?"checked":""}> Treino</label>
          <input type="number" data-officeadj="${idx}" value="${office.adjust||0}">
          <span class="total">${skillTotalText(total,locked)}</span>
          <span class="skillActions"><button type="button" class="skillRollButton iconImageButton" data-officeroll="${idx}" data-bonus="${total}" title="Rolar Ofício" aria-label="Rolar Ofício" ${locked?"disabled":""}>${ROLL_ICON_HTML}</button> <button type="button" class="remove deleteIconButton" data-officedel="${idx}" title="Excluir Ofício" aria-label="Excluir Ofício">${DELETE_ICON_HTML}</button></span>
        </div>`);
      });
      rows.push(`<div><button id="addOffice">+ Adicionar Ofício</button></div>`);
      continue;
    }
    const d=state.skillData[name]||{trained:(cls.pericias||[]).includes(name),adjust:0,attr:defaultAttr};
    d.attr=validSkillAttr(d.attr,defaultAttr);
    state.skillData[name]=d;
    const attr=d.attr;
    const armorPenalty=ARMOR_PENALTY_SKILLS.has(name)?armorPenaltyValue():0;
    const locked=skillIsLocked(name,d.trained);
    const resistanceBonus=RESISTANCE_SKILLS.has(name)?globalResistanceBonus:0;
    const partnerBonus=partnerSkillBonus(name);
    const total=halfLevel()+attrNum(attr)+(d.trained?trainingBonus():0)+Number(d.adjust||0)+globalTestBonus+globalSkillBonus+resistanceBonus+partnerBonus+itemSkillBonus(name)+armorPenalty+Number(fx.allSkills||0)+Number(fx.attrs[attr]||0)+Number(fx.skills[name]||0);
    rows.push(`<div class="skill ${d.trained?"trained":""} ${locked?"locked":""} ${armorPenalty?"hasArmorPenalty":""}">
      <span class="skillName">${escapeHtml(name)} <select class="skillAttrSelect" data-skattr="${escapeHtml(name)}" title="Atributo-chave">${skillAttrOptions(attr)}</select>${skillBadges(name)}${partnerSkillBadge(partnerBonus)}</span>
      <label><input type="checkbox" data-sktrain="${escapeHtml(name)}" ${d.trained?"checked":""}> Treino</label>
      <input type="number" data-skadj="${escapeHtml(name)}" value="${d.adjust||0}">
      <span class="total">${skillTotalText(total,locked)}</span>
      <button type="button" class="skillRollButton iconImageButton" data-skroll="${escapeHtml(name)}" data-bonus="${total}" title="Rolar ${escapeHtml(name)}" aria-label="Rolar ${escapeHtml(name)}" ${locked?"disabled":""}>${ROLL_ICON_HTML}</button>
    </div>`);
  }
  $("#skillsList").innerHTML=rows.join("");
  $$("[data-skattr]").forEach(e=>e.onchange=()=>{const name=e.dataset.skattr;state.skillData[name]=state.skillData[name]||{trained:(cls.pericias||[]).includes(name),adjust:0};state.skillData[name].attr=e.value;renderSkills();save(false)});
  $$("[data-sktrain]").forEach(e=>e.onchange=()=>{state.skillData[e.dataset.sktrain].trained=e.checked;renderSkills();save(false)});
  $$("[data-skadj]").forEach(e=>e.oninput=()=>{state.skillData[e.dataset.skadj].adjust=Number(e.value||0);renderSkills();save(false)});
  $$("[data-skroll]").forEach(e=>e.onclick=()=>rollD20(e.dataset.bonus,e.dataset.skroll));
  $$("[data-officename]").forEach(e=>e.oninput=()=>{state.offices[+e.dataset.officename].name=e.value;save(false)});
  $$("[data-officeattr]").forEach(e=>e.onchange=()=>{state.offices[+e.dataset.officeattr].attr=e.value;renderSkills();save(false)});
  $$("[data-officetrain]").forEach(e=>e.onchange=()=>{state.offices[+e.dataset.officetrain].trained=e.checked;renderSkills();save(false)});
  $$("[data-officeadj]").forEach(e=>e.oninput=()=>{state.offices[+e.dataset.officeadj].adjust=Number(e.value||0);renderSkills();save(false)});
  $$("[data-officeroll]").forEach(e=>e.onclick=()=>{const o=state.offices[+e.dataset.officeroll];rollD20(e.dataset.bonus,`Ofício${o.name?": "+o.name:""}`)});
  $$("[data-officedel]").forEach(e=>e.onclick=()=>{if(state.offices.length>1)state.offices.splice(+e.dataset.officedel,1);else state.offices[0]={name:"",trained:false,adjust:0,attr:T20_DATA.pericias["Ofício"]};renderSkills();save(false)});
  if($("#addOffice"))$("#addOffice").onclick=()=>{state.offices.push({name:"",trained:false,adjust:0,attr:T20_DATA.pericias["Ofício"]});renderSkills();save(false)};
  refreshAttackSummaries();
}
function renderPowersLegacy(){
  $("#powersList").innerHTML=state.powers.map((p,i)=>`<div class="card"><div class="cardHead"><input data-p="${i}" data-k="name" value="${p.name||""}" placeholder="Nome"><select data-p="${i}" data-k="type"><option ${p.type==="Classe"?"selected":""}>Classe</option><option ${p.type==="Raça"?"selected":""}>Raça</option><option ${p.type==="Origem"?"selected":""}>Origem</option><option ${p.type==="Concedido"?"selected":""}>Concedido</option><option ${p.type==="Distinção"?"selected":""}>Distinção</option><option ${p.type==="Outro"?"selected":""}>Outro</option></select><button type="button" class="remove deleteIconButton" data-pdel="${i}" title="Excluir poder" aria-label="Excluir poder">${DELETE_ICON_HTML}</button></div><div class="powerMeta"><input data-p="${i}" data-k="cost" value="${p.cost||""}" placeholder="Custo/uso"><input data-p="${i}" data-k="action" value="${p.action||""}" placeholder="Ação"><input data-p="${i}" data-k="source" value="${p.source||""}" placeholder="Fonte/página"></div><textarea data-p="${i}" data-k="desc" rows="4" placeholder="Descrição">${p.desc||""}</textarea></div>`).join("");
  bindCollection("p",state.powers,renderPowers);$$("[data-pdel]").forEach(e=>e.onclick=()=>{state.powers.splice(+e.dataset.pdel,1);renderPowers();save(false)});
}

const POWER_TYPES=["Classe","Geral","Raça","Origem","Concedido","Distinção","Outro"];
const CLASS_POWER_SOURCE_ORDER=["Jogo do Ano","Heróis de Arton","Deuses de Arton"];
const POWER_CATALOG_SOURCE_ORDER=["Jogo do Ano","Heróis de Arton","Ameaças de Arton","Deuses de Arton","Atlas de Arton"];
const GENERAL_POWER_SUBTYPES=["Combate","Magia","Destino"];
const AUTO_CLASS_FEATURE_FLAG="progressaoClasse";
const AUTO_RACE_ABILITY_FLAG="habilidadeRacial";
const RACE_POWER_ALIASES={
  qareen:["Qareen da Água","Qareen da Agua","Qareen do Ar","Qareen do Fogo","Qareen da Terra","Qareen da Luz","Qareen das Trevas"],
  sereia:["Sereia","Tritão","Tritao","Sereia/Tritão","Sereia/Tritao"],
  suraggel:["Suraggel"],
  suraggel_aggelus:["Suraggel","Aggelus"],
  suraggel_sulfure:["Suraggel","Sulfure"],
  meio_elfo:["Meio-Elfo","Meio Elfo"],
  golem_ameacas:["Golem"],
  troganao:["Trog","Troganão"],
  moreau:["Moreau da Serpente","Moreau do Lobo"]
};
const POWER_TYPE_ALIASES={"RaÃ§a":"Raça","RaÃƒÂ§a":"Raça","DistinÃ§Ã£o":"Distinção","DistinÃƒÂ§ÃƒÂ£o":"Distinção"};
function normalizePowerType(type){
  return POWER_TYPE_ALIASES[type]||type||"Classe";
}
function raceBaseSize(race){
  return String(race?.tamanho||"Médio").trim()||"Médio";
}
function raceBaseMove(race){
  const move=Number(race?.deslocamento);
  return Number.isFinite(move)?move:9;
}
const SIZE_OPTIONS=["Minúsculo","Pequeno","Médio","Grande","Enorme","Colossal"];
function sizeSelectOptions(selected){
  const options=SIZE_OPTIONS.includes(selected)?SIZE_OPTIONS:[selected,...SIZE_OPTIONS].filter(Boolean);
  return options.map(size=>`<option ${size===selected?"selected":""}>${escapeHtml(size)}</option>`).join("");
}
function raceAliasesFor(raceId,race){
  const names=[race?.nome,raceId,...(RACE_POWER_ALIASES[raceId]||[])].filter(Boolean);
  return [...new Set(names.flatMap(name=>String(name).split("/")).concat(names).map(powerCatalogKey).filter(Boolean))];
}
function racePowerMatchesRace(power,raceId,race){
  const races=power.races||[];
  if(races.some(raceName=>powerCatalogKey(raceName)==="varias")) return true;
  const aliases=raceAliasesFor(raceId,race);
  return races.some(raceName=>aliases.includes(powerCatalogKey(raceName)));
}
function isRaceAttributeModifierPower(power){
  if(normalizePowerType(power.type)!=="Raça") return false;
  const name=String(power.name||"");
  const nameKey=powerCatalogKey(name);
  const descKey=powerCatalogKey(power.desc||"");
  if(descKey.includes("modificadoresdeatributos")) return true;
  if(nameKey==="donsdeduende") return true;
  const hasNumericBonus=/[+-]\s*\d/.test(name);
  const mentionsAttribute=nameKey.includes("atributo")||["forca","destreza","constituicao","inteligencia","sabedoria","carisma","for","des","con","int","sab","car"].some(attr=>nameKey.includes(attr));
  return hasNumericBonus && mentionsAttribute;
}
function raceAttributeTextFromPower(power){
  const name=String(power.name||"").trim();
  if(powerCatalogKey(name)==="donsdeduende"){
    return compactInlineText(power.desc).split(".")[0]||name;
  }
  return name;
}
function raceAttributeSummary(raceId,race){
  if(race?.atributos) return String(race.atributos);
  const powers=powerCatalogEntries().filter(power=>
    isRaceAttributeModifierPower(power) && racePowerMatchesRace(power,raceId,race)
  );
  const seen=new Set();
  return powers.map(raceAttributeTextFromPower).filter(text=>{
    const key=powerCatalogKey(text);
    if(!key||seen.has(key)) return false;
    seen.add(key);
    return true;
  }).join("; ");
}
function raceSummaryText(raceId,race){
  const attrs=raceAttributeSummary(raceId,race);
  return attrs?escapeHtml(attrs):'<span class="muted">Atributos conforme raça ou escolha.</span>';
}
function powerTypeOptions(selected){
  selected=normalizePowerType(selected);
  const options=POWER_TYPES.includes(selected)?POWER_TYPES:[selected,...POWER_TYPES].filter(Boolean);
  return options.map(type=>`<option ${type===selected?"selected":""}>${escapeHtml(type)}</option>`).join("");
}
function splitProgressionFeatures(text){
  const parts=[];
  let current="",depth=0;
  for(const ch of String(text||"")){
    if(ch==="(") depth++;
    if(ch===")") depth=Math.max(0,depth-1);
    if(ch==="," && depth===0){
      if(current.trim()) parts.push(current.trim());
      current="";
      continue;
    }
    current+=ch;
  }
  if(current.trim()) parts.push(current.trim());
  return parts;
}
function isProgressionChoiceFeature(feature){
  const key=powerCatalogKey(feature);
  return key.startsWith("poderde") || key==="poderavancodeclasse";
}
function classFeatureBaseKey(feature){
  return powerCatalogKey(
    String(feature||"")
      .replace(/\([^)]*\)/g,"")
      .replace(/\s+[+-]\s*\d+(?:d\d+)?(?:\s*PV)?\s*$/i,"")
      .replace(/\s+\d+d\d+.*$/i,"")
      .replace(/\s+\d+\s*$/i,"")
      .trim()
  );
}
function prettifyClassFeatureName(feature){
  const keepLower=new Set(["a","o","as","os","de","do","da","dos","das","e","em","com","para","por","pela","pelas","pelo","pelos","ao","aos","à","às"]);
  return String(feature||"").trim().split(/\s+/).map((word,index)=>{
    if(index>0 && keepLower.has(word.toLowerCase())) return word.toLowerCase();
    return word.charAt(0).toUpperCase()+word.slice(1);
  }).join(" ");
}
function classProgressionForCurrentClass(){
  return classProgressionForClassId(primaryClassEntry().id);
}
function classFeatureDetailsFor(classId,baseClassId,baseKey){
  const catalog=window.T20_CLASS_FEATURE_DETAILS||{};
  return catalog[`${classId}|${baseKey}`]
    || catalog[`${baseClassId||""}|${baseKey}`]
    || catalog[`*|${baseKey}`]
    || {};
}
function currentAutoClassFeatures(){
  const byFeature=new Map();
  currentClassLevels().forEach(entry=>{
    const {classId,cls,progression}=classProgressionForClassId(entry.id);
    for(let level=1;level<=clampClassLevel(entry.level);level++){
      splitProgressionFeatures(progression[level]).forEach(rawFeature=>{
        if(!rawFeature || isProgressionChoiceFeature(rawFeature)) return;
        const baseKey=classFeatureBaseKey(rawFeature);
        if(!baseKey) return;
        const featureName=prettifyClassFeatureName(rawFeature);
        const mapKey=`${classId}|${baseKey}`;
        const previous=byFeature.get(mapKey)||{firstLevel:level,history:[],classId,cls,baseKey};
        previous.name=featureName;
        previous.level=level;
        previous.history.push({level,feature:featureName});
        byFeature.set(mapKey,previous);
      });
    }
  });
  return [...byFeature.values()].map(feature=>{
    const {classId,cls,baseKey}=feature;
    const history=feature.history.map(item=>`${item.level}º: ${item.feature}`).join("; ");
    const evolved=feature.history.length>1?` Evolução registrada: ${history}.`:"";
    const details=classFeatureDetailsFor(classId,cls?.idBase,baseKey);
    const fallbackDesc=`Habilidade automática da progressão de ${cls?.nome||"classe"}, recebida no ${feature.level}º nível.`;
    return {
      name:details.name||feature.name,
      type:"Classe",
      cost:details.cost||"",
      action:details.action||"",
      source:`${cls?.fonte||"Classe"} • ${cls?.nome||"Classe"} nível ${feature.level}`,
      desc:`${details.desc||fallbackDesc}${evolved}`,
      autoClassFeature:AUTO_CLASS_FEATURE_FLAG,
      autoClassId:classId,
      autoFeatureKey:`${classId}|${baseKey}`,
      autoLevel:feature.level
    };
  }).sort((a,b)=>Number(a.autoLevel||0)-Number(b.autoLevel||0)||String(a.source||"").localeCompare(String(b.source||""),"pt-BR")||String(a.name||"").localeCompare(String(b.name||""),"pt-BR"));
}
function autoPowerSuppressionKey(power){
  if(power?.autoClassFeature===AUTO_CLASS_FEATURE_FLAG){
    return `class:${power.autoFeatureKey||[power.autoClassId,power.name,power.source].map(powerCatalogKey).join("|")}`;
  }
  if(power?.autoRaceAbility===AUTO_RACE_ABILITY_FLAG){
    return `race:${power.autoRaceAbilityKey||[power.autoRaceId,power.name,power.source].map(powerCatalogKey).join("|")}`;
  }
  return "";
}
function isSuppressedAutoPower(power){
  const key=autoPowerSuppressionKey(power);
  return !!key && (state.suppressedAutoPowers||[]).includes(key);
}
function suppressAutoPower(power){
  const key=autoPowerSuppressionKey(power);
  if(!key) return;
  state.suppressedAutoPowers=Array.isArray(state.suppressedAutoPowers)?state.suppressedAutoPowers:[];
  if(!state.suppressedAutoPowers.includes(key)) state.suppressedAutoPowers.push(key);
}
function syncAutoClassFeatures(){
  state.powers=Array.isArray(state.powers)?state.powers:[];
  state.suppressedAutoPowers=Array.isArray(state.suppressedAutoPowers)?state.suppressedAutoPowers:[];
  const previousPowers=state.powers.filter(power=>!isRaceAttributeModifierPower(power));
  const manual=state.powers.filter(power=>power.autoClassFeature!==AUTO_CLASS_FEATURE_FLAG && power.autoRaceAbility!==AUTO_RACE_ABILITY_FLAG && !isRaceAttributeModifierPower(power));
  const manualClassFeatureKeys=new Set(manual
    .filter(power=>normalizePowerType(power.type)==="Classe")
    .map(power=>classFeatureBaseKey(power.name))
    .filter(Boolean));
  const manualRaceAbilityKeys=new Set(manual
    .filter(power=>normalizePowerType(power.type)==="Raça")
    .map(power=>powerCatalogKey(power.name))
    .filter(Boolean));
  const auto=currentAutoClassFeatures().filter(power=>!manualClassFeatureKeys.has(classFeatureBaseKey(power.name)) && !isSuppressedAutoPower(power));
  const autoRace=currentAutoRaceAbilities().filter(power=>!manualRaceAbilityKeys.has(powerCatalogKey(power.name)) && !isSuppressedAutoPower(power));
  const generated=[...auto,...autoRace],generatedByKey=new Map(generated.map(power=>[autoPowerSuppressionKey(power),power]));
  const hadAutomatic=previousPowers.some(power=>autoPowerSuppressionKey(power));
  if(!hadAutomatic){
    state.powers=[...generated,...manual];
  }else{
    const ordered=[];
    previousPowers.forEach(power=>{
      const key=autoPowerSuppressionKey(power);
      if(!key){ordered.push(power);return}
      const refreshed=generatedByKey.get(key);
      if(refreshed){ordered.push(refreshed);generatedByKey.delete(key)}
    });
    const newAutomatic=[...generatedByKey.values()];
    const lastAutomaticIndex=ordered.reduce((last,power,index)=>autoPowerSuppressionKey(power)?index:last,-1);
    ordered.splice(lastAutomaticIndex+1,0,...newAutomatic);
    state.powers=ordered;
  }
  expandedPowerCards=new Set([...expandedPowerCards].filter(index=>index<state.powers.length));
}
function isAutoRaceAbilityEntry(power){
  if(normalizePowerType(power.type)!=="Raça") return false;
  const raceId=value("raca");
  const sourceKey=powerCatalogKey(power.source);
  const nameKey=powerCatalogKey(power.name);
  const raceKeys=(power.races||[]).map(powerCatalogKey);
  if(nameKey.startsWith("moreauheranca") || nameKey==="moreauherancadacoruja") return false;
  if(raceId==="golem_ameacas" && sourceKey==="jogodoano" && raceKeys.includes("golem")) return false;
  if(raceId!=="golem_ameacas" && sourceKey==="ameacasdearton" && raceKeys.includes("golem")) return false;
  if(powerCatalogKey(power.subtype)==="habilidadederaca") return true;
  return sourceKey==="jogodoano" && raceKeys.length>0 && !raceKeys.includes("varias");
}
function currentAutoRaceAbilities(){
  const raceId=value("raca");
  const race=T20_DATA.racas[raceId];
  return currentRacePowers()
    .filter(isAutoRaceAbilityEntry)
    .map(power=>({
      ...power,
      type:"Raça",
      source:`${power.source||race?.fonte||"Raça"} • ${race?.nome||"Raça"}`,
      autoRaceAbility:AUTO_RACE_ABILITY_FLAG,
      autoRaceId:raceId,
      autoRaceAbilityKey:`${raceId}|${powerCatalogKey(power.name)}|${powerCatalogKey(power.source)}`
    }));
}
function moveCollectionEntry(collection,index,direction){
  const target=index+direction;
  if(!Array.isArray(collection)||index<0||target<0||index>=collection.length||target>=collection.length) return false;
  [collection[index],collection[target]]=[collection[target],collection[index]];
  return true;
}
function swapExpandedIndexes(indexes,first,second){
  return new Set([...indexes].map(index=>index===first?second:index===second?first:index));
}
function moveCollectionEntryTo(collection,from,to){
  if(!Array.isArray(collection)||from===to||from<0||to<0||from>=collection.length||to>=collection.length) return false;
  const [entry]=collection.splice(from,1);
  collection.splice(to,0,entry);
  return true;
}
function moveExpandedIndex(indexes,from,to){
  return new Set([...indexes].map(index=>{
    if(index===from) return to;
    if(from<to&&index>from&&index<=to) return index-1;
    if(to<from&&index>=to&&index<from) return index+1;
    return index;
  }));
}
function accordionDragHandle(kind,index){
  return `<button type="button" class="accordionDragHandle" data-reorder-kind="${kind}" data-reorder-index="${index}" title="Arraste para reordenar" aria-label="Arraste para reordenar; use as setas do teclado"><span aria-hidden="true"></span></button>`;
}
function bindAccordionReorder({kind,collection,cardSelector,getExpanded,setExpanded,render,commit}){
  const container=kind==="power"?$("#powersList"):$("#itemsList");
  if(!container) return;
  const handles=[...container.querySelectorAll(`[data-reorder-kind="${kind}"]`)];
  const moveByKeyboard=(from,direction)=>{
    const to=from+direction;
    if(!moveCollectionEntry(collection,from,direction)) return;
    setExpanded(swapExpandedIndexes(getExpanded(),from,to));
    commit();
  };
  handles.forEach(handle=>{
    handle.onkeydown=event=>{
      const direction=["ArrowUp","ArrowLeft"].includes(event.key)?-1:["ArrowDown","ArrowRight"].includes(event.key)?1:0;
      if(!direction) return;
      event.preventDefault();
      moveByKeyboard(Number(handle.dataset.reorderIndex),direction);
    };
    handle.onpointerdown=event=>{
      if(event.button!==0) return;
      event.preventDefault();
      const card=handle.closest(cardSelector),from=Number(handle.dataset.reorderIndex);
      if(!card||!Number.isInteger(from)) return;
      const startX=event.clientX,startY=event.clientY,originalStyle=card.getAttribute("style");
      let dragging=false,placeholder=null,offsetX=0,offsetY=0;
      handle.setPointerCapture?.(event.pointerId);
      const startDragging=moveEvent=>{
        const rect=card.getBoundingClientRect();
        offsetX=startX-rect.left;offsetY=startY-rect.top;
        placeholder=document.createElement("div");
        placeholder.className="accordionDropPlaceholder";
        placeholder.style.height=`${rect.height}px`;
        container.insertBefore(placeholder,card);
        Object.assign(card.style,{position:"fixed",left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,margin:"0",pointerEvents:"none"});
        card.classList.add("dragging");
        document.body.classList.add("accordionDragging");
        dragging=true;
        positionFloatingCard(moveEvent);
      };
      const positionFloatingCard=moveEvent=>{
        card.style.left=`${moveEvent.clientX-offsetX}px`;
        card.style.top=`${moveEvent.clientY-offsetY}px`;
      };
      const placePlaceholder=moveEvent=>{
        const candidates=[...container.children].filter(child=>child!==card&&child!==placeholder&&child.matches?.(cardSelector));
        if(!candidates.length) return;
        let target=null,bestDistance=Infinity;
        candidates.forEach(candidate=>{
          const rect=candidate.getBoundingClientRect(),centerX=rect.left+rect.width/2,centerY=rect.top+rect.height/2;
          const distance=((moveEvent.clientX-centerX)/Math.max(1,rect.width))**2+((moveEvent.clientY-centerY)/Math.max(1,Math.min(rect.height,180)))**2;
          if(distance<bestDistance){bestDistance=distance;target=candidate}
        });
        if(!target) return;
        const rect=target.getBoundingClientRect(),centerX=rect.left+rect.width/2,centerY=rect.top+rect.height/2;
        const sameRow=Math.abs(moveEvent.clientY-centerY)<Math.min(rect.height*.42,90);
        const before=sameRow?moveEvent.clientX<centerX:moveEvent.clientY<centerY;
        container.insertBefore(placeholder,before?target:target.nextSibling);
      };
      const onMove=moveEvent=>{
        if(!dragging&&Math.hypot(moveEvent.clientX-startX,moveEvent.clientY-startY)<6) return;
        if(!dragging) startDragging(moveEvent);
        positionFloatingCard(moveEvent);
        placePlaceholder(moveEvent);
        const edge=72,scrollStep=14;
        if(moveEvent.clientY<edge) window.scrollBy(0,-scrollStep);
        else if(moveEvent.clientY>window.innerHeight-edge) window.scrollBy(0,scrollStep);
      };
      const finish=shouldCommit=>{
        handle.removeEventListener("pointermove",onMove);
        handle.removeEventListener("pointerup",onUp);
        handle.removeEventListener("pointercancel",onCancel);
        handle.releasePointerCapture?.(event.pointerId);
        card.classList.remove("dragging");
        document.body.classList.remove("accordionDragging");
        if(originalStyle===null) card.removeAttribute("style");else card.setAttribute("style",originalStyle);
        if(!dragging){return}
        const order=[...container.children].filter(child=>child!==card&&(child===placeholder||child.matches?.(cardSelector)));
        const to=order.indexOf(placeholder);
        placeholder?.remove();
        if(!shouldCommit){return}
        if(!moveCollectionEntryTo(collection,from,to)){render();return}
        setExpanded(moveExpandedIndex(getExpanded(),from,to));
        commit();
      };
      const onUp=()=>finish(true),onCancel=()=>finish(false);
      handle.addEventListener("pointermove",onMove);
      handle.addEventListener("pointerup",onUp);
      handle.addEventListener("pointercancel",onCancel);
    };
  });
}
function renderPowerCard(p,i){
  const isOpen=expandedPowerCards.has(i);
  p.type=normalizePowerType(p.type||"Classe");
  const isAttributeIncrease=isAttributeIncreasePower(p);
  const chosenAttribute=ATTR_KEYS.includes(p.attributeIncrease)?p.attributeIncrease:"";
  const isAutoClass=p.autoClassFeature===AUTO_CLASS_FEATURE_FLAG;
  const isAutoRace=p.autoRaceAbility===AUTO_RACE_ABILITY_FLAG;
  const isAuto=isAutoClass||isAutoRace;
  const baseMeta=isAutoClass?`Automático • nível ${p.autoLevel||"?"}`:isAutoRace?"Automático • raça":escapeHtml(p.type);
  const autoText=`${baseMeta}${isAttributeIncrease?` • ${chosenAttribute?`${chosenAttribute} +1`:"atributo pendente"}`:""}`;
  const lockAttr=isAuto?" readonly":"";
  const disabledAttr=isAuto?" disabled":"";
  const autoActions=isAuto
    ? `<div class="autoPowerActions"><span class="autoPowerBadge">${isAutoRace?"Raça":"Progressão"}</span><button type="button" class="remove autoRemove deleteIconButton" data-pautodel="${i}" title="Remover este poder automático" aria-label="Remover este poder automático">${DELETE_ICON_HTML}</button></div>`
    : `<button type="button" class="remove deleteIconButton" data-pdel="${i}" title="Excluir poder" aria-label="Excluir poder">${DELETE_ICON_HTML}</button>`;
  return `<div class="card powerAccordionCard ${isOpen?"expanded":""}">
    <div class="accordionCardHeader">
      <button type="button" class="powerAccordionToggle" data-powertoggle="${i}" aria-expanded="${isOpen}">
        <span class="powerAccordionTitle"><strong>${escapeHtml(p.name||"Poder sem nome")}</strong><small>${autoText}</small></span>
        <span class="powerAccordionCue">${isOpen?"Recolher":"Expandir"}</span>
      </button>
      ${accordionDragHandle("power",i)}
    </div>
    <div class="powerAccordionBody ${isOpen?"":"hidden"}">
      <div class="powerMainFields">
        <label>Nome<input data-p="${i}" data-k="name" value="${escapeHtml(p.name||"")}" placeholder="Nome"${lockAttr}></label>
        <label>Tipo<select data-p="${i}" data-k="type"${disabledAttr}>${powerTypeOptions(p.type||"Classe")}</select></label>
        ${autoActions}
      </div>
      ${isAttributeIncrease?`<div class="powerAttributeIncrease">
        <label>Atributo aumentado<select data-p="${i}" data-k="attributeIncrease" aria-label="Atributo aumentado por este poder">
          <option value="">Escolha um atributo</option>
          ${ATTR_KEYS.map(attr=>`<option value="${attr}" ${attr===chosenAttribute?"selected":""}>${attr} — ${ATTR_NAMES[attr]}</option>`).join("")}
        </select></label>
        <span><strong>+1</strong><small>Aplicado automaticamente aos cálculos do atributo.</small></span>
      </div>`:""}
      <div class="powerMeta">
        <label>Custo/uso<input data-p="${i}" data-k="cost" value="${escapeHtml(p.cost||"")}" placeholder="Custo/uso"${lockAttr}></label>
        <label>Ação<input data-p="${i}" data-k="action" value="${escapeHtml(p.action||"")}" placeholder="Ação"${lockAttr}></label>
        <label>Fonte/página<input data-p="${i}" data-k="source" value="${escapeHtml(p.source||"")}" placeholder="Fonte/página"${lockAttr}></label>
      </div>
      <label>Descrição<textarea data-p="${i}" data-k="desc" rows="5" placeholder="Descrição"${lockAttr}>${escapeHtml(p.desc||"")}</textarea></label>
    </div>
  </div>`;
}
function renderPowers(){
  syncAutoClassFeatures();
  $("#powersList").innerHTML=state.powers.map((p,i)=>renderPowerCard(p,i)).join("") || '<p class="muted">Nenhum poder registrado ainda.</p>';
  $$("[data-powertoggle]").forEach(e=>e.onclick=()=>{const idx=+e.dataset.powertoggle;if(expandedPowerCards.has(idx))expandedPowerCards.delete(idx);else expandedPowerCards.add(idx);renderPowers()});
  bindAccordionReorder({
    kind:"power",collection:state.powers,cardSelector:".powerAccordionCard",
    getExpanded:()=>expandedPowerCards,setExpanded:value=>{expandedPowerCards=value},
    render:renderPowers,commit:()=>{renderPowers();save(false)}
  });
  bindCollection("p",state.powers,renderPowers);
  $$("[data-pautodel]").forEach(e=>e.onclick=()=>{const idx=+e.dataset.pautodel;suppressAutoPower(state.powers[idx]);expandedPowerCards=new Set([...expandedPowerCards].filter(openIdx=>openIdx!==idx).map(openIdx=>openIdx>idx?openIdx-1:openIdx));renderPowers();recalc();save(false)});
  $$("[data-pdel]").forEach(e=>e.onclick=()=>{const idx=+e.dataset.pdel;if(state.powers[idx]?.cartomanteGrantedPower)state.cartomante.grantedPower="";state.powers.splice(idx,1);expandedPowerCards=new Set([...expandedPowerCards].filter(openIdx=>openIdx!==idx).map(openIdx=>openIdx>idx?openIdx-1:openIdx));renderPowers();recalc();save(false)});
}
function currentClassPowerIds(){
  return [...new Set(currentClassLevels().flatMap(entry=>{
    const cls=T20_DATA.classes[entry.id];
    return [entry.id,cls?.idBase].filter(Boolean);
  }))];
}
function currentClassPowers(){
  const catalog=window.T20_CLASS_POWERS||{};
  const details=window.T20_CLASS_POWER_DETAILS||{};
  return currentClassPowerIds()
    .flatMap(classId=>(catalog[classId]||[]).map(power=>{
      const key=`${classId}|${power.source||""}|${power.name||""}`;
      return {...power,classId,...(details[key]||{})};
    }))
    .sort((a,b)=>
      classPowerSourceRank(a.source)-classPowerSourceRank(b.source)||
      String(a.name||"").localeCompare(String(b.name||""),"pt-BR")
    );
}
function classPowerSourceRank(source){
  const index=CLASS_POWER_SOURCE_ORDER.indexOf(source);
  return index>=0?index:CLASS_POWER_SOURCE_ORDER.length;
}
function powerCatalogKey(text){
  return String(text||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"");
}
function powerSourceRank(source){
  const index=POWER_CATALOG_SOURCE_ORDER.indexOf(source);
  return index>=0?index:POWER_CATALOG_SOURCE_ORDER.length;
}
function powerCatalogEntries(){
  return window.T20_POWER_CATALOG||[];
}
function sortCatalogPowers(powers){
  return powers.slice().sort((a,b)=>
    powerSourceRank(a.source)-powerSourceRank(b.source)||
    GENERAL_POWER_SUBTYPES.indexOf(a.subtype)-GENERAL_POWER_SUBTYPES.indexOf(b.subtype)||
    String(a.name||"").localeCompare(String(b.name||""),"pt-BR")
  );
}
function currentGeneralPowers(){
  const subtype=value("powerCatalogSubtype");
  return sortCatalogPowers(powerCatalogEntries().filter(power=>
    power.type==="Geral" && (!subtype || power.subtype===subtype)
  ));
}
function powerMatchesCurrentRace(power){
  const raceId=value("raca"), race=T20_DATA.racas[raceId];
  return racePowerMatchesRace(power,raceId,race);
}
function currentRacePowers(){
  return sortCatalogPowers(powerCatalogEntries().filter(power=>normalizePowerType(power.type)==="Raça" && powerMatchesCurrentRace(power) && !isRaceAttributeModifierPower(power)));
}
function uniqueCatalogPowers(powers){
  const seen=new Set();
  return powers.filter(power=>{
    const key=[power.name,power.type,power.subtype,power.source].map(powerCatalogKey).join("|");
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function currentOriginPowers(){
  const originId=value("origem");
  const origin=T20_ORIGINS[originId]||T20_ORIGINS.custom;
  const originPowerNames=new Set((origin.poderes||[]).map(powerCatalogKey).filter(Boolean));
  const allowsCombatChoice=(origin.poderes||[]).some(power=>powerCatalogKey(power)==="umpoderdecombateasuaescolha");
  return sortCatalogPowers(uniqueCatalogPowers(powerCatalogEntries().filter(power=>{
    if(power.type==="Origem" && (power.originIds||[]).includes(originId)) return true;
    if(originPowerNames.has(powerCatalogKey(power.name))) return true;
    if(allowsCombatChoice && power.type==="Geral" && power.subtype==="Combate") return true;
    return false;
  })));
}
function currentGrantedPowers(){
  const deityKey=powerCatalogKey(value("divindade"));
  const powers=powerCatalogEntries().filter(power=>power.type==="Concedido");
  if(!deityKey) return sortCatalogPowers(powers);
  const filtered=powers.filter(power=>(power.deities||[]).some(deity=>powerCatalogKey(deity)===deityKey));
  return sortCatalogPowers(filtered.length?filtered:powers);
}
function currentPowerPickerType(){
  return value("powerCatalogType")||"Classe";
}
function currentPowerPickerPowers(){
  switch(currentPowerPickerType()){
    case "Geral": return currentGeneralPowers();
    case "Raça": return currentRacePowers();
    case "Origem": return currentOriginPowers();
    case "Concedido": return currentGrantedPowers();
    default: return currentClassPowers();
  }
}
function powerPickerMetaText(powers){
  const type=currentPowerPickerType();
  if(type==="Classe"){
    const classes=classListLabel();
    return powers.length?`${classes} • ${powers.length} poderes encontrados`:`${classes} • nenhum poder catalogado para estas classes`;
  }
  if(type==="Geral"){
    const subtype=value("powerCatalogSubtype")||"todos os grupos";
    return `${subtype} • ${powers.length} poderes gerais encontrados`;
  }
  if(type==="Raça"){
    const race=T20_DATA.racas[value("raca")];
    return `${race?.nome||"Raça"} • ${powers.length} poderes de raça encontrados`;
  }
  if(type==="Origem"){
    const origin=T20_ORIGINS[value("origem")]||T20_ORIGINS.custom;
    return `${origin?.nome||"Origem"} • ${powers.length} poderes encontrados`;
  }
  const deity=value("divindade").trim()||"Todas as divindades";
  return `${deity} • ${powers.length} poderes concedidos encontrados`;
}
function powerOptionMeta(power){
  if(power.classId) return T20_DATA.classes[power.classId]?.nome||power.classId;
  if(power.type==="Raça" && power.races?.length) return power.races.join(", ");
  if(power.type==="Origem" && power.origins?.length) return power.origins.join(", ");
  if(power.type==="Concedido" && power.deities?.length) return power.deities.join(", ");
  return "";
}
function powerOptionGroup(power){
  if(power.type==="Geral") return `${power.subtype||"Geral"} • ${power.source||"Fonte não informada"}`;
  if(power.type==="Raça" && power.subtype) return `${power.source||"Fonte não informada"} • ${power.subtype}`;
  return power.source||"Fonte não informada";
}
function renderPowerCatalogOptions(powers){
  const groups=powers.reduce((acc,power,index)=>{
    const source=powerOptionGroup(power);
    (acc[source]??=[]).push({power,index});
    return acc;
  },{});
  return Object.entries(groups).map(([source,items])=>
    `<optgroup label="${escapeHtml(source)}">${items.map(({power,index})=>{
      const meta=powerOptionMeta(power);
      return `<option value="${index}">${escapeHtml(power.name)}${meta?` — ${escapeHtml(meta)}`:""}</option>`;
    }).join("")}</optgroup>`
  ).join("");
}
function addPowerEntry(power={}){
  state.powers.push({
    name:power.name||"Novo poder",
    type:power.type||"Classe",
    cost:power.cost||"",
    action:power.action||"",
    source:power.source||"",
    desc:power.desc||"",
    attributeIncrease:ATTR_KEYS.includes(power.attributeIncrease)?power.attributeIncrease:"",
    attributeIncreasePower:isAttributeIncreasePower(power)
  });
  expandedPowerCards.add(state.powers.length-1);
  renderPowers();
  save(false);
}
function closePowerPicker(){
  $("#powerPicker")?.classList.add("hidden");
}
function updatePowerPicker(){
  const picker=$("#powerPicker"), select=$("#classPowerSelect");
  if(!picker||!select) return;
  const subtypeWrap=$("#powerCatalogSubtypeWrap");
  if(subtypeWrap) subtypeWrap.hidden=currentPowerPickerType()!=="Geral";
  const powers=currentPowerPickerPowers();
  $("#powerPickerMeta").textContent=powerPickerMetaText(powers);
  select.innerHTML=powers.length
    ? renderPowerCatalogOptions(powers)
    : '<option value="">Nenhum poder catalogado</option>';
  select.disabled=!powers.length;
  $("#addSelectedPower").disabled=!powers.length;
}
function openPowerPicker(){
  const picker=$("#powerPicker"), select=$("#classPowerSelect");
  if(!picker||!select){addPowerEntry();return}
  updatePowerPicker();
  picker.classList.remove("hidden");
}
function refreshPowerPickerIfOpen(){
  const picker=$("#powerPicker");
  if(picker && !picker.classList.contains("hidden")) updatePowerPicker();
}
function addSelectedCatalogPower(){
  const selected=currentPowerPickerPowers()[Number(value("classPowerSelect"))];
  if(selected) addPowerEntry(selected);
  closePowerPicker();
}
function escapeHtml(text){
  return String(text??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
}
function compactInlineText(text){
  return String(text||"").replace(/\r\n/g,"\n").replace(/\u00ad\s*/g,"").replace(/\s*-\s*\n\s*/g,"").replace(/\s*\n\s*/g," ").replace(/[ \t]+/g," ").trim();
}
function cleanSpellDetail(text){
  return compactInlineText(text).replace(/^[;:\s]+/,"").replace(/[.;\s]+$/,"");
}
function stripSpellDescriptionLeaks(desc){
  const text=String(desc||"").replace(/\r\n/g,"\n");
  const leakPatterns=[
    /\n\s*[A-ZÁÉÍÓÚÂÊÔÃÕÇ][^\n]{1,90}\n(?:\s*[^\n]{1,90}\n){0,2}\s*(?:Arcana|Divina|Universal)\s+[1-5]\s*\(/,
    /\n\s*(?:Magia|Jogando|Recompensas)\s*\n+\s*\d+\s*\n+\s*CAP[IÍ]TULO/i,
    /\n\s*(?:CAP[IÍ]TULO|Capítulo|Arsenal dos Heróis|Novos Itens Mágicos|Armas Específicas|Armaduras\s*&\s*Escudos|Tabela\s+\d)/i
  ];
  let cut=text.length;
  for(const pattern of leakPatterns){
    const match=pattern.exec(text);
    if(match && match.index>80) cut=Math.min(cut,match.index);
  }
  return text.slice(0,cut).replace(/\n+\s*\d{1,3}\s*$/,"");
}
function applySpellHeader(spell, header){
  const text=compactInlineText(header);
  if(!text) return;
  const labels=[
    "Alvo\\/Área\\/Efeito",
    "Alvo(?:s| ou Área)?",
    "Área(?: de Efeito)?(?: ou Alvo)?",
    "Efeito",
    "Duração",
    "Resistência",
    "Alcance",
    "Execução"
  ].join("|");
  const firstLabel=text.search(new RegExp(`(?:^|[.;]\\s*)(?:${labels}):`,"i"));
  if(firstLabel>0){
    const target=cleanSpellDetail(text.slice(0,firstLabel));
    if(target) spell.target=target;
  }else if(firstLabel<0){
    const target=cleanSpellDetail(text);
    if(target) spell.target=target;
  }
  const re=new RegExp(`(?:^|[.;]\\s*)(${labels}):\\s*([\\s\\S]*?)(?=[.;]\\s*(?:${labels}):|$)`,"gi");
  let match;
  while((match=re.exec(text))){
    const label=match[1].toLowerCase(), value=cleanSpellDetail(match[2]);
    if(!value) continue;
    if(label.includes("duração")) spell.duration=value;
    else if(label.includes("resistência")) spell.resistance=value;
    else if(label.includes("alcance")) spell.range=value;
    else if(label.includes("execução")) spell.execution=value;
    else spell.target=value;
  }
}
function normalizeSpellDetailFields(spell){
  const fieldLabels={execution:"Execução",range:"Alcance",target:"Alvo/Área/Efeito",duration:"Duração",resistance:"Resistência"};
  for(const key of Object.keys(fieldLabels)) applySpellHeader(spell,`${fieldLabels[key]}: ${spell[key]||""}`);
  return spell;
}
function moveLeakedDetailTextToDescription(spell){
  for(const key of ["execution","range","target","duration","resistance"]){
    const value=String(spell[key]||"");
    const match=value.match(/^(.{1,120}?\.)\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ].{20,})$/s);
    if(!match) continue;
    spell[key]=cleanSpellDetail(match[1]);
    spell.desc=[match[2],spell.desc].filter(Boolean).join("\n");
  }
}
function completeSplitResistance(spell){
  if(!spell.resistance || !spell.desc) return;
  const match=String(spell.desc).match(/^\s*((?:anula|parcial|reduz(?:\s+à\s+metade)?(?:\s+parcial)?|veja texto)[^.]*\.)\s*/i);
  if(!match) return;
  spell.resistance=cleanSpellDetail(`${spell.resistance} ${match[1]}`);
  spell.desc=String(spell.desc).slice(match[0].length).trim();
}
function readSpellHeaderPrefix(desc, needsContinuation){
  const text=String(desc||"").replace(/\r\n/g,"\n");
  if(!text.trim()) return ["",text];
  const firstBlank=text.search(/\n\s*\n/);
  const chunk=text.slice(0,firstBlank>=0?firstBlank:Math.min(text.length,300));
  const compact=compactInlineText(chunk);
  const fullCompact=compactInlineText(text);
  const hasLabel=/^(?:Alvo\/Área\/Efeito|Alvo(?:s| ou Área)?|Área(?: de Efeito)?(?: ou Alvo)?|Efeito|Duração|Resistência|Alcance|Execução):/i.test(compact);
  const hasUnlabeledTarget=/^[^.\n]+;\s*(?:Duração|Resistência):/i.test(compact);
  if(firstBlank>=0 && (hasLabel||hasUnlabeledTarget||needsContinuation)) return [text.slice(0,firstBlank),text.slice(firstBlank).replace(/^\n+/,"")];
  if(hasLabel||hasUnlabeledTarget||needsContinuation){
    const compactResistance=fullCompact.match(/^([\s\S]{0,260}?Resistência:[^.]+\.)\s*([\s\S]*)$/i);
    if(compactResistance) return [compactResistance[1],compactResistance[2]];
    const compactDuration=fullCompact.match(/^([\s\S]{0,220}?Duração:[^.]+\.)\s*([\s\S]*)$/i);
    if(compactDuration) return [compactDuration[1],compactDuration[2]];
    const resistance=text.match(/^[\s\S]{0,260}?Resistência:[^\n.]+\. */i);
    if(resistance) return [resistance[0],text.slice(resistance[0].length).replace(/^\n+/,"")];
    const duration=text.match(/^[\s\S]{0,220}?Duração:[^\n.]+\. */i);
    if(duration) return [duration[0],text.slice(duration[0].length).replace(/^\n+/,"")];
    if(needsContinuation){
      const sentence=text.match(/^\s*[^.\n]+\. */);
      if(sentence) return [sentence[0],text.slice(sentence[0].length).replace(/^\n+/,"")];
    }
  }
  return ["",text];
}
function normalizeSpellForDisplay(spell){
  const result={...spell};
  let desc=String(result.desc||"").replace(/\r\n/g,"\n");
  if(/^veja$/i.test(result.range||"") && /^\s*texto\b/i.test(desc)){
    result.range="veja texto";
    desc=desc.replace(/^\s*texto;\s*/i,"");
  }
  const targetText=String(result.target||"");
  const needsContinuation=/(?:Duração|Resistência|Alvo(?:s)?|Área(?: de Efeito)?|Efeito):\s*$/i.test(targetText);
  const [prefix,rest]=readSpellHeaderPrefix(desc,needsContinuation);
  applySpellHeader(result,[targetText,prefix].filter(Boolean).join(" "));
  normalizeSpellDetailFields(result);
  result.desc=rest.trim();
  completeSplitResistance(result);
  moveLeakedDetailTextToDescription(result);
  result.desc=stripSpellDescriptionLeaks(result.desc).trim();
  return result;
}
function splitSpellDescriptionParagraphs(desc){
  const text=String(desc||"").replace(/\r\n/g,"\n").trim();
  if(!text) return [];
  return text.split(/\n\s*\n/).flatMap(paragraph=>{
    const line=compactInlineText(paragraph)
      .replace(/\s+(?=(?:Truque|Custo adicional|Componente Material|\+\d+\s*PM(?:\s*\([^)]*\))?):)/g,"\n");
    return line.split("\n").map(part=>part.trim()).filter(Boolean);
  });
}
function renderSpellDescription(desc){
  const paragraphs=splitSpellDescriptionParagraphs(desc);
  if(!paragraphs.length) return '<p class="muted">A descrição completa desta magia ainda não está cadastrada na base local.</p>';
  return paragraphs.map(line=>{
    const cls=/^(?:Truque|Custo adicional|Componente Material|\+\d+\s*PM)/.test(line)?" class=\"spellEnhancement\"":"";
    return `<p${cls}>${escapeHtml(line)}</p>`;
  }).join("");
}
function addSpellToGrimoire(spell){
  const normalized=normalizeSpellForDisplay(spell);
  if(state.spells.some(s=>String(s.name).toLowerCase()===String(normalized.name).toLowerCase())){
    notify(`A magia <b>${normalized.name}</b> já está no Grimório.`);
    return;
  }
  state.spells.push({
    name:normalized.name,
    school:normalized.school||"",
    circle:normalized.circle||1,
    cost:normalized.cost||1,
    execution:normalized.execution||"",
    range:normalized.range||"",
    target:normalized.target||"",
    duration:normalized.duration||"",
    resistance:normalized.resistance||"",
    desc:normalized.desc||"",
    type:normalized.type||"",
    publication:normalized.publication||"Grimório T20"
  });
  renderSpells();
  save(false);
  notify(`Magia <b>${normalized.name}</b> adicionada ao Grimório.`);
}
function openSpellModal(index){
  const rawSpell=(window.T20_SPELL_CATALOG||[])[Number(index)];
  if(!rawSpell) return;
  const spell=normalizeSpellForDisplay(rawSpell);
  window.__selectedCatalogSpell=spell;
  $("#spellModalCircle").textContent=`${spell.circle}º`;
  $("#spellModalTitle").textContent=spell.name;
  $("#spellModalMeta").textContent=[spell.type,spell.school,spell.publication].filter(Boolean).join(" • ") || "Magia de Tormenta20";
  const details=[
    spell.execution && ["Execução",spell.execution],
    spell.range && ["Alcance",spell.range],
    spell.target && ["Alvo/Área/Efeito",spell.target],
    spell.duration && ["Duração",spell.duration],
    spell.resistance && ["Resistência",spell.resistance],
    ["Custo-base",`${spell.cost} PM`]
  ].filter(Boolean);
  $("#spellModalDetails").innerHTML=details.map(([label,val])=>`<div><small>${escapeHtml(label)}</small><strong>${escapeHtml(val)}</strong></div>`).join("");
  $("#spellModalDescription").innerHTML=renderSpellDescription(spell.desc);
  $("#spellModal").classList.remove("hidden");
  document.body.classList.add("modalOpen");
}
function closeSpellModal(){
  $("#spellModal").classList.add("hidden");
  document.body.classList.remove("modalOpen");
}
function renderSpellCatalog(){
  const search=(value("spellSearchCatalog")||"").trim().toLowerCase();
  const circle=value("spellCircleFilter");
  const type=value("spellTypeFilter");
  const school=value("spellSchoolFilter");
  const filtered=(window.T20_SPELL_CATALOG||[]).filter(spell=>{
    const matchesSearch=!search || spell.name.toLowerCase().includes(search);
    const matchesCircle=!circle || String(spell.circle)===String(circle);
    const matchesType=!type || spell.type===type || (spell.type==="Universal"&&(type==="Arcana"||type==="Divina"));
    const matchesSchool=!school || spell.school===school;
    return matchesSearch && matchesCircle && matchesType && matchesSchool;
  });
  $("#spellCatalogCount").textContent=filtered.length;
  const byCircle={1:[],2:[],3:[],4:[],5:[]};
  filtered.forEach(spell=>byCircle[spell.circle].push(spell));
  $("#spellCatalogList").innerHTML=[1,2,3,4,5].map(circle=>{
    const list=byCircle[circle];
    if(!list.length) return "";
    return `<div class="spellCircleGroup"><div class="circleHeader"><h3>${circle}º círculo</h3><span>${list[0].cost} PM</span></div><div class="spellCatalogGrid">${list.map(spell=>{
      const idx=(window.T20_SPELL_CATALOG||[]).findIndex(s=>s.name===spell.name && s.circle===spell.circle);
      const summary=[spell.type,spell.school].filter(Boolean).join(" • ");
      return `<div class="spellCatalogCard"><div><h4>${spell.name}</h4><div class="spellMetaLine">${circle}º círculo • ${spell.cost} PM${summary?` • ${summary}`:""}</div></div><div class="spellCatalogActions"><button class="viewSpell" data-viewcatalogspell="${idx}">Ver descrição</button><button data-addcatalogspell="${idx}">Adicionar</button></div></div>`;
    }).join("")}</div></div>`;
  }).join("") || '<p class="muted">Nenhuma magia encontrada com esses filtros.</p>';
  $$("[data-viewcatalogspell]").forEach(btn=>btn.onclick=()=>openSpellModal(btn.dataset.viewcatalogspell));
  $$("[data-addcatalogspell]").forEach(btn=>btn.onclick=()=>{
    const spell=(window.T20_SPELL_CATALOG||[])[Number(btn.dataset.addcatalogspell)];
    if(spell) addSpellToGrimoire(spell);
  });
}
function renderSpellsLegacy(){
  const sorted=state.spells.map((spell,index)=>({spell,index})).sort((a,b)=>(Number(a.spell.circle||1)-Number(b.spell.circle||1)) || String(a.spell.name||'').localeCompare(String(b.spell.name||''),'pt-BR'));
  const groups={1:[],2:[],3:[],4:[],5:[]};
  sorted.forEach(item=>{
    const circle=Math.max(1,Math.min(5,Number(item.spell.circle||1)));
    groups[circle].push(item);
  });
  $('#spellsList').innerHTML=[1,2,3,4,5].map(circle=>{
    const list=groups[circle];
    if(!list.length) return '';
    return `<div class="grimoireGroup"><div class="grimoireDivider">${circle}º círculo</div>${list.map(({spell:s,index:i})=>`<div class="card"><div class="cardHead"><input data-s="${i}" data-k="name" value="${s.name||''}" placeholder="Nome da magia"><input data-s="${i}" data-k="school" value="${s.school||''}" placeholder="Escola"><button type="button" class="remove deleteIconButton" data-sdel="${i}" title="Excluir magia" aria-label="Excluir magia">${DELETE_ICON_HTML}</button></div><div class="spellMeta"><input data-s="${i}" data-k="circle" type="number" min="1" max="5" value="${s.circle||1}" title="Círculo"><input data-s="${i}" data-k="cost" type="number" min="0" value="${s.cost||1}" title="PM"><input data-s="${i}" data-k="execution" value="${s.execution||''}" placeholder="Execução"><input data-s="${i}" data-k="range" value="${s.range||''}" placeholder="Alcance/alvo"><input data-s="${i}" data-k="resistance" value="${s.resistance||''}" placeholder="Resistência"></div><textarea data-s="${i}" data-k="desc" rows="4" placeholder="Descrição e aprimoramentos">${s.desc||''}</textarea><div class="smallActions"><button class="cast" data-cast="${i}">Conjurar (−${partnerSpellCost(s)} PM)</button></div></div>`).join('')}</div>`;
  }).join('') || '<p class="muted">Nenhuma magia no Grimório ainda. Vá até a aba Magias para adicionar.</p>';
  bindCollection('s',state.spells,renderSpells);
  $$('[data-sdel]').forEach(e=>e.onclick=()=>{state.spells.splice(+e.dataset.sdel,1);renderSpells();save(false)});
  $$('[data-cast]').forEach(e=>e.onclick=()=>{const spell=state.spells[+e.dataset.cast],cost=partnerSpellCost(spell);applyResourceDelta("pmAtual","pmBonus",-cost,false);recalc();save(false);notify(`${spell.name||'Magia'} conjurada: −${cost} PM`)});
}
function cartomanteClassEntry(){return currentClassLevels().find(entry=>entry.id==="cartomante")||null}
function cartomanteLevel(){return cartomanteClassEntry()?.level||0}
function cartomanteHandLimit(){
  const level=totalClassLevel();
  return level<=4?4:level<=10?5:level<=16?6:7;
}
function cartomanteCardMaxHp(){
  const stored=Number($("#pvMaxView")?.dataset?.max||0);
  return Math.max(1,Math.floor(stored/4));
}
function cartomanteSpellKey(spell){return `spell:${spell.id}`}
function cartomanteSpellExecution(spell){
  const execution=String(spell?.execution||"").trim();
  if(!cartomanteClassEntry()||/livre|reaç|reac/i.test(execution)) return execution;
  return "movimento (Cartomante)";
}
function cartomanteSpecialIds(){
  const level=cartomanteLevel(),cart=state.cartomante;
  const result=[];
  if(level>=7&&window.T20_CARTOMANTE_CARDS?.[cart.rareChoice]) result.push(cart.rareChoice);
  if(level>=10&&window.T20_CARTOMANTE_CARDS?.[cart.epicChoice]&&!result.includes(cart.epicChoice)) result.push(cart.epicChoice);
  return result;
}
function cartomanteExodiaEntries(){
  if(cartomanteLevel()<20) return [];
  return [
    ["cabeca","Cabeça"],["braco_direito","Braço Direito"],["braco_esquerdo","Braço Esquerdo"],
    ["perna_direita","Perna Direita"],["perna_esquerda","Perna Esquerda"]
  ].map(([id,name])=>({key:`exodia:${id}`,type:"exodia",id,name:`Exodia: ${name}`,cost:5,rarity:"Mítica",summary:"Parte do Aspecto divino; permanece no pentagrama após ser jogada."}));
}
function cartomanteDeckEntries(){
  const spells=state.spells.map((spell,index)=>({
    key:cartomanteSpellKey(spell),type:"spell",index,name:spell.name||"Magia sem nome",
    cost:partnerSpellCost(spell),rarity:`${spell.circle||1}º círculo`,summary:[spell.type,spell.school,cartomanteSpellExecution(spell)].filter(Boolean).join(" • ")
  }));
  const specials=cartomanteSpecialIds().map(id=>{
    const card=window.T20_CARTOMANTE_CARDS[id];
    return {key:`special:${id}`,type:"special",...card};
  });
  return [...spells,...specials,...cartomanteExodiaEntries()];
}
function cartomanteEntryByKey(key){return cartomanteDeckEntries().find(entry=>entry.key===key)||null}
function pruneCartomanteHand(){
  const valid=new Set(cartomanteDeckEntries().map(entry=>entry.key));
  state.cartomante.hand=state.cartomante.hand.filter(key=>valid.has(key)&&!state.cartomante.exodiaParts.includes(key));
}
function drawCartomanteCards(amount){
  const cart=state.cartomante;
  if(!cart.materialized){notify("Materialize o baralho antes de comprar cartas.");return 0}
  pruneCartomanteHand();
  let drawn=0;
  for(let count=0;count<amount;count++){
    const blocked=new Set([...cart.hand,...cart.exodiaParts]);
    const available=cartomanteDeckEntries().filter(entry=>!blocked.has(entry.key));
    if(!available.length) break;
    const card=available[Math.floor(Math.random()*available.length)];
    cart.hand.push(card.key);drawn++;
  }
  return drawn;
}
function removeCartomantePartner(){
  state.partners=state.partners.filter(partner=>partner.source!=="Carta Especial: Parceiro Arcano");
}
function materializeCartomanteDeck(){
  const cart=state.cartomante;
  applyResourceDelta("pmAtual","pmBonus",-1,false);
  cart.materialized=true;cart.hand=[];cart.cardHp=cartomanteCardMaxHp();cart.mulliganUsed=false;
  cart.exodiaParts=[];cart.exodiaSummoned=false;
  const drawn=drawCartomanteCards(cartomanteHandLimit());
  recalc();renderSpells();save(false);
  notify(`Baralho materializado: ${drawn} carta${drawn===1?"":"s"} na mão.`);
}
function endCartomanteScene(){
  const cart=state.cartomante;
  cart.materialized=false;cart.hand=[];cart.cardHp=0;cart.mulliganUsed=false;cart.exodiaParts=[];cart.exodiaSummoned=false;
  removeCartomantePartner();renderPartners();renderSpells();recalc();save(false);notify("Cena encerrada; as cartas retornaram ao baralho.");
}
function destroyCartomanteCards(){
  const cart=state.cartomante;
  cart.materialized=false;cart.hand=[];cart.cardHp=0;
  state.conditions.Atordoado={active:true};
  renderConditions();renderConditionMini();renderSpells();recalc();save(false);
  notify("As cartas foram destruídas. Você fica atordoado por uma rodada e deve materializá-las novamente.");
}
function cartomanteMulligan(){
  const cart=state.cartomante;
  if(cartomanteLevel()<3||!cart.materialized||cart.mulliganUsed) return;
  cart.hand=[];cart.mulliganUsed=true;
  const drawn=drawCartomanteCards(cartomanteHandLimit());
  renderSpells();save(false);notify(`Mulligan realizado: ${drawn} nova${drawn===1?" carta":"s cartas"}.`);
}
function cartomantePmMaximum(){
  const value=Number($("#pmMaxView")?.textContent||0);
  return Number.isFinite(value)?Math.max(0,value):0;
}
function summonCartomantePartner(){
  const cart=state.cartomante,level=cartomanteLevel();
  const rank=level>=18?"Mestre":level>=12?"Veterano":"Iniciante";
  removeCartomantePartner();
  state.partners.push(defaultPartner({type:cart.partnerType,rank,name:`Parceiro Arcano (${PARTNER_CATALOG[cart.partnerType]?.name||"Parceiro"})`,source:"Carta Especial: Parceiro Arcano"}));
  renderPartners();
}
function resolveCartomanteCard(entry,{skipCost=false,fromHand=true}={}){
  if(!entry) return;
  const cart=state.cartomante;
  if(fromHand){
    const index=cart.hand.indexOf(entry.key);
    if(index<0){notify("Essa carta não está em sua mão.");return}
    cart.hand.splice(index,1);
  }
  if(!skipCost) applyResourceDelta("pmAtual","pmBonus",-Number(entry.cost||0),false);
  if(entry.type==="spell"){
    const spell=state.spells[entry.index];
    notify(`${spell?.name||entry.name} conjurada: ${skipCost?"custo-base ignorado pelo Tutor Arcano":`-${entry.cost} PM`}.`);
  }else if(entry.type==="exodia"){
    if(!cart.exodiaParts.includes(entry.key)) cart.exodiaParts.push(entry.key);
    cart.exodiaSummoned=cart.exodiaParts.length===5;
    notify(cart.exodiaSummoned?`Exodia completo: o Aspecto de ${cart.deity||"sua divindade"} se manifesta.`:`${entry.name} foi colocada no pentagrama.`);
  }else{
    switch(entry.id){
      case "parceiro_arcano": summonCartomantePartner();notify("Parceiro Arcano invocado até o fim da cena.");break;
      case "clone": notify(`Clone preparado${cart.cloneAbility?`: ${cart.cloneAbility}`:""}. A habilidade pode ser usada até o fim do próximo turno.`);break;
      case "super_trunfo": notify("Super Trunfo: o teste escolhido é um sucesso automático.");break;
      case "chamado_ancestral": {const count=drawCartomanteCards(3);notify(`Chamado Ancestral: ${count} carta${count===1?" comprada":"s compradas"}.`);break}
      case "lotus_negra": {
        const recovered=Array.from({length:3},()=>1+Math.floor(Math.random()*8)).reduce((sum,die)=>sum+die,0);
        setNumberField("pmAtual",Math.min(cartomantePmMaximum(),num("pmAtual")+recovered));
        notify(`Lótus Negra recuperou ${recovered} PM.`);break;
      }
    }
  }
  recalc();renderSpells();save(false);
}
function castGrimoireSpell(index){
  const spell=state.spells[index];
  if(!spell) return;
  if(cartomanteClassEntry()){
    if(!state.cartomante.materialized){notify("Materialize o baralho para lançar suas cartas.");return}
    const entry=cartomanteEntryByKey(cartomanteSpellKey(spell));
    if(!entry||!state.cartomante.hand.includes(entry.key)){notify("Essa magia está no baralho, não em sua mão.");return}
    resolveCartomanteCard(entry);return;
  }
  const cost=partnerSpellCost(spell);
  applyResourceDelta("pmAtual","pmBonus",-cost,false);recalc();save(false);notify(`${spell.name||"Magia"} conjurada: -${cost} PM`);
}
function cartomanteJogatinaBonus(){
  const button=$('[data-skroll="Jogatina"]');
  if(button) return Number(button.dataset.bonus||0);
  const data=state.skillData.Jogatina||{trained:true,adjust:0,attr:"CAR"};
  return halfLevel()+attrNum(data.attr||"CAR")+(data.trained?trainingBonus():0)+Number(data.adjust||0)+num("globalTestBonus")+num("skillGlobalBonus");
}
function useTutorArcano(){
  const cart=state.cartomante;
  if(cartomanteLevel()<16||!cart.materialized){notify("Materialize o baralho antes de usar Tutor Arcano.");return}
  const entry=cartomanteEntryByKey(cart.tutorCard);
  if(!entry||cart.hand.includes(entry.key)||cart.exodiaParts.includes(entry.key)){notify("Escolha uma carta que esteja no baralho.");return}
  const extra=Math.max(0,Number(cart.tutorExtraPm||0)),cost=15+extra;
  applyResourceDelta("pmAtual","pmBonus",-cost,false);
  const die=1+Math.floor(Math.random()*20),bonus=cartomanteJogatinaBonus(),total=die+bonus,dc=20+cartomanteLevel();
  if(total>=dc){
    resolveCartomanteCard(entry,{skipCost:true,fromHand:false});
    notify(`Tutor Arcano: ${die} ${bonus>=0?"+":""}${bonus} = ${total} contra CD ${dc}. ${entry.name} foi lançada.`);
  }else{
    state.conditions.Confuso={active:true};renderConditions();renderConditionMini();recalc();renderSpells();save(false);
    notify(`Tutor Arcano falhou: ${die} ${bonus>=0?"+":""}${bonus} = ${total} contra CD ${dc}. Você fica confuso até o fim do próximo turno.`);
  }
}
function cartomanteDivineSpellOptions(circle,selected){
  const spells=(window.T20_SPELL_CATALOG||[]).filter(spell=>Number(spell.circle)===Number(circle)&&["Divina","Universal"].includes(spell.type));
  return `<option value="">Escolha...</option>${spells.map(spell=>`<option value="${escapeHtml(spell.name)}" ${spell.name===selected?"selected":""}>${escapeHtml(spell.name)} (${escapeHtml(spell.type)})</option>`).join("")}`;
}
function setCartomanteDivineSpell(circle,name){
  const cart=state.cartomante,marker=Number(circle);
  state.spells=state.spells.filter(spell=>Number(spell.cartomanteDivineCircle)!==marker);
  cart.divineSpells[circle]=name;
  if(name&&!state.spells.some(spell=>spell.name===name)){
    const source=(window.T20_SPELL_CATALOG||[]).find(spell=>spell.name===name&&Number(spell.circle)===marker);
    if(source) state.spells.push({...normalizeSpellForDisplay(source),id:makeEntryId("spell"),cartomanteDivineCircle:marker});
  }
  expandedSpellCards.clear();renderSpells();save(false);
}
function setCartomanteGrantedPower(name){
  state.cartomante.grantedPower=name;
  state.powers=state.powers.filter(power=>power.cartomanteGrantedPower!==true);
  const power=powerCatalogEntries().find(entry=>entry.type==="Concedido"&&entry.name===name);
  if(power) state.powers.push({name:power.name,type:"Concedido",cost:power.cost||"",action:power.action||"",source:`Destino Traçado • ${power.source||"Poder concedido"}`,desc:power.desc||"",cartomanteGrantedPower:true});
  renderPowers();recalc();save(false);
}
function renderCartomantePanel(){
  const panel=$("#cartomantePanel");
  if(!panel) return;
  const classEntry=cartomanteClassEntry();
  panel.classList.toggle("hidden",!classEntry);
  if(!classEntry){panel.innerHTML="";return}
  const level=cartomanteLevel(),cart=state.cartomante;
  if(cart.materialized) cart.cardHp=Math.min(cart.cardHp,cartomanteCardMaxHp());
  pruneCartomanteHand();
  const entries=cartomanteDeckEntries(),handEntries=cart.hand.map(cartomanteEntryByKey).filter(Boolean);
  const staged=new Set(cart.exodiaParts),deckCount=entries.filter(entry=>!cart.hand.includes(entry.key)&&!staged.has(entry.key)).length;
  const limit=cartomanteHandLimit(),overLimit=cart.hand.length>limit;
  const rareOptions=["parceiro_arcano","clone","super_trunfo"].map(id=>`<option value="${id}" ${cart.rareChoice===id?"selected":""}>${escapeHtml(window.T20_CARTOMANTE_CARDS[id].name)}</option>`).join("");
  const epicIds=["chamado_ancestral","lotus_negra",...(["parceiro_arcano","clone","super_trunfo"].filter(id=>id!==cart.rareChoice))];
  const epicOptions=epicIds.map(id=>`<option value="${id}" ${cart.epicChoice===id?"selected":""}>${escapeHtml(window.T20_CARTOMANTE_CARDS[id].name)} (${escapeHtml(window.T20_CARTOMANTE_CARDS[id].rarity)})</option>`).join("");
  const deityOptions=(window.T20_CARTOMANTE_DEITIES||[]).map(name=>`<option ${cart.deity===name?"selected":""}>${escapeHtml(name)}</option>`).join("");
  const granted=cart.deity?powerCatalogEntries().filter(power=>power.type==="Concedido"&&(power.deities||[]).includes(cart.deity)).sort((a,b)=>a.name.localeCompare(b.name,"pt-BR")):[];
  const partnerOptions=Object.entries(PARTNER_CATALOG).map(([id,entry])=>`<option value="${id}" ${cart.partnerType===id?"selected":""}>${escapeHtml(entry.name)}</option>`).join("");
  const tutorOptions=entries.filter(entry=>!cart.hand.includes(entry.key)&&!staged.has(entry.key)).map(entry=>`<option value="${entry.key}" ${cart.tutorCard===entry.key?"selected":""}>${escapeHtml(entry.name)}</option>`).join("");
  panel.innerHTML=`
    <div class="cartomanteHeader"><div><span class="eyebrow">Caminho do Cartomante</span><h3>Baralho Arcano</h3><p>As magias só podem ser lançadas quando suas cartas estiverem na mão.</p></div><span class="cartomanteStatus ${cart.materialized?"active":""}">${cart.materialized?"Materializado":"Desmaterializado"}</span></div>
    <div class="cartomanteStats">
      <div><small>Baralho</small><strong>${deckCount}</strong></div><div class="${overLimit?"danger":""}"><small>Mão</small><strong>${cart.hand.length}/${limit}</strong></div>
      <div><small>Cartas</small><strong>RD 5</strong></div><label><span>PV das cartas <small>máx. ${cartomanteCardMaxHp()}</small></span><input id="cartomanteCardHp" type="number" min="0" max="${cartomanteCardMaxHp()}" value="${cart.cardHp}"></label>
    </div>
    <div class="cartomanteActions">
      <button type="button" id="cartomanteMaterialize">${cart.materialized?"Rematerializar (-1 PM)":"Materializar (-1 PM)"}</button>
      <button type="button" id="cartomanteDraw" ${!cart.materialized||overLimit?"disabled":""}>Início do turno: comprar 1</button>
      ${level>=3?`<button type="button" id="cartomanteMulligan" ${!cart.materialized||cart.mulliganUsed?"disabled":""}>Mulligan</button>`:""}
      <button type="button" id="cartomanteDestroy" class="dangerButton" ${!cart.materialized?"disabled":""}>Cartas destruídas</button>
      <button type="button" id="cartomanteEndScene" ${!cart.materialized?"disabled":""}>Encerrar cena</button>
    </div>
    ${overLimit?`<p class="cartomanteWarning">Sua mão excedeu o limite. Devolva ${cart.hand.length-limit} carta${cart.hand.length-limit===1?"":"s"} ao baralho.</p>`:""}
    <div class="cartomanteHand"><div class="cartomanteSubhead"><h4>Mão</h4><span>${handEntries.length?"Jogue ou devolva uma carta":"Nenhuma carta na mão"}</span></div><div class="cartomanteHandGrid">${handEntries.map(entry=>`<article class="cartomanteCard ${entry.type}"><div><small>${escapeHtml(entry.rarity||"")} • ${entry.cost} PM</small><strong>${escapeHtml(entry.name)}</strong><p>${escapeHtml(entry.summary||"")}</p>${entry.desc?`<details><summary>Regras da carta</summary><p>${escapeHtml(entry.desc)}</p></details>`:""}</div><div><button type="button" data-cart-play="${entry.key}" ${overLimit?"disabled":""}>${entry.type==="spell"?"Conjurar":"Jogar"}</button><button type="button" data-cart-return="${entry.key}">Devolver</button></div></article>`).join("")}</div></div>
    <details class="cartomanteSetup" ${level>=7&&!cart.rareChoice?"open":""}><summary>Configuração e habilidades do caminho</summary><div class="cartomanteSetupGrid">
      ${level>=7?`<label>Carta Especial Rara<select id="cartomanteRare"><option value="">Escolha...</option>${rareOptions}</select></label>`:""}
      ${level>=10?`<label>Carta Especial Épica<select id="cartomanteEpic"><option value="">Escolha...</option>${epicOptions}</select></label>`:""}
      ${level>=7&&[cart.rareChoice,cart.epicChoice].includes("parceiro_arcano")?`<label>Tipo do Parceiro Arcano<select id="cartomantePartnerType">${partnerOptions}</select></label>`:""}
      ${level>=7&&[cart.rareChoice,cart.epicChoice].includes("clone")?`<label>Habilidade copiada por Clone<input id="cartomanteCloneAbility" value="${escapeHtml(cart.cloneAbility)}" placeholder="Nome da habilidade"></label>`:""}
      ${level>=15?`<label>Deus de Destino Traçado<select id="cartomanteDeity"><option value="">Escolha...</option>${deityOptions}</select></label><label>Poder concedido<select id="cartomanteGranted"><option value="">Escolha...</option>${granted.map(power=>`<option ${cart.grantedPower===power.name?"selected":""}>${escapeHtml(power.name)}</option>`).join("")}</select></label>`:""}
      ${level>=15?[1,2,3,4,...(level>=20?[5]:[])].map(circle=>`<label>Magia divina de ${circle}º círculo<select data-cart-divine="${circle}">${cartomanteDivineSpellOptions(circle,cart.divineSpells[circle])}</select></label>`).join(""):""}
    </div></details>
    ${level>=16?`<div class="cartomanteTutor"><div><h4>Tutor Arcano</h4><p>Teste de Jogatina contra CD ${20+level}; o custo é 15 PM mais aprimoramentos.</p></div><select id="cartomanteTutorCard"><option value="">Carta no baralho...</option>${tutorOptions}</select><label>PM de aprimoramentos<input id="cartomanteTutorExtra" type="number" min="0" value="${cart.tutorExtraPm}"></label><button type="button" id="cartomanteTutorUse">Buscar e lançar</button></div>`:""}
    ${level>=20?`<div class="cartomanteExodia"><div><h4>Exodia</h4><p>${cart.exodiaSummoned?`Aspecto de ${escapeHtml(cart.deity||"sua divindade")} manifestado.`:`${cart.exodiaParts.length}/5 partes no pentagrama.`}</p></div><label>Controle<select id="cartomanteExodiaMode"><option value="partner" ${cart.exodiaMode==="partner"?"selected":""}>Criatura parceira</option><option value="direct" ${cart.exodiaMode==="direct"?"selected":""}>Controle direto</option></select></label><label class="cartomanteExodiaNotes">Aspecto escolhido ou ficha personalizada<textarea id="cartomanteExodiaNotes" rows="2" placeholder="Nome, ND e referência do Aspecto...">${escapeHtml(cart.exodiaNotes)}</textarea></label></div>`:""}`;
  $("#cartomanteMaterialize").onclick=materializeCartomanteDeck;
  $("#cartomanteDraw").onclick=()=>{const count=drawCartomanteCards(1);renderSpells();save(false);notify(count?"Uma carta foi comprada.":"Não há cartas disponíveis no baralho.")};
  $("#cartomanteMulligan")?.addEventListener("click",cartomanteMulligan);
  $("#cartomanteDestroy").onclick=destroyCartomanteCards;$("#cartomanteEndScene").onclick=endCartomanteScene;
  $("#cartomanteCardHp").onchange=event=>{cart.cardHp=Math.max(0,Math.min(cartomanteCardMaxHp(),Number(event.target.value||0)));if(cart.cardHp===0&&cart.materialized)destroyCartomanteCards();else save(false)};
  $$('[data-cart-play]').forEach(button=>button.onclick=()=>resolveCartomanteCard(cartomanteEntryByKey(button.dataset.cartPlay)));
  $$('[data-cart-return]').forEach(button=>button.onclick=()=>{cart.hand=cart.hand.filter(key=>key!==button.dataset.cartReturn);renderSpells();save(false)});
  $("#cartomanteRare")?.addEventListener("change",event=>{cart.rareChoice=event.target.value;if(cart.epicChoice===cart.rareChoice)cart.epicChoice="";pruneCartomanteHand();renderSpells();save(false)});
  $("#cartomanteEpic")?.addEventListener("change",event=>{cart.epicChoice=event.target.value;pruneCartomanteHand();renderSpells();save(false)});
  $("#cartomantePartnerType")?.addEventListener("change",event=>{cart.partnerType=event.target.value;save(false)});
  $("#cartomanteCloneAbility")?.addEventListener("input",event=>{cart.cloneAbility=event.target.value;save(false)});
  $("#cartomanteDeity")?.addEventListener("change",event=>{cart.deity=event.target.value;cart.grantedPower="";setCartomanteGrantedPower("");renderSpells();save(false)});
  $("#cartomanteGranted")?.addEventListener("change",event=>setCartomanteGrantedPower(event.target.value));
  $$('[data-cart-divine]').forEach(select=>select.onchange=()=>setCartomanteDivineSpell(Number(select.dataset.cartDivine),select.value));
  $("#cartomanteTutorCard")?.addEventListener("change",event=>{cart.tutorCard=event.target.value;save(false)});
  $("#cartomanteTutorExtra")?.addEventListener("input",event=>{cart.tutorExtraPm=Math.max(0,Number(event.target.value||0));save(false)});
  $("#cartomanteTutorUse")?.addEventListener("click",useTutorArcano);
  $("#cartomanteExodiaMode")?.addEventListener("change",event=>{cart.exodiaMode=event.target.value;save(false)});
  $("#cartomanteExodiaNotes")?.addEventListener("input",event=>{cart.exodiaNotes=event.target.value;save(false)});
}
function renderGrimoireSpellCard(s,i){
  const isOpen=expandedSpellCards.has(i);
  const circle=Math.max(1,Math.min(5,Number(s.circle||1)));
  const cost=Number(s.cost||1),castCost=partnerSpellCost(s);
  const costSummary=castCost===cost?`${cost} PM`:`${castCost} PM com parceiro`;
  const summary=[`${circle}º círculo`,costSummary,s.type,s.school,cartomanteSpellExecution(s)].filter(Boolean).map(escapeHtml).join(" &bull; ");
  return `<div class="card grimoireSpellCard ${isOpen?"expanded":""}">
    <button type="button" class="grimoireSpellToggle" data-spelltoggle="${i}" aria-expanded="${isOpen}">
      <span class="grimoireSpellTitle"><strong>${escapeHtml(s.name||"Magia sem nome")}</strong><small>${summary||"Sem detalhes"}</small></span>
      <span class="grimoireSpellCue">${isOpen?"Recolher":"Expandir"}</span>
    </button>
    <div class="grimoireSpellBody ${isOpen?"":"hidden"}">
      ${cartomanteClassEntry()?`<p class="cartomanteSpellRule">Carta do baralho: execução efetiva ${escapeHtml(cartomanteSpellExecution(s)||"conforme a magia")}; exige as duas mãos livres.</p>`:""}
      <div class="grimoireMainFields">
        <label>Nome<input data-s="${i}" data-k="name" value="${escapeHtml(s.name||"")}" placeholder="Nome da magia"></label>
        <label>Escola<input data-s="${i}" data-k="school" value="${escapeHtml(s.school||"")}" placeholder="Escola"></label>
        <label>Tipo<input data-s="${i}" data-k="type" value="${escapeHtml(s.type||"")}" placeholder="Arcana, Divina..."></label>
        <label>Fonte<input data-s="${i}" data-k="publication" value="${escapeHtml(s.publication||"")}" placeholder="Publicacao"></label>
      </div>
      <div class="grimoireSpellFields">
        <label>Círculo<input data-s="${i}" data-k="circle" type="number" min="1" max="5" value="${circle}"></label>
        <label>PM<input data-s="${i}" data-k="cost" type="number" min="0" value="${cost}"></label>
        <label>Execução<input data-s="${i}" data-k="execution" value="${escapeHtml(s.execution||"")}" placeholder="padrão"></label>
        <label>Alcance<input data-s="${i}" data-k="range" value="${escapeHtml(s.range||"")}" placeholder="curto, toque..."></label>
        <label>Alvo/Área/Efeito<input data-s="${i}" data-k="target" value="${escapeHtml(s.target||"")}" placeholder="1 criatura, area..."></label>
        <label>Duração<input data-s="${i}" data-k="duration" value="${escapeHtml(s.duration||"")}" placeholder="cena"></label>
        <label>Resistência<input data-s="${i}" data-k="resistance" value="${escapeHtml(s.resistance||"")}" placeholder="Vontade anula"></label>
      </div>
      <label>Descrição e aprimoramentos<textarea data-s="${i}" data-k="desc" rows="7" placeholder="Descricao e aprimoramentos">${escapeHtml(s.desc||"")}</textarea></label>
      <div class="smallActions grimoireSpellActions"><button type="button" class="cast" data-cast="${i}">${cartomanteClassEntry()?(state.cartomante.hand.includes(cartomanteSpellKey(s))?`Jogar carta (-${castCost} PM)`:"Carta no baralho"):`Conjurar (-${castCost} PM)`}</button><button type="button" class="remove iconRemove deleteIconButton" data-sdel="${i}" aria-label="Excluir magia ${escapeHtml(s.name||"")}" title="Excluir">${DELETE_ICON_HTML}</button></div>
    </div>
  </div>`;
}
function renderSpells(){
  renderCartomantePanel();
  const sorted=state.spells.map((spell,index)=>({spell,index})).sort((a,b)=>(Number(a.spell.circle||1)-Number(b.spell.circle||1)) || String(a.spell.name||'').localeCompare(String(b.spell.name||''),'pt-BR'));
  const groups={1:[],2:[],3:[],4:[],5:[]};
  sorted.forEach(item=>{
    const circle=Math.max(1,Math.min(5,Number(item.spell.circle||1)));
    groups[circle].push(item);
  });
  $('#spellsList').innerHTML=[1,2,3,4,5].map(circle=>{
    const list=groups[circle];
    if(!list.length) return '';
    return `<div class="grimoireGroup"><div class="grimoireDivider">${circle}º círculo</div><div class="grimoireSpellGrid">${list.map(({spell:s,index:i})=>renderGrimoireSpellCard(s,i)).join('')}</div></div>`;
  }).join('') || '<p class="muted">Nenhuma magia no Grimorio ainda. Va ate a aba Magias para adicionar.</p>';
  $$('[data-spelltoggle]').forEach(e=>e.onclick=()=>{const idx=+e.dataset.spelltoggle;if(expandedSpellCards.has(idx))expandedSpellCards.delete(idx);else expandedSpellCards.add(idx);renderSpells()});
  bindCollection('s',state.spells,renderSpells);
  $$('[data-sdel]').forEach(e=>e.onclick=()=>{const idx=+e.dataset.sdel;state.spells.splice(idx,1);expandedSpellCards=new Set([...expandedSpellCards].filter(openIdx=>openIdx!==idx).map(openIdx=>openIdx>idx?openIdx-1:openIdx));renderSpells();save(false)});
  $$('[data-cast]').forEach(e=>e.onclick=()=>castGrimoireSpell(+e.dataset.cast));
}
function itemCustomizationOptions(entries,selected,type){
  const selectedSet=new Set(selected||[]);
  const available=entries.filter(entry=>entry.types.includes(type)&&!selectedSet.has(entry.id));
  return '<option value="">Escolha...</option>'+available.map(entry=>`<option value="${entry.id}" title="${escapeHtml(entry.description)}">${escapeHtml(entry.name)}</option>`).join("");
}
function itemMaterialOptions(item,type){
  return itemCustomizationData().materials.filter(entry=>entry.types.includes(type)).map(entry=>`<option value="${entry.id}" ${entry.id===item.material?"selected":""}>${escapeHtml(entry.name)}</option>`).join("");
}
function itemCustomizationChips(item,kind,index){
  const entries=kind==="improvement"?itemCustomizationData().improvements:itemCustomizationData().enchantments;
  const ids=kind==="improvement"?item.improvements:item.enchantments;
  return (ids||[]).map(id=>{
    const entry=entries.find(option=>option.id===id);
    return entry?`<span class="itemModChip" title="${escapeHtml(entry.description)}">${escapeHtml(entry.name)}<button type="button" data-removeitemmod="${kind}" data-itemindex="${index}" data-modid="${id}" aria-label="Remover ${escapeHtml(entry.name)}">&times;</button></span>`:"";
  }).join("");
}
function linkedAttackOptions(selected=""){
  return `<option value="" ${selected?"":"selected"}>Nenhum ataque</option>${state.attacks.map(attack=>`<option value="${escapeHtml(attack.id)}" ${attack.id===selected?"selected":""}>${escapeHtml(attack.name||"Ataque sem nome")}</option>`).join("")}`;
}
function inventorySkillOptions(selected=""){
  return `<option value="" ${selected?"":"selected"}>Nenhuma</option>${Object.keys(T20_DATA.pericias||{}).sort((a,b)=>a.localeCompare(b,"pt-BR")).map(skill=>`<option value="${escapeHtml(skill)}" ${skill===selected?"selected":""}>${escapeHtml(skill)}</option>`).join("")}`;
}
function manualItemEffectFields(item,i){
  const manual=normalizedManualItemEffects(item.manualEffects);
  const attrs=ATTR_KEYS.map(attr=>`<label>${attr}<input data-itemmanual="${i}" data-effectattr="${attr}" type="number" value="${manual.attrs[attr]||0}"></label>`).join("");
  const numeric=[["defense","Defesa"],["rd","RD"],["resistance","Resistências"],["spellCd","CD de magia"],["pmLimit","Limite de PM"],["pvMax","PV máx."],["pmMax","PM máx."],["load","Carga"]]
    .map(([key,label])=>`<label>${label}<input data-itemmanual="${i}" data-effectkey="${key}" type="number" value="${manual[key]||0}"></label>`).join("");
  return `<details class="itemManualEffects"><summary>Ajustes automáticos manuais</summary><div class="itemManualEffectGrid">${attrs}${numeric}<label>Perícia<select data-itemmanual="${i}" data-effectkey="skill">${inventorySkillOptions(manual.skill)}</select></label><label>Bônus da perícia<input data-itemmanual="${i}" data-effectkey="skillBonus" type="number" value="${manual.skillBonus||0}"></label></div><small>Use para efeitos permanentes enquanto o item estiver equipado. Efeitos condicionais podem continuar nas notas.</small></details>`;
}
function renderItemCard(it,i){
  const isOpen=expandedItemCards.has(i);
  const rawQty=Number(it.qty??1),rawSpaces=Number(it.spaces||0);
  const qty=Number.isFinite(rawQty)?rawQty:0,spaces=Number.isFinite(rawSpaces)?rawSpaces:0,effectiveSpaces=itemEffectiveSpaces(it),totalSpaces=qty*effectiveSpaces;
  const description=itemDescription(it);
  const type=inventoryItemType(it),data=itemCustomizationData(),protection=baseProtectionStats(it);
  const foldedCategory=foldItemText(it.category),ambiguousProtection=foldedCategory.includes("armadura")&&foldedCategory.includes("escudo");
  const effectLabels=itemAutomaticEffectLabels(it);
  const improvementCount=(it.improvements||[]).length,enchantmentCount=itemEnchantmentSlots(it),superiorCount=itemSuperiorSlots(it),priceDetails=itemPriceDetails(it);
  const materialName=it.material?data.materials.find(entry=>entry.id===it.material)?.name:"";
  const summary=[
    qty?`${qty}x`:null,
    it.category,
    priceDetails.display,
    it.source,
    effectiveSpaces?`${totalSpaces.toFixed(totalSpaces%1?1:0)} espaços`:null,
    improvementCount?`${improvementCount} melhoria${improvementCount===1?"":"s"}`:null,
    materialName,
    enchantmentCount?`${enchantmentCount} encanto${enchantmentCount===1?"":"s"}`:null,
    it.equipped?"Equipado":null
  ].filter(Boolean).map(escapeHtml).join(" &bull; ");
  return `<div class="card itemAccordionCard ${isOpen?"expanded":""} ${it.equipped?"equipped":""}">
    <div class="accordionCardHeader">
      <button type="button" class="itemAccordionToggle" data-itemtoggle="${i}" aria-expanded="${isOpen}">
        <span class="itemAccordionTitle"><strong>${escapeHtml(it.name||"Item sem nome")}</strong><small>${summary||"Sem detalhes"}</small></span>
        <span class="itemAccordionCue">${isOpen?"Recolher":"Expandir"}</span>
      </button>
      ${accordionDragHandle("item",i)}
    </div>
    <div class="itemAccordionBody ${isOpen?"":"hidden"}">
      <div class="itemMainFields">
        <label>Item<input data-i="${i}" data-k="name" value="${escapeHtml(it.name||"")}"></label>
        <label>Categoria<input data-i="${i}" data-k="category" value="${escapeHtml(it.category||"")}"></label>
        <button type="button" class="remove deleteIconButton" data-idel="${i}" title="Excluir item" aria-label="Excluir item">${DELETE_ICON_HTML}</button>
      </div>
      <div class="itemDetailFields">
        <label>Qtd.<input data-i="${i}" data-k="qty" type="number" min="0" value="${qty}"></label>
        <label>Espaços<input data-i="${i}" data-k="spaces" type="number" step=".5" value="${spaces}"></label>
        <label>Preço base/listado<input data-i="${i}" data-k="price" value="${escapeHtml(it.price||"")}"></label>
        <label>Preço automático<span class="itemPriceToggle"><span>${priceDetails.automatic?"Sim":"Não"}</span><input data-i="${i}" data-k="priceAuto" type="checkbox" ${it.priceAuto!==false?"checked":""} ${priceDetails.registered===null?"disabled":""}></span></label>
        <label>Fonte<input data-i="${i}" data-k="source" value="${escapeHtml(it.source||"")}"></label>
        <label>Equipado<select data-i="${i}" data-k="equipped"><option value="false" ${!it.equipped?"selected":""}>Não</option><option value="true" ${it.equipped?"selected":""}>Sim</option></select></label>
      </div>
      ${itemPriceBreakdownHtml(it)}
      ${type==="armor"||type==="shield"?`<div class="itemProtectionFields">
        <label>Defesa base<input data-i="${i}" data-k="baseDefense" type="number" min="0" value="${protection.defense}"></label>
        <label>Penalidade base<input data-i="${i}" data-k="baseArmorPenalty" type="number" min="0" value="${protection.armorPenalty}"></label>
        <div class="itemProtectionStatus"><small>Aplicação</small><strong>${it.equipped?(type==="shield"?"Escudo equipado":"Armadura equipada"):"Item não equipado"}</strong></div>
      </div>`:""}
      <section class="itemCustomization">
        <div class="itemCustomizationTitle"><div><strong>Modificações</strong><small>Ativas apenas quando o item estiver equipado</small></div><span class="${superiorCount>4||enchantmentCount>3?"limitExceeded":""}">${superiorCount}/4 melhorias &bull; ${enchantmentCount}/3 encantos</span></div>
        <div class="itemCustomizationControls">
          ${itemMaterialOptions(it,type)?`<label>Material<select data-i="${i}" data-k="material">${itemMaterialOptions(it,type)}</select></label>`:""}
          ${ambiguousProtection?`<label>Aplicar como<select data-i="${i}" data-k="customizationType"><option value="" ${it.customizationType?"":"selected"}>Automático</option><option value="armor" ${it.customizationType==="armor"?"selected":""}>Armadura</option><option value="shield" ${it.customizationType==="shield"?"selected":""}>Escudo</option></select></label>`:""}
          ${data.improvements.some(entry=>entry.types.includes(type))?`<label>Adicionar melhoria<span class="itemAddControl"><select id="item-improvement-${i}">${itemCustomizationOptions(data.improvements,it.improvements,type)}</select><button type="button" data-additemmod="improvement" data-itemindex="${i}" aria-label="Adicionar melhoria">+</button></span></label>`:""}
          ${data.enchantments.some(entry=>entry.types.includes(type))?`<label>Adicionar encanto<span class="itemAddControl"><select id="item-enchantment-${i}">${itemCustomizationOptions(data.enchantments,it.enchantments,type)}</select><button type="button" data-additemmod="enchantment" data-itemindex="${i}" aria-label="Adicionar encanto">+</button></span></label>`:""}
          ${type==="weapon"?`<label>Ataque associado<select data-i="${i}" data-k="linkedAttackId">${linkedAttackOptions(it.linkedAttackId)}</select></label>`:""}
          ${(it.improvements||[]).includes("aprimorado")?`<label>Perícia aprimorada<select data-i="${i}" data-k="chosenSkill">${inventorySkillOptions(it.chosenSkill)}</select></label>`:""}
        </div>
        ${improvementCount||enchantmentCount?`<div class="itemModChips">${itemCustomizationChips(it,"improvement",i)}${itemCustomizationChips(it,"enchantment",i)}</div>`:""}
        <div class="itemAutomaticEffects ${effectLabels.length?"":"empty"}">${effectLabels.length?effectLabels.map(label=>`<span>${escapeHtml(label)}</span>`).join(""):"Nenhum efeito numérico automático"}</div>
        ${manualItemEffectFields(it,i)}
      </section>
      <label>Descri&ccedil;&atilde;o e efeitos condicionais<textarea data-i="${i}" data-k="notes" rows="5" placeholder="Descrição, condições de uso e efeitos especiais">${escapeHtml(description)}</textarea></label>
    </div>
  </div>`;
}
function renderItems(){
  $("#itemsList").innerHTML=state.items.map((it,i)=>renderItemCard(it,i)).join("") || '<p class="muted">Nenhum item registrado ainda.</p>';
  $$("[data-itemtoggle]").forEach(e=>e.onclick=()=>{const idx=+e.dataset.itemtoggle;if(expandedItemCards.has(idx))expandedItemCards.delete(idx);else expandedItemCards.add(idx);renderItems()});
  bindAccordionReorder({
    kind:"item",collection:state.items,cardSelector:".itemAccordionCard",
    getExpanded:()=>expandedItemCards,setExpanded:value=>{expandedItemCards=value},
    render:renderItems,commit:refreshInventoryEffects
  });
  bindCollection("i",state.items,renderItems);
  $$("[data-additemmod]").forEach(button=>button.onclick=()=>{
    const index=Number(button.dataset.itemindex),kind=button.dataset.additemmod,select=$(`#item-${kind}-${index}`),id=select?.value;
    if(!id) return;
    const key=kind==="improvement"?"improvements":"enchantments";
    const prerequisites={pungente:"certeira",atroz:"cruel","sob-medida":"ajustada",energetica:"formidavel",magnifica:"formidavel",lancinante:"dilacerante",guardiao:"defensor"};
    const additions=[prerequisites[id],id].filter(Boolean),current=state.items[index][key]||[];
    const next=[...new Set([...current,...additions])],limit=kind==="improvement"?4-(state.items[index].material?1:0):3;
    if(next.length>limit){notify(`Limite de ${kind==="improvement"?"4 melhorias (incluindo material especial)":"3 encantos"} atingido.`);return}
    state.items[index][key]=next;
    refreshInventoryEffects();
  });
  $$("[data-removeitemmod]").forEach(button=>button.onclick=()=>{
    const index=Number(button.dataset.itemindex),key=button.dataset.removeitemmod==="improvement"?"improvements":"enchantments";
    state.items[index][key]=(state.items[index][key]||[]).filter(id=>id!==button.dataset.modid);
    refreshInventoryEffects();
  });
  $$("[data-itemmanual]").forEach(control=>control.onchange=()=>{
    const item=state.items[Number(control.dataset.itemmanual)];
    item.manualEffects=normalizedManualItemEffects(item.manualEffects);
    const fieldValue=control.type==="number"?Number(control.value||0):control.value;
    if(control.dataset.effectattr) item.manualEffects.attrs[control.dataset.effectattr]=fieldValue;
    else item.manualEffects[control.dataset.effectkey]=fieldValue;
    refreshInventoryEffects();
  });
  $$("[data-idel]").forEach(e=>e.onclick=()=>{const idx=+e.dataset.idel;state.items.splice(idx,1);expandedItemCards=new Set([...expandedItemCards].filter(openIdx=>openIdx!==idx).map(openIdx=>openIdx>idx?openIdx-1:openIdx));refreshInventoryEffects()});
}
function refreshInventoryEffects(){renderItems();renderInventorySummary();recalc();renderAttacks();save(false)}
function baseLoadLimitForStrength(strength){
  strength=Number(strength)||0;
  return Math.max(0,10+(strength>=0?strength*2:strength));
}
function baseLoadLimitFromStrength(){return baseLoadLimitForStrength(permanentAttrNum("FOR"))}
function renderInventorySummary(){
  const used=state.items.reduce((sum,it)=>sum+Number(it.qty||0)*itemEffectiveSpaces(it),0);
  const auto=$("#spacesLimitAuto")?.checked!==false;
  const calculatedLimit=baseLoadLimitFromStrength()+Number(equippedItemEffects().load||0);
  if(auto&&$("#spacesLimit")) $("#spacesLimit").value=calculatedLimit;
  const limit=Math.max(0,num("spacesLimit"));
  const absoluteMax=limit*2;
  const overloaded=used>limit;
  const impossible=used>absoluteMax;
  $("#spacesUsed").textContent=used.toFixed(used%1?1:0)+(overloaded?" ⚠":"");
  if($("#spacesMax")) $("#spacesMax").textContent=absoluteMax.toFixed(absoluteMax%1?1:0);
  const hint=$("#loadRuleHint"),text=$("#loadRuleText");
  if(text) text.textContent=auto
    ? "Automático pela FOR atual: "+calculatedLimit+" espaços."
    : "Limite manual: "+limit+" espaços. O máximo permanece o dobro desse valor.";
  if(hint){
    hint.classList.toggle("overloaded",overloaded&&!impossible);
    hint.classList.toggle("impossible",impossible);
  }
}
let itemPickerMode="mundane";
function itemPickerIsMagic(){return itemPickerMode==="magic"}
function itemCatalogEntries(){
  const base=itemPickerIsMagic()?window.T20_MAGIC_ITEM_CATALOG:window.T20_ITEM_CATALOG;
  const extra=itemPickerIsMagic()?window.T20_EXPANSION_MAGIC_ITEM_CATALOG:window.T20_EXPANSION_ITEM_CATALOG;
  return [
    ...(Array.isArray(base)?base:[]),
    ...(Array.isArray(extra)?extra:[])
  ];
}
function itemPickerTitleText(){
  return itemPickerIsMagic()?"Adicionar item mágico":"Adicionar item";
}
function itemPickerSourceText(){
  return itemPickerIsMagic()?"itens mágicos disponíveis":"itens disponíveis";
}
function itemSpaceText(spaces){
  const value=Number(spaces||0);
  if(!Number.isFinite(value)||!value) return "sem espaço";
  return `${value.toFixed(value%1?1:0)} espaço${value===1?"":"s"}`;
}
function itemDescription(item){
  return String(item?.description??item?.desc??item?.notes??"").trim();
}
function itemAllowsCatalogDescription(item){
  return !!String(item?.name||"").trim() && !!String(item?.category||"").trim();
}
function catalogInventoryItem(item){
  if(!itemAllowsCatalogDescription(item)) return "";
  const name=String(item?.name||"").trim().toLowerCase();
  const category=String(item?.category||"").trim().toLowerCase();
  if(!name||!category) return "";
  const source=String(item?.source||"").trim().toLowerCase();
  return allInventoryCatalogEntries().find(entry=>
    String(entry.name||"").trim().toLowerCase()===name &&
    String(entry.category||"").trim().toLowerCase()===category &&
    (!source||String(entry.source||"").trim().toLowerCase()===source)
  );
}
function catalogInventoryDescription(item){
  return itemDescription(catalogInventoryItem(item));
}
function normalizeInventoryItemDescription(item){
  const normalized={...(item||{})};
  const catalogDescription=catalogInventoryDescription(normalized);
  const current=itemDescription(normalized);
  if(catalogDescription&&(!current || catalogDescription.startsWith(`${current}\n\n`))){
    normalized.notes=catalogDescription;
  }
  const inferred=inferItemCustomizations(normalized);
  normalized.id=String(normalized.id||"").trim()||makeEntryId("item");
  normalized.improvements=Array.isArray(normalized.improvements)?normalized.improvements:inferred.improvements;
  normalized.enchantments=Array.isArray(normalized.enchantments)?normalized.enchantments:inferred.enchantments;
  normalized.material=typeof normalized.material==="string"?normalized.material:inferred.material;
  repairLegacyCatalogCustomization(normalized);
  normalized.customizationType=String(normalized.customizationType||"");
  normalized.chosenSkill=String(normalized.chosenSkill||"");
  normalized.linkedAttackId=String(normalized.linkedAttackId||"");
  normalized.priceAuto=normalized.priceAuto!==false;
  normalized.manualEffects=normalizedManualItemEffects(normalized.manualEffects);
  const inferredProtection=inferredProtectionBase(normalized);
  normalized.baseDefense=Number.isFinite(Number(normalized.baseDefense))?Math.max(0,Number(normalized.baseDefense)):inferredProtection.defense;
  normalized.baseArmorPenalty=Number.isFinite(Number(normalized.baseArmorPenalty))?Math.max(0,Math.abs(Number(normalized.baseArmorPenalty))):inferredProtection.armorPenalty;
  return normalized;
}
function fillItemCatalogCategories(){
  const select=$("#itemCatalogCategory");
  if(!select) return;
  const previous=select.value;
  const categories=[...new Set(itemCatalogEntries().map(item=>item.category).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b,"pt-BR"));
  select.innerHTML='<option value="">Todas</option>'+categories.map(category=>`<option>${escapeHtml(category)}</option>`).join("");
  if(categories.includes(previous)) select.value=previous;
}
function currentItemCatalog(){
  const search=(value("itemCatalogSearch")||"").trim().toLowerCase();
  const category=value("itemCatalogCategory");
  return itemCatalogEntries().filter(item=>{
    const haystack=[item.name,item.category,item.price,item.source,itemDescription(item)].filter(Boolean).join(" ").toLowerCase();
    return (!category||item.category===category) && (!search||haystack.includes(search));
  }).sort((a,b)=>a.category.localeCompare(b.category,"pt-BR")||a.name.localeCompare(b.name,"pt-BR"));
}
function renderItemCatalogOptions(items){
  if(!items.length) return '<option value="">Nenhum item encontrado</option>';
  let html="",currentCategory="";
  items.forEach((item,index)=>{
    const category=item.category||"Outros";
    if(category!==currentCategory){
      if(currentCategory) html+="</optgroup>";
      currentCategory=category;
      html+=`<optgroup label="${escapeHtml(currentCategory)}">`;
    }
    const details=[item.price,itemSpaceText(item.spaces),item.source].filter(Boolean).join(" - ");
    html+=`<option value="${index}">${escapeHtml(item.name)}${details?` (${escapeHtml(details)})`:""}</option>`;
  });
  return html+"</optgroup>";
}
function updateItemPicker(){
  const picker=$("#itemPicker"),select=$("#itemCatalogSelect");
  if(!picker||!select) return;
  fillItemCatalogCategories();
  const items=currentItemCatalog();
  window.__filteredItemCatalog=items;
  select.innerHTML=renderItemCatalogOptions(items);
  select.disabled=!items.length;
  $("#addSelectedItem").disabled=!items.length;
  $("#itemPickerTitle").textContent=itemPickerTitleText();
  $("#itemPickerMeta").textContent=items.length
    ? `${items.length} de ${itemCatalogEntries().length} ${itemPickerSourceText()}.`
    : "Nenhum item encontrado; você ainda pode adicionar manualmente.";
}
function openItemPicker(mode="mundane"){
  itemPickerMode=mode;
  const picker=$("#itemPicker");
  if(!picker){addItemEntry();return}
  const search=$("#itemCatalogSearch"),category=$("#itemCatalogCategory");
  if(search) search.value="";
  if(category) category.value="";
  updateItemPicker();
  picker.classList.remove("hidden");
  $("#itemCatalogSearch")?.focus();
}
function openMagicItemPicker(){openItemPicker("magic")}
function closeItemPicker(){
  $("#itemPicker")?.classList.add("hidden");
}
function addItemEntry(item={}){
  const qty=Number(item.qty??1),spaces=Number(item.spaces??0);
  state.items.push(normalizeInventoryItemDescription({
    ...item,
    id:item.id||makeEntryId("item"),
    name:item.name||"Novo item",
    qty:Number.isFinite(qty)?qty:1,
    spaces:Number.isFinite(spaces)?spaces:0,
    category:item.category||"",
    price:item.price||"",
    equipped:!!item.equipped,
    notes:itemDescription(item),
    source:item.source||""
  }));
  expandedItemCards.add(state.items.length-1);
  renderItems();
  renderInventorySummary();
  save(false);
}
function addSelectedCatalogItem(){
  const select=$("#itemCatalogSelect");
  const items=window.__filteredItemCatalog||currentItemCatalog();
  const selected=items[Number(select?.value)];
  if(selected){
    addItemEntry(selected);
    closeItemPicker();
  }
}
function attackSkillOptions(selected){
  return ["Manual","Luta","Pontaria"].map(skill=>`<option value="${skill}" ${skill===selected?"selected":""}>${skill}</option>`).join("");
}
function attackAttributeOptions(selected,skillName){
  const defaultAttr=skillName==="Manual"?"":(T20_DATA.pericias[skillName]||"FOR");
  const defaultLabel=defaultAttr?`Padr&atilde;o (${defaultAttr})`:"Escolha uma per&iacute;cia";
  return `<option value="" ${selected?"":"selected"}>${defaultLabel}</option>${ATTR_KEYS.map(attr=>`<option value="${attr}" ${attr===selected?"selected":""}>${attr}</option>`).join("")}`;
}
function damageAttributeOptions(selected){
  return `<option value="" ${selected?"":"selected"}>Nenhum</option>${ATTR_KEYS.map(attr=>`<option value="${attr}" ${attr===selected?"selected":""}>${attr}</option>`).join("")}`;
}
function attackLinkedItemOptions(attack){
  const linked=linkedAttackItems(attack),selected=linked[0]?.id||"";
  const weapons=(state.items||[]).filter(item=>inventoryItemType(item)==="weapon");
  return `<option value="" ${selected?"":"selected"}>Nenhuma</option>${weapons.map(item=>`<option value="${escapeHtml(item.id)}" ${item.id===selected?"selected":""}>${escapeHtml(item.name||"Arma sem nome")}${item.equipped?"":" (não equipada)"}</option>`).join("")}`;
}
function attackDiceModeText(attack){
  const balance=(Number(attack.bestDice)||0)-(Number(attack.worstDice)||0);
  if(balance>0) return `${balance+1}d20, melhor`;
  if(balance<0) return `${Math.abs(balance)+1}d20, pior`;
  return "1d20";
}
function refreshAttackSummaries(){
  state.attacks.forEach((attack,index)=>{
    const root=$(`[data-attacksummary="${index}"]`);
    if(!root) return;
    const normalized=normalizeAttack(attack);
    const breakdown=attackBonusBreakdown(normalized);
    const itemFx=breakdown.itemFx||emptyItemEffects();
    const damageAttr=ATTR_KEYS.includes(normalized.damageAttr)?normalized.damageAttr:"";
    const extra=[String(normalized.extraDamage||""),...(itemFx.extraDamage||[]),damageAttr?`${damageAttr} (${signedNumber(permanentAttrNum(damageAttr))})`:"",itemFx.damage?`item ${signedNumber(itemFx.damage)}`:""].filter(Boolean).join(" + ")||"-";
    const parsed=parseCritical(normalized.crit,normalized.mult),margin=21-parsed.threshold;
    const itemMargin=Number(itemFx.critRange||0)+(itemFx.doubleThreat?margin:0);
    const linkedItems=linkedAttackItems(normalized),linkedNames=linkedItems.map(item=>item.name||"Arma sem nome").join(", ");
    const set=(selector,text)=>{const element=root.querySelector(selector);if(element) element.textContent=text};
    set(".js-attack-source",`${breakdown.skillName==="Manual"?"Manual":`${breakdown.skillName} / ${breakdown.attr}`}${linkedNames?` • ${linkedNames}`:""}`);
    set(".js-attack-bonus",signedNumber(breakdown.total));
    set(".js-attack-damage",normalized.damage||"sem dano");
    set(".js-attack-extra",extra);
    set(".js-attack-crit",`${Math.max(2,parsed.threshold-itemMargin)}/x${parsed.multiplier+Number(itemFx.critMultiplier||0)}`);
    set(".js-attack-dice",attackDiceModeText(normalized));
  });
}
function renderAttackCard(a,i){
  a=normalizeAttack(a);
  state.attacks[i]=a;
  const isOpen=expandedAttackCards.has(i);
  const name=escapeHtml(a.name||"Ataque sem nome");
  const bonus=Number(a.bonus||0);
  const attackBreakdown=attackBonusBreakdown(a);
  const itemFx=attackBreakdown.itemFx||emptyItemEffects();
  const bonusText=signedNumber(attackBreakdown.total);
  const damage=escapeHtml(a.damage||"sem dano");
  const extraDamage=escapeHtml(a.extraDamage||"");
  const damageAttr=ATTR_KEYS.includes(a.damageAttr)?a.damageAttr:"";
  const extraSummary=[String(a.extraDamage||""),...(itemFx.extraDamage||[]),damageAttr?`${damageAttr} (${signedNumber(permanentAttrNum(damageAttr))})`:"",itemFx.damage?`item ${signedNumber(itemFx.damage)}`:""].filter(Boolean).join(" + ")||"-";
  const critFlat=a.critFlat===true;
  const parsedCrit=parseCritical(a.crit,a.mult),baseMargin=21-parsedCrit.threshold;
  const itemCritMargin=Number(itemFx.critRange||0)+(itemFx.doubleThreat?baseMargin:0);
  const effectiveCrit=escapeHtml(String(Math.max(2,parsedCrit.threshold-itemCritMargin)));
  const effectiveMult=escapeHtml(`x${parsedCrit.multiplier+Number(itemFx.critMultiplier||0)}`);
  const crit=escapeHtml(a.crit||"20"),mult=escapeHtml(a.mult||"x2");
  const attackSkill=attackSkillName(a);
  const attackAttr=ATTR_KEYS.includes(a.attackAttr)?a.attackAttr:"";
  const skillSummary=attackSkill==="Manual"?"Manual":`${attackSkill} / ${attackBreakdown.attr}`;
  const bestDice=Number(a.bestDice)>0;
  const worstDice=Number(a.worstDice)>0;
  const damageType=escapeHtml(a.damageType||"");
  const range=escapeHtml(a.range||"");
  const notes=escapeHtml(a.notes||"");
  const linkedItems=linkedAttackItems(a),linkedNames=linkedItems.map(item=>item.name||"Arma sem nome").join(", ");
  const linkedSummary=linkedItems.length?linkedItems.map(item=>attackLinkedItemSummary(item)).join(" • "):"Nenhuma arma associada";
  const toggleLabel=isOpen?"Recolher detalhes do ataque":"Expandir detalhes do ataque";
  return `<div class="card combatAttackCard ${isOpen?"expanded":""}">
    <div class="combatAttackHeader">
      <button type="button" class="attackDamageRoll" data-combatroll="${i}" aria-label="Rolar ataque e dano" title="Rolar ataque e dano"><img src="attack-roll-icon.png" alt="" draggable="false"></button>
      <button type="button" class="combatAttackToggle" data-attacktoggle="${i}" aria-expanded="${isOpen}" aria-label="${toggleLabel}" title="${toggleLabel}">
        <span class="combatAttackOverview" data-attacksummary="${i}">
          <span class="combatAttackTitle"><strong>${name}</strong><small class="js-attack-source">${skillSummary}${linkedNames?` &bull; ${escapeHtml(linkedNames)}`:""}</small></span>
          <span class="combatAttackStat"><small>Ataque</small><strong class="js-attack-bonus">${bonusText}</strong></span>
          <span class="combatAttackStat"><small>Dano base</small><strong class="js-attack-damage">${damage}</strong></span>
          <span class="combatAttackStat"><small>Dano extra</small><strong class="js-attack-extra">${escapeHtml(extraSummary)}</strong></span>
          <span class="combatAttackStat"><small>Cr&iacute;tico</small><strong class="js-attack-crit">${effectiveCrit}/${effectiveMult}</strong></span>
          <span class="combatAttackStat combatDiceStat"><small>Dados</small><strong class="js-attack-dice">${attackDiceModeText(a)}</strong></span>
          <span class="combatAttackChevron" aria-hidden="true">${isOpen?"&#9650;":"&#9660;"}</span>
        </span>
      </button>
    </div>
    <div class="combatAttackBody ${isOpen?"":"hidden"}">
      <div class="attackFields">
        <label>Nome<input data-a="${i}" data-k="name" value="${name}"></label>
        <label>Per&iacute;cia do ataque<select data-a="${i}" data-k="attackSkill">${attackSkillOptions(attackSkill)}</select></label>
        <label>Atributo do ataque<select data-a="${i}" data-k="attackAttr" ${attackSkill==="Manual"?"disabled":""}>${attackAttributeOptions(attackAttr,attackSkill)}</select></label>
        <label>B&ocirc;nus de ataque<input data-a="${i}" data-k="bonus" type="number" value="${bonus}"></label>
        <label>Dano base (crítico)<input data-a="${i}" data-k="damage" value="${damage}" placeholder="Ex.: 2d6 ou 1d8+1d6"></label>
        <label>Dano extra<input data-a="${i}" data-k="extraDamage" value="${extraDamage}" placeholder="Ex.: +3 ou 1d6"></label>
        <label>Crítico<input data-a="${i}" data-k="crit" value="${crit}"></label>
        <label>Mult.<input data-a="${i}" data-k="mult" value="${mult}"></label>
      </div>
      <div class="attackDetailFields">
        <label>Tipo de dano<input data-a="${i}" data-k="damageType" value="${damageType}" placeholder="Ex.: corte"></label>
        <label>Alcance<input data-a="${i}" data-k="range" value="${range}" placeholder="Ex.: corpo a corpo"></label>
        <label>Atributo no dano<select data-a="${i}" data-k="damageAttr">${damageAttributeOptions(damageAttr)}</select></label>
        <label class="attackDiceToggle">Melhor dado<span class="attackCritFlatControl"><input data-a="${i}" data-k="bestDice" type="checkbox" ${bestDice?"checked":""}><span>+1d20</span></span></label>
        <label class="attackDiceToggle">Pior dado<span class="attackCritFlatControl"><input data-a="${i}" data-k="worstDice" type="checkbox" ${worstDice?"checked":""}><span>-1d20</span></span></label>
        <label class="attackCritFlat">Bônus numérico<span class="attackCritFlatControl"><input data-a="${i}" data-k="critFlat" type="checkbox" ${critFlat?"checked":""}><span>Crita</span></span></label>
        <button type="button" class="remove combatRemove deleteIconButton" data-adel="${i}" title="Excluir ataque" aria-label="Excluir ataque">${DELETE_ICON_HTML}</button>
      </div>
      <div class="attackLinkedEquipment">
        <label>Arma associada<select data-attackitem="${i}">${attackLinkedItemOptions(a)}</select></label>
        <div class="attackLinkedSummary ${linkedItems.some(item=>!item.equipped)?"inactive":""}"><small>Efeitos do inventário</small><strong class="js-attack-itemeffects">${escapeHtml(linkedSummary)}</strong></div>
      </div>
      <label class="attackNotes">Notas<textarea data-a="${i}" data-k="notes" rows="2" placeholder="Munição, melhorias, efeitos especiais...">${notes}</textarea></label>
    </div>
  </div>`;
}
function renderAttacks(){
  expandedAttackCards=new Set([...expandedAttackCards].filter(index=>index<state.attacks.length));
  $("#attacksList").innerHTML=state.attacks.map((a,i)=>renderAttackCard(a,i)).join("") || '<p class="muted">Nenhum ataque registrado ainda.</p>';
  $$("[data-attacktoggle]").forEach(e=>e.onclick=()=>{
    const idx=+e.dataset.attacktoggle;
    if(expandedAttackCards.has(idx)) expandedAttackCards.delete(idx);
    else expandedAttackCards.add(idx);
    renderAttacks();
  });
  bindCollection("a",state.attacks,renderAttacks);
  $$('[data-attackitem]').forEach(select=>select.onchange=()=>{
    const attack=state.attacks[Number(select.dataset.attackitem)],selectedId=select.value;
    if(!attack) return;
    state.items.forEach(item=>{
      if(inventoryItemType(item)!=="weapon") return;
      if(item.linkedAttackId===attack.id) item.linkedAttackId="";
      if(item.id===selectedId) item.linkedAttackId=attack.id;
    });
    refreshInventoryEffects();
  });
  $$("[data-adel]").forEach(e=>e.onclick=()=>{
    const idx=+e.dataset.adel;
    state.attacks.splice(idx,1);
    expandedAttackCards=new Set([...expandedAttackCards].filter(openIdx=>openIdx!==idx).map(openIdx=>openIdx>idx?openIdx-1:openIdx));
    renderAttacks();
    save(false);
  });
  $$("[data-combatroll]").forEach(e=>e.onclick=()=>{
    try{
      const result=rollAttackDamage(state.attacks[+e.dataset.combatroll]);
      recordCampaignRoll(result).catch(error=>console.warn("Falha ao registrar rolagem:",error));
    }catch(err){
      alert(err.message);
    }
  });
}
function bindCollection(prefix,arr,rerender){
  $$(`[data-${prefix}]`).forEach(element=>element.onchange=()=>{
    let newValue=element.type==="checkbox"?element.checked:element.value;
    if(element.type==="number") newValue=Number(newValue||0);
    if(element.tagName==="SELECT"&&(newValue==="true"||newValue==="false")) newValue=newValue==="true";
    const entry=arr[Number(element.dataset[prefix])],key=element.dataset.k;
    if(prefix==="i"&&key==="material"&&newValue&&!entry.material&&(entry.improvements||[]).length>=4){
      notify("O material especial conta no limite de 4 melhorias.");rerender();return;
    }
    entry[key]=newValue;
    if(prefix==="p"&&isAttributeIncreasePower(entry)) entry.attributeIncreasePower=true;
    if(prefix==="i"){renderInventorySummary();recalc();renderAttacks()}
    if(prefix==="p") recalc();
    save(false);
    if(prefix==="s"||prefix==="p"||prefix==="i"||prefix==="a") rerender();
  });
}
function partnerTypeOptions(selected=""){
  const groups={};
  Object.entries(PARTNER_CATALOG).forEach(([id,entry])=>(groups[entry.group]??=[]).push([id,entry]));
  const catalog=Object.entries(groups).map(([group,items])=>`<optgroup label="${escapeHtml(group)}">${items.map(([id,entry])=>`<option value="${id}" ${id===selected?"selected":""}>${escapeHtml(entry.name)}</option>`).join("")}</optgroup>`).join("");
  return `${catalog}<option value="custom" ${selected==="custom"?"selected":""}>Personalizado</option>`;
}
function partnerRankOptions(selected="Iniciante",level=totalClassLevel()){
  const maxIndex=partnerRankIndex(partnerTierForLevel(level).rank);
  return PARTNER_RANKS.map((rank,index)=>`<option value="${rank}" ${rank===selected?"selected":""} ${index>maxIndex?"disabled":""}>${rank}${index>maxIndex?" (patamar insuficiente)":""}</option>`).join("");
}
function activeCountedPartners(){return state.partners.filter(partner=>partner.active&&partner.countsTowardLimit).length}
function updatePartnerSummary(){
  const total=totalClassLevel();
  const tier=partnerTierForLevel(total);
  const activeCount=activeCountedPartners();
  $("#partnerTier").textContent=tier.name;
  $("#partnerTierLevel").textContent=`Nível total ${total}`;
  $("#partnerActiveCount").textContent=activeCount;
  $("#partnerLimit").textContent=tier.limit;
  $("#partnerMaxRank").textContent=tier.rank;
  const notice=$("#partnerLimitNotice");
  const remaining=tier.limit-activeCount;
  notice.classList.toggle("warning",remaining<0);
  notice.classList.toggle("full",remaining===0);
  notice.innerHTML=remaining<0
    ? `<strong>Limite excedido:</strong> ${Math.abs(remaining)} parceiro${Math.abs(remaining)===1?"":"s"} ativo${Math.abs(remaining)===1?"":"s"} além do permitido.`
    : remaining===0
      ? `<strong>Limite preenchido.</strong> Parceiros especiais ainda podem ser registrados sem contar no limite.`
      : `${remaining} vaga${remaining===1?"":"s"} disponível${remaining===1?"":"is"} para parceiros ativos que contam no limite.`;
}
function partnerProgressionHtml(partner){
  const entry=partnerCatalogEntry(partner.type);
  if(!entry) return `<div class="partnerManualHint">Parceiro personalizado: use o campo de benefício para registrar suas regras.</div>`;
  const maxIndex=partnerRankIndex(partnerTierForLevel().rank);
  return `<div class="partnerProgression">${PARTNER_RANKS.map((rank,index)=>`
    <div class="partnerProgressionStep ${rank===partner.rank?"selected":""} ${index>maxIndex?"locked":""}">
      <strong>${rank}</strong><span>${escapeHtml(entry.levels[index])}</span>
    </div>`).join("")}</div>`;
}
function partnerSkillChoicesHtml(partner,index){
  const slots=partnerSkillSlots(partner);
  if(!slots) return "";
  const available=Object.keys(T20_DATA.pericias).filter(skill=>!["Luta","Pontaria"].includes(skill));
  return `<div class="partnerSkillChoiceBlock">
    <div><strong>Perícias do Ajudante</strong><span>Escolha ${slots}; Luta e Pontaria não são permitidas.</span></div>
    <div class="partnerSkillChoices">${Array.from({length:slots},(_,slot)=>{
      const selected=partner.skills?.[slot]||"";
      return `<label>Perícia ${slot+1}<select data-partner-skill="${index}" data-slot="${slot}"><option value="">Escolher...</option>${available.map(skill=>`<option value="${escapeHtml(skill)}" ${skill===selected?"selected":""}>${escapeHtml(skill)}</option>`).join("")}</select></label>`;
    }).join("")}</div>
  </div>`;
}
function partnerBookDescriptionHtml(entry){
  if(!entry) return "";
  return `<div class="partnerBookDescription">
    <strong>Descrição do livro</strong>
    <p>${escapeHtml(entry.description||entry.summary||"")}</p>
    ${entry.note?`<p class="partnerBookNote">${escapeHtml(entry.note)}</p>`:""}
  </div>`;
}
function renderPartnerCard(partner,index){
  const entry=partnerCatalogEntry(partner.type);
  const isOpen=expandedPartnerCards.has(index);
  const maxRank=allowedPartnerRank(partner.rank);
  if(partner.rank!==maxRank){
    partner.rank=maxRank;
    if(entry&&!partner.benefitCustomized) partner.benefit=partnerBenefit(partner.type,maxRank);
  }
  if(entry&&!partner.benefitCustomized) partner.benefit=partnerBenefit(partner.type,partner.rank);
  const size=entry?.size?` • ${entry.size}`:"";
  const limitLabel=partner.countsTowardLimit?"conta no limite":"fora do limite";
  return `<article class="card partnerAccordionCard ${isOpen?"expanded":""} ${partner.active?"active":"inactive"}">
    <button type="button" class="partnerAccordionToggle" data-partnertoggle="${index}" aria-expanded="${isOpen}">
      <span class="partnerAccordionTitle"><strong>${escapeHtml(partner.name||entry?.name||"Parceiro")}</strong><small>${escapeHtml(entry?.name||"Personalizado")} • ${escapeHtml(partner.rank)}${escapeHtml(size)} • ${partner.active?"ativo":"inativo"} • ${limitLabel}</small><span>${escapeHtml(partner.benefit||"Benefício não informado")}</span></span>
      <span class="partnerAccordionCue">${isOpen?"Recolher":"Expandir"}</span>
    </button>
    <div class="partnerAccordionBody ${isOpen?"":"hidden"}">
      <div class="partnerMainFields">
        <label>Nome<input data-partner="${index}" data-k="name" value="${escapeHtml(partner.name)}" placeholder="Nome do parceiro"></label>
        <label>Tipo<select data-partner-type="${index}">${partnerTypeOptions(partner.type)}</select></label>
        <label>Graduação<select data-partner-rank="${index}">${partnerRankOptions(partner.rank)}</select></label>
        <label>Fonte/página<input data-partner="${index}" data-k="source" value="${escapeHtml(partner.source)}"></label>
      </div>
      <div class="partnerStatusFields">
        <label class="partnerCheck"><span>Ativo</span><input data-partner-active="${index}" type="checkbox" ${partner.active?"checked":""}></label>
        <label class="partnerCheck"><span>Conta no limite</span><input data-partner-counts="${index}" type="checkbox" ${partner.countsTowardLimit?"checked":""}></label>
        <span class="partnerSourceBadge">${escapeHtml(entry?.group||"Personalizado")}${entry?.mount?" • Montaria":""}</span>
        <button type="button" class="remove deleteIconButton" data-partnerdel="${index}" title="Excluir parceiro" aria-label="Excluir parceiro">${DELETE_ICON_HTML}</button>
      </div>
      ${partnerBookDescriptionHtml(entry)}
      <div class="partnerAppliedEffect"><strong>Aplicado pela ficha</strong><span>${escapeHtml(partnerAutomationText(partner))}</span></div>
      ${partnerSkillChoicesHtml(partner,index)}
      <label>Benefício atual<textarea data-partner="${index}" data-k="benefit" rows="3" placeholder="Benefício do parceiro">${escapeHtml(partner.benefit)}</textarea></label>
      ${entry?`<div class="partnerBenefitActions"><button type="button" data-partnerreset="${index}">Restaurar benefício do catálogo</button></div>`:""}
      <label>Descrição e anotações<textarea data-partner="${index}" data-k="notes" rows="3" placeholder="Aparência, personalidade, duração, origem e outros detalhes...">${escapeHtml(partner.notes)}</textarea></label>
      <div class="partnerProgressionTitle"><strong>Progressão do tipo</strong><span>Jogo do Ano</span></div>
      ${partnerProgressionHtml(partner)}
    </div>
  </article>`;
}
function renderPartners(){
  state.partners=Array.isArray(state.partners)?state.partners.map(normalizePartner):[];
  expandedPartnerCards=new Set([...expandedPartnerCards].filter(index=>index<state.partners.length));
  $("#partnersList").innerHTML=state.partners.map(renderPartnerCard).join("")||'<p class="muted">Nenhum parceiro registrado ainda.</p>';
  updatePartnerSummary();
  updatePartnerPicker();
  $$("[data-partnertoggle]").forEach(element=>element.onclick=()=>{
    const index=Number(element.dataset.partnertoggle);
    if(expandedPartnerCards.has(index)) expandedPartnerCards.delete(index); else expandedPartnerCards.add(index);
    renderPartners();
  });
  $$("[data-partner]").forEach(element=>element.oninput=()=>{
    const partner=state.partners[Number(element.dataset.partner)];
    partner[element.dataset.k]=element.value;
    if(element.dataset.k==="benefit") partner.benefitCustomized=true;
    save(false);
  });
  $$("[data-partner-type]").forEach(element=>element.onchange=()=>{
    const partner=state.partners[Number(element.dataset.partnerType)];
    const oldEntry=partnerCatalogEntry(partner.type);
    const newEntry=partnerCatalogEntry(element.value);
    if(oldEntry&&partner.name===oldEntry.name&&newEntry) partner.name=newEntry.name;
    partner.type=element.value;
    partner.benefitCustomized=false;
    partner.benefit=newEntry?partnerBenefit(partner.type,partner.rank):"";
    if(partner.type==="ajudante"&&!Array.isArray(partner.skills)) partner.skills=[];
    if(newEntry) partner.source=newEntry.page;
    renderPartners();refreshPartnerCalculations();save(false);
  });
  $$("[data-partner-rank]").forEach(element=>element.onchange=()=>{
    const partner=state.partners[Number(element.dataset.partnerRank)];
    partner.rank=allowedPartnerRank(element.value);
    partner.benefitCustomized=false;
    partner.benefit=partnerBenefit(partner.type,partner.rank)||partner.benefit;
    renderPartners();refreshPartnerCalculations();save(false);
  });
  $$("[data-partner-active]").forEach(element=>element.onchange=()=>{
    const partner=state.partners[Number(element.dataset.partnerActive)];
    const tier=partnerTierForLevel();
    if(element.checked&&partner.countsTowardLimit&&activeCountedPartners()>=tier.limit){
      element.checked=false;
      notify(`O patamar ${tier.name} permite até ${tier.limit} parceiro${tier.limit===1?"":"s"} ativo${tier.limit===1?"":"s"}.`);
      return;
    }
    partner.active=element.checked;renderPartners();refreshPartnerCalculations();save(false);
  });
  $$("[data-partner-counts]").forEach(element=>element.onchange=()=>{
    const partner=state.partners[Number(element.dataset.partnerCounts)];
    const tier=partnerTierForLevel();
    if(element.checked&&partner.active&&activeCountedPartners()>=tier.limit){
      element.checked=false;
      notify(`O limite de parceiros ativos do patamar ${tier.name} já foi preenchido.`);
      return;
    }
    partner.countsTowardLimit=element.checked;renderPartners();save(false);
  });
  $$("[data-partnerreset]").forEach(element=>element.onclick=()=>{
    const partner=state.partners[Number(element.dataset.partnerreset)];
    partner.benefitCustomized=false;
    partner.benefit=partnerBenefit(partner.type,partner.rank);
    renderPartners();save(false);
  });
  $$("[data-partner-skill]").forEach(element=>element.onchange=()=>{
    const partner=state.partners[Number(element.dataset.partnerSkill)];
    const slot=Number(element.dataset.slot);
    const selected=element.value;
    if(selected&&partner.skills.some((skill,index)=>index!==slot&&skill===selected)){
      notify("Escolha perícias diferentes para o Ajudante.");
      renderPartners();
      return;
    }
    partner.skills[slot]=selected;
    renderPartners();refreshPartnerCalculations();save(false);
  });
  $$("[data-partnerdel]").forEach(element=>element.onclick=()=>{
    const index=Number(element.dataset.partnerdel);
    state.partners.splice(index,1);
    expandedPartnerCards=new Set([...expandedPartnerCards].filter(openIndex=>openIndex!==index).map(openIndex=>openIndex>index?openIndex-1:openIndex));
    renderPartners();refreshPartnerCalculations();save(false);
  });
}
function updatePartnerPicker(){
  const typeSelect=$("#partnerCatalogType"),rankSelect=$("#partnerCatalogRank");
  if(!typeSelect||!rankSelect) return;
  const selectedType=PARTNER_CATALOG[typeSelect.value]?typeSelect.value:"combatente";
  typeSelect.innerHTML=partnerTypeOptions(selectedType).replace('<option value="custom" >Personalizado</option>',"");
  if(PARTNER_CATALOG[selectedType]) typeSelect.value=selectedType;
  const selectedRank=allowedPartnerRank(rankSelect.value||"Iniciante");
  rankSelect.innerHTML=partnerRankOptions(selectedRank);
  rankSelect.value=selectedRank;
}
function openPartnerPicker(){
  $("#partnerPicker").classList.remove("hidden");
  updatePartnerPicker();
  $("#partnerCatalogName").focus();
}
function closePartnerPicker(){$("#partnerPicker").classList.add("hidden")}
function addPartnerEntry(partner){
  const tier=partnerTierForLevel();
  const row=normalizePartner(partner);
  row.rank=allowedPartnerRank(row.rank);
  if(row.active&&row.countsTowardLimit&&activeCountedPartners()>=tier.limit){
    row.active=false;
    notify("Parceiro adicionado como inativo porque o limite do patamar já foi preenchido.");
  }
  state.partners.push(row);
  expandedPartnerCards.add(state.partners.length-1);
  renderPartners();refreshPartnerCalculations();save(false);
}
function savedFieldValue(element){
  return element.type==="checkbox"?element.checked:element.value;
}
function collectSavedFields(){
  const fields={};
  $$("[data-save]").forEach(e=>fields[e.id]=savedFieldValue(e));
  return fields;
}
function restoreSavedField(id,value){
  const element=$("#"+id);
  if(!element) return;
  if(element.type==="checkbox"){
    element.checked=value===true || value==="true" || value==="on" || value==="1";
    return;
  }
  element.value=value;
}
function defaultSavedFieldValue(element){
  if(element.type==="checkbox") return element.defaultChecked;
  if(element.tagName==="SELECT"){
    const selected=[...element.options].find(option=>option.defaultSelected)||element.options[0];
    return selected?selected.value:"";
  }
  return element.defaultValue||"";
}
function resetSavedFieldsToDefaults(){
  $$("[data-save]").forEach(element=>restoreSavedField(element.id,defaultSavedFieldValue(element)));
}
function clonePlain(value){
  return JSON.parse(JSON.stringify(value||{}));
}
function normalizeLoadedState(saved){
  const base=defaultState();
  saved=saved&&typeof saved==="object"?saved:{};
  return {
    powers:Array.isArray(saved.powers)?saved.powers:base.powers,
    spells:Array.isArray(saved.spells)?saved.spells:base.spells,
    items:Array.isArray(saved.items)?saved.items:base.items,
    partners:Array.isArray(saved.partners)?saved.partners:base.partners,
    attacks:Array.isArray(saved.attacks)&&saved.attacks.length?saved.attacks:base.attacks,
    skillData:saved.skillData&&typeof saved.skillData==="object"?saved.skillData:base.skillData,
    conditions:saved.conditions&&typeof saved.conditions==="object"?saved.conditions:base.conditions,
    customConditions:Array.isArray(saved.customConditions)?saved.customConditions:base.customConditions,
    originBenefits:Array.isArray(saved.originBenefits)?saved.originBenefits:base.originBenefits,
    offices:Array.isArray(saved.offices)&&saved.offices.length?saved.offices:base.offices,
    suppressedAutoPowers:Array.isArray(saved.suppressedAutoPowers)?saved.suppressedAutoPowers:base.suppressedAutoPowers,
    classLevels:Array.isArray(saved.classLevels)?saved.classLevels:base.classLevels,
    multiclassEnabled:saved.multiclassEnabled===true,
    cartomante:normalizeCartomanteState(saved.cartomante)
  };
}
function normalizeSheetData(data){
  data=data&&typeof data==="object"?data:{};
  const fields=data.fields&&typeof data.fields==="object"?{...data.fields}:{};
  const hasCartomante=fields.classe==="cartomante"||(Array.isArray(data.state?.classLevels)&&data.state.classLevels.some(entry=>entry?.id==="cartomante"));
  if(fields.raca==="suraggel") fields.raca="suraggel_aggelus";
  if(fields.classe==="sentinela" && fields.defAttr===undefined) fields.defAttr="INT";
  if(hasCartomante) fields.spellAttr="CAR";
  if(fields.spacesLimitAuto===undefined){
    const savedLimit=Number(fields.spacesLimit);
    const calculatedLimit=baseLoadLimitForStrength(fields.FOR);
    fields.spacesLimitAuto=!Number.isFinite(savedLimit)||savedLimit===10||savedLimit===calculatedLimit;
  }
  return {
    fields,
    state:normalizeLoadedState(data.state)
  };
}
function sheetDataFromCurrent(){
  return {fields:collectSavedFields(),state:clonePlain(state)};
}
function blankSheetData(name=""){
  const fields={};
  $$("[data-save]").forEach(element=>fields[element.id]=defaultSavedFieldValue(element));
  fields.nome=name;
  return {fields,state:defaultState()};
}
function applySheetData(data){
  const normalized=normalizeSheetData(data);
  resetSavedFieldsToDefaults();
  state=normalized.state;
  Object.entries(normalized.fields).forEach(([id,v])=>restoreSavedField(id,v));
  normalizeState();
  state.classLevels=sanitizeClassLevels(state.classLevels,{fallbackId:value("classe"),fallbackLevel:num("nivel")||1});
  syncPrimaryFieldsFromClassLevels();
  expandedSpellCards.clear();
  expandedPowerCards.clear();
  expandedItemCards.clear();
  expandedAttackCards.clear();
  expandedPartnerCards.clear();
}
function characterKey(id){return `${CHARACTER_PREFIX}${id}`}
function newCharacterId(){return `char_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`}
function readCharacterIndex(){
  try{
    const raw=localStorage.getItem(CHARACTER_INDEX_KEY);
    if(!raw) return {activeId:"",characters:[]};
    const parsed=JSON.parse(raw);
    const characters=(Array.isArray(parsed.characters)?parsed.characters:[])
      .filter(character=>character&&character.id)
      .map(character=>({
        id:String(character.id),
        name:String(character.name||"Personagem sem nome"),
        updatedAt:character.updatedAt||""
      }));
    const activeId=characters.some(character=>character.id===parsed.activeId)?parsed.activeId:(characters[0]?.id||"");
    return {activeId,characters};
  }catch(err){
    console.warn("Falha ao ler índice de personagens:",err);
    return {activeId:"",characters:[]};
  }
}
function writeCharacterIndex(index){
  const characters=(index.characters||[]).filter(character=>character&&character.id);
  const activeId=characters.some(character=>character.id===index.activeId)?index.activeId:(characters[0]?.id||"");
  localStorage.setItem(CHARACTER_INDEX_KEY,JSON.stringify({activeId,characters}));
  if(!characters.length) localStorage.removeItem(KEY);
}
function characterNameFromData(data,fallback="Personagem sem nome"){
  return String(data?.fields?.nome||"").trim()||fallback;
}
function characterImageUrlFromFields(fields){
  const raw=String(fields?.portraitUrl||fields?.imageUrl||"").trim();
  if(!raw) return "";
  if(/^data:image\/(?:jpeg|png|webp);base64,/i.test(raw)) return raw;
  try{
    const url=new URL(raw);
    return ["http:","https:"].includes(url.protocol)?raw:"";
  }catch{
    return "";
  }
}
function characterImageUrlFromData(data){
  return characterImageUrlFromFields(data?.fields||{});
}
function renderCharacterPortrait(){
  const imageUrl=characterImageUrlFromData(sheetDataFromCurrent());
  const preview=$("#characterPortraitPreview");
  const image=$("#characterPortraitImage");
  const placeholder=$("#characterPortraitPlaceholder");
  const editor=$(".portraitEditor");
  const removeButton=$("#portraitRemoveBtn");
  if(!preview||!image||!placeholder) return;
  const locked=currentCloudReadOnly||publicViewActive();
  const initial=String(value("nome")||"?").trim().charAt(0).toLocaleUpperCase("pt-BR")||"?";
  placeholder.textContent=initial;
  editor?.classList.toggle("readOnly",locked);
  if($("#portraitUploadBtn")) $("#portraitUploadBtn").disabled=locked;
  removeButton?.classList.toggle("hidden",!imageUrl||locked);
  image.onload=()=>{image.classList.remove("hidden");placeholder.classList.add("hidden")};
  image.onerror=()=>{image.classList.add("hidden");placeholder.classList.remove("hidden")};
  if(imageUrl){
    image.classList.add("hidden");
    placeholder.classList.remove("hidden");
    image.src=imageUrl;
  }else{
    image.removeAttribute("src");
    image.classList.add("hidden");
    placeholder.classList.remove("hidden");
  }
}
function portraitCropCanvas(){return $("#portraitCropCanvas")}
function portraitCropArea(){
  const canvas=portraitCropCanvas();
  const size=Math.min(canvas.width,canvas.height)*.72;
  return {x:(canvas.width-size)/2,y:(canvas.height-size)/2,size};
}
function clampPortraitCropPosition(){
  const source=portraitCropState.source;
  if(!source) return;
  const crop=portraitCropArea();
  const width=source.width*portraitCropState.scale,height=source.height*portraitCropState.scale;
  portraitCropState.x=Math.min(crop.x,Math.max(crop.x+crop.size-width,portraitCropState.x));
  portraitCropState.y=Math.min(crop.y,Math.max(crop.y+crop.size-height,portraitCropState.y));
}
function drawPortraitCrop(){
  const canvas=portraitCropCanvas(),source=portraitCropState.source;
  if(!canvas||!source) return;
  const ctx=canvas.getContext("2d"),crop=portraitCropArea();
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle="#050403";ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(source,portraitCropState.x,portraitCropState.y,source.width*portraitCropState.scale,source.height*portraitCropState.scale);
  ctx.fillStyle="rgba(0,0,0,.64)";
  ctx.fillRect(0,0,canvas.width,crop.y);
  ctx.fillRect(0,crop.y+crop.size,canvas.width,canvas.height-crop.y-crop.size);
  ctx.fillRect(0,crop.y,crop.x,crop.size);
  ctx.fillRect(crop.x+crop.size,crop.y,canvas.width-crop.x-crop.size,crop.size);
  ctx.strokeStyle="#f2dfc0";ctx.lineWidth=3;ctx.strokeRect(crop.x+.5,crop.y+.5,crop.size-1,crop.size-1);
  ctx.strokeStyle="rgba(213,168,76,.65)";ctx.lineWidth=1;
  for(let i=1;i<3;i++){
    const offset=crop.size*i/3;
    ctx.beginPath();ctx.moveTo(crop.x+offset,crop.y);ctx.lineTo(crop.x+offset,crop.y+crop.size);ctx.stroke();
    ctx.beginPath();ctx.moveTo(crop.x,crop.y+offset);ctx.lineTo(crop.x+crop.size,crop.y+offset);ctx.stroke();
  }
}
function fitPortraitCropSource(source){
  portraitCropState.source=source;
  const crop=portraitCropArea();
  portraitCropState.minScale=Math.max(crop.size/source.width,crop.size/source.height);
  portraitCropState.scale=portraitCropState.minScale;
  portraitCropState.x=(portraitCropCanvas().width-source.width*portraitCropState.scale)/2;
  portraitCropState.y=(portraitCropCanvas().height-source.height*portraitCropState.scale)/2;
  const zoom=$("#portraitCropZoom");
  if(zoom) zoom.value="1";
  clampPortraitCropPosition();drawPortraitCrop();
}
async function portraitSourceFromFile(file){
  if(globalThis.createImageBitmap){
    try{return await createImageBitmap(file,{imageOrientation:"from-image"})}catch{}
  }
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file),image=new Image();
    image.onload=()=>{URL.revokeObjectURL(url);resolve(image)};
    image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Não foi possível abrir esta imagem."))};
    image.src=url;
  });
}
async function openPortraitCrop(file){
  if(!file) return;
  if(!/^image\/(?:jpeg|png|webp)$/i.test(file.type||"")) throw new Error("Escolha uma imagem JPG, PNG ou WebP.");
  if(file.size>PORTRAIT_MAX_SOURCE_BYTES) throw new Error("A imagem original deve ter no máximo 12 MB.");
  if(portraitCropState.source?.close) portraitCropState.source.close();
  const source=await portraitSourceFromFile(file);
  $("#portraitCropModal").classList.remove("hidden");
  document.body.classList.add("modalOpen");
  fitPortraitCropSource(source);
}
function closePortraitCrop(){
  $("#portraitCropModal")?.classList.add("hidden");
  document.body.classList.remove("modalOpen");
  portraitCropState.dragging=false;portraitCropState.pointerId=null;
  if(portraitCropState.source?.close) portraitCropState.source.close();
  portraitCropState.source=null;
}
function portraitCropOutputBlob(){
  const source=portraitCropState.source,crop=portraitCropArea();
  if(!source) return Promise.reject(new Error("Nenhuma imagem foi selecionada."));
  const output=document.createElement("canvas");output.width=512;output.height=512;
  const ctx=output.getContext("2d");
  const sourceX=(crop.x-portraitCropState.x)/portraitCropState.scale;
  const sourceY=(crop.y-portraitCropState.y)/portraitCropState.scale;
  const sourceSize=crop.size/portraitCropState.scale;
  ctx.drawImage(source,sourceX,sourceY,sourceSize,sourceSize,0,0,512,512);
  return new Promise((resolve,reject)=>output.toBlob(blob=>blob?resolve(blob):reject(new Error("Não foi possível recortar a imagem.")),"image/jpeg",.88));
}
function blobToDataUrl(blob){
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob)});
}
function dataUrlToBlob(dataUrl){
  const [header,payload]=String(dataUrl||"").split(",");
  const mime=/data:([^;]+)/i.exec(header||"")?.[1]||"image/jpeg";
  const bytes=atob(payload||""),array=new Uint8Array(bytes.length);
  for(let i=0;i<bytes.length;i++) array[i]=bytes.charCodeAt(i);
  return new Blob([array],{type:mime});
}
async function uploadPortraitBlob(blob,referenceId="character"){
  if(!supabaseClient||!cloudUser) throw new Error("Entre na nuvem para enviar o retrato.");
  const safeReference=String(referenceId||"character").replace(/[^a-z0-9_-]/gi,"-").slice(0,80)||"character";
  const token=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path=`${cloudUser.id}/${safeReference}/${token}.jpg`;
  const {error}=await supabaseClient.storage.from(PORTRAIT_BUCKET).upload(path,blob,{contentType:"image/jpeg",cacheControl:"31536000",upsert:false});
  if(error) throw error;
  const {data}=supabaseClient.storage.from(PORTRAIT_BUCKET).getPublicUrl(path);
  if(!data?.publicUrl) throw new Error("O Storage não retornou a URL do retrato.");
  return {url:data.publicUrl,path};
}
async function preparePortraitDataForCloud(data,referenceId="character"){
  const normalized=normalizeSheetData(data);
  const raw=String(normalized.fields?.portraitUrl||"").trim();
  if(!/^data:image\/(?:jpeg|png|webp);base64,/i.test(raw)) return normalized;
  const uploaded=await uploadPortraitBlob(dataUrlToBlob(raw),referenceId);
  normalized.fields.portraitUrl=uploaded.url;
  normalized.fields.portraitPath=uploaded.path;
  return normalized;
}
function applyPreparedPortraitFields(data){
  restoreSavedField("portraitUrl",data?.fields?.portraitUrl||"");
  restoreSavedField("portraitPath",data?.fields?.portraitPath||"");
  renderCharacterPortrait();
}
async function confirmPortraitCrop(){
  const button=$("#portraitCropConfirm");
  if(button) button.disabled=true;
  try{
    const blob=await portraitCropOutputBlob();
    closePortraitCrop();
    if(cloudFirstMode()){
      markSaving("Enviando retrato...");
      const uploaded=await uploadPortraitBlob(blob,mappedCloudCharacterId()||currentCharacterId||"character");
      restoreSavedField("portraitUrl",uploaded.url);restoreSavedField("portraitPath",uploaded.path);
      renderCharacterPortrait();saveLocalSnapshot(false);
      await saveCloudCharacter(false);
      notify("Retrato recortado e salvo na nuvem.");
    }else{
      restoreSavedField("portraitUrl",await blobToDataUrl(blob));restoreSavedField("portraitPath","");
      renderCharacterPortrait();save(false);
      notify("Retrato recortado e salvo neste navegador.");
    }
  }finally{if(button) button.disabled=false}
}
function removeCharacterPortrait(){
  if(currentCloudReadOnly||publicViewActive()) return;
  if(!characterImageUrlFromData(sheetDataFromCurrent())) return;
  if(!confirm("Remover o retrato deste personagem?")) return;
  restoreSavedField("portraitUrl","");restoreSavedField("portraitPath","");
  renderCharacterPortrait();save(false);
}
function cloudFirstMode(){
  return !!(supabaseClient&&cloudUser);
}
function currentLinkedCampaignId(){
  return currentCloudCharacterMeta()?.campaign_id||"";
}
function cloudCampaignIdForSave(remoteId=""){
  const selected=value("cloudCampaignSelect");
  if(selected) return selected;
  const id=remoteId||mappedCloudCharacterId();
  const meta=id?cloudCharacters.find(character=>character.id===id):currentCloudCharacterMeta();
  return meta?.campaign_id||"";
}
function renderSheetCampaignShortcut(){
  const button=$("#actionOpenCampaignBtn");
  if(!button) return;
  const campaignId=currentLinkedCampaignId();
  button.classList.toggle("hidden",!cloudFirstMode()||publicViewActive());
  button.disabled=!campaignId;
  button.textContent=campaignId?"Abrir campanha vinculada":"Sem campanha vinculada";
}
function queueCloudAutosave(){
  if(!cloudFirstMode()||currentCloudReadOnly||!currentCharacterId) return;
  const snapshot={
    localId:currentCharacterId,
    remoteId:mappedCloudCharacterId(),
    data:sheetDataFromCurrent()
  };
  if(!snapshot.remoteId) return;
  markSaving("Salvando...");
  cacheLocalCharacterData(snapshot.localId,snapshot.data,characterNameFromData(snapshot.data),new Date().toISOString());
  clearTimeout(cloudAutosaveTimers.get(snapshot.remoteId));
  const timer=setTimeout(()=>{
    cloudAutosaveTimers.delete(snapshot.remoteId);
    runCloudAction(()=>saveCloudCharacterSnapshot(snapshot));
  },900);
  cloudAutosaveTimers.set(snapshot.remoteId,timer);
}
function clearCloudAutosaveTimer(remoteId){
  if(!remoteId||!cloudAutosaveTimers.has(remoteId)) return;
  clearTimeout(cloudAutosaveTimers.get(remoteId));
  cloudAutosaveTimers.delete(remoteId);
}
async function saveCloudCharacterSnapshot(snapshot){
  if(!supabaseClient||!cloudUser||!snapshot?.remoteId||!snapshot?.data) return;
  const selectedMeta=cloudCharacters.find(character=>character.id===snapshot.remoteId);
  if(isCloudCharacterReadOnly(selectedMeta)) return;
  const originalPortrait=String(snapshot.data?.fields?.portraitUrl||"");
  const preparedData=await preparePortraitDataForCloud(snapshot.data,snapshot.remoteId);
  const payload=cloudCharacterUpdatePayload(preparedData);
  const {data,error}=await supabaseClient
    .from("characters")
    .update(payload)
    .eq("id",snapshot.remoteId)
    .eq("owner_id",cloudUser.id)
    .select("id,name,campaign_id,updated_at")
    .single();
  if(error) throw error;
  if(snapshot.localId){
    setCloudMappingForLocal(snapshot.localId,data.id);
    cacheLocalCharacterData(snapshot.localId,payload.sheet_data,data.name||payload.name,data.updated_at);
    if(snapshot.localId===currentCharacterId&&value("portraitUrl")===originalPortrait) applyPreparedPortraitFields(preparedData);
  }
  await loadCloudData();
  markSaved("Salvo na nuvem");
}
function renderCharacterManager(){
  const select=$("#characterSelect");
  if(!select) return;
  const index=readCharacterIndex();
  select.innerHTML=index.characters.map(character=>`<option value="${escapeHtml(character.id)}">${escapeHtml(character.name||"Personagem sem nome")}</option>`).join("");
  select.value=currentCharacterId||index.activeId||"";
  syncCloudCharacterSelection();
  renderHub();
}
function formattedDate(value){
  if(!value) return "";
  const date=new Date(value);
  return Number.isNaN(date.getTime())?"":date.toLocaleDateString("pt-BR");
}
function localCharacterData(id){
  try{
    const raw=localStorage.getItem(characterKey(id));
    return raw?normalizeSheetData(JSON.parse(raw)):null;
  }catch(err){
    console.warn("Falha ao ler ficha local:",err);
    return null;
  }
}
function characterSummaryFromData(data){
  const fields=data?.fields||{};
  const race=T20_DATA.racas[fields.raca]?.nome||fields.raca||"Raca nao definida";
  const classLevels=classLevelsForSheet(fields,data?.state||{});
  const clsName=classListLabel(classLevels);
  const lvl=totalClassLevel(classLevels);
  const player=fields.jogador?` &bull; ${escapeHtml(fields.jogador)}`:"";
  return `${escapeHtml(race)} &bull; ${escapeHtml(clsName)} &bull; nivel ${escapeHtml(lvl)}${player}`;
}
function localCloudIdSet(){
  const index=readCharacterIndex();
  const localIds=new Set(index.characters.map(character=>character.id));
  const map=readCloudCharacterMap();
  return new Set(Object.entries(map).filter(([localId])=>localIds.has(localId)).map(([,cloudId])=>cloudId));
}
function isOwnCloudCharacter(character){
  return !!(character?.owner_id&&cloudUser&&character.owner_id===cloudUser.id);
}
function ownCloudCharacters(){
  return cloudUser?cloudCharacters.filter(isOwnCloudCharacter):[];
}
function homeCharacterRecord(){
  const index=readCharacterIndex();
  const preferredId=currentCharacterId||index.activeId||index.characters[0]?.id||"";
  const localMeta=index.characters.find(character=>character.id===preferredId)||index.characters[0];
  if(localMeta){
    const data=localCharacterData(localMeta.id)||blankSheetData(localMeta.name);
    return {
      kind:"local",
      id:localMeta.id,
      name:characterNameFromData(data,localMeta.name||"Personagem sem nome"),
      meta:characterSummaryFromData(data),
      updatedAt:localMeta.updatedAt||""
    };
  }
  const cloudMeta=ownCloudCharacters()
    .filter(character=>!isCampaignOnlyCharacter(character))
    .sort((a,b)=>new Date(b.updated_at||0)-new Date(a.updated_at||0))[0];
  if(!cloudMeta) return null;
  return {
    kind:"cloud",
    id:cloudMeta.id,
    name:cloudMeta.name||"Personagem sem nome",
    meta:[cloudMeta.player_name,"Nuvem"].filter(Boolean).map(escapeHtml).join(" &bull; "),
    updatedAt:cloudMeta.updated_at||""
  };
}
function renderHubHome(){
  const character=homeCharacterRecord();
  const characterButton=$("#homeContinueCharacterBtn");
  if($("#homeLastCharacterName")) $("#homeLastCharacterName").textContent=character?.name||"Nenhuma ficha aberta";
  if($("#homeLastCharacterMeta")){
    const date=character?.updatedAt?` Atualizada em ${formattedDate(character.updatedAt)}.`:"";
    $("#homeLastCharacterMeta").innerHTML=character?`${character.meta||"Sem detalhes."}${date}`:"Crie uma ficha ou carregue uma da nuvem.";
  }
  if(characterButton){
    characterButton.disabled=!character;
    characterButton.dataset.kind=character?.kind||"";
    characterButton.dataset.id=character?.id||"";
  }
  const campaign=cloudUser?cloudCampaigns[0]:null;
  const campaignButton=$("#homeOpenRecentCampaignBtn");
  if($("#homeRecentCampaignName")) $("#homeRecentCampaignName").textContent=campaign?.name||"Nenhuma campanha";
  if($("#homeRecentCampaignMeta")){
    const count=campaign?campaignCharactersForView(campaign).length:0;
    $("#homeRecentCampaignMeta").textContent=campaign
      ? `${count} ficha${count===1?"":"s"}${campaign.updated_at?` - atualizada em ${formattedDate(campaign.updated_at)}`:""}`
      : "Entre na nuvem para criar ou acessar campanhas.";
  }
  if(campaignButton){
    campaignButton.disabled=!campaign;
    campaignButton.dataset.id=campaign?.id||"";
  }
  if($("#homeCloudState")) $("#homeCloudState").textContent=cloudUser?"Nuvem conectada":"Modo local";
  if($("#homeCloudMeta")) $("#homeCloudMeta").textContent=cloudUser
    ? `${cloudUser.email||"Conta conectada"} - fichas e campanhas sincronizadas.`
    : "Exportar e importar JSON continua disponivel.";
  if($("#homeCloudActionBtn")) $("#homeCloudActionBtn").textContent=cloudUser?"Abrir fichas":"Entrar na nuvem";
}
function browserRouteLocation(){
  const raw=location.protocol==="file:"&&location.hash.startsWith("#/")?location.hash.slice(1):`${location.pathname}${location.search}`;
  return new URL(raw||"/","https://ficha.local");
}
function publicViewActive(){return !!publicViewCharacter?.id}
function routedCloudCharacterId(route=browserRouteLocation()){
  const parts=route.pathname.replace(/\/+$/g,"").split("/").filter(Boolean);
  if(parts.length!==2||parts[0]!=="fichas"||parts[1]==="local") return "";
  try{return decodeURIComponent(parts[1])}catch{return ""}
}
function normalizedRoutePath(path="/"){
  path=String(path||"/").trim();
  if(!path.startsWith("/")) path=`/${path}`;
  return path.replace(/\/{2,}/g,"/");
}
function writeBrowserRoute(path,{replace=false}={}){
  if(!browserRoutingReady||applyingBrowserRoute) return;
  const normalized=normalizedRoutePath(path),current=browserRouteLocation();
  if(`${current.pathname}${current.search}`===normalized) return;
  const target=location.protocol==="file:"?`#${normalized}`:normalized;
  history[replace?"replaceState":"pushState"]({appRoute:true},"",target);
}
function hubRoute(section){
  if(section==="campanhas"||section==="campanha") return "/campanhas";
  if(section==="fichas") return "/fichas";
  return "/";
}
function activeSheetTab(){
  return $$('[data-tab]').find(button=>button.classList.contains("active"))?.dataset.tab||"resumo";
}
function currentSheetRoute(){
  if(publicViewActive()){
    const base=`/fichas/${encodeURIComponent(publicViewCharacter.id)}`;
    const tab=activeSheetTab();
    return tab&&tab!=="resumo"?`${base}?aba=${encodeURIComponent(tab)}`:base;
  }
  const remoteId=mappedCloudCharacterId();
  const base=remoteId?`/fichas/${encodeURIComponent(remoteId)}`:currentCharacterId?`/fichas/local/${encodeURIComponent(currentCharacterId)}`:"/fichas";
  const tab=activeSheetTab();
  return tab&&tab!=="resumo"?`${base}?aba=${encodeURIComponent(tab)}`:base;
}
function activateSheetTab(tab="resumo"){
  const safeTab=globalThis.CSS?.escape?CSS.escape(tab):String(tab).replace(/[^a-z0-9_-]/gi,"");
  const button=$(`[data-tab="${safeTab}"]`)||$('[data-tab="resumo"]');
  if(!button) return;
  $$('[data-tab]').forEach(candidate=>candidate.classList.toggle("active",candidate===button));
  $$(".tab").forEach(section=>section.classList.toggle("active",section.id===`tab-${button.dataset.tab}`));
  $("#identityLayout")?.classList.toggle("portraitVisible",button.dataset.tab==="resumo");
}
async function flushPendingRouteSave(){
  const remoteId=mappedCloudCharacterId();
  if(!remoteId||!cloudAutosaveTimers.has(remoteId)||currentCloudReadOnly) return;
  const snapshot={localId:currentCharacterId,remoteId,data:sheetDataFromCurrent()};
  clearCloudAutosaveTimer(remoteId);
  await saveCloudCharacterSnapshot(snapshot);
}
async function applyBrowserRoute({flush=false}={}){
  if(!browserRoutingReady) return;
  const request=++browserRouteRequest,route=browserRouteLocation();
  applyingBrowserRoute=true;
  let fallback="",message="";
  try{
    if(flush){
      try{
        await flushPendingRouteSave();
      }catch(error){
        console.error("Falha ao salvar antes da navegação:",error);
        markSaveWarning("Pendente na nuvem");
        notify("A navegação continuou, mas a última alteração ainda está pendente na nuvem.");
      }
    }
    if(request!==browserRouteRequest) return;
    const pathname=route.pathname.replace(/\/+$/g,"")||"/";
    const parts=pathname.split("/").filter(Boolean).map(part=>decodeURIComponent(part));
    if(pathname==="/"||pathname==="/index.html"){
      openHub("inicio",{updateRoute:false});
    }else if(parts.length===1&&parts[0]==="fichas"){
      openHub("fichas",{updateRoute:false});
    }else if(parts[0]==="fichas"&&parts[1]==="local"&&parts[2]){
      if(!localCharacterData(parts[2])) throw new Error("Ficha local não encontrada neste navegador.");
      if(currentCharacterId!==parts[2]) switchCharacter(parts[2]);
      openSheetView({updateRoute:false});
      activateSheetTab(route.searchParams.get("aba")||"resumo");
    }else if(parts[0]==="fichas"&&parts[1]&&parts.length===2){
      if(cloudUser){
        try{
          await openCloudCharacter(parts[1],{updateRoute:false});
        }catch(error){
          console.warn("Ficha sem acesso autenticado; tentando link público.",error);
          await openPublicCloudCharacter(parts[1],{updateRoute:false});
        }
      }else{
        await openPublicCloudCharacter(parts[1],{updateRoute:false});
      }
      activateSheetTab(route.searchParams.get("aba")||"resumo");
    }else if(parts.length===1&&parts[0]==="campanhas"){
      openHub("campanhas",{updateRoute:false});
    }else if(parts[0]==="campanhas"&&parts[1]&&parts.length===2){
      if(!cloudUser) throw new Error("Entre na nuvem para abrir esta campanha.");
      if(!cloudCampaigns.some(campaign=>campaign.id===parts[1])) throw new Error("Campanha não encontrada ou sem permissão de acesso.");
      openCampaignDashboard(parts[1],{updateRoute:false});
    }else{
      fallback="/";
      openHub("inicio",{updateRoute:false});
    }
  }catch(error){
    console.error("Falha ao abrir rota:",error);
    const campaignRoute=route.pathname.startsWith("/campanhas/");
    fallback=campaignRoute?"/campanhas":"/fichas";
    message=error.message||"Não foi possível abrir este endereço.";
    openHub(campaignRoute?"campanhas":"fichas",{updateRoute:false});
  }finally{
    if(request===browserRouteRequest) applyingBrowserRoute=false;
  }
  if(fallback) writeBrowserRoute(fallback,{replace:true});
  if(message) notify(escapeHtml(message));
}
async function initializeBrowserRouting(){
  browserRoutingReady=true;
  await applyBrowserRoute({flush:false});
}
function setHubSection(section="fichas"){
  activeHubSection=section==="campanha"?"campanha":(section==="campanhas"?"campanhas":(section==="inicio"?"inicio":"fichas"));
  $("#hubHome")?.classList.toggle("hidden",activeHubSection!=="inicio");
  $("#hubFichas")?.classList.toggle("hidden",activeHubSection!=="fichas");
  $("#hubCampanhas")?.classList.toggle("hidden",activeHubSection!=="campanhas");
  $("#hubCampaignDashboard")?.classList.toggle("hidden",activeHubSection!=="campanha");
  $$("[data-hub-section]").forEach(button=>button.classList.toggle("active",button.dataset.hubSection===(activeHubSection==="campanha"?"campanhas":activeHubSection)));
}
function leavePublicView(){
  if(!publicViewActive()) return;
  publicViewCharacter=null;
  document.body.classList.remove("public-view");
  setCurrentCloudReadOnly(false);
  load();
  renderAll();
}
function openSheetView(options={}){
  closeProfileMenu();
  closeSheetActionMenu();
  stopCampaignRollPolling();
  if(!currentCharacterId&&!publicViewActive()){
    document.body.classList.add("hub-open");
    setHubSection("fichas");
    renderCloudPanel();
    renderHub();
    if(options.updateRoute!==false) writeBrowserRoute("/fichas");
    notify("Crie ou abra uma ficha para editar.");
    return;
  }
  document.body.classList.remove("hub-open");
  renderCloudPanel();
  if(options.updateRoute!==false) writeBrowserRoute(currentSheetRoute());
}
function openHub(section="fichas",options={}){
  closeProfileMenu();
  closeSheetActionMenu();
  if(section!=="campanha") stopCampaignRollPolling();
  const wasPublic=publicViewActive();
  if(!wasPublic&&!document.body.classList.contains("auth-gated")&&!document.body.classList.contains("hub-open")) save(false);
  if(wasPublic) leavePublicView();
  if(wasPublic&&!cloudUser&&sessionStorage.getItem(AUTH_MODE_KEY)!=="offline"){
    if(options.updateRoute!==false) writeBrowserRoute(hubRoute(section));
    showAuthGate();
    return;
  }
  if(section==="inicio"||section==="fichas"||section==="campanhas") activeHubCampaignId="";
  document.body.classList.add("hub-open");
  setHubSection(section);
  renderCloudPanel();
  renderHub();
  if(options.updateRoute!==false) writeBrowserRoute(hubRoute(section));
}
function hubCharacterMatches(record,query){
  if(!query) return true;
  return record.search.includes(query);
}
function renderHubCharacters(){
  const list=$("#hubCharacterList");
  if(!list) return;
  const query=String(value("hubCharacterSearch")).trim().toLowerCase();
  const mappedCloudIds=localCloudIdSet();
  const cloudMap=readCloudCharacterMap();
  const cloudById=new Map(cloudCharacters.map(character=>[character.id,character]));
  const ownCloudList=ownCloudCharacters();
  const selectedCampaign=activeHubCampaignId?cloudCampaigns.find(campaign=>campaign.id===activeHubCampaignId):null;
  const hint=$("#hubCharacterHint");
  if(hint) hint.textContent=selectedCampaign?`Fichas da campanha ${selectedCampaign.name||"sem nome"}.`:"Suas fichas salvas neste navegador e na nuvem.";
  const localRecords=readCharacterIndex().characters.map(character=>{
    const cloudMeta=cloudById.get(cloudMap[character.id]);
    const data=cloudMeta?.sheet_data?normalizeSheetData(cloudMeta.sheet_data):localCharacterData(character.id);
    const name=character.name||characterNameFromData(data);
    const fields=data?.fields||{};
    const race=T20_DATA.racas[fields.raca]?.nome||fields.raca||"";
    const classLevels=classLevelsForSheet(fields,data?.state||{});
    const cls=classListLabel(classLevels);
    const level=totalClassLevel(classLevels);
    return {
      kind:"local",
      id:character.id,
      cloudId:cloudMap[character.id]||"",
      name:cloudMeta?.name||name,
      imageUrl:characterImageUrlFromData(data),
      summary:characterSummaryFromData(data),
      meta:`${cloudMeta?"Local + nuvem":"Local"}${cloudMeta&&isPrivateCloudCharacter(cloudMeta)?" &bull; oculta":""}${character.updatedAt?` &bull; atualizado em ${formattedDate(character.updatedAt)}`:""}`,
      campaignId:cloudMeta?.campaign_id||"",
      campaignOnly:!!(cloudMeta&&isCampaignOnlyCharacter(cloudMeta)),
      orphanCloud:!!(cloudMap[character.id]&&cloudUser&&!cloudMeta),
      foreignCloud:!!(cloudMeta&&!isOwnCloudCharacter(cloudMeta)),
      search:[name,fields.jogador,race,cls,level].filter(Boolean).join(" ").toLowerCase()
    };
  }).filter(record=>!record.foreignCloud&&!record.campaignOnly&&!record.orphanCloud);
  const cloudRecords=ownCloudList.filter(character=>!mappedCloudIds.has(character.id)&&!isCampaignOnlyCharacter(character)).map(character=>({
    kind:"cloud",
    id:character.id,
    cloudId:character.id,
    name:character.name||"Personagem sem nome",
    imageUrl:characterImageUrlFromData(character.sheet_data),
    summary:[character.player_name,"Nuvem"].filter(Boolean).map(escapeHtml).join(" &bull; "),
    meta:`Nuvem${isPrivateCloudCharacter(character)?" &bull; oculta":""}${character.updated_at?` &bull; atualizado em ${formattedDate(character.updated_at)}`:""}`,
    campaignId:character.campaign_id||"",
    search:[character.name,character.player_name].filter(Boolean).join(" ").toLowerCase()
  }));
  const records=[...localRecords,...cloudRecords]
    .filter(record=>!activeHubCampaignId||record.campaignId===activeHubCampaignId)
    .filter(record=>hubCharacterMatches(record,query));
  $("#hubCharacterCount").textContent=`Fichas: ${records.length}`;
  list.innerHTML=records.length?records.map(record=>{
    const deleteAttrs=record.kind==="local"
      ? `data-delete-local-character="${escapeHtml(record.id)}"${record.cloudId?` data-delete-cloud-character="${escapeHtml(record.cloudId)}"`:""}`
      : `data-delete-cloud-character="${escapeHtml(record.id)}"`;
    return `
      <article class="hubCard ${record.kind==="cloud"?"cloudHubCard":""} ${record.imageUrl?"hasPortrait":""}">
        ${record.imageUrl?`<img class="hubPortrait" src="${escapeHtml(record.imageUrl)}" alt="Retrato de ${escapeHtml(record.name)}">`:""}
        <div class="hubCardBody">
          <small>${record.meta}</small>
          <strong>${escapeHtml(record.name)}</strong>
          <span>${record.summary||"Sem detalhes"}</span>
        </div>
        <div class="hubCardActions characterHubActions">
          <button class="hubOpenButton" type="button" data-open-${record.kind}-character="${escapeHtml(record.id)}">Acessar ficha</button>
          <button class="hubDeleteButton deleteIconButton" type="button" ${deleteAttrs} title="Excluir ficha" aria-label="Excluir ficha">${DELETE_ICON_HTML}</button>
        </div>
      </article>`;
  }).join(""):`<div class="hubEmpty">Nenhuma ficha encontrada.</div>`;
  $$("[data-open-local-character]").forEach(button=>button.onclick=()=>{switchCharacter(button.dataset.openLocalCharacter);openSheetView()});
  $$("[data-open-cloud-character]").forEach(button=>button.onclick=()=>runCloudAction(()=>openCloudCharacter(button.dataset.openCloudCharacter)));
  $$(".hubDeleteButton").forEach(button=>button.onclick=()=>runCloudAction(async()=>{
    const localId=button.dataset.deleteLocalCharacter||"";
    const remoteId=button.dataset.deleteCloudCharacter||"";
    if(localId) await deleteHubLocalCharacter(localId,remoteId);
    else if(remoteId) await deleteHubCloudCharacter(remoteId);
  }));
}
function renderHubCampaigns(){
  const list=$("#hubCampaignList");
  if(!list) return;
  const campaigns=cloudUser?cloudCampaigns:[];
  $("#hubCampaignCount").textContent=`Campanhas: ${campaigns.length}`;
  if(!cloudUser){
    list.innerHTML=`<div class="hubEmpty">Entre na nuvem para criar e acessar campanhas.</div>`;
    return;
  }
  list.innerHTML=campaigns.length?campaigns.map(campaign=>{
    const count=campaignCharactersForView(campaign).length;
    const code=campaign.invite_code?` &bull; convite ${escapeHtml(campaign.invite_code)}`:"";
    return `<article class="hubCard campaignHubCard">
      <div class="hubCardBody">
        <small>${count} ficha${count===1?"":"s"}${code}</small>
        <strong>${escapeHtml(campaign.name||"Campanha sem nome")}</strong>
        <span>${campaign.updated_at?`Atualizada em ${formattedDate(campaign.updated_at)}`:"Sem data registrada"}</span>
      </div>
      <div class="hubCardActions">
        <button type="button" data-open-campaign-dashboard="${escapeHtml(campaign.id)}">Acessar campanha</button>
      </div>
    </article>`;
  }).join(""):`<div class="hubEmpty">Nenhuma campanha criada ainda.</div>`;
  $$("[data-open-campaign-dashboard]").forEach(button=>button.onclick=()=>openCampaignDashboard(button.dataset.openCampaignDashboard));
}
function isCampaignOwner(campaign){
  return !!(campaign?.owner_id&&cloudUser&&campaign.owner_id===cloudUser.id);
}
function isPrivateCloudCharacter(character){
  return character?.is_private===true||character?.is_private==="true";
}
function isCampaignOnlyCharacter(character){
  return !!(character?.campaign_id&&isPrivateCloudCharacter(character));
}
function campaignCharactersForView(campaign,campaignOwner=isCampaignOwner(campaign)){
  if(!campaign) return [];
  return cloudCharacters.filter(character=>
    character.campaign_id===campaign.id
    && (campaignOwner||!isPrivateCloudCharacter(character))
  );
}
function cloudMappingSet(){
  const map=readCloudCharacterMap();
  return new Set(Object.values(map).filter(Boolean));
}
function campaignCharacterLinkRecords(){
  if(!cloudUser) return [];
  const cloudMap=readCloudCharacterMap();
  const mappedCloudIds=cloudMappingSet();
  const records=[];
  readCharacterIndex().characters.forEach(character=>{
    const data=character.id===currentCharacterId?sheetDataFromCurrent():localCharacterData(character.id);
    const cloudId=cloudMap[character.id]||"";
    const cloudMeta=cloudId?cloudCharacters.find(entry=>entry.id===cloudId):null;
    if(cloudMeta&&!isOwnCloudCharacter(cloudMeta)) return;
    if(cloudMeta&&isCampaignOnlyCharacter(cloudMeta)) return;
    const linkedCampaignId=cloudMeta?.campaign_id||"";
    const name=cloudMeta?.name||character.name||characterNameFromData(data,"Personagem sem nome");
    const suffix=linkedCampaignId?` - vinculada${linkedCampaignId===activeHubCampaignId?" aqui":""}`:(cloudId?" - na nuvem":" - local");
    records.push({value:`local:${character.id}`,label:`${name}${suffix}`});
  });
  ownCloudCharacters()
    .filter(character=>!mappedCloudIds.has(character.id)&&!isCampaignOnlyCharacter(character))
    .forEach(character=>{
      const suffix=character.campaign_id?` - vinculada${character.campaign_id===activeHubCampaignId?" aqui":""}`:" - na nuvem";
      records.push({value:`cloud:${character.id}`,label:`${character.name||"Personagem sem nome"}${suffix}`});
    });
  return records;
}
function renderCampaignCharacterLinkPicker(){
  const select=$("#campaignCharacterLinkSelect");
  const button=$("#campaignLinkSelectedBtn");
  if(!select||!button) return;
  const records=campaignCharacterLinkRecords();
  select.innerHTML=records.length
    ? records.map(record=>`<option value="${escapeHtml(record.value)}">${escapeHtml(record.label)}</option>`).join("")
    : '<option value="">Nenhuma ficha disponivel</option>';
  const preferred=currentCharacterId?`local:${currentCharacterId}`:"";
  if(preferred&&records.some(record=>record.value===preferred)) select.value=preferred;
  select.disabled=!records.length;
  button.disabled=!records.length||!activeHubCampaignId;
}
function campaignCharacterRemoveRecords(campaignId=activeHubCampaignId){
  if(!cloudUser||!campaignId) return [];
  return ownCloudCharacters()
    .filter(character=>character.campaign_id===campaignId&&!isCampaignOnlyCharacter(character))
    .map(character=>({
      value:character.id,
      label:character.name||"Personagem sem nome"
    }));
}
function renderCampaignCharacterRemovePicker(campaignOwner=false){
  const select=$("#campaignCharacterRemoveSelect");
  const button=$("#campaignRemoveSelectedBtn");
  const label=select?.closest(".campaignRemovePicker");
  if(!select||!button) return;
  const records=campaignOwner?[]:campaignCharacterRemoveRecords();
  const hidden=campaignOwner||!records.length;
  label?.classList.toggle("hidden",hidden);
  button.classList.toggle("hidden",hidden);
  select.innerHTML=records.length
    ? records.map(record=>`<option value="${escapeHtml(record.value)}">${escapeHtml(record.label)}</option>`).join("")
    : '<option value="">Nenhuma ficha vinculada</option>';
  const currentRemoteId=mappedCloudCharacterId();
  if(currentRemoteId&&records.some(record=>record.value===currentRemoteId)) select.value=currentRemoteId;
  select.disabled=!records.length;
  button.disabled=!records.length||!activeHubCampaignId;
}
function openCampaignDashboard(campaignId,options={}){
  if(!campaignId) return;
  closeProfileMenu();
  closeSheetActionMenu();
  if(!document.body.classList.contains("auth-gated")&&!document.body.classList.contains("hub-open")) save(false);
  document.body.classList.add("hub-open");
  activeHubCampaignId=campaignId;
  activeCampaignDashboardTab="fichas";
  shieldCharacterFilter="";
  shieldSortMode="risco";
  if($("#cloudCampaignSelect")) $("#cloudCampaignSelect").value=campaignId;
  setHubSection("campanha");
  renderCloudPanel();
  renderHub();
  if(options.updateRoute!==false) writeBrowserRoute(`/campanhas/${encodeURIComponent(campaignId)}`);
}
function sheetNum(fields,id){
  const value=Number(fields?.[id]||0);
  return Number.isFinite(value)?value:0;
}
function sheetBool(fields,id,defaultValue=true){
  const value=fields?.[id];
  if(value===undefined) return defaultValue;
  return value===true || value==="true" || value==="on" || value==="1";
}
function sheetConditionEffects(savedState){
  const result={defense:0};
  const stacked={defense:0};
  const addPenalty=(value,{stack=false}={})=>{
    const n=Number(value||0);
    if(!n) return;
    if(stack) stacked.defense+=n;
    else result.defense=Math.min(Number(result.defense||0),n);
  };
  for(const [name,status] of Object.entries(savedState?.conditions||{})){
    if(!status?.active) continue;
    const effects=CONDITION_LIBRARY[name]?.effects||{};
    addPenalty(effects.defense,{stack:!!effects.stackDefense});
  }
  result.defense+=stacked.defense;
  return result;
}
function activeConditionNamesFromSheet(data){
  const savedState=data?.state||{};
  const base=Object.entries(savedState.conditions||{}).filter(([,status])=>status?.active).map(([name])=>name);
  const custom=(savedState.customConditions||[]).filter(condition=>condition?.active).map(condition=>condition.name||"Condicao");
  return [...base,...custom];
}
function sheetSummaryFromCloudCharacter(character){
  const data=normalizeSheetData(character.sheet_data||{});
  const fields=data.fields||{},savedState=data.state||{};
  const itemFx=equippedItemEffects(savedState.items||[]);
  const classLevels=classLevelsForSheet(fields,savedState);
  const race=T20_DATA.racas[fields.raca]||{};
  const lvl=totalClassLevel(classLevels);
  const con=sheetNum(fields,"CON")+Number(itemFx.attrs.CON||0);
  const spellAttr=ATTR_KEYS.includes(fields.spellAttr)?fields.spellAttr:"INT";
  const bases=classResourceBases(classLevels,{con,spellAttrValue:sheetNum(fields,spellAttr)+Number(itemFx.attrs[spellAttr]||0)});
  const pvBase=bases.pvBase;
  const pmBase=bases.pmBase;
  const pvMax=pvBase+sheetNum(fields,"pvAjuste")+itemFx.pvMax;
  const pmMax=pmBase+sheetNum(fields,"pmAjuste")+itemFx.pmMax;
  const defenseAttr=ATTR_KEYS.includes(fields.defAttr)?fields.defAttr:"DES";
  const defenseAttrBonus=sheetBool(fields,"defUseDex",true)?sheetNum(fields,defenseAttr)+Number(itemFx.attrs[defenseAttr]||0):0;
  const conditionFx=sheetConditionEffects(savedState);
  const defense=10+defenseAttrBonus+sheetNum(fields,"armadura")+sheetNum(fields,"escudo")+sheetNum(fields,"defBonus")+sheetNum(fields,"defAjuste")+sheetNum(fields,"globalDefenseBonus")+partnerDefenseBonus(savedState.partners)+itemFx.defense+conditionFx.defense;
  const activeConditions=activeConditionNamesFromSheet(data);
  const deathLimit=deathLimitFromPvMax(pvMax);
  const pvAtual=sheetNum(fields,"pvAtual");
  return {
    id:character.id,
    name:character.name||fields.nome||"Personagem sem nome",
    imageUrl:characterImageUrlFromFields(fields),
    player:character.player_name||fields.jogador||"",
    className:classListLabel(classLevels),
    raceName:race.nome||fields.raca||"Raca nao definida",
    level:lvl,
    attrs:Object.fromEntries(ATTR_KEYS.map(key=>[key,sheetNum(fields,key)+Number(itemFx.attrs[key]||0)])),
    pvAtual,
    pvMax,
    pvTemp:Math.max(0,sheetNum(fields,"pvBonus")),
    pmAtual:sheetNum(fields,"pmAtual"),
    pmMax,
    pmTemp:Math.max(0,sheetNum(fields,"pmBonus")),
    defense,
    rd:sheetNum(fields,"rd")+itemFx.rd,
    deslocamento:sheetNum(fields,"deslocamento")||race.deslocamento||9,
    tamanho:fields.tamanho||race.tamanho||"Medio",
    conditions:activeConditions,
    updatedAt:character.updated_at||"",
    deathLimit,
    status:pvAtual<deathLimit?"morto":(pvAtual<0?"morrendo":(pvMax>0&&pvAtual<=Math.ceil(pvMax*.25)?"ferido":"ok"))
  };
}
function resourceBarPercent(current,max){
  if(max<=0) return 0;
  return Math.max(0,Math.min(100,current/max*100));
}
function formatRollDate(value){
  const date=new Date(value);
  if(Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
}
function activeCampaignEncounter(campaignId=activeHubCampaignId){
  return cloudCampaignEncounters
    .filter(encounter=>encounter.campaign_id===campaignId&&["collecting","active"].includes(encounter.status))
    .sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0))[0]||null;
}
function initiativeEntriesForEncounter(encounterId){
  return cloudInitiativeEntries.filter(entry=>entry.encounter_id===encounterId);
}
function initiativeHasTotal(entry){
  return entry?.initiative_total!==null&&entry?.initiative_total!==""&&Number.isFinite(Number(entry.initiative_total));
}
function sortedInitiativeEntries(encounter){
  const entries=initiativeEntriesForEncounter(encounter?.id);
  return [...entries].sort((a,b)=>{
    if(encounter?.status==="active"){
      const aPosition=Number.isFinite(Number(a.position))&&a.position!==null?Number(a.position):Number.MAX_SAFE_INTEGER;
      const bPosition=Number.isFinite(Number(b.position))&&b.position!==null?Number(b.position):Number.MAX_SAFE_INTEGER;
      if(aPosition!==bPosition) return aPosition-bPosition;
    }
    const aWaiting=initiativeHasTotal(a)?0:1,bWaiting=initiativeHasTotal(b)?0:1;
    if(aWaiting!==bWaiting) return aWaiting-bWaiting;
    return Number(b.initiative_total||0)-Number(a.initiative_total||0)
      ||Number(b.initiative_bonus||0)-Number(a.initiative_bonus||0)
      ||String(a.actor_name||"").localeCompare(String(b.actor_name||""),"pt-BR");
  });
}
function initiativeStateOptions(selected){
  return [
    ["ready","Pronto"],
    ["unconscious","Inconsciente"],
    ["out","Fora do combate"]
  ].map(([value,label])=>`<option value="${value}" ${selected===value?"selected":""}>${label}</option>`).join("");
}
function renderInitiativeEntry(entry,index,encounter,summaryById){
  const summary=summaryById.get(entry.character_id);
  const hasTotal=initiativeHasTotal(entry);
  const isCurrent=encounter.status==="active"&&encounter.current_entry_id===entry.id;
  const source=entry.source==="roll"&&entry.d20!==null
    ?`1d20 (${entry.d20}) ${Number(entry.initiative_bonus||0)>=0?"+":""}${Number(entry.initiative_bonus||0)}`
    :(entry.source==="manual"?"Valor manual":"Aguardando rolagem");
  const detail=summary?`${summary.raceName} &bull; ${summary.className} nivel ${summary.level}`:source;
  return `<article class="initiativeEntry ${isCurrent?"current":""} ${hasTotal?"":"waiting"} ${entry.participant_state||"ready"}">
    <div class="initiativeOrder">${isCurrent?`<span>Vez</span>`:`<span>${hasTotal?index+1:"-"}</span>`}</div>
    <div class="initiativePortrait">${summary?.imageUrl?`<img src="${escapeHtml(summary.imageUrl)}" alt="Retrato de ${escapeHtml(entry.actor_name)}">`:`<span>${escapeHtml(String(entry.actor_name||"?").trim()[0]||"?")}</span>`}</div>
    <div class="initiativeIdentity">
      <strong>${escapeHtml(entry.actor_name||"Participante")}</strong>
      <small>${detail}</small>
      ${entry.source==="roll"?`<em>${source}</em>`:""}
    </div>
    <label class="initiativeValue">Iniciativa<input type="number" data-initiative-total="${escapeHtml(entry.id)}" value="${hasTotal?Number(entry.initiative_total):""}" placeholder="--"></label>
    <label class="initiativeState">Estado<select data-initiative-state="${escapeHtml(entry.id)}">${initiativeStateOptions(entry.participant_state||"ready")}</select></label>
    <div class="initiativeEntryActions">
      ${encounter.status==="active"?`<button type="button" data-initiative-move="${escapeHtml(entry.id)}" data-direction="-1" title="Subir na ordem" aria-label="Subir na ordem">&#8593;</button><button type="button" data-initiative-move="${escapeHtml(entry.id)}" data-direction="1" title="Descer na ordem" aria-label="Descer na ordem">&#8595;</button>`:""}
      <button type="button" class="deleteIconButton" data-initiative-delete="${escapeHtml(entry.id)}" title="Remover da iniciativa" aria-label="Remover da iniciativa">${DELETE_ICON_HTML}</button>
    </div>
  </article>`;
}
function renderCampaignInitiative(campaignId,summaries){
  if(!campaignInitiativeAvailable) return `<section class="campaignInitiativePanel unavailable"><div><small>Iniciativa</small><strong>Recurso indisponivel</strong><span>Aplique o arquivo supabase_campaign_initiative.sql no Supabase.</span></div></section>`;
  const encounter=activeCampaignEncounter(campaignId);
  if(!encounter) return `<section class="campaignInitiativePanel idle">
    <div class="initiativePanelIntro"><small>Combate</small><h3>Iniciativa</h3><p>Ative o combate para receber e ordenar automaticamente as rolagens de Iniciativa da campanha.</p></div>
    <button id="initiativeStartBtn" type="button">Iniciar combate</button>
  </section>`;
  const entries=sortedInitiativeEntries(encounter);
  const summaryById=new Map(summaries.map(summary=>[summary.id,summary]));
  const rolledEntries=entries.filter(initiativeHasTotal);
  const current=entries.find(entry=>entry.id===encounter.current_entry_id);
  const collecting=encounter.status==="collecting";
  return `<section class="campaignInitiativePanel ${encounter.status}">
    <div class="initiativePanelHeader">
      <div class="initiativePanelIntro"><small>Combate ativo</small><h3>Iniciativa</h3><p>${collecting?`${rolledEntries.length} de ${entries.length} participantes rolaram.`:`Rodada ${encounter.round_number||1}${current?` &bull; vez de ${escapeHtml(current.actor_name)}`:""}`}</p></div>
      <div class="initiativeRoundBadge"><small>${collecting?"Preparacao":"Rodada"}</small><strong>${collecting?rolledEntries.length:(encounter.round_number||1)}</strong></div>
      <div class="initiativePanelActions">
        ${collecting?`<button id="initiativeBeginRoundBtn" type="button" ${rolledEntries.length?"":"disabled"}>Comecar rodada</button>`:`<button id="initiativePrevTurnBtn" type="button" title="Turno anterior" aria-label="Turno anterior">&#8592;</button><button id="initiativeNextTurnBtn" type="button">Proximo turno &#8594;</button>`}
        <button id="initiativeEndBtn" class="subtleButton" type="button">Encerrar combate</button>
      </div>
    </div>
    <div class="initiativeEntries">${entries.length?entries.map((entry,index)=>renderInitiativeEntry(entry,index,encounter,summaryById)).join(""):`<p class="muted">Nenhum participante. Vincule fichas ou adicione um participante manual.</p>`}</div>
    <div class="initiativeManualAdd">
      <label>Participante<input id="initiativeManualName" placeholder="Nome do NPC ou aliado"></label>
      <label>Iniciativa<input id="initiativeManualTotal" type="number" placeholder="Opcional"></label>
      <button id="initiativeManualAddBtn" type="button" title="Adicionar participante">+ Adicionar</button>
    </div>
  </section>`;
}
function renderCampaignRollHistory(campaignId,characterId=""){
  const rolls=cloudCampaignRolls
    .filter(roll=>roll.campaign_id===campaignId)
    .filter(roll=>!characterId||roll.character_id===characterId)
    .slice(0,12);
  if(!rolls.length) return `<p class="muted">Nenhuma rolagem registrada ainda.</p>`;
  return rolls.map(roll=>{
    const stateClass=roll.is_fumble?"fumble":(roll.is_critical?"critical":"");
    const isD20=roll.roll_type==="d20";
    const label=isD20?(roll.is_fumble?"Falha":(roll.is_critical?"20 nat.":"Total")):(roll.is_fumble?"Falha":(roll.is_critical?"Critico":"Ataque"));
    const secondValue=isD20?(roll.d20??"-"):(roll.total_damage??"-");
    const secondLabel=isD20?"d20":"Dano";
    return `<article class="shieldRoll ${stateClass}">
      <div class="shieldRollHead">
        <small>${escapeHtml(roll.actor_name||"Personagem")}</small>
        <span>${formatRollDate(roll.created_at)}</span>
      </div>
      <strong>${escapeHtml(roll.title||"Rolagem")}</strong>
      <div class="shieldRollTotals">
        <div><b>${roll.total_attack??"-"}</b><small>${label}</small></div>
        <div><b>${secondValue}</b><small>${secondLabel}</small></div>
      </div>
      <em>1d20 [${escapeHtml(roll.d20??"-")}]${roll.damage_details?` - ${escapeHtml(roll.damage_details)}`:""}</em>
    </article>`;
  }).join("");
}
function shieldStatusRank(status){
  return ({morto:0,morrendo:1,ferido:2,ok:3})[status]??4;
}
function sortShieldSummaries(summaries){
  const list=[...summaries];
  if(shieldSortMode==="pv"){
    return list.sort((a,b)=>(a.pvAtual-a.pvMax)-(b.pvAtual-b.pvMax)||a.pvAtual-b.pvAtual||a.name.localeCompare(b.name));
  }
  if(shieldSortMode==="risco"){
    return list.sort((a,b)=>shieldStatusRank(a.status)-shieldStatusRank(b.status)||a.pvAtual-b.pvAtual||a.name.localeCompare(b.name));
  }
  return list.sort((a,b)=>a.name.localeCompare(b.name));
}
function renderShieldControls(summaries){
  const options=summaries.map(summary=>
    `<option value="${escapeHtml(summary.id)}" ${shieldCharacterFilter===summary.id?"selected":""}>${escapeHtml(summary.name)}</option>`
  ).join("");
  return `<div class="shieldControls">
    <label>Personagem<select id="shieldCharacterFilter"><option value="">Todos</option>${options}</select></label>
    <label>Ordem<select id="shieldSortMode">
      <option value="default" ${shieldSortMode==="default"?"selected":""}>Nome</option>
      <option value="risco" ${shieldSortMode==="risco"?"selected":""}>Risco</option>
      <option value="pv" ${shieldSortMode==="pv"?"selected":""}>PV baixo</option>
    </select></label>
    <button id="clearCampaignRollsBtn" type="button">Limpar rolagens</button>
  </div>`;
}
function renderMasterShield(characters){
  const allSummaries=characters.map(sheetSummaryFromCloudCharacter);
  if(shieldCharacterFilter&&!allSummaries.some(summary=>summary.id===shieldCharacterFilter)) shieldCharacterFilter="";
  const summaries=sortShieldSummaries(allSummaries.filter(summary=>!shieldCharacterFilter||summary.id===shieldCharacterFilter));
  const alerts=summaries.flatMap(summary=>{
    const items=[];
    if(summary.status==="morto") items.push({type:"danger",name:summary.name,text:`Morto ou alem do limite (${summary.pvAtual}/${summary.deathLimit} PV).`});
    else if(summary.status==="morrendo") items.push({type:"danger",name:summary.name,text:`Morrendo. Limite em ${summary.deathLimit} PV.`});
    else if(summary.status==="ferido") items.push({type:"warning",name:summary.name,text:`PV baixo: ${summary.pvAtual}/${summary.pvMax}.`});
    if(summary.conditions.length) items.push({type:"condition",name:summary.name,text:`Condicoes: ${summary.conditions.join(", ")}.`});
    return items;
  });
  const dyingCount=allSummaries.filter(summary=>summary.status==="morrendo"||summary.status==="morto").length;
  const woundedCount=allSummaries.filter(summary=>summary.status==="ferido").length;
  const conditionCount=allSummaries.filter(summary=>summary.conditions.length).length;
  return `<div class="masterShieldSurface">
    ${renderCampaignInitiative(activeHubCampaignId,allSummaries)}
    <div class="masterShieldLayout">
    <aside class="masterShieldFeed">
      ${renderShieldControls(allSummaries)}
      <div class="shieldOverview">
        <div><small>Fichas</small><strong>${allSummaries.length}</strong></div>
        <div><small>Risco</small><strong>${dyingCount}</strong></div>
        <div><small>Feridos</small><strong>${woundedCount}</strong></div>
        <div><small>Cond.</small><strong>${conditionCount}</strong></div>
      </div>
      <div class="shieldFeedHead">
        <strong>Alertas</strong>
        <span>${alerts.length||"sem"} destaque${alerts.length===1?"":"s"}</span>
      </div>
      <div class="shieldFeedList">
        ${alerts.length?alerts.map(alert=>`<article class="shieldAlert ${alert.type}">
          <small>${escapeHtml(alert.name)}</small>
          <span>${escapeHtml(alert.text)}</span>
        </article>`).join(""):`<p class="muted">Nenhum personagem em risco no momento.</p>`}
      </div>
      <div class="shieldFeedHead shieldRollsHead">
        <strong>Rolagens</strong>
        <span>ultimas</span>
      </div>
      <div class="shieldRollList">${renderCampaignRollHistory(activeHubCampaignId,shieldCharacterFilter)}</div>
    </aside>
    <div class="masterShieldRoster">
      ${summaries.length?summaries.map(summary=>renderMasterShieldCard(summary)).join(""):`<div class="hubEmpty">Nenhuma ficha vinculada a esta campanha ainda.</div>`}
    </div>
  </div></div>`;
}
function bindMasterShieldControls(){
  const filter=$("#shieldCharacterFilter");
  if(filter) filter.onchange=()=>{
    shieldCharacterFilter=filter.value;
    renderCampaignDashboard();
  };
  const sort=$("#shieldSortMode");
  if(sort) sort.onchange=()=>{
    shieldSortMode=sort.value||"default";
    renderCampaignDashboard();
  };
  const clear=$("#clearCampaignRollsBtn");
  if(clear) clear.onclick=()=>runCloudAction(clearCampaignRollHistory);
  const start=$("#initiativeStartBtn");
  if(start) start.onclick=()=>runCloudAction(startCampaignEncounter);
  const begin=$("#initiativeBeginRoundBtn");
  if(begin) begin.onclick=()=>runCloudAction(beginCampaignInitiativeRound);
  const previous=$("#initiativePrevTurnBtn");
  if(previous) previous.onclick=()=>runCloudAction(()=>advanceCampaignInitiative(-1));
  const next=$("#initiativeNextTurnBtn");
  if(next) next.onclick=()=>runCloudAction(()=>advanceCampaignInitiative(1));
  const end=$("#initiativeEndBtn");
  if(end) end.onclick=()=>runCloudAction(endCampaignEncounter);
  const add=$("#initiativeManualAddBtn");
  if(add) add.onclick=()=>runCloudAction(addManualInitiativeEntry);
  $$("[data-initiative-total]").forEach(input=>input.onchange=()=>runCloudAction(()=>updateInitiativeTotal(input.dataset.initiativeTotal,input.value)));
  $$("[data-initiative-state]").forEach(select=>select.onchange=()=>runCloudAction(()=>updateInitiativeState(select.dataset.initiativeState,select.value)));
  $$("[data-initiative-move]").forEach(button=>button.onclick=()=>runCloudAction(()=>moveInitiativeEntry(button.dataset.initiativeMove,Number(button.dataset.direction||0))));
  $$("[data-initiative-delete]").forEach(button=>button.onclick=()=>runCloudAction(()=>deleteInitiativeEntry(button.dataset.initiativeDelete)));
}
function requireMasterEncounter(){
  const campaign=cloudCampaigns.find(item=>item.id===activeHubCampaignId);
  if(!campaign||!isCampaignOwner(campaign)){
    notify("A iniciativa pode ser controlada apenas pelo mestre da campanha.");
    return null;
  }
  return {campaign,encounter:activeCampaignEncounter(campaign.id)};
}
async function refreshCampaignShield(message=""){
  await loadCloudData();
  activeCampaignDashboardTab="escudo";
  renderCampaignDashboard();
  if(message) notify(message);
}
async function startCampaignEncounter(){
  if(!cloudRequireLogin()||!campaignInitiativeAvailable) return;
  const context=requireMasterEncounter();
  if(!context) return;
  if(context.encounter){
    notify("Esta campanha ja possui um combate ativo.");
    return;
  }
  const {data:encounter,error}=await supabaseClient
    .from("campaign_encounters")
    .insert({campaign_id:context.campaign.id,created_by:cloudUser.id,status:"collecting",round_number:0})
    .select("id,campaign_id,created_by,status,round_number,current_entry_id,created_at,updated_at,ended_at")
    .single();
  if(error) throw error;
  const characters=campaignCharactersForView(context.campaign,true);
  if(characters.length){
    const rows=characters.map(character=>({
      encounter_id:encounter.id,
      campaign_id:context.campaign.id,
      character_id:character.id,
      user_id:character.owner_id||cloudUser.id,
      actor_name:character.name||"Personagem sem nome",
      participant_state:"ready",
      source:"campaign"
    }));
    const {error:entryError}=await supabaseClient.from("campaign_initiative_entries").insert(rows);
    if(entryError){
      await supabaseClient.from("campaign_encounters").delete().eq("id",encounter.id);
      throw entryError;
    }
  }
  await refreshCampaignShield("Combate iniciado. Aguardando rolagens de Iniciativa.");
}
async function beginCampaignInitiativeRound(){
  const context=requireMasterEncounter();
  if(!context?.encounter) return;
  const ordered=sortedInitiativeEntries(context.encounter).filter(initiativeHasTotal);
  if(!ordered.length){
    notify("Aguarde ao menos uma rolagem de Iniciativa.");
    return;
  }
  const updates=ordered.map((entry,index)=>supabaseClient
    .from("campaign_initiative_entries")
    .update({position:index,updated_at:new Date().toISOString()})
    .eq("id",entry.id));
  const results=await Promise.all(updates);
  const failed=results.find(result=>result.error);
  if(failed?.error) throw failed.error;
  const {error}=await supabaseClient
    .from("campaign_encounters")
    .update({status:"active",round_number:1,current_entry_id:ordered[0].id,updated_at:new Date().toISOString()})
    .eq("id",context.encounter.id);
  if(error) throw error;
  await refreshCampaignShield(`Rodada 1 iniciada. Vez de <b>${escapeHtml(ordered[0].actor_name)}</b>.`);
}
async function advanceCampaignInitiative(direction=1){
  const context=requireMasterEncounter();
  if(!context?.encounter||context.encounter.status!=="active") return;
  const ordered=sortedInitiativeEntries(context.encounter)
    .filter(entry=>initiativeHasTotal(entry)&&entry.participant_state==="ready");
  if(!ordered.length){
    notify("Nao ha participantes ativos na iniciativa.");
    return;
  }
  const currentIndex=ordered.findIndex(entry=>entry.id===context.encounter.current_entry_id);
  let nextIndex=currentIndex<0?0:currentIndex+Math.sign(direction||1);
  let round=Math.max(1,Number(context.encounter.round_number||1));
  if(nextIndex>=ordered.length){nextIndex=0;round+=1}
  if(nextIndex<0){nextIndex=ordered.length-1;round=Math.max(1,round-1)}
  const next=ordered[nextIndex];
  const {error}=await supabaseClient
    .from("campaign_encounters")
    .update({current_entry_id:next.id,round_number:round,updated_at:new Date().toISOString()})
    .eq("id",context.encounter.id);
  if(error) throw error;
  await refreshCampaignShield(`Rodada ${round}: vez de <b>${escapeHtml(next.actor_name)}</b>.`);
}
async function endCampaignEncounter(){
  const context=requireMasterEncounter();
  if(!context?.encounter) return;
  if(!confirm("Encerrar o combate atual? A ordem sera arquivada.")) return;
  const now=new Date().toISOString();
  const {error}=await supabaseClient
    .from("campaign_encounters")
    .update({status:"ended",current_entry_id:null,ended_at:now,updated_at:now})
    .eq("id",context.encounter.id);
  if(error) throw error;
  await refreshCampaignShield("Combate encerrado.");
}
async function addManualInitiativeEntry(){
  const context=requireMasterEncounter();
  if(!context?.encounter) return;
  const name=String($("#initiativeManualName")?.value||"").trim();
  const raw=String($("#initiativeManualTotal")?.value||"").trim();
  if(!name){notify("Informe o nome do participante.");return}
  const total=raw===""?null:Number(raw);
  if(total!==null&&!Number.isFinite(total)){notify("Informe uma iniciativa valida.");return}
  const entries=sortedInitiativeEntries(context.encounter);
  const position=context.encounter.status==="active"&&total!==null
    ?Math.max(-1,...entries.map(entry=>entry.position===null?-1:Number(entry.position||0)))+1
    :null;
  const {error}=await supabaseClient.from("campaign_initiative_entries").insert({
    encounter_id:context.encounter.id,
    campaign_id:context.campaign.id,
    user_id:cloudUser.id,
    actor_name:name,
    initiative_total:total,
    initiative_bonus:0,
    position,
    participant_state:"ready",
    source:"manual"
  });
  if(error) throw error;
  await refreshCampaignShield(`Participante adicionado: <b>${escapeHtml(name)}</b>.`);
}
async function updateInitiativeTotal(entryId,rawValue){
  const context=requireMasterEncounter();
  if(!context?.encounter||!entryId) return;
  const raw=String(rawValue??"").trim();
  const total=raw===""?null:Number(raw);
  if(total!==null&&!Number.isFinite(total)) return;
  const entry=cloudInitiativeEntries.find(item=>item.id===entryId);
  const patch={initiative_total:total,d20:null,source:"manual",updated_at:new Date().toISOString()};
  if(context.encounter.status==="active"&&total!==null&&entry?.position===null){
    const entries=initiativeEntriesForEncounter(context.encounter.id);
    patch.position=Math.max(-1,...entries.map(item=>item.position===null?-1:Number(item.position||0)))+1;
  }
  const {error}=await supabaseClient.from("campaign_initiative_entries").update(patch).eq("id",entryId);
  if(error) throw error;
  await refreshCampaignShield();
}
async function updateInitiativeState(entryId,nextState){
  const context=requireMasterEncounter();
  if(!context?.encounter||!entryId||!["ready","unconscious","out"].includes(nextState)) return;
  const {error}=await supabaseClient
    .from("campaign_initiative_entries")
    .update({participant_state:nextState,updated_at:new Date().toISOString()})
    .eq("id",entryId);
  if(error) throw error;
  await refreshCampaignShield();
}
async function moveInitiativeEntry(entryId,direction){
  const context=requireMasterEncounter();
  if(!context?.encounter||context.encounter.status!=="active") return;
  const ordered=sortedInitiativeEntries(context.encounter).filter(initiativeHasTotal);
  const index=ordered.findIndex(entry=>entry.id===entryId);
  const target=index+Math.sign(direction||0);
  if(index<0||target<0||target>=ordered.length) return;
  [ordered[index],ordered[target]]=[ordered[target],ordered[index]];
  const results=await Promise.all(ordered.map((entry,position)=>supabaseClient
    .from("campaign_initiative_entries")
    .update({position,updated_at:new Date().toISOString()})
    .eq("id",entry.id)));
  const failed=results.find(result=>result.error);
  if(failed?.error) throw failed.error;
  await refreshCampaignShield();
}
async function deleteInitiativeEntry(entryId){
  const context=requireMasterEncounter();
  if(!context?.encounter||!entryId) return;
  const entry=cloudInitiativeEntries.find(item=>item.id===entryId);
  if(!confirm(`Remover ${entry?.actor_name||"este participante"} da iniciativa?`)) return;
  const {error}=await supabaseClient.from("campaign_initiative_entries").delete().eq("id",entryId);
  if(error) throw error;
  await refreshCampaignShield();
}
async function clearCampaignRollHistory(){
  if(!cloudRequireLogin()||!activeHubCampaignId) return;
  const target=shieldCharacterFilter
    ? cloudCharacters.find(character=>character.id===shieldCharacterFilter)?.name||"este personagem"
    : "esta campanha";
  if(!confirm(`Limpar rolagens de ${target}?`)) return;
  let request=supabaseClient.from("campaign_rolls").delete().eq("campaign_id",activeHubCampaignId);
  if(shieldCharacterFilter) request=request.eq("character_id",shieldCharacterFilter);
  const {error}=await request;
  if(error) throw error;
  cloudCampaignRolls=cloudCampaignRolls.filter(roll=>
    roll.campaign_id!==activeHubCampaignId||(shieldCharacterFilter&&roll.character_id!==shieldCharacterFilter)
  );
  renderCampaignDashboard();
  notify("Historico de rolagens limpo.");
}
function renderMasterShieldCard(summary){
  const pvPct=resourceBarPercent(summary.pvAtual,summary.pvMax);
  const pmPct=resourceBarPercent(summary.pmAtual,summary.pmMax);
  const attrs=ATTR_KEYS.map(key=>`<div><small>${key}</small><strong>${summary.attrs[key]}</strong></div>`).join("");
  const conditionText=summary.conditions.length?summary.conditions.map(escapeHtml).join(" &bull; "):"Sem condicoes";
  return `<article class="masterShieldCard ${summary.status}">
    <div class="shieldCardHeader ${summary.imageUrl?"hasPortrait":""}">
      ${summary.imageUrl?`<img class="shieldPortrait" src="${escapeHtml(summary.imageUrl)}" alt="Retrato de ${escapeHtml(summary.name)}">`:""}
      <div>
        <strong>${escapeHtml(summary.name)}</strong>
        <span>${escapeHtml(summary.raceName)} &bull; ${escapeHtml(summary.className)} nivel ${summary.level}</span>
        ${summary.player?`<small>${escapeHtml(summary.player)}</small>`:""}
      </div>
      <button type="button" data-dashboard-open-character="${escapeHtml(summary.id)}">Ficha</button>
    </div>
    <div class="shieldAttrs">${attrs}</div>
    <div class="shieldResource">
      <div><small>PV</small><strong>${summary.pvAtual}/${summary.pvMax}${summary.pvTemp?` +${summary.pvTemp}`:""}</strong></div>
      <span><i style="width:${pvPct}%"></i></span>
    </div>
    <div class="shieldResource pm">
      <div><small>PM</small><strong>${summary.pmAtual}/${summary.pmMax}${summary.pmTemp?` +${summary.pmTemp}`:""}</strong></div>
      <span><i style="width:${pmPct}%"></i></span>
    </div>
    <div class="shieldStats">
      <div><small>Defesa</small><strong>${summary.defense}</strong></div>
      <div><small>RD</small><strong>${summary.rd}</strong></div>
      <div><small>Desl.</small><strong>${summary.deslocamento}m</strong></div>
      <div><small>Tam.</small><strong>${escapeHtml(summary.tamanho)}</strong></div>
    </div>
    <div class="shieldConditions">${conditionText}</div>
  </article>`;
}
function shouldPollCampaignRolls(){
  return !!(supabaseClient&&cloudUser&&document.body.classList.contains("hub-open")&&activeHubSection==="campanha"&&activeCampaignDashboardTab==="escudo"&&activeHubCampaignId);
}
function stopCampaignRollPolling(){
  if(campaignRollPollTimer){
    clearInterval(campaignRollPollTimer);
    campaignRollPollTimer=null;
  }
}
function syncCampaignRollPolling(){
  if(!shouldPollCampaignRolls()){
    stopCampaignRollPolling();
    return;
  }
  if(campaignRollPollTimer) return;
  campaignRollPollTimer=setInterval(async()=>{
    if(!shouldPollCampaignRolls()){
      stopCampaignRollPolling();
      return;
    }
    try{
      await loadCloudData();
    }catch(error){
      console.warn("Falha ao atualizar escudo:",error);
    }
  },4000);
}
function renderCampaignDashboard(){
  const section=$("#hubCampaignDashboard");
  if(!section) return;
  const campaign=cloudCampaigns.find(item=>item.id===activeHubCampaignId);
  const content=$("#campaignDashboardContent");
  if(!campaign){
    if(content) content.innerHTML=`<div class="hubEmpty">Campanha nao encontrada.</div>`;
    syncCampaignRollPolling();
    return;
  }
  const campaignOwner=isCampaignOwner(campaign);
  if(activeCampaignDashboardTab==="escudo"&&!campaignOwner) activeCampaignDashboardTab="fichas";
  const characters=campaignCharactersForView(campaign,campaignOwner);
  $("#campaignDashboardName").textContent=campaign.name||"Campanha sem nome";
  $("#campaignDashboardMeta").textContent=`${characters.length} ficha${characters.length===1?"":"s"}${campaign.invite_code?` - convite ${campaign.invite_code}`:""}`;
  $("#campaignRenameBtn")?.classList.toggle("hidden",!campaignOwner);
  $("#campaignCreatePrivateCharacterBtn")?.classList.toggle("hidden",!campaignOwner);
  $("#campaignLeaveBtn")?.classList.toggle("hidden",campaignOwner);
  $("#campaignShieldBtn")?.classList.toggle("hidden",!campaignOwner);
  $("#campaignDeleteBtn")?.classList.toggle("hidden",!campaignOwner);
  renderCampaignCharacterLinkPicker();
  renderCampaignCharacterRemovePicker(campaignOwner);
  $$("[data-campaign-panel='escudo']").forEach(button=>button.classList.toggle("hidden",!campaignOwner));
  $$("[data-campaign-panel]").forEach(button=>button.classList.toggle("active",button.dataset.campaignPanel===activeCampaignDashboardTab));
  if(activeCampaignDashboardTab==="escudo"){
    content.className="campaignDashboardContent";
    content.innerHTML=renderMasterShield(characters);
    bindMasterShieldControls();
    $$("[data-dashboard-open-character]").forEach(button=>button.onclick=()=>runCloudAction(()=>openCloudCharacter(button.dataset.dashboardOpenCharacter)));
    syncCampaignRollPolling();
    return;
  }
  syncCampaignRollPolling();
  if(activeCampaignDashboardTab==="jogadores"){
    const players=new Map();
    characters.forEach(character=>{
      const name=String(character.player_name||"Sem jogador").trim()||"Sem jogador";
      const current=players.get(name)||{count:0,characters:[]};
      current.count+=1;
      current.characters.push(character.name||"Personagem sem nome");
      players.set(name,current);
    });
    content.innerHTML=players.size?[...players.entries()].map(([player,info])=>`
      <article class="campaignPlayerCard">
        <small>${info.count} ficha${info.count===1?"":"s"}</small>
        <strong>${escapeHtml(player)}</strong>
        <span>${info.characters.map(escapeHtml).join(" &bull; ")}</span>
      </article>`).join(""):`<div class="hubEmpty">Nenhum jogador com ficha vinculada ainda.</div>`;
    content.className="campaignDashboardContent campaignPlayerGrid";
    return;
  }
  content.className="campaignDashboardContent hubGrid";
  content.innerHTML=characters.length?characters.map(character=>{
    const canDeletePrivate=campaignOwner&&isCampaignOnlyCharacter(character);
    const canRemoveFromCampaign=campaignOwner&&!isCampaignOnlyCharacter(character);
    const imageUrl=characterImageUrlFromData(character.sheet_data);
    return `<article class="hubCard cloudHubCard ${imageUrl?"hasPortrait":""}">
      ${imageUrl?`<img class="hubPortrait" src="${escapeHtml(imageUrl)}" alt="Retrato de ${escapeHtml(character.name||"Personagem sem nome")}">`:""}
      <div class="hubCardBody">
        <small>Nuvem${isPrivateCloudCharacter(character)?` &bull; oculta para jogadores`:""}${character.updated_at?` &bull; atualizado em ${formattedDate(character.updated_at)}`:""}</small>
        <strong>${escapeHtml(character.name||"Personagem sem nome")}</strong>
        <span>${[character.player_name,"Ficha da campanha"].filter(Boolean).map(escapeHtml).join(" &bull; ")}</span>
      </div>
      <div class="hubCardActions characterHubActions${canRemoveFromCampaign?" hasRemove":""}${canDeletePrivate?" hasDelete":""}">
        <button class="hubOpenButton" type="button" data-dashboard-open-character="${escapeHtml(character.id)}">Acessar ficha</button>
        ${canRemoveFromCampaign?`<button class="hubRemoveButton" type="button" data-remove-campaign-character="${escapeHtml(character.id)}">Remover</button>`:""}
        ${canDeletePrivate?`<button class="hubDeleteButton deleteIconButton" type="button" data-delete-private-campaign-character="${escapeHtml(character.id)}" title="Excluir ficha oculta" aria-label="Excluir ficha oculta">${DELETE_ICON_HTML}</button>`:""}
      </div>
    </article>`;
  }).join(""):`<div class="hubEmpty">Nenhuma ficha vinculada a esta campanha ainda.</div>`;
  $$("[data-dashboard-open-character]").forEach(button=>button.onclick=()=>runCloudAction(()=>openCloudCharacter(button.dataset.dashboardOpenCharacter)));
  $$("[data-remove-campaign-character]").forEach(button=>button.onclick=()=>runCloudAction(()=>removeCampaignCharacter(button.dataset.removeCampaignCharacter)));
  $$("[data-delete-private-campaign-character]").forEach(button=>button.onclick=()=>runCloudAction(()=>deleteCampaignPrivateCharacter(button.dataset.deletePrivateCampaignCharacter)));
}
function renderHub(){
  if(!$("#appHub")) return;
  renderHubHome();
  renderHubCharacters();
  renderHubCampaigns();
  renderCampaignDashboard();
}
function localIdForCloudCharacter(remoteId){
  return Object.entries(readCloudCharacterMap()).find(([localId,cloudId])=>cloudId===remoteId&&localStorage.getItem(characterKey(localId)))?.[0]||"";
}
function removeCloudMappingForLocal(localId){
  if(!localId) return;
  const map=readCloudCharacterMap();
  delete map[localId];
  writeCloudCharacterMap(map);
}
function removeCloudMappingForRemote(remoteId){
  if(!remoteId) return;
  const map=readCloudCharacterMap();
  Object.keys(map).forEach(localId=>{
    if(map[localId]===remoteId) delete map[localId];
  });
  writeCloudCharacterMap(map);
}
function removeLocalCopiesForRemoteCharacters(characters,{keepOwn=false}={}){
  (characters||[]).forEach(character=>{
    if(!character?.id) return;
    if(keepOwn&&isOwnCloudCharacter(character)) return;
    const localId=localIdForCloudCharacter(character.id);
    if(localId) removeLocalCharacterOnly(localId);
    else removeCloudMappingForRemote(character.id);
  });
}
function removeLocalCharacterOnly(localId){
  if(!localId) return;
  localStorage.removeItem(characterKey(localId));
  const index=readCharacterIndex();
  const remaining=index.characters.filter(character=>character.id!==localId);
  const nextId=currentCharacterId===localId?remaining[0]?.id||"":(index.activeId===localId?remaining[0]?.id||"":index.activeId);
  writeCharacterIndex({activeId:nextId,characters:remaining});
  if(currentCharacterId!==localId){
    renderCharacterManager();
    return;
  }
  currentCharacterId=nextId;
  setCurrentCloudReadOnly(false);
  if(nextId){
    try{
      const raw=localStorage.getItem(characterKey(nextId));
      applySheetData(raw?JSON.parse(raw):blankSheetData(""));
    }catch{
      applySheetData(blankSheetData(""));
    }
  }else{
    applySheetData(blankSheetData(""));
  }
  renderAll();
}
async function deleteCloudCharacterById(remoteId){
  if(!remoteId||!cloudRequireLogin()) return false;
  const {error}=await supabaseClient.from("characters").delete().eq("id",remoteId);
  if(error) throw error;
  removeCloudMappingForRemote(remoteId);
  await loadCloudData();
  return true;
}
async function deleteCampaignPrivateCharacter(remoteId){
  if(!cloudRequireLogin()||!remoteId) return;
  const character=cloudCharacters.find(entry=>entry.id===remoteId);
  const campaign=cloudCampaigns.find(item=>item.id===character?.campaign_id);
  if(!character||!isCampaignOnlyCharacter(character)){
    notify("Esta acao vale apenas para fichas ocultas da campanha.");
    return;
  }
  if(!isCampaignOwner(campaign)){
    notify("Apenas o mestre pode excluir fichas ocultas da campanha.");
    return;
  }
  const label=character.name||"esta ficha oculta";
  if(!confirm(`Excluir ${label}? Esta ficha oculta sera apagada da campanha.`)) return;
  const localId=localIdForCloudCharacter(remoteId);
  await deleteCloudCharacterById(remoteId);
  if(localId) removeLocalCharacterOnly(localId);
  activeHubCampaignId=campaign.id;
  setHubSection("campanha");
  renderHub();
  notify("Ficha oculta excluida.");
}
async function removeCampaignCharacter(remoteId){
  if(!cloudRequireLogin()||!remoteId) return;
  const character=cloudCharacters.find(entry=>entry.id===remoteId);
  const campaign=cloudCampaigns.find(item=>item.id===character?.campaign_id);
  if(!character||!campaign){
    notify("Ficha da campanha nao encontrada.");
    return;
  }
  if(!isCampaignOwner(campaign)){
    notify("Apenas o mestre pode remover fichas da campanha.");
    return;
  }
  if(isCampaignOnlyCharacter(character)){
    await deleteCampaignPrivateCharacter(remoteId);
    return;
  }
  const label=character.name||"esta ficha";
  if(!confirm(`Remover ${label} da campanha? A ficha nao sera apagada.`)) return;
  if(isOwnCloudCharacter(character)){
    const {error}=await supabaseClient
      .from("characters")
      .update({campaign_id:null,updated_at:new Date().toISOString()})
      .eq("id",remoteId);
    if(error) throw error;
    if(mappedCloudCharacterId()===remoteId && $("#cloudCampaignSelect")) $("#cloudCampaignSelect").value="";
  }else{
    const {error}=await supabaseClient.rpc("remove_character_from_campaign",{character_uuid:remoteId});
    if(error&&/remove_character_from_campaign|function/i.test(String(error.message||""))){
      notify("Rode o SQL supabase_campaign_character_management.sql para habilitar remover fichas de jogadores.");
      return;
    }
    if(error) throw error;
    const localId=localIdForCloudCharacter(remoteId);
    if(localId) removeLocalCharacterOnly(localId);
    else removeCloudMappingForRemote(remoteId);
  }
  await loadCloudData();
  activeHubCampaignId=campaign.id;
  setHubSection("campanha");
  renderHub();
  notify("Ficha removida da campanha.");
}
async function deleteHubCloudCharacter(remoteId){
  if(!cloudRequireLogin()) return;
  const character=cloudCharacters.find(entry=>entry.id===remoteId);
  if(!isOwnCloudCharacter(character)){
    notify("Voce so pode excluir fichas da sua conta.");
    return;
  }
  const label=character?.name||"esta ficha";
  if(!confirm(`Excluir ${label} da nuvem?`)) return;
  await deleteCloudCharacterById(remoteId);
  renderHub();
  notify("Ficha excluida da nuvem.");
}
async function deleteHubLocalCharacter(localId,remoteId=""){
  const index=readCharacterIndex();
  const current=index.characters.find(character=>character.id===localId);
  if(!current) return;
  const label=current.name||"esta ficha";
  const cloudText=remoteId&&cloudUser?" A copia na nuvem tambem sera removida.":"";
  if(!confirm(`Excluir ${label}? Esta acao remove a ficha salva neste navegador.${cloudText}`)) return;
  if(remoteId&&cloudUser) await deleteCloudCharacterById(remoteId);
  removeCloudMappingForLocal(localId);
  localStorage.removeItem(characterKey(localId));
  const remaining=index.characters.filter(character=>character.id!==localId);
  if(!remaining.length){
    setCurrentCloudReadOnly(false);
    currentCharacterId="";
    writeCharacterIndex({activeId:"",characters:[]});
    applySheetData(blankSheetData(""));
    renderAll();
    renderHub();
    notify("Ficha excluida.");
    return;
  }
  const nextId=currentCharacterId===localId?remaining[0].id:(index.activeId===localId?remaining[0].id:index.activeId);
  writeCharacterIndex({activeId:nextId,characters:remaining});
  if(currentCharacterId===localId){
    currentCharacterId=nextId;
    const raw=localStorage.getItem(characterKey(nextId));
    applySheetData(raw?JSON.parse(raw):blankSheetData(""));
    renderAll();
    save(false);
  }else{
    renderCharacterManager();
  }
  renderHub();
  notify("Ficha excluida.");
}
async function openPublicCloudCharacter(remoteId,options={}){
  if(!supabaseClient||!remoteId) throw new Error("Compartilhamento público indisponível.");
  const {data,error}=await supabaseClient
    .rpc("get_public_character",{character_uuid:remoteId})
    .maybeSingle();
  if(error) throw error;
  if(!data) throw new Error("Este link público não está ativo ou a ficha não existe.");
  publicViewCharacter={
    id:data.id,
    name:data.name||"Personagem",
    player_name:data.player_name||"",
    updated_at:data.updated_at||""
  };
  applySheetData(data.sheet_data||{});
  document.body.classList.remove("auth-gated","hub-open");
  document.body.classList.add("public-view");
  setCurrentCloudReadOnly(true);
  renderAll();
  openSheetView({updateRoute:options.updateRoute});
  setSaveStatus("Visualização pública","idle");
  notify(`Ficha pública de <b>${escapeHtml(publicViewCharacter.name)}</b> aberta em modo somente leitura.`);
}
async function openCloudCharacter(remoteId,options={}){
  if(!cloudRequireLogin()) return;
  if(publicViewActive()) leavePublicView();
  const {data,error}=await supabaseClient.from("characters").select("id,name,owner_id,player_name,sheet_data,campaign_id,is_public,is_private,updated_at").eq("id",remoteId).single();
  if(error) throw error;
  const currentRemoteId=mappedCloudCharacterId();
  if(currentRemoteId&&currentRemoteId!==remoteId) save(false);
  else clearCloudAutosaveTimer(remoteId);
  const localId=localIdForCloudCharacter(remoteId);
  if(localId){
    currentCharacterId=localId;
    const index=readCharacterIndex();
    index.activeId=localId;
    writeCharacterIndex(index);
  }else{
    createCharacter(data.sheet_data,characterNameFromData(data.sheet_data,data.name||"Personagem da nuvem"));
  }
  applySheetData(data.sheet_data);
  setMappedCloudCharacterId(data.id);
  cacheLocalCharacterData(currentCharacterId,data.sheet_data,data.name,data.updated_at);
  setCurrentCloudReadOnly(isCloudCharacterReadOnly(data));
  if($("#cloudCampaignSelect")) $("#cloudCampaignSelect").value=data.campaign_id||"";
  renderAll();
  openSheetView({updateRoute:options.updateRoute});
  notify(`Ficha carregada da nuvem: <b>${escapeHtml(data.name||"personagem")}</b>${currentCloudReadOnly?"<br><small>Somente leitura: apenas o dono pode salvar alteracoes na nuvem.</small>":""}`);
}
function createCharacter(data,name){
  const normalized=normalizeSheetData(data);
  const id=newCharacterId();
  const index=readCharacterIndex();
  const now=new Date().toISOString();
  index.characters.push({id,name:name||characterNameFromData(normalized),updatedAt:now});
  index.activeId=id;
  currentCharacterId=id;
  setCurrentCloudReadOnly(false);
  localStorage.setItem(characterKey(id),JSON.stringify(normalized));
  writeCharacterIndex(index);
  renderCharacterManager();
  return id;
}
function updateActiveCharacterMeta(data){
  if(!currentCharacterId) return;
  const index=readCharacterIndex();
  let meta=index.characters.find(character=>character.id===currentCharacterId);
  if(!meta){
    meta={id:currentCharacterId,name:characterNameFromData(data),updatedAt:""};
    index.characters.push(meta);
  }
  meta.name=characterNameFromData(data,meta.name);
  meta.updatedAt=new Date().toISOString();
  index.activeId=currentCharacterId;
  writeCharacterIndex(index);
  renderCharacterManager();
}
function findLegacySheetData(){
  const keys=[KEY,...LEGACY_KEYS];
  for(const key of keys){
    const raw=localStorage.getItem(key);
    if(!raw) continue;
    try{return normalizeSheetData(JSON.parse(raw))}
    catch(err){console.warn(`Falha ao migrar ${key}:`,err)}
  }
  return null;
}
function load(){
  let index=readCharacterIndex();
  if(!index.characters.length&&localStorage.getItem(LEGACY_MIGRATED_KEY)!=="1"){
    const legacy=findLegacySheetData();
    if(legacy){
      createCharacter(legacy,characterNameFromData(legacy));
      index=readCharacterIndex();
    }
  }
  localStorage.setItem(LEGACY_MIGRATED_KEY,"1");
  currentCharacterId=index.activeId||index.characters[0]?.id||"";
  if(!currentCharacterId){
    setCurrentCloudReadOnly(false);
    applySheetData(blankSheetData(""));
    renderCharacterManager();
    return;
  }
  setCurrentCloudReadOnly(false);
  try{
    const raw=localStorage.getItem(characterKey(currentCharacterId));
    const data=raw?JSON.parse(raw):blankSheetData("");
    applySheetData(data);
    save(false);
  }catch(err){
    console.error("Falha ao carregar personagem:",err);
    applySheetData(blankSheetData(""));
  }
  renderCharacterManager();
}
function saveLocalSnapshot(show=true){
  if(!currentCharacterId){
    if(!show) return;
    createCharacter(sheetDataFromCurrent(),characterNameFromData(sheetDataFromCurrent()));
  }
  const data=sheetDataFromCurrent();
  localStorage.setItem(characterKey(currentCharacterId),JSON.stringify(data));
  updateActiveCharacterMeta(data);
  markSaved("Salvo localmente");
  if(show) notify("Personagem salvo neste navegador.");
}
function cacheLocalCharacterData(localId,data,name="",updatedAt=""){
  if(!localId||!data) return;
  const normalized=normalizeSheetData(data);
  localStorage.setItem(characterKey(localId),JSON.stringify(normalized));
  const index=readCharacterIndex();
  let meta=index.characters.find(character=>character.id===localId);
  if(!meta){
    meta={id:localId,name:name||characterNameFromData(normalized),updatedAt:updatedAt||new Date().toISOString()};
    index.characters.push(meta);
  }
  meta.name=name||characterNameFromData(normalized,meta.name);
  meta.updatedAt=updatedAt||new Date().toISOString();
  writeCharacterIndex({...index,activeId:currentCharacterId||localId});
}
function save(show=true){
  if(publicViewActive()){
    if(show) notify("Esta ficha pública está em modo somente leitura.");
    return;
  }
  if(cloudFirstMode()){
    if(show) return runCloudAction(()=>saveCloudCharacter(true));
    if(!mappedCloudCharacterId()){
      saveLocalSnapshot(false);
      return;
    }
    queueCloudAutosave();
    return;
  }
  return saveLocalSnapshot(show);
}
function switchCharacter(id){
  if(!id||id===currentCharacterId) return;
  save(false);
  const raw=localStorage.getItem(characterKey(id));
  if(!raw){alert("Personagem não encontrado neste navegador.");renderCharacterManager();return}
  try{
    const targetRemoteId=readCloudCharacterMap()[id]||"";
    const cloudMeta=cloudFirstMode()&&targetRemoteId?cloudCharacters.find(character=>character.id===targetRemoteId):null;
    const data=cloudMeta?.sheet_data?normalizeSheetData(cloudMeta.sheet_data):JSON.parse(raw);
    currentCharacterId=id;
    setCurrentCloudReadOnly(isCloudCharacterReadOnly(cloudMeta));
    const index=readCharacterIndex();
    index.activeId=id;
    writeCharacterIndex(index);
    applySheetData(data);
    if(cloudMeta){
      cacheLocalCharacterData(id,data,cloudMeta.name||characterNameFromData(data),cloudMeta.updated_at);
      if($("#cloudCampaignSelect")) $("#cloudCampaignSelect").value=cloudMeta.campaign_id||"";
    }else if(targetRemoteId){
      removeCloudMappingForRemote(targetRemoteId);
      if($("#cloudCampaignSelect")) $("#cloudCampaignSelect").value="";
    }else if($("#cloudCampaignSelect")){
      $("#cloudCampaignSelect").value="";
    }
    renderAll();
    if(!cloudFirstMode()) save(false);
    notify(`Personagem carregado: <b>${escapeHtml(value("nome")||"sem nome")}</b>`);
  }catch(err){
    console.error("Falha ao trocar personagem:",err);
    alert("Não foi possível carregar este personagem.");
  }
}
function newCharacter(){
  save(false);
  const data=blankSheetData("Novo personagem");
  createCharacter(data,"Novo personagem");
  if($("#cloudCampaignSelect")) $("#cloudCampaignSelect").value="";
  setCurrentCloudReadOnly(false);
  applySheetData(data);
  renderAll();
  if(cloudFirstMode()) runCloudAction(()=>saveCloudCharacter(false));
  else save(false);
  notify("Novo personagem criado.");
}
function duplicateCharacter(){
  save(false);
  const data=sheetDataFromCurrent();
  const name=`${characterNameFromData(data)} (cópia)`;
  data.fields.nome=name;
  createCharacter(data,name);
  applySheetData(data);
  renderAll();
  if(cloudFirstMode()) runCloudAction(()=>saveCloudCharacter(false));
  else save(false);
  notify("Personagem duplicado.");
}
function renameCharacter(){
  const current=String(value("nome")||"").trim()||"Personagem sem nome";
  const name=prompt("Novo nome do personagem:",current);
  if(name===null) return;
  restoreSavedField("nome",name.trim()||"Personagem sem nome");
  recalc();
  save(false);
  notify("Personagem renomeado.");
}
function deleteCharacter(){
  const index=readCharacterIndex();
  if(!currentCharacterId) return;
  const current=index.characters.find(character=>character.id===currentCharacterId);
  const label=current?.name||"este personagem";
  if(!confirm(`Excluir ${label}? Esta ação remove o personagem salvo neste navegador.`)) return;
  localStorage.removeItem(characterKey(currentCharacterId));
  const remaining=index.characters.filter(character=>character.id!==currentCharacterId);
  if(!remaining.length){
    removeCloudMappingForLocal(currentCharacterId);
    setCurrentCloudReadOnly(false);
    currentCharacterId="";
    writeCharacterIndex({activeId:"",characters:[]});
    applySheetData(blankSheetData(""));
    renderAll();
    openHub("fichas");
    notify("Personagem excluido.");
    return;
  }
  const nextId=remaining[0].id;
  writeCharacterIndex({activeId:nextId,characters:remaining});
  currentCharacterId=nextId;
  const raw=localStorage.getItem(characterKey(nextId));
  applySheetData(raw?JSON.parse(raw):blankSheetData(""));
  renderAll();
  save(false);
  writeBrowserRoute(currentSheetRoute(),{replace:true});
  notify("Personagem excluído.");
}
function resetCurrentCharacter(){
  if(!confirm("Limpar os dados do personagem atual?")) return;
  const data=blankSheetData("Novo personagem");
  applySheetData(data);
  renderAll();
  save(false);
  notify("Ficha atual limpa.");
}
function importSheetData(data){
  const normalized=normalizeSheetData(data);
  const asNew=confirm("Importar como novo personagem? Clique em Cancelar para substituir o personagem atual.");
  if(asNew||!currentCharacterId){
    save(false);
    createCharacter(normalized,characterNameFromData(normalized,"Personagem importado"));
  }
  applySheetData(normalized);
  renderAll();
  if(cloudFirstMode()&&(asNew||!mappedCloudCharacterId())) runCloudAction(()=>saveCloudCharacter(false));
  else save(false);
  notify(asNew?"Personagem importado.":"Personagem atual substituído pelo JSON importado.");
}
function sheetDataForJsonExport(){
  const data=sheetDataFromCurrent();
  delete data.fields.portraitUrl;
  delete data.fields.portraitPath;
  delete data.fields.imageUrl;
  return data;
}
function exportSheet(){
  const data=sheetDataForJsonExport();
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`ficha-${(value("nome")||"personagem").replace(/\W+/g,"-")}.json`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),0);
  notify("JSON exportado sem o retrato para manter o arquivo leve.");
}
function readCloudCharacterMap(){
  try{return JSON.parse(localStorage.getItem(CLOUD_CHARACTER_MAP_KEY)||"{}")||{}}
  catch{return {}}
}
function writeCloudCharacterMap(map){
  localStorage.setItem(CLOUD_CHARACTER_MAP_KEY,JSON.stringify(map||{}));
}
function mappedCloudCharacterId(){
  return currentCharacterId?readCloudCharacterMap()[currentCharacterId]||"":"";
}
function setMappedCloudCharacterId(remoteId){
  if(!currentCharacterId||!remoteId) return;
  const map=readCloudCharacterMap();
  map[currentCharacterId]=remoteId;
  writeCloudCharacterMap(map);
}
function syncCloudCharacterSelection(){
  const select=$("#cloudCharacterSelect");
  if(!select) return;
  const remoteId=mappedCloudCharacterId();
  if(remoteId && [...select.options].some(option=>option.value===remoteId)) select.value=remoteId;
  else select.value="";
}
function isCloudCharacterReadOnly(character){
  return !!(character?.owner_id&&cloudUser&&character.owner_id!==cloudUser.id);
}
function syncCloudReadOnlyControls(){
  const controls=$$(".wrap input:not([readonly]), .wrap select, .wrap textarea:not([readonly])");
  controls.forEach(control=>{
    if(currentCloudReadOnly){
      if(control.dataset.readonlyWasDisabled===undefined) control.dataset.readonlyWasDisabled=control.disabled?"1":"0";
      control.disabled=true;
    }else if(control.dataset.readonlyWasDisabled!==undefined){
      control.disabled=control.dataset.readonlyWasDisabled==="1";
      delete control.dataset.readonlyWasDisabled;
    }
  });
}
function setCurrentCloudReadOnly(readOnly){
  currentCloudReadOnly=!!readOnly;
  document.body.classList.toggle("cloud-readonly",currentCloudReadOnly);
  syncCloudReadOnlyControls();
}
function currentCloudCharacterMeta(remoteId=mappedCloudCharacterId()){
  return remoteId?cloudCharacters.find(character=>character.id===remoteId)||null:null;
}
function currentCampaignIdForRoll(){
  return currentCloudCharacterMeta()?.campaign_id||"";
}
async function loadCampaignRolls(){
  if(!supabaseClient||!cloudUser){
    cloudCampaignRolls=[];
    return;
  }
  const {data,error}=await supabaseClient
    .from("campaign_rolls")
    .select("id,campaign_id,character_id,user_id,actor_name,roll_type,title,total_attack,total_damage,d20,damage_details,is_critical,is_fumble,payload,created_at")
    .order("created_at",{ascending:false})
    .limit(120);
  if(error){
    console.warn("Historico de rolagens indisponivel:",error);
    cloudCampaignRolls=[];
    return;
  }
  cloudCampaignRolls=data||[];
}
function missingInitiativeSchema(error){
  const message=String(error?.message||error?.details||"");
  return ["42P01","PGRST205","PGRST204"].includes(error?.code)||/campaign_encounters|campaign_initiative_entries/i.test(message);
}
async function loadCampaignInitiative(){
  if(!supabaseClient||!cloudUser){
    cloudCampaignEncounters=[];
    cloudInitiativeEntries=[];
    return;
  }
  const {data:encounters,error:encounterError}=await supabaseClient
    .from("campaign_encounters")
    .select("id,campaign_id,created_by,status,round_number,current_entry_id,created_at,updated_at,ended_at")
    .in("status",["collecting","active"])
    .order("created_at",{ascending:false});
  if(encounterError){
    if(missingInitiativeSchema(encounterError)){
      campaignInitiativeAvailable=false;
      cloudCampaignEncounters=[];
      cloudInitiativeEntries=[];
      return;
    }
    throw encounterError;
  }
  campaignInitiativeAvailable=true;
  cloudCampaignEncounters=encounters||[];
  const encounterIds=cloudCampaignEncounters.map(encounter=>encounter.id);
  if(!encounterIds.length){
    cloudInitiativeEntries=[];
    return;
  }
  const {data:entries,error:entryError}=await supabaseClient
    .from("campaign_initiative_entries")
    .select("id,encounter_id,campaign_id,character_id,user_id,actor_name,initiative_total,initiative_bonus,d20,position,participant_state,source,created_at,updated_at")
    .in("encounter_id",encounterIds);
  if(entryError){
    if(missingInitiativeSchema(entryError)){
      campaignInitiativeAvailable=false;
      cloudInitiativeEntries=[];
      return;
    }
    throw entryError;
  }
  cloudInitiativeEntries=entries||[];
}
async function confirmInitiativeRollCapture(roll,campaignId){
  if(roll?.type!=="d20"||foldItemText(roll.title)!=="iniciativa") return;
  const {data,error}=await supabaseClient
    .from("campaign_encounters")
    .select("id")
    .eq("campaign_id",campaignId)
    .in("status",["collecting","active"])
    .limit(1);
  if(!error&&data?.length) markSaved("Iniciativa enviada ao mestre",4200);
}
async function recordCampaignRoll(roll){
  if(!supabaseClient||!cloudUser||!roll) return;
  const campaignId=currentCampaignIdForRoll();
  if(!campaignId) return;
  const character=currentCloudCharacterMeta();
  const remoteId=character?.id||mappedCloudCharacterId()||null;
  const actorName=value("nome")||character?.name||"Personagem";
  const payload={
    ...roll,
    characterName:actorName,
    playerName:value("jogador")||cloudUser.email||"",
    createdAt:new Date().toISOString()
  };
  const rollRow={
    campaign_id:campaignId,
    character_id:remoteId,
    user_id:cloudUser.id,
    actor_name:actorName,
    roll_type:roll.type||"roll",
    title:roll.title||"Rolagem",
    total_attack:Number.isFinite(roll.totalAttack)?roll.totalAttack:null,
    total_damage:Number.isFinite(roll.totalDamage)?roll.totalDamage:null,
    d20:Number.isFinite(roll.d20)?roll.d20:null,
    damage_details:roll.damageDetails||"",
    is_critical:!!roll.isCritical,
    is_fumble:!!roll.isFumble,
    payload
  };
  const campaign=cloudCampaigns.find(item=>item.id===campaignId);
  if(isCampaignOwner(campaign)){
    const {data,error}=await supabaseClient.from("campaign_rolls").insert(rollRow).select("id,campaign_id,character_id,user_id,actor_name,roll_type,title,total_attack,total_damage,d20,damage_details,is_critical,is_fumble,payload,created_at").single();
    if(error) throw error;
    cloudCampaignRolls=[data,...cloudCampaignRolls].slice(0,120);
    if(activeHubCampaignId===campaignId&&activeCampaignDashboardTab==="escudo") renderCampaignDashboard();
    await confirmInitiativeRollCapture(roll,campaignId);
    return;
  }
  const {error}=await supabaseClient.from("campaign_rolls").insert(rollRow);
  if(error) throw error;
  await confirmInitiativeRollCapture(roll,campaignId);
}
function setCloudStatus(text){
  const status=$("#cloudStatus");
  if(status) status.textContent=text;
}
function closeProfileMenu(){
  $("#profileDropdown")?.classList.add("hidden");
  $("#profileMenuBtn")?.setAttribute("aria-expanded","false");
}
function closeSheetActionMenu(){
  $("#sheetActionDropdown")?.classList.add("hidden");
  $("#sheetActionMenuBtn")?.setAttribute("aria-expanded","false");
}
function toggleProfileMenu(){
  const dropdown=$("#profileDropdown"),button=$("#profileMenuBtn");
  if(!dropdown||!button) return;
  const open=dropdown.classList.toggle("hidden")===false;
  button.setAttribute("aria-expanded",open?"true":"false");
}
function toggleSheetActionMenu(){
  const dropdown=$("#sheetActionDropdown"),button=$("#sheetActionMenuBtn");
  if(!dropdown||!button) return;
  const open=dropdown.classList.toggle("hidden")===false;
  button.setAttribute("aria-expanded",open?"true":"false");
}
function renderProfileMenu(){
  const signedIn=!!cloudUser;
  const label=publicViewActive()?"Visitante":(signedIn?(cloudUser.email||"Conectado"):"Offline");
  const status=publicViewActive()?"Ficha pública":(signedIn?(currentCloudReadOnly?"Somente leitura":"Nuvem conectada"):"Modo local");
  const initial=(label.trim()[0]||"?").toUpperCase();
  if($("#profileName")) $("#profileName").textContent=label;
  if($("#profileStatus")) $("#profileStatus").textContent=status;
  if($("#profileAvatar")) $("#profileAvatar").textContent=initial;
  $("#profileCloudBtn")?.classList.toggle("hidden",signedIn);
  if($("#profileLogoutBtn")){
    $("#profileLogoutBtn").classList.toggle("hidden",publicViewActive());
    $("#profileLogoutBtn").textContent=signedIn?"Logout":"Sair";
  }
}
function enterApp(mode="offline"){
  const wasGated=document.body.classList.contains("auth-gated");
  if(mode==="cloud"){
    localStorage.removeItem(AUTH_MODE_KEY);
    sessionStorage.removeItem(AUTH_MODE_KEY);
  }else{
    localStorage.removeItem(AUTH_MODE_KEY);
    sessionStorage.setItem(AUTH_MODE_KEY,"offline");
  }
  document.body.classList.remove("auth-gated");
  setSaveStatus(mode==="cloud"?"Nuvem pronta":"Modo local","idle");
  if(wasGated) openHub("inicio",{updateRoute:!browserRoutingReady});
  else{renderCloudPanel();renderHub()}
}
function showAuthGate(){
  stopCampaignRollPolling();
  document.body.classList.add("auth-gated");
  document.body.classList.remove("hub-open");
  renderCloudPanel();
}
function renderCloudPanel(){
  const signedIn=!!cloudUser;
  renderProfileMenu();
  renderSheetCampaignShortcut();
  $("#cloudSignedOut")?.classList.toggle("hidden",signedIn);
  $("#cloudSignedIn")?.classList.toggle("hidden",!signedIn);
  setCloudStatus(signedIn?(cloudUser.email||"Conectado"):(document.body.classList.contains("auth-gated")?"Desconectado":"Offline"));
  const charSelect=$("#cloudCharacterSelect");
  if(charSelect){
    const cloudOptions=ownCloudCharacters().filter(character=>!isCampaignOnlyCharacter(character));
    charSelect.innerHTML='<option value="">Nova ficha na nuvem</option>'+cloudOptions.map(character=>{
      const updated=character.updated_at?new Date(character.updated_at).toLocaleDateString("pt-BR"):"";
      return `<option value="${escapeHtml(character.id)}">${escapeHtml(character.name||"Personagem sem nome")}${updated?` (${updated})`:""}</option>`;
    }).join("");
  }
  const campaignSelect=$("#cloudCampaignSelect");
  if(campaignSelect){
    campaignSelect.innerHTML='<option value="">Sem campanha</option>'+cloudCampaigns.map(campaign=>
      `<option value="${escapeHtml(campaign.id)}">${escapeHtml(campaign.name||"Campanha sem nome")}${campaign.invite_code?` • ${escapeHtml(campaign.invite_code)}`:""}</option>`
    ).join("");
  }
  syncCloudCharacterSelection();
  const selectedCloud=ownCloudCharacters().find(character=>character.id===value("cloudCharacterSelect"));
  if(selectedCloud?.campaign_id && campaignSelect) campaignSelect.value=selectedCloud.campaign_id;
  const cloudSaveButton=$("#cloudSaveCharacterBtn");
  if(cloudSaveButton){
    cloudSaveButton.disabled=currentCloudReadOnly;
    cloudSaveButton.title=currentCloudReadOnly?"Somente o dono pode salvar esta ficha na nuvem":"";
  }
  const actionSaveCloudButton=$("#actionSaveCloudBtn");
  if(actionSaveCloudButton){
    actionSaveCloudButton.disabled=currentCloudReadOnly;
    actionSaveCloudButton.title=currentCloudReadOnly?"Somente o dono pode salvar esta ficha na nuvem":"";
  }
  const currentCharacter=currentCloudCharacterMeta();
  const canShare=!!(signedIn&&currentCharacter&&isOwnCloudCharacter(currentCharacter)&&!currentCloudReadOnly&&!isPrivateCloudCharacter(currentCharacter));
  const shareButton=$("#actionShareCharacterBtn");
  if(shareButton){
    shareButton.classList.toggle("hidden",!canShare);
    shareButton.textContent=currentCharacter?.is_public?"Copiar link público":"Ativar link público";
  }
  const disableShareButton=$("#actionDisableShareBtn");
  if(disableShareButton) disableShareButton.classList.toggle("hidden",!canShare||!currentCharacter?.is_public);
}
function syncCurrentCharacterFromCloud(){
  const remoteId=mappedCloudCharacterId();
  if(!remoteId||!currentCharacterId) return;
  const cloudMeta=cloudCharacters.find(character=>character.id===remoteId);
  if(!cloudMeta){
    removeLocalCharacterOnly(currentCharacterId);
    removeCloudMappingForRemote(remoteId);
    return;
  }
  clearCloudAutosaveTimer(remoteId);
  const data=normalizeSheetData(cloudMeta.sheet_data||{});
  applySheetData(data);
  cacheLocalCharacterData(currentCharacterId,data,cloudMeta.name||characterNameFromData(data),cloudMeta.updated_at);
  setCurrentCloudReadOnly(isCloudCharacterReadOnly(cloudMeta));
  if($("#cloudCampaignSelect")) $("#cloudCampaignSelect").value=cloudMeta.campaign_id||"";
  renderAll();
}
async function loadCloudData(options={}){
  if(!supabaseClient||!cloudUser){
    cloudCharacters=[];
    cloudCampaigns=[];
    cloudCampaignRolls=[];
    cloudCampaignEncounters=[];
    cloudInitiativeEntries=[];
    setCurrentCloudReadOnly(false);
    renderCloudPanel();
    renderHub();
    return;
  }
  const characterColumns="id,owner_id,name,player_name,campaign_id,is_public,is_private,updated_at,sheet_data";
  let [{data:campaigns,error:campaignError},{data:characters,error:characterError}]=await Promise.all([
    supabaseClient.from("campaigns").select("id,owner_id,name,invite_code,updated_at").order("updated_at",{ascending:false}),
    supabaseClient.from("characters").select(characterColumns).order("updated_at",{ascending:false})
  ]);
  if(campaignError) throw campaignError;
  if(characterError&&/is_private|column/i.test(String(characterError.message||""))){
    const fallback=await supabaseClient
      .from("characters")
      .select("id,owner_id,name,player_name,campaign_id,is_public,updated_at,sheet_data")
      .order("updated_at",{ascending:false});
    characters=(fallback.data||[]).map(character=>({...character,is_private:false}));
    characterError=fallback.error;
  }
  if(characterError) throw characterError;
  cloudCampaigns=campaigns||[];
  cloudCharacters=characters||[];
  setCurrentCloudReadOnly(isCloudCharacterReadOnly(currentCloudCharacterMeta()));
  if(options.syncCurrent) syncCurrentCharacterFromCloud();
  await Promise.all([loadCampaignRolls(),loadCampaignInitiative()]);
  renderCloudPanel();
  renderHub();
}
function cloudRequireLogin(){
  if(supabaseClient&&cloudUser) return true;
  notify("Entre na nuvem antes de usar este recurso.");
  return false;
}
function cloudPayloadFromCurrent(remoteId=""){
  const data=sheetDataFromCurrent();
  return {
    owner_id:cloudUser.id,
    campaign_id:cloudCampaignIdForSave(remoteId)||null,
    name:characterNameFromData(data),
    player_name:value("jogador")||null,
    sheet_data:data,
    updated_at:new Date().toISOString()
  };
}
// Salvar a ficha nunca altera sua campanha; vinculos e remocoes usam fluxos explicitos.
function cloudCharacterUpdatePayload(data){
  const normalized=normalizeSheetData(data);
  return {
    owner_id:cloudUser.id,
    name:characterNameFromData(normalized),
    player_name:normalized.fields?.jogador||null,
    sheet_data:normalized,
    updated_at:new Date().toISOString()
  };
}
async function saveCloudCharacter(show=true){
  if(!cloudRequireLogin()) return;
  if(!currentCharacterId){
    if(show) notify("Crie ou abra uma ficha antes de salvar na nuvem.");
    return;
  }
  const selected=mappedCloudCharacterId();
  if(selected&&cloudAutosaveTimers.has(selected)){
    clearTimeout(cloudAutosaveTimers.get(selected));
    cloudAutosaveTimers.delete(selected);
  }
  const selectedMeta=selected?cloudCharacters.find(character=>character.id===selected):null;
  if(currentCloudReadOnly||isCloudCharacterReadOnly(selectedMeta)){
    setCurrentCloudReadOnly(true);
    renderCloudPanel();
    markSaveWarning("Somente leitura");
    notify("Ficha em modo somente leitura. Apenas o dono pode salvar alteracoes na nuvem.");
    return;
  }
  markSaving("Salvando...");
  const preparedData=await preparePortraitDataForCloud(sheetDataFromCurrent(),selected||currentCharacterId);
  applyPreparedPortraitFields(preparedData);
  const payload=selected?cloudCharacterUpdatePayload(preparedData):{
    ...cloudPayloadFromCurrent(),
    name:characterNameFromData(preparedData),
    player_name:preparedData.fields?.jogador||null,
    sheet_data:preparedData
  };
  const request=selected
    ? supabaseClient.from("characters").update(payload).eq("id",selected).eq("owner_id",cloudUser.id).select("id,name,campaign_id,updated_at").single()
    : supabaseClient.from("characters").insert(payload).select("id,name,campaign_id,updated_at").single();
  const {data,error}=await request;
  if(error) throw error;
  setMappedCloudCharacterId(data.id);
  cacheLocalCharacterData(currentCharacterId,payload.sheet_data,data.name||payload.name,data.updated_at);
  await loadCloudData();
  if(!document.body.classList.contains("hub-open")) writeBrowserRoute(currentSheetRoute(),{replace:true});
  markSaved("Salvo na nuvem");
  if(show) notify(`Ficha salva na nuvem: <b>${escapeHtml(data.name||payload.name)}</b>`);
}
function publicCharacterShareUrl(remoteId){
  const hosted=/^https?:$/.test(location.protocol)&&!['localhost','127.0.0.1'].includes(location.hostname);
  const origin=hosted?location.origin:"https://fichatormenta20.netlify.app";
  return `${origin}/fichas/${encodeURIComponent(remoteId)}`;
}
async function copyPublicCharacterLink(remoteId){
  const url=publicCharacterShareUrl(remoteId);
  try{
    await navigator.clipboard.writeText(url);
    notify("Link público copiado. Qualquer pessoa com o endereço poderá visualizar a ficha em modo somente leitura.");
  }catch{
    prompt("Copie o link público da ficha:",url);
  }
}
async function shareCurrentCloudCharacter(){
  if(!cloudRequireLogin()||currentCloudReadOnly) return;
  await saveCloudCharacter(false);
  const remoteId=mappedCloudCharacterId();
  const character=currentCloudCharacterMeta(remoteId);
  if(!remoteId||!character) throw new Error("Salve a ficha na nuvem antes de compartilhar.");
  if(isPrivateCloudCharacter(character)) throw new Error("Fichas ocultas de campanha não podem ser compartilhadas publicamente.");
  if(!character.is_public){
    const {error}=await supabaseClient
      .from("characters")
      .update({is_public:true,updated_at:new Date().toISOString()})
      .eq("id",remoteId)
      .eq("owner_id",cloudUser.id);
    if(error) throw error;
    await loadCloudData();
  }
  renderCloudPanel();
  await copyPublicCharacterLink(remoteId);
}
async function disableCurrentCharacterShare(){
  if(!cloudRequireLogin()||currentCloudReadOnly) return;
  const remoteId=mappedCloudCharacterId();
  const character=currentCloudCharacterMeta(remoteId);
  if(!remoteId||!character?.is_public) return;
  if(!confirm("Desativar o link público desta ficha? Quem tiver o endereço deixará de conseguir visualizá-la.")) return;
  const {error}=await supabaseClient
    .from("characters")
    .update({is_public:false,updated_at:new Date().toISOString()})
    .eq("id",remoteId)
    .eq("owner_id",cloudUser.id);
  if(error) throw error;
  await loadCloudData();
  renderCloudPanel();
  notify("Link público desativado.");
}
async function loadSelectedCloudCharacter(){
  if(!cloudRequireLogin()) return;
  const remoteId=value("cloudCharacterSelect");
  if(!remoteId){notify("Escolha uma ficha da nuvem para carregar.");return}
  const {data,error}=await supabaseClient.from("characters").select("id,name,owner_id,player_name,sheet_data,campaign_id,is_public,is_private,updated_at").eq("id",remoteId).single();
  if(error) throw error;
  if(!confirm(`Carregar "${data.name||"personagem"}" da nuvem e substituir a ficha atual neste navegador?`)) return;
  const currentRemoteId=mappedCloudCharacterId();
  if(currentRemoteId&&currentRemoteId!==remoteId) save(false);
  else clearCloudAutosaveTimer(remoteId);
  if(!currentCharacterId) createCharacter(data.sheet_data,characterNameFromData(data.sheet_data,data.name||"Personagem da nuvem"));
  applySheetData(data.sheet_data);
  setMappedCloudCharacterId(data.id);
  cacheLocalCharacterData(currentCharacterId,data.sheet_data,data.name,data.updated_at);
  setCurrentCloudReadOnly(isCloudCharacterReadOnly(data));
  if($("#cloudCampaignSelect")) $("#cloudCampaignSelect").value=data.campaign_id||"";
  renderAll();
  openSheetView();
  notify(`Ficha carregada da nuvem: <b>${escapeHtml(data.name||"personagem")}</b>${currentCloudReadOnly?"<br><small>Somente leitura: apenas o dono pode salvar alteracoes na nuvem.</small>":""}`);
}
async function createCloudCampaign(){
  if(!cloudRequireLogin()) return;
  const name=prompt("Nome da campanha:");
  if(name===null) return;
  const campaignName=name.trim()||"Nova campanha";
  const masterName=value("jogador")||cloudUser.email||null;
  let {data,error}=await supabaseClient.rpc("create_campaign",{
    campaign_name:campaignName,
    master_name_input:masterName
  });
  if(error&&String(error.message||"").includes("Could not find the function")){
    ({data,error}=await supabaseClient.from("campaigns").insert({
      owner_id:cloudUser.id,
      name:campaignName,
      master_name:masterName,
      updated_at:new Date().toISOString()
    }).select("id,name,invite_code,updated_at").single());
  }
  if(error) throw error;
  const campaign=Array.isArray(data)?data[0]:data;
  await loadCloudData();
  if(campaign?.id && $("#cloudCampaignSelect")) $("#cloudCampaignSelect").value=campaign.id;
  setHubSection("campanhas");
  renderHub();
  notify(`Campanha criada: <b>${escapeHtml(campaign?.name||campaignName)}</b>`);
}
async function deleteCloudCampaign(campaignId=activeHubCampaignId){
  if(!cloudRequireLogin()||!campaignId) return;
  const campaign=cloudCampaigns.find(item=>item.id===campaignId);
  if(!isCampaignOwner(campaign)){
    notify("Apenas o mestre que criou a campanha pode exclui-la.");
    return;
  }
  const count=cloudCharacters.filter(character=>character.campaign_id===campaignId).length;
  const hiddenCharacters=cloudCharacters.filter(character=>character.campaign_id===campaignId&&isPrivateCloudCharacter(character));
  const foreignCharacters=cloudCharacters.filter(character=>character.campaign_id===campaignId&&!isOwnCloudCharacter(character));
  const name=campaign?.name||"esta campanha";
  const detail=count?` As ${count} ficha${count===1?"":"s"} vinculada${count===1?"":"s"} nao serao apagadas.`:"";
  const hiddenDetail=hiddenCharacters.length?` As ${hiddenCharacters.length} ficha${hiddenCharacters.length===1?" oculta sera apagada":"s ocultas serao apagadas"} junto com a campanha.`:"";
  if(!confirm(`Excluir ${name}?${detail}${hiddenDetail}`)) return;
  removeLocalCopiesForRemoteCharacters(hiddenCharacters);
  removeLocalCopiesForRemoteCharacters(foreignCharacters);
  if(hiddenCharacters.length){
    const {error:hiddenError}=await supabaseClient
      .from("characters")
      .delete()
      .eq("campaign_id",campaignId)
      .eq("owner_id",cloudUser.id)
      .eq("is_private",true);
    if(hiddenError) throw hiddenError;
  }
  await supabaseClient.from("campaign_rolls").delete().eq("campaign_id",campaignId);
  await supabaseClient.from("campaign_members").delete().eq("campaign_id",campaignId);
  const {error}=await supabaseClient.from("campaigns").delete().eq("id",campaignId);
  if(error) throw error;
  if($("#cloudCampaignSelect")?.value===campaignId) $("#cloudCampaignSelect").value="";
  activeHubCampaignId="";
  activeCampaignDashboardTab="fichas";
  shieldCharacterFilter="";
  await loadCloudData();
  openHub("campanhas");
  notify(`Campanha excluida: <b>${escapeHtml(name)}</b>`);
}
async function renameCloudCampaign(campaignId=activeHubCampaignId){
  if(!cloudRequireLogin()||!campaignId) return;
  const campaign=cloudCampaigns.find(item=>item.id===campaignId);
  if(!isCampaignOwner(campaign)){
    notify("Apenas o mestre que criou a campanha pode renomea-la.");
    return;
  }
  const currentName=campaign?.name||"Campanha sem nome";
  const nextName=prompt("Novo nome da campanha:",currentName);
  if(nextName===null) return;
  const name=nextName.trim();
  if(!name){notify("Informe um nome para a campanha.");return}
  const {error}=await supabaseClient
    .from("campaigns")
    .update({name,updated_at:new Date().toISOString()})
    .eq("id",campaignId);
  if(error) throw error;
  await loadCloudData();
  activeHubCampaignId=campaignId;
  setHubSection("campanha");
  renderHub();
  notify(`Campanha renomeada: <b>${escapeHtml(name)}</b>`);
}
async function createPrivateCampaignCharacter(campaignId=activeHubCampaignId){
  if(!cloudRequireLogin()||!campaignId) return;
  const campaign=cloudCampaigns.find(item=>item.id===campaignId);
  if(!isCampaignOwner(campaign)){
    notify("Apenas o mestre pode criar fichas ocultas nesta campanha.");
    return;
  }
  const typedName=prompt("Nome da ficha oculta:", "Ficha oculta");
  if(typedName===null) return;
  const name=typedName.trim()||"Ficha oculta";
  const sheet=blankSheetData(name);
  sheet.fields.nome=name;
  sheet.fields.jogador="Mestre";
  const payload={
    owner_id:cloudUser.id,
    campaign_id:campaignId,
    name,
    player_name:"Mestre",
    sheet_data:sheet,
    is_private:true,
    updated_at:new Date().toISOString()
  };
  const {data,error}=await supabaseClient
    .from("characters")
    .insert(payload)
    .select("id,name,campaign_id,updated_at,is_private")
    .single();
  if(error&&/is_private|column/i.test(String(error.message||""))){
    notify("Rode o SQL supabase_private_characters.sql no Supabase para habilitar fichas ocultas.");
    return;
  }
  if(error) throw error;
  await loadCloudData();
  activeHubCampaignId=campaignId;
  setHubSection("campanha");
  renderHub();
  notify(`Ficha oculta criada: <b>${escapeHtml(data?.name||name)}</b>`);
}
async function leaveCloudCampaign(campaignId=activeHubCampaignId){
  if(!cloudRequireLogin()||!campaignId) return;
  const campaign=cloudCampaigns.find(item=>item.id===campaignId);
  if(isCampaignOwner(campaign)){
    notify("O mestre nao pode sair da propria campanha. Para remover a campanha, use Excluir campanha.");
    return;
  }
  const name=campaign?.name||"esta campanha";
  const ownLinked=cloudCharacters.filter(character=>isOwnCloudCharacter(character)&&character.campaign_id===campaignId);
  const foreignLinked=cloudCharacters.filter(character=>!isOwnCloudCharacter(character)&&character.campaign_id===campaignId);
  const detail=ownLinked.length?` Suas ${ownLinked.length} ficha${ownLinked.length===1?"":"s"} vinculada${ownLinked.length===1?"":"s"} ficarao sem campanha.`:"";
  if(!confirm(`Sair de ${name}?${detail}`)) return;
  removeLocalCopiesForRemoteCharacters(foreignLinked);
  const {error:characterError}=await supabaseClient
    .from("characters")
    .update({campaign_id:null,updated_at:new Date().toISOString()})
    .eq("campaign_id",campaignId)
    .eq("owner_id",cloudUser.id);
  if(characterError) throw characterError;
  const {error:memberError}=await supabaseClient
    .from("campaign_members")
    .delete()
    .eq("campaign_id",campaignId)
    .eq("user_id",cloudUser.id);
  if(memberError) throw memberError;
  if($("#cloudCampaignSelect")?.value===campaignId) $("#cloudCampaignSelect").value="";
  activeHubCampaignId="";
  activeCampaignDashboardTab="fichas";
  shieldCharacterFilter="";
  await loadCloudData();
  openHub("campanhas");
  notify(`Voce saiu da campanha: <b>${escapeHtml(name)}</b>`);
}
async function unlinkSelectedOwnCharacterFromCampaign(){
  if(!cloudRequireLogin()) return;
  const campaignId=activeHubCampaignId;
  const remoteId=value("campaignCharacterRemoveSelect");
  if(!campaignId){notify("Abra uma campanha primeiro.");return}
  if(!remoteId){notify("Escolha uma ficha para remover da campanha.");return}
  const campaign=cloudCampaigns.find(item=>item.id===campaignId);
  const character=cloudCharacters.find(entry=>entry.id===remoteId);
  if(!character||!isOwnCloudCharacter(character)||character.campaign_id!==campaignId){
    notify("Esta ficha nao pertence a sua conta ou nao esta vinculada a esta campanha.");
    return;
  }
  if(isCampaignOnlyCharacter(character)){
    notify("Fichas ocultas devem ser gerenciadas pelo mestre.");
    return;
  }
  const label=character.name||"esta ficha";
  const campaignName=campaign?.name||"esta campanha";
  if(!confirm(`Remover ${label} de ${campaignName}? A ficha continuara salva na sua nuvem.`)) return;
  clearCloudAutosaveTimer(remoteId);
  const {error}=await supabaseClient
    .from("characters")
    .update({campaign_id:null,updated_at:new Date().toISOString()})
    .eq("id",remoteId)
    .eq("owner_id",cloudUser.id);
  if(error) throw error;
  if(mappedCloudCharacterId()===remoteId && $("#cloudCampaignSelect")) $("#cloudCampaignSelect").value="";
  await loadCloudData({syncCurrent:true});
  activeHubCampaignId=campaignId;
  setHubSection("campanha");
  renderHub();
  notify(`Ficha removida da campanha: <b>${escapeHtml(label)}</b>`);
}
async function linkCloudCampaign(){
  if(!cloudRequireLogin()) return;
  const campaignId=value("cloudCampaignSelect");
  if(!campaignId){notify("Escolha uma campanha para vincular.");return}
  await saveCloudCharacter(false);
  const remoteId=mappedCloudCharacterId();
  if(!remoteId){notify("Salve a ficha na nuvem antes de vincular.");return}
  await persistCloudCharacterCampaign(remoteId,campaignId);
  await loadCloudData({syncCurrent:true});
  if($("#cloudCampaignSelect")) $("#cloudCampaignSelect").value=campaignId;
  notify("Ficha vinculada à campanha e salva na nuvem.");
}
function promptCampaignCode(){
  const code=prompt("Codigo de convite da campanha:");
  if(code===null) return "";
  return code.trim();
}
function campaignIdFromRpcData(data){
  const result=Array.isArray(data)?data[0]:data;
  if(!result) return "";
  if(typeof result==="string") return result;
  return result.id||result.campaign_id||"";
}
async function joinCloudCampaignByCode(){
  if(!cloudRequireLogin()) return;
  const code=promptCampaignCode();
  if(!code){notify("Informe o codigo de convite.");return}
  const {data,error}=await supabaseClient.rpc("join_campaign_by_code",{code});
  if(error) throw error;
  await loadCloudData();
  const campaign=Array.isArray(data)?data[0]:data;
  const campaignId=campaignIdFromRpcData(data);
  if(campaignId && $("#cloudCampaignSelect")) $("#cloudCampaignSelect").value=campaignId;
  setHubSection("campanhas");
  renderHub();
  notify(`Campanha adicionada: <b>${escapeHtml(campaign?.name||"campanha")}</b>`);
}
function cloudPayloadFromSheetData(data,campaignId){
  const normalized=normalizeSheetData(data);
  return {
    owner_id:cloudUser.id,
    campaign_id:campaignId||null,
    name:characterNameFromData(normalized),
    player_name:normalized.fields?.jogador||null,
    sheet_data:normalized,
    updated_at:new Date().toISOString()
  };
}
function setCloudMappingForLocal(localId,remoteId){
  if(!localId||!remoteId) return;
  const map=readCloudCharacterMap();
  map[localId]=remoteId;
  writeCloudCharacterMap(map);
}
async function persistCloudCharacterCampaign(remoteId,campaignId){
  if(!remoteId||!campaignId) throw new Error("Ficha ou campanha invalida para vinculacao.");
  clearCloudAutosaveTimer(remoteId);
  const {data,error}=await supabaseClient
    .from("characters")
    .update({campaign_id:campaignId,updated_at:new Date().toISOString()})
    .eq("id",remoteId)
    .eq("owner_id",cloudUser.id)
    .select("id,campaign_id,updated_at")
    .single();
  if(error) throw error;
  if(data?.campaign_id!==campaignId) throw new Error("O vinculo com a campanha nao foi persistido.");
  return data;
}
async function linkLocalCharacterToCampaign(localId,campaignId){
  let data=localId===currentCharacterId?sheetDataFromCurrent():localCharacterData(localId);
  if(!data){notify("Ficha local nao encontrada.");return}
  data=await preparePortraitDataForCloud(data,readCloudCharacterMap()[localId]||localId);
  cacheLocalCharacterData(localId,data,characterNameFromData(data));
  if(localId===currentCharacterId) applyPreparedPortraitFields(data);
  const payload=cloudPayloadFromSheetData(data,campaignId);
  const remoteId=readCloudCharacterMap()[localId]||"";
  clearCloudAutosaveTimer(remoteId);
  const request=remoteId
    ? supabaseClient.from("characters").update(payload).eq("id",remoteId).eq("owner_id",cloudUser.id).select("id,name,campaign_id,updated_at").single()
    : supabaseClient.from("characters").insert(payload).select("id,name,campaign_id,updated_at").single();
  const {data:cloudData,error}=await request;
  if(error) throw error;
  if(cloudData?.campaign_id!==campaignId) throw new Error("O vinculo com a campanha nao foi persistido.");
  setCloudMappingForLocal(localId,cloudData.id);
  if(localId===currentCharacterId){
    if($("#cloudCampaignSelect")) $("#cloudCampaignSelect").value=campaignId;
    setMappedCloudCharacterId(cloudData.id);
  }
}
async function linkCloudCharacterToCampaign(remoteId,campaignId){
  const character=cloudCharacters.find(entry=>entry.id===remoteId);
  if(!character||character.owner_id!==cloudUser.id){notify("Voce so pode vincular fichas da sua conta.");return}
  await persistCloudCharacterCampaign(remoteId,campaignId);
  if(mappedCloudCharacterId()===remoteId && $("#cloudCampaignSelect")) $("#cloudCampaignSelect").value=campaignId;
}
async function linkSelectedCharacterToCampaign(){
  if(!cloudRequireLogin()) return;
  if(!activeHubCampaignId){notify("Abra uma campanha primeiro.");return}
  const selected=value("campaignCharacterLinkSelect");
  if(!selected){notify("Escolha uma ficha para vincular.");return}
  const [kind,id]=selected.split(":");
  if(kind==="local") await linkLocalCharacterToCampaign(id,activeHubCampaignId);
  else if(kind==="cloud") await linkCloudCharacterToCampaign(id,activeHubCampaignId);
  else{notify("Escolha uma ficha valida.");return}
  await loadCloudData({syncCurrent:true});
  const campaign=cloudCampaigns.find(item=>item.id===activeHubCampaignId);
  notify(`Ficha vinculada a campanha: <b>${escapeHtml(campaign?.name||"campanha")}</b>`);
}
async function linkCurrentCharacterToCampaignByCode(){
  if(!cloudRequireLogin()) return;
  const code=promptCampaignCode();
  if(!code){notify("Informe o codigo de convite.");return}
  await saveCloudCharacter(false);
  const remoteId=mappedCloudCharacterId();
  if(!remoteId){notify("Salve a ficha na nuvem antes de vincular.");return}
  const {data,error}=await supabaseClient.rpc("link_character_to_campaign",{character_uuid:remoteId,code});
  if(error) throw error;
  let campaignId=campaignIdFromRpcData(data);
  if(!campaignId){
    const joined=await supabaseClient.rpc("join_campaign_by_code",{code});
    if(joined.error) throw joined.error;
    campaignId=campaignIdFromRpcData(joined.data);
  }
  if(!campaignId){
    await loadCloudData();
    const normalizedCode=String(code).trim().toUpperCase();
    campaignId=cloudCampaigns.find(campaign=>String(campaign.invite_code||"").toUpperCase()===normalizedCode)?.id||"";
  }
  if(campaignId){
    if($("#cloudCampaignSelect")) $("#cloudCampaignSelect").value=campaignId;
    await persistCloudCharacterCampaign(remoteId,campaignId);
  }else{
    throw new Error("Nao foi possivel localizar a campanha pelo codigo informado.");
  }
  await loadCloudData({syncCurrent:true});
  if(campaignId && $("#cloudCampaignSelect")) $("#cloudCampaignSelect").value=campaignId;
  notify("Ficha vinculada a campanha.");
}
async function cloudSignIn(){
  if(!supabaseClient){notify("Biblioteca do Supabase nao carregou.");return}
  const email=value("cloudEmail").trim(),password=value("cloudPassword");
  if(!email||!password){notify("Informe email e senha.");return}
  const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});
  if(error) throw error;
  cloudUser=data.user||data.session?.user||null;
  enterApp("cloud");
  await loadCloudData({syncCurrent:true});
  await initializeBrowserRouting();
  notify("Login realizado.");
}
async function cloudSignUp(){
  if(!supabaseClient){notify("Biblioteca do Supabase nao carregou.");return}
  const email=value("cloudEmail").trim(),password=value("cloudPassword");
  if(!email||!password){notify("Informe email e senha.");return}
  const {data,error}=await supabaseClient.auth.signUp({email,password});
  if(error) throw error;
  cloudUser=data.user&&data.session?data.user:null;
  if(cloudUser){
    enterApp("cloud");
    await loadCloudData({syncCurrent:true});
    await initializeBrowserRouting();
    notify("Conta criada e conectada.");
  }else{
    renderCloudPanel();
    notify("Conta criada. Confirme o email antes de entrar, se a confirmacao estiver ativa.");
  }
}
async function cloudSignOut(){
  if(!supabaseClient) return;
  cloudAutosaveTimers.forEach(timer=>clearTimeout(timer));
  cloudAutosaveTimers.clear();
  await supabaseClient.auth.signOut();
  cloudUser=null;
  cloudCharacters=[];
  cloudCampaigns=[];
  setCurrentCloudReadOnly(false);
  if(publicViewActive()) leavePublicView();
  localStorage.removeItem(AUTH_MODE_KEY);
  sessionStorage.removeItem(AUTH_MODE_KEY);
  writeBrowserRoute("/",{replace:true});
  showAuthGate();
  notify("Saiu da nuvem.");
}
async function initCloud(){
  if(!SUPABASE_URL||!SUPABASE_PUBLISHABLE_KEY||!window.supabase?.createClient){
    setCloudStatus("Indisponivel");
    if(sessionStorage.getItem(AUTH_MODE_KEY)==="offline") enterApp("offline");
    await initializeBrowserRouting();
    return;
  }
  supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
  try{
    const {data,error}=await supabaseClient.auth.getSession();
    if(error) throw error;
    cloudUser=data.session?.user||null;
    if(cloudUser) enterApp("cloud");
    else if(sessionStorage.getItem(AUTH_MODE_KEY)==="offline") enterApp("offline");
    else showAuthGate();
    await loadCloudData({syncCurrent:true});
    browserRoutingReady=true;
    if(cloudUser||sessionStorage.getItem(AUTH_MODE_KEY)==="offline"||routedCloudCharacterId()) await applyBrowserRoute({flush:false});
    supabaseClient.auth.onAuthStateChange(async(_event,session)=>{
      cloudUser=session?.user||null;
      if(cloudUser) enterApp("cloud");
      try{
        await loadCloudData({syncCurrent:!!cloudUser});
        if(cloudUser) await initializeBrowserRouting();
      }catch(err){console.error(err);renderCloudPanel()}
    });
  }catch(err){
    console.error("Falha ao iniciar Supabase:",err);
    setCloudStatus("Erro na conexao");
    if(sessionStorage.getItem(AUTH_MODE_KEY)==="offline") enterApp("offline");
    else showAuthGate();
  }
  renderCloudPanel();
}
function runCloudAction(action){
  action().catch(error=>{
    console.error(error);
    markSaveError("Erro na nuvem");
    notify(`Erro na nuvem: ${escapeHtml(error.message||String(error))}`);
  });
}
function renderConditions(){
  $("#conditionsList").innerHTML=Object.entries(CONDITION_LIBRARY).map(([name,desc])=>{
    const c=state.conditions[name]||{active:false};state.conditions[name]={active:!!c.active};
    return `<div class="conditionCard ${c.active?"active":""}">
      <div class="conditionTitle"><strong>${name}</strong><input type="checkbox" data-cond="${name}" ${c.active?"checked":""}></div>
      <p>${desc.desc}</p>
    </div>`}).join("");
  $$("[data-cond]").forEach(e=>e.onchange=()=>{state.conditions[e.dataset.cond]={active:e.checked};renderConditions();renderConditionMini();recalc();save(false)});
  renderCustomConditions();renderConditionMini();
}
function renderConditionMini(){
  const active=Object.entries(state.conditions).filter(([,v])=>v.active).map(([k])=>k);
  const custom=state.customConditions.filter(c=>c.active).map(c=>c.name||"Condição");
  const all=[...active,...custom];
  $("#activeConditionsMini").innerHTML=all.length?all.map(x=>`<span class="conditionChip">${escapeHtml(x)}</span>`).join(""):`<span class="muted">Nenhuma condição ativa.</span>`;
}
function renderCustomConditions(){
  $("#customConditionsList").innerHTML=state.customConditions.map((c,i)=>{
    const name=escapeHtml(c.name||"");
    const effect=escapeHtml(c.effect||"");
    return `<div class="card customConditionCard">
      <div class="cardHead"><input data-cc="${i}" data-k="name" value="${name}" placeholder="Nome"><label>Ativa<input data-ccactive="${i}" type="checkbox" ${c.active?"checked":""}></label><button type="button" class="remove deleteIconButton" data-ccdel="${i}" title="Excluir condição" aria-label="Excluir condição">${DELETE_ICON_HTML}</button></div>
      <textarea class="conditionDescription" data-cc="${i}" data-k="effect" placeholder="Descrição da condição">${effect}</textarea>
    </div>`;
  }).join("");
  $$("[data-cc]").forEach(e=>e.oninput=()=>{state.customConditions[+e.dataset.cc][e.dataset.k]=e.value;renderConditionMini();save(false)});
  $$("[data-ccactive]").forEach(e=>e.onchange=()=>{state.customConditions[+e.dataset.ccactive].active=e.checked;renderConditionMini();save(false)});
  $$("[data-ccdel]").forEach(e=>e.onclick=()=>{state.customConditions.splice(+e.dataset.ccdel,1);renderCustomConditions();renderConditionMini();save(false)});
}
function originSkillKey(name){
  const raw=String(name||"").trim();
  if(!raw) return "";
  if(T20_DATA.pericias[raw]) return raw;
  if(powerCatalogKey(raw).startsWith("oficio")) return "Ofício";
  return "";
}
function originSuggestedBenefits(origin){
  const suggested=[...(origin.pericias||[]),...(origin.poderes||[])].filter(Boolean);
  if(origin.tipo==="especial"||origin.tipo==="regional") return suggested.length?suggested:[origin.beneficio].filter(Boolean);
  return suggested.slice(0,2);
}
function applyOrigin(){
  const origin=T20_ORIGINS[value("origem")]||T20_ORIGINS.custom;
  origin.pericias.forEach(name=>{
    const skill=originSkillKey(name);
    if(!skill) return;
    if(state.skillData[skill]) state.skillData[skill].trained=true;
    else state.skillData[skill]={trained:true,adjust:0};
  });
  if(state.originBenefits.length===0){
    const suggested=originSuggestedBenefits(origin);
    state.originBenefits.push(...suggested);
  }
  renderOriginBenefits();renderSkills();save(false);notify(`Origem ${origin.nome} aplicada às perícias e benefícios sugeridos.`);
}


function renderOffices(){
  state.offices=Array.isArray(state.offices)&&state.offices.length?state.offices:[{name:"",trained:false,adjust:0}];
}
function renderOriginBenefits(){
  state.originBenefits=Array.isArray(state.originBenefits)?state.originBenefits:[];
  $("#originBenefitsList").innerHTML=state.originBenefits.map((b,i)=>`
    <div class="originBenefitRow">
      <input data-ob="${i}" value="${String(b||"").replace(/"/g,"&quot;")}" placeholder="Perícia, poder, item ou outro benefício">
      <button type="button" class="remove deleteIconButton" data-obdel="${i}" title="Excluir benefício" aria-label="Excluir benefício">${DELETE_ICON_HTML}</button>
    </div>`).join("");
  $$("[data-ob]").forEach(e=>e.oninput=()=>{state.originBenefits[+e.dataset.ob]=e.value;save(false)});
  $$("[data-obdel]").forEach(e=>e.onclick=()=>{state.originBenefits.splice(+e.dataset.obdel,1);renderOriginBenefits();save(false)});
}
function renderAll(){normalizeState();syncClassSpellAttr();renderClassLevels();renderOffices();renderPowers();renderSpells();renderSpellCatalog();renderItems();renderPartners();renderAttacks();renderConditions();renderOriginBenefits();renderCharacterManager();renderCharacterPortrait();recalc();syncCloudReadOnlyControls()}
function showFatalError(error){
  console.error(error);
  const banner=document.createElement("div");
  banner.className="fatalError";
  banner.innerHTML=`<strong>Erro ao iniciar a ficha</strong><br>${error?.message||error}<br><small>Abra o console do navegador para mais detalhes.</small>`;
  document.body.prepend(banner);
}

try{
  fillSelects();
  load();
  renderAll();
}catch(error){
  showFatalError(error);
}

$("#portraitUploadBtn")?.addEventListener("click",()=>$("#portraitFileInput")?.click());
$("#portraitFileInput")?.addEventListener("change",event=>{
  const file=event.target.files?.[0];
  event.target.value="";
  if(!file) return;
  openPortraitCrop(file).catch(error=>notify(`Não foi possível abrir a imagem: ${escapeHtml(error?.message||error)}`));
});
$("#portraitRemoveBtn")?.addEventListener("click",removeCharacterPortrait);
$("#portraitCropClose")?.addEventListener("click",closePortraitCrop);
$("#portraitCropCancel")?.addEventListener("click",closePortraitCrop);
$$("[data-close-portrait-crop]").forEach(element=>element.addEventListener("click",closePortraitCrop));
$("#portraitChooseAnother")?.addEventListener("click",()=>$("#portraitFileInput")?.click());
$("#portraitCropConfirm")?.addEventListener("click",()=>confirmPortraitCrop().catch(error=>{
  console.error(error);
  markSaveError("Erro no retrato");
  notify(`Não foi possível salvar o retrato: ${escapeHtml(error?.message||error)}`);
}));
$("#portraitCropZoom")?.addEventListener("input",event=>{
  const source=portraitCropState.source;
  if(!source) return;
  const crop=portraitCropArea(),centerX=crop.x+crop.size/2,centerY=crop.y+crop.size/2;
  const imageCenterX=(centerX-portraitCropState.x)/portraitCropState.scale;
  const imageCenterY=(centerY-portraitCropState.y)/portraitCropState.scale;
  portraitCropState.scale=portraitCropState.minScale*Number(event.target.value||1);
  portraitCropState.x=centerX-imageCenterX*portraitCropState.scale;
  portraitCropState.y=centerY-imageCenterY*portraitCropState.scale;
  clampPortraitCropPosition();drawPortraitCrop();
});
portraitCropCanvas()?.addEventListener("pointerdown",event=>{
  if(!portraitCropState.source) return;
  const canvas=portraitCropCanvas(),rect=canvas.getBoundingClientRect();
  portraitCropState.dragging=true;portraitCropState.pointerId=event.pointerId;
  portraitCropState.lastX=event.clientX*canvas.width/rect.width;portraitCropState.lastY=event.clientY*canvas.height/rect.height;
  canvas.setPointerCapture(event.pointerId);canvas.classList.add("dragging");
});
portraitCropCanvas()?.addEventListener("pointermove",event=>{
  if(!portraitCropState.dragging||event.pointerId!==portraitCropState.pointerId) return;
  const canvas=portraitCropCanvas(),rect=canvas.getBoundingClientRect();
  const x=event.clientX*canvas.width/rect.width,y=event.clientY*canvas.height/rect.height;
  portraitCropState.x+=x-portraitCropState.lastX;portraitCropState.y+=y-portraitCropState.lastY;
  portraitCropState.lastX=x;portraitCropState.lastY=y;
  clampPortraitCropPosition();drawPortraitCrop();
});
function stopPortraitCropDrag(event){
  if(event.pointerId!==portraitCropState.pointerId) return;
  portraitCropState.dragging=false;portraitCropState.pointerId=null;
  portraitCropCanvas()?.classList.remove("dragging");
}
portraitCropCanvas()?.addEventListener("pointerup",stopPortraitCropDrag);
portraitCropCanvas()?.addEventListener("pointercancel",stopPortraitCropDrag);
document.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&!$("#portraitCropModal")?.classList.contains("hidden")) closePortraitCrop();
});


$$("[data-save]").forEach(e=>e.addEventListener("input",()=>{
  if(e.id==="classe"){
    state.skillData={};
    syncClassLevelsFromPrimaryFields();
  }
  if(e.id==="nivel"){
    const levels=currentClassLevels();
    if(levels.length===1){
      levels[0].level=clampClassLevel(e.value);
      setClassLevels(levels);
    }
    renderPowers();renderPartners();renderSpells();refreshPowerPickerIfOpen();
  }
  if(e.id==="portraitUrl"||e.id==="nome") renderCharacterPortrait();
  if(e.id==="spacesLimit"&&$("#spacesLimitAuto")?.checked) $("#spacesLimitAuto").checked=false;
  recalc();
  if(e.id==="divindade") refreshPowerPickerIfOpen();
  save(false);
}));
$("#spellAttr").addEventListener("change",()=>{syncClassSpellAttr();recalc();save(false)});
$("#defAttr").addEventListener("change",()=>{recalc();save(false)});
function syncClassDefenseAttr(){
  if(currentClassLevels().some(entry=>entry.id==="sentinela") && (!value("defAttr") || value("defAttr")==="DES")) $("#defAttr").value="INT";
}
function syncClassSpellAttr(){
  const select=$("#spellAttr"),locked=currentClassLevels().some(entry=>entry.id==="cartomante");
  if(!select) return;
  if(locked) select.value="CAR";
  select.disabled=locked;
  select.title=locked?"Cartomantes usam Carisma como atributo-chave.":"Atributo-chave das magias.";
}
$("#classe").addEventListener("change",()=>{state.skillData={};syncClassLevelsFromPrimaryFields();syncClassDefenseAttr();syncClassSpellAttr();renderPowers();renderSpells();refreshPowerPickerIfOpen();recalc();save(false)});
$("#multiclassEnabled")?.addEventListener("change",event=>{
  if(!event.target.checked&&currentClassLevels().length>1){
    event.target.checked=true;
    notify("Remova as classes extras antes de desativar a multiclasse.");
    return;
  }
  state.multiclassEnabled=event.target.checked;
  renderClassLevels();
  save(false);
});
$("#addClassLevelBtn")?.addEventListener("click",addClassLevel);
$("#raca").addEventListener("change",()=>{renderPowers();refreshPowerPickerIfOpen();recalc();save(false)});
$("#origem").addEventListener("change",()=>{refreshPowerPickerIfOpen();recalc();save(false)});
$("#origemTab").addEventListener("change",()=>{$("#origem").value=$("#origemTab").value;refreshPowerPickerIfOpen();recalc();save(false)});
$$("[data-tab]").forEach(b=>b.onclick=()=>{
  activateSheetTab(b.dataset.tab);
  if(!document.body.classList.contains("hub-open")) writeBrowserRoute(currentSheetRoute(),{replace:true});
});
$("#activeModifiersSummary")?.addEventListener("click",()=>{$('[data-tab="modificadores"]')?.click()});
$("#clearGlobalModifiers")?.addEventListener("click",()=>{
  if(!confirm("Zerar todos os modificadores temporários e globais?")) return;
  [...ATTR_KEYS.map(attr=>`${attr}Temp`),...GLOBAL_MODIFIER_FIELDS.map(field=>field.id)].forEach(id=>setNumberField(id,0));
  recalc();
  save(false);
  notify("Modificadores temporários removidos.");
});
$$("[data-change]").forEach(b=>b.onclick=()=>{const[id,delta]=b.dataset.change.split(":");applyQuickResourceChange(id,Number(delta));recalc();save(false)});
$$("[data-resource-amount]").forEach(b=>b.onclick=()=>{const[kind,direction]=b.dataset.resourceAmount.split(":");applyResourceAmount(kind,Number(direction))});
$("#spellSearchCatalog").oninput=renderSpellCatalog;$("#spellCircleFilter").onchange=renderSpellCatalog;$("#spellTypeFilter").onchange=renderSpellCatalog;$("#spellSchoolFilter").onchange=renderSpellCatalog;
$$("[data-close-spell-modal]").forEach(el=>el.onclick=closeSpellModal);$("#spellModalAdd").onclick=()=>{if(window.__selectedCatalogSpell){addSpellToGrimoire(window.__selectedCatalogSpell);closeSpellModal();}};document.addEventListener("keydown",e=>{if(e.key==="Escape")closeSpellModal();});
$("#addPower").onclick=openPowerPicker;
$("#closePowerPicker").onclick=closePowerPicker;
$("#powerCatalogType").onchange=updatePowerPicker;
$("#powerCatalogSubtype").onchange=updatePowerPicker;
$("#addBlankPower").onclick=()=>{addPowerEntry({name:"Novo poder",type:currentPowerPickerType()});closePowerPicker()};
$("#addSelectedPower").onclick=addSelectedCatalogPower;
$("#addSpell").onclick=()=>{state.spells.push({name:"Nova magia",school:"",circle:1,cost:1,execution:"",range:"",target:"",duration:"",resistance:"",desc:"",publication:"Manual"});expandedSpellCards.add(state.spells.length-1);renderSpells();save(false)};
$("#addItem").onclick=()=>openItemPicker("mundane");
$("#addMagicItem").onclick=openMagicItemPicker;
$("#closeItemPicker").onclick=closeItemPicker;
$("#itemCatalogSearch").oninput=updateItemPicker;
$("#itemCatalogCategory").onchange=updateItemPicker;
$("#addSelectedItem").onclick=addSelectedCatalogItem;
$("#addBlankItem").onclick=()=>{addItemEntry();closeItemPicker()};
$("#addPartner")?.addEventListener("click",openPartnerPicker);
$("#closePartnerPicker")?.addEventListener("click",closePartnerPicker);
$("#partnerCatalogType")?.addEventListener("change",updatePartnerPicker);
$("#partnerCatalogRank")?.addEventListener("change",updatePartnerPicker);
$("#addSelectedPartner")?.addEventListener("click",()=>{
  const type=value("partnerCatalogType");
  const entry=partnerCatalogEntry(type);
  if(!entry){notify("Escolha um tipo de parceiro do catálogo.");return}
  const rank=allowedPartnerRank(value("partnerCatalogRank"));
  addPartnerEntry(defaultPartner({type,rank,name:value("partnerCatalogName")||entry.name}));
  $("#partnerCatalogName").value="";
  closePartnerPicker();
});
$("#addBlankPartner")?.addEventListener("click",()=>{
  addPartnerEntry({name:value("partnerCatalogName")||"Novo parceiro",type:"custom",rank:allowedPartnerRank(value("partnerCatalogRank")),source:"Manual",benefit:"",benefitCustomized:true});
  $("#partnerCatalogName").value="";
  closePartnerPicker();
});
$("#applyOriginBtn").onclick=applyOrigin;$("#addOriginBenefit").onclick=()=>{state.originBenefits.push("");renderOriginBenefits();save(false)};$("#addCustomCondition").onclick=()=>{state.customConditions.push({name:"Nova condição",active:true,effect:""});renderCustomConditions();renderConditionMini();save(false)};
$("#addAttack").onclick=()=>{state.attacks.push(defaultAttack());expandedAttackCards.add(state.attacks.length-1);renderAttacks();save(false)};
$("#characterSelect").onchange=e=>{switchCharacter(e.target.value);openSheetView()};
$("#newCharacterBtn").onclick=()=>{newCharacter();openSheetView()};
$("#duplicateCharacterBtn").onclick=()=>{duplicateCharacter();openSheetView()};
$("#renameCharacterBtn").onclick=renameCharacter;
$("#deleteCharacterBtn").onclick=deleteCharacter;
function saveFromHeader(){
  return cloudUser&&supabaseClient?runCloudAction(()=>saveCloudCharacter(true)):save(true);
}
$("#saveBtn").onclick=saveFromHeader;
$("#cloudSignInBtn")?.addEventListener("click",()=>runCloudAction(cloudSignIn));
$("#cloudSignUpBtn")?.addEventListener("click",()=>runCloudAction(cloudSignUp));
$("#offlineModeBtn")?.addEventListener("click",async()=>{enterApp("offline");await initializeBrowserRouting()});
$("#cloudOpenLoginBtn")?.addEventListener("click",()=>{
  localStorage.removeItem(AUTH_MODE_KEY);
  sessionStorage.removeItem(AUTH_MODE_KEY);
  showAuthGate();
});
$("#cloudSignOutBtn")?.addEventListener("click",()=>runCloudAction(cloudSignOut));
$("#cloudSaveCharacterBtn")?.addEventListener("click",()=>runCloudAction(()=>saveCloudCharacter(true)));
$("#cloudLoadCharacterBtn")?.addEventListener("click",()=>runCloudAction(loadSelectedCloudCharacter));
$("#cloudCreateCampaignBtn")?.addEventListener("click",()=>runCloudAction(createCloudCampaign));
$("#cloudLinkCampaignBtn")?.addEventListener("click",()=>runCloudAction(linkCloudCampaign));
$("#cloudCharacterSelect")?.addEventListener("change",()=>{
  const selected=cloudCharacters.find(character=>character.id===value("cloudCharacterSelect"));
  if(selected?.campaign_id && $("#cloudCampaignSelect")) $("#cloudCampaignSelect").value=selected.campaign_id;
});
$("#appHomeBtn")?.addEventListener("click",()=>{
  if(document.body.classList.contains("auth-gated")) return;
  openHub("inicio");
});
$("#profileMenuBtn")?.addEventListener("click",event=>{
  event.stopPropagation();
  closeSheetActionMenu();
  toggleProfileMenu();
});
$("#sheetActionMenuBtn")?.addEventListener("click",event=>{
  event.stopPropagation();
  closeProfileMenu();
  toggleSheetActionMenu();
});
$("#profileHubBtn")?.addEventListener("click",()=>{
  closeProfileMenu();
  openHub("fichas");
});
$("#profileCampaignsBtn")?.addEventListener("click",()=>{
  closeProfileMenu();
  openHub("campanhas");
});
$("#profileSaveBtn")?.addEventListener("click",()=>{
  closeProfileMenu();
  saveFromHeader();
});
$("#profileLinkCampaignBtn")?.addEventListener("click",()=>{
  closeProfileMenu();
  runCloudAction(linkCurrentCharacterToCampaignByCode);
});
$("#profileExportBtn")?.addEventListener("click",()=>{
  closeProfileMenu();
  exportSheet();
});
$("#profileImportBtn")?.addEventListener("click",()=>{
  closeProfileMenu();
  $("#importInput")?.click();
});
$("#profileResetBtn")?.addEventListener("click",()=>{
  closeProfileMenu();
  resetCurrentCharacter();
});
$("#actionOpenCampaignBtn")?.addEventListener("click",()=>{
  closeSheetActionMenu();
  const campaignId=currentLinkedCampaignId();
  if(!campaignId){notify("Esta ficha ainda nao esta vinculada a uma campanha.");return}
  openCampaignDashboard(campaignId);
});
$("#actionSaveCloudBtn")?.addEventListener("click",()=>{
  closeSheetActionMenu();
  runCloudAction(()=>saveCloudCharacter(true));
});
$("#actionShareCharacterBtn")?.addEventListener("click",()=>{
  closeSheetActionMenu();
  runCloudAction(shareCurrentCloudCharacter);
});
$("#actionDisableShareBtn")?.addEventListener("click",()=>{
  closeSheetActionMenu();
  runCloudAction(disableCurrentCharacterShare);
});
$("#actionLinkCampaignBtn")?.addEventListener("click",()=>{
  closeSheetActionMenu();
  runCloudAction(linkCurrentCharacterToCampaignByCode);
});
$("#actionExportBtn")?.addEventListener("click",()=>{
  closeSheetActionMenu();
  exportSheet();
});
$("#actionImportBtn")?.addEventListener("click",()=>{
  closeSheetActionMenu();
  $("#importInput")?.click();
});
$("#actionResetBtn")?.addEventListener("click",()=>{
  closeSheetActionMenu();
  resetCurrentCharacter();
});
$("#profileCloudBtn")?.addEventListener("click",()=>{
  closeProfileMenu();
  localStorage.removeItem(AUTH_MODE_KEY);
  sessionStorage.removeItem(AUTH_MODE_KEY);
  showAuthGate();
});
$("#profileLogoutBtn")?.addEventListener("click",()=>{
  closeProfileMenu();
  if(cloudUser&&supabaseClient) runCloudAction(cloudSignOut);
  else{
    localStorage.removeItem(AUTH_MODE_KEY);
    sessionStorage.removeItem(AUTH_MODE_KEY);
    showAuthGate();
    notify("Saiu do modo local.");
  }
});
document.addEventListener("click",event=>{
  if(!event.target.closest?.(".profileMenu")) closeProfileMenu();
  if(!event.target.closest?.(".sheetActionMenu")) closeSheetActionMenu();
});
$$("[data-hub-section]").forEach(button=>button.addEventListener("click",()=>openHub(button.dataset.hubSection)));
$("#homeOpenSheetsBtn")?.addEventListener("click",()=>openHub("fichas"));
$("#homeOpenCampaignsBtn")?.addEventListener("click",()=>openHub("campanhas"));
$("#homeContinueCharacterBtn")?.addEventListener("click",()=>{
  const button=$("#homeContinueCharacterBtn");
  const kind=button?.dataset.kind||"",id=button?.dataset.id||"";
  if(!id) return;
  if(kind==="cloud") runCloudAction(()=>openCloudCharacter(id));
  else{switchCharacter(id);openSheetView()}
});
$("#homeOpenRecentCampaignBtn")?.addEventListener("click",()=>{
  const id=$("#homeOpenRecentCampaignBtn")?.dataset.id||"";
  if(id) openCampaignDashboard(id);
});
$("#homeCloudActionBtn")?.addEventListener("click",()=>{
  if(cloudUser) openHub("fichas");
  else{
    localStorage.removeItem(AUTH_MODE_KEY);
    sessionStorage.removeItem(AUTH_MODE_KEY);
    showAuthGate();
  }
});
$("#hubCharacterSearch")?.addEventListener("input",renderHub);
$("#hubNewCharacterBtn")?.addEventListener("click",()=>{newCharacter();openSheetView()});
$("#hubJoinCampaignBtn")?.addEventListener("click",()=>runCloudAction(joinCloudCampaignByCode));
$("#hubNewCampaignBtn")?.addEventListener("click",()=>runCloudAction(createCloudCampaign));
$("#hubBackCampaignsBtn")?.addEventListener("click",()=>openHub("campanhas"));
$("#campaignInviteBtn")?.addEventListener("click",()=>{
  const campaign=cloudCampaigns.find(item=>item.id===activeHubCampaignId);
  const code=campaign?.invite_code||"";
  if(!code){notify("Esta campanha ainda nao tem codigo de convite.");return}
  navigator.clipboard?.writeText(code)
    .then(()=>notify(`Codigo de convite copiado: <b>${escapeHtml(code)}</b>`))
    .catch(()=>notify(`Codigo de convite: <b>${escapeHtml(code)}</b>`));
});
$("#campaignLinkSelectedBtn")?.addEventListener("click",()=>runCloudAction(linkSelectedCharacterToCampaign));
$("#campaignRemoveSelectedBtn")?.addEventListener("click",()=>runCloudAction(unlinkSelectedOwnCharacterFromCampaign));
$("#campaignRenameBtn")?.addEventListener("click",()=>runCloudAction(()=>renameCloudCampaign(activeHubCampaignId)));
$("#campaignCreatePrivateCharacterBtn")?.addEventListener("click",()=>runCloudAction(()=>createPrivateCampaignCharacter(activeHubCampaignId)));
$("#campaignLeaveBtn")?.addEventListener("click",()=>runCloudAction(()=>leaveCloudCampaign(activeHubCampaignId)));
$("#campaignShieldBtn")?.addEventListener("click",()=>{
  const campaign=cloudCampaigns.find(item=>item.id===activeHubCampaignId);
  if(!isCampaignOwner(campaign)){
    notify("O Escudo do Mestre fica disponivel apenas para quem criou a campanha.");
    return;
  }
  activeCampaignDashboardTab="escudo";
  renderCampaignDashboard();
});
$("#campaignDeleteBtn")?.addEventListener("click",()=>runCloudAction(()=>deleteCloudCampaign(activeHubCampaignId)));
$$("[data-campaign-panel]").forEach(button=>button.addEventListener("click",()=>{
  const nextPanel=["fichas","jogadores","escudo"].includes(button.dataset.campaignPanel)?button.dataset.campaignPanel:"fichas";
  const campaign=cloudCampaigns.find(item=>item.id===activeHubCampaignId);
  if(nextPanel==="escudo"&&!isCampaignOwner(campaign)){
    notify("O Escudo do Mestre fica disponivel apenas para quem criou a campanha.");
    return;
  }
  activeCampaignDashboardTab=nextPanel;
  renderCampaignDashboard();
}));
$("#exportBtn").onclick=exportSheet;
$("#resetBtn").onclick=resetCurrentCharacter;
$("#importInput").onchange=e=>{
  const f=e.target.files[0];
  if(!f) return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      importSheetData(JSON.parse(r.result));
      e.target.value="";
    }catch{
      alert("Arquivo inválido.");
    }
  };
  r.readAsText(f);
};
window.addEventListener("popstate",()=>{
  applyBrowserRoute({flush:true}).catch(error=>{
    console.error("Falha ao navegar pelo histórico:",error);
    notify("Não foi possível abrir a página anterior.");
  });
});
initCloud();
