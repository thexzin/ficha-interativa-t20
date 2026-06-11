
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

let supabaseClient=null;
let cloudUser=null;
let cloudCharacters=[];
let cloudCampaigns=[];
let cloudCampaignRolls=[];

function defaultState(){
  return {powers:[],spells:[],items:[],attacks:[{name:"Ataque desarmado",bonus:0,damage:"1d3",crit:"20",mult:"x2",notes:""}],skillData:{},conditions:{},customConditions:[],originBenefits:[],offices:[{name:"",trained:false,adjust:0}],suppressedAutoPowers:[]};
}
function normalizeState(){
  const defaults=defaultState();
  state={...defaults,...(state||{})};
  for(const k of Object.keys(defaults)){
    if(Array.isArray(defaults[k]) && !Array.isArray(state[k])) state[k]=[];
    if(!Array.isArray(defaults[k]) && typeof state[k]!=="object") state[k]={};
  }
  if(!state.attacks.length) state.attacks=defaultState().attacks;
  if(!state.offices.length) state.offices=defaultState().offices;
  state.spells=state.spells.map(spell=>normalizeSpellDetailFields({...spell}));
  state.items=state.items.map(item=>normalizeInventoryItemDescription(item));
}

let state=defaultState();
let currentCharacterId="";
let expandedSpellCards=new Set();
let expandedPowerCards=new Set();
let expandedItemCards=new Set();
let expandedAttackCards=new Set();
let activeHubSection="fichas";
let activeHubCampaignId="";
let activeCampaignDashboardTab="fichas";
let campaignRollPollTimer=null;
let shieldCharacterFilter="";
let shieldSortMode="risco";
let currentCloudReadOnly=false;
let cloudAutosaveTimers=new Map();
let saveStatusTimer=null;

const ATTR_KEYS=["FOR","DES","CON","INT","SAB","CAR"];
const rawNum=id=>Number($("#"+id)?.value||0);
const num=id=>rawNum(id);
const attrNum=id=>ATTR_KEYS.includes(id)?rawNum(id)+rawNum(`${id}Temp`):rawNum(id);
const value=id=>$("#"+id)?.value||"";
const DELETE_ICON_HTML='<span class="deleteIconGlyph" aria-hidden="true"></span>';
const ROLL_ICON_HTML='<img src="attack-roll-icon.png" alt="" draggable="false" aria-hidden="true">';
function notify(html){const t=$("#toast");t.innerHTML=html;t.classList.remove("hidden");clearTimeout(window.__to);window.__to=setTimeout(()=>t.classList.add("hidden"),3500)}
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
  notify(`<b>${title}</b><br><span style="font-size:2rem;color:${totalColor}">${total}</span>${naturalLabel?`<br><strong style="color:${totalColor}">${naturalLabel}</strong>`:""}<br>1d20 (${d}) + ${bonus}`);
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

function rollDamageExpression(expr,critMultiplier=1){
  const clean=String(expr).toLowerCase().replace(/\s/g,"");
  if(!clean) throw Error("Informe uma expressao de dano.");
  const normalized=clean.replace(/-/g,"+-");
  const parts=normalized.split("+").filter(Boolean);
  let total=0;
  const details=[];
  let multipliedBaseDice=false;
  const multiplier=Math.max(1,Math.floor(Number(critMultiplier)||1));
  for(const part of parts){
    const dice=part.match(/^(-?)(\d+)d(\d+)$/);
    if(dice){
      const sign=dice[1]==="-"?-1:1,q=Number(dice[2]),faces=Number(dice[3]);
      const finalQty=!multipliedBaseDice?q*multiplier:q;
      if(q<1||finalQty>100||faces<2||faces>1000) throw Error("Expressao de dados invalida.");
      const rolls=Array.from({length:finalQty},()=>Math.floor(Math.random()*faces)+1);
      total+=rolls.reduce((a,b)=>a+b,0)*sign;
      const critNote=multiplier>1&&!multipliedBaseDice?` (${q}d${faces} x${multiplier})`:"";
      details.push(`${sign<0?"-":""}${finalQty}d${faces} [${rolls.join(", ")}]${critNote}`);
      multipliedBaseDice=true;
    }else if(/^-?\d+$/.test(part)){
      const flat=Number(part);
      total+=flat;
      details.push(String(flat));
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
function rollAttackDamage(attack){
  const bonus=Number(attack.bonus||0)+activeConditionEffects().attack;
  const d20=Math.floor(Math.random()*20)+1;
  const totalAttack=d20+bonus;
  const critical=parseCritical(attack.crit,attack.mult);
  const isCritical=d20>=critical.threshold;
  const isFumble=d20===1;
  const damage=rollDamageExpression(attack.damage,isCritical?critical.multiplier:1);
  const attackTotalClass=isFumble?"fumbleTotal":isCritical?"criticalTotal":"";
  const rollLabel=isFumble?"Falha":isCritical?"Cr&iacute;tico":"Ataque";
  const title=escapeHtml(attack.name||"Ataque");
  const damageLine=escapeHtml(damage.details.join(" + "));
  notify(`<div class="combatRollToast">
    <div class="combatRollTop"><strong>${title}</strong><span>${rollLabel}</span></div>
    <div class="combatRollFormula">Ataque: 1d20 [${d20}] ${signedNumber(bonus)}<br>Dano: ${damageLine}${isCritical?`<br>Cr&iacute;tico: ${critical.threshold}/x${critical.multiplier}`:""}</div>
    <div class="combatRollTotals">
      <div><strong class="${attackTotalClass}">${totalAttack}</strong><small>Ataque</small></div>
      <div><strong>${damage.total}</strong><small>Dano</small></div>
    </div>
  </div>`);
  return {
    type:"attack",
    title:attack.name||"Ataque",
    d20,
    bonus,
    totalAttack,
    totalDamage:damage.total,
    damageDetails:damage.details.join(" + "),
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
function trainingBonus(){const l=num("nivel");return l>=15?6:l>=7?4:2}
function halfLevel(){return Math.floor(num("nivel")/2)}
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
const SPELL_ATTR_PM_CLASSES=new Set(["arcanista","bardo","clerigo","druida","frade"]);
function classUsesSpellAttrForPm(cls){return SPELL_ATTR_PM_CLASSES.has(cls?.idBase)}
function spellAttrPmBonus(cls){return classUsesSpellAttrForPm(cls)?num(value("spellAttr")):0}

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
function recalc(){
  const cls=T20_DATA.classes[value("classe")], race=T20_DATA.racas[value("raca")], lvl=Math.max(1,Math.min(20,num("nivel")||1)), con=num("CON");
  const pmAttrBonus=spellAttrPmBonus(cls);
  const pvBase=cls.pv1+con+(lvl-1)*(cls.pvNivel+con), pmBase=lvl*cls.pmNivel+pmAttrBonus;
  $("#pvBase").value=pvBase;$("#pmBase").value=pmBase;
  const pvTemp=Math.max(0,num("pvBonus")),pmTemp=Math.max(0,num("pmBonus"));
  const pvMax=pvBase+num("pvAjuste"),pmMax=pmBase+num("pmAjuste");
  const pvAtual=num("pvAtual"),deathLimit=deathLimitFromPvMax(pvMax),deathThreshold=deathLimit-1,isDying=pvAtual<0,isDead=pvAtual<deathLimit;
  $("#pvMaxView").textContent=isDying?deathLimit:pvMax;$("#pmMaxView").textContent=pmMax;$("#pvAtualView").textContent=pvAtual;$("#pmAtualView").textContent=num("pmAtual");
  $("#pvTempView").textContent=pvTemp?` +${pvTemp} temp`:"";$("#pmTempView").textContent=pmTemp?` +${pmTemp} temp`:"";
  const conditionFx=activeConditionEffects();
  const defenseAttr=ATTR_KEYS.includes(value("defAttr"))?value("defAttr"):"DES";
  const defenseAttrBonus=$("#defUseDex")?.checked!==false?num(defenseAttr):0;
  if($("#defUseDexState")) $("#defUseDexState").textContent=$("#defUseDex")?.checked!==false?"Sim":"Não";
  $("#defView").textContent=10+defenseAttrBonus+num("armadura")+num("escudo")+num("defBonus")+num("defAjuste")+conditionFx.defense;
  const penalties=[];
  if(conditionFx.defense) penalties.push(`Defesa ${conditionFx.defense}`);
  if(conditionFx.attack) penalties.push(`Ataques ${conditionFx.attack}`);
  if(conditionFx.allSkills) penalties.push(`Todas as perícias ${conditionFx.allSkills}`);
  for(const [a,v] of Object.entries(conditionFx.attrs)) if(v) penalties.push(`Testes de ${a} ${v}`);
  for(const [s,v] of Object.entries(conditionFx.skills)) if(v) penalties.push(`${s} ${v}`);
  const penaltyHtml=penalties.length?`<strong>Condições aplicadas:</strong> ${penalties.join(" • ")}`:"";
  $("#conditionPenaltySummary").innerHTML=penaltyHtml;
  $("#combatPenaltySummary").innerHTML=penaltyHtml;
  $("#spellCd").textContent=10+halfLevel()+attrNum(value("spellAttr"))+num("spellCdBonus");
  $("#pmLimit").textContent=Math.max(0,lvl+num("pmLimitBonus")+num("pmLimitAdjust"));
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
  const variantText=cls.variante?` — variante de ${escapeHtml(cls.classeBase)}`:"";
  const pmSummary=`${cls.pmNivel} por nível${classUsesSpellAttrForPm(cls)?" + atributo-chave de magia":""}`;
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
    <small>Classe</small>
    <strong>${escapeHtml(cls.nome)}</strong>
    <span>${escapeHtml(cls.fonte)}${variantText}</span>
    <p><b>PV:</b> ${cls.pv1}+CON no 1º nível, ${cls.pvNivel}+CON por nível adicional.</p>
    <p><b>PM:</b> ${pmSummary}.</p>
  </article>`;
  const sizeInput=$("#summarySizeInput");
  if(sizeInput) sizeInput.onchange=()=>{const sizeField=$("#tamanho");if(sizeField) sizeField.value=sizeInput.value===baseSize?"":sizeInput.value;save(false)};
  const moveInput=$("#summaryMoveInput");
  if(moveInput) moveInput.oninput=()=>{const moveField=$("#deslocamento");if(moveField) moveField.value=moveInput.value;save(false)};
  renderProgress();renderSkills();renderInventorySummary();
}
function renderProgress(){
  const cls=T20_DATA.classes[value("classe")],lvl=num("nivel"),rows=[];
  const baseProgress=T20_DATA.classes[cls.idBase]?.progressao;
  const progression=cls.progressao||baseProgress||{};
  rows.push(`<div class="progressHeader"><strong>Nível</strong><span>Habilidades de Classe</span></div>`);
  for(let i=1;i<=20;i++){
    let text=progression[i]||(i===1?`Características iniciais de ${cls.nome}`:`Escolhas e habilidades do ${i}º nível`);
    if(!progression[i]&&i>=2) text+=` • poder/avanço de classe conforme tabela`;
    rows.push(`<div class="level ${i<=lvl?"active":""}"><strong>${i}º</strong><span>${escapeHtml(text)}</span></div>`);
  }
  if($("#progressSummaryMeta")) $("#progressSummaryMeta").textContent=`${cls.nome}, nível ${lvl}`;
  if($("#progressList")) $("#progressList").innerHTML=rows.join("");
}
function renderSkillsLegacy(){
  const cls=T20_DATA.classes[value("classe")], fx=activeConditionEffects();
  const rows=[];
  for(const [name,attr] of Object.entries(T20_DATA.pericias)){
    if(name==="Ofício"){
      state.offices=Array.isArray(state.offices)&&state.offices.length?state.offices:[{name:"",trained:false,adjust:0}];
      state.offices.forEach((office,idx)=>{
        const total=halfLevel()+attrNum(attr)+(office.trained?trainingBonus():0)+Number(office.adjust||0)+Number(fx.allSkills||0)+Number(fx.attrs[attr]||0)+Number(fx.skills[name]||0);
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
    const total=halfLevel()+attrNum(attr)+(d.trained?trainingBonus():0)+Number(d.adjust||0)+Number(fx.allSkills||0)+Number(fx.attrs[attr]||0)+Number(fx.skills[name]||0);
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
function armorPenaltyValue(){return -Math.abs(num("armorPenalty"))}
function skillIsLocked(name, trained){return TRAINED_ONLY_SKILLS.has(name)&&!trained}
function skillTotalText(total, locked){return locked?"—":`${total>=0?"+":""}${total}`}
function skillBadges(name){
  const badges=[];
  if(TRAINED_ONLY_SKILLS.has(name)) badges.push(`<span class="skillBadge trainedOnly">Só treinada</span>`);
  if(ARMOR_PENALTY_SKILLS.has(name)) badges.push(`<span class="skillBadge armorPenalty">Armadura</span>`);
  return badges.length?`<span class="skillBadges">${badges.join("")}</span>`:"";
}
function renderSkills(){
  const cls=T20_DATA.classes[value("classe")], fx=activeConditionEffects();
  const rows=[];
  for(const [name,defaultAttr] of Object.entries(T20_DATA.pericias)){
    if(name==="Ofício"){
      state.offices=Array.isArray(state.offices)&&state.offices.length?state.offices:[{name:"",trained:false,adjust:0}];
      state.offices.forEach((office,idx)=>{
        const attr=validSkillAttr(office.attr,defaultAttr);
        office.attr=attr;
        const locked=skillIsLocked(name,office.trained);
        const total=halfLevel()+attrNum(attr)+(office.trained?trainingBonus():0)+Number(office.adjust||0)+Number(fx.allSkills||0)+Number(fx.attrs[attr]||0)+Number(fx.skills[name]||0);
        rows.push(`<div class="skill office-skill ${office.trained?"trained":""} ${locked?"locked":""}">
          <span class="skillName">Ofício <select class="skillAttrSelect" data-officeattr="${idx}" title="Atributo-chave">${skillAttrOptions(attr)}</select>${skillBadges(name)}</span>
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
    const d=state.skillData[name]||{trained:cls.pericias.includes(name),adjust:0,attr:defaultAttr};
    d.attr=validSkillAttr(d.attr,defaultAttr);
    state.skillData[name]=d;
    const attr=d.attr;
    const armorPenalty=ARMOR_PENALTY_SKILLS.has(name)?armorPenaltyValue():0;
    const locked=skillIsLocked(name,d.trained);
    const total=halfLevel()+attrNum(attr)+(d.trained?trainingBonus():0)+Number(d.adjust||0)+armorPenalty+Number(fx.allSkills||0)+Number(fx.attrs[attr]||0)+Number(fx.skills[name]||0);
    rows.push(`<div class="skill ${d.trained?"trained":""} ${locked?"locked":""} ${armorPenalty?"hasArmorPenalty":""}">
      <span class="skillName">${escapeHtml(name)} <select class="skillAttrSelect" data-skattr="${escapeHtml(name)}" title="Atributo-chave">${skillAttrOptions(attr)}</select>${skillBadges(name)}</span>
      <label><input type="checkbox" data-sktrain="${escapeHtml(name)}" ${d.trained?"checked":""}> Treino</label>
      <input type="number" data-skadj="${escapeHtml(name)}" value="${d.adjust||0}">
      <span class="total">${skillTotalText(total,locked)}</span>
      <button type="button" class="skillRollButton iconImageButton" data-skroll="${escapeHtml(name)}" data-bonus="${total}" title="Rolar ${escapeHtml(name)}" aria-label="Rolar ${escapeHtml(name)}" ${locked?"disabled":""}>${ROLL_ICON_HTML}</button>
    </div>`);
  }
  $("#skillsList").innerHTML=rows.join("");
  $$("[data-skattr]").forEach(e=>e.onchange=()=>{const name=e.dataset.skattr;state.skillData[name]=state.skillData[name]||{trained:cls.pericias.includes(name),adjust:0};state.skillData[name].attr=e.value;renderSkills();save(false)});
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
  const classId=value("classe");
  const cls=T20_DATA.classes[classId];
  if(!cls) return {classId:"",cls:null,progression:{}};
  const baseProgress=T20_DATA.classes[cls.idBase]?.progressao;
  return {classId,cls,progression:cls.progressao||baseProgress||{}};
}
function classFeatureDetailsFor(classId,baseClassId,baseKey){
  const catalog=window.T20_CLASS_FEATURE_DETAILS||{};
  return catalog[`${classId}|${baseKey}`]
    || catalog[`${baseClassId||""}|${baseKey}`]
    || catalog[`*|${baseKey}`]
    || {};
}
function currentAutoClassFeatures(){
  const {classId,cls,progression}=classProgressionForCurrentClass();
  const lvl=Math.max(1,Math.min(20,num("nivel")||1));
  const byFeature=new Map();
  for(let level=1;level<=lvl;level++){
    splitProgressionFeatures(progression[level]).forEach(rawFeature=>{
      if(!rawFeature || isProgressionChoiceFeature(rawFeature)) return;
      const baseKey=classFeatureBaseKey(rawFeature);
      if(!baseKey) return;
      const feature=prettifyClassFeatureName(rawFeature);
      const previous=byFeature.get(baseKey)||{firstLevel:level,history:[]};
      previous.name=feature;
      previous.level=level;
      previous.history.push({level,feature});
      byFeature.set(baseKey,previous);
    });
  }
  return [...byFeature.entries()].map(([baseKey,feature])=>{
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
  }).sort((a,b)=>Number(a.autoLevel||0)-Number(b.autoLevel||0)||String(a.name||"").localeCompare(String(b.name||""),"pt-BR"));
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
  state.powers=[...auto,...autoRace,...manual];
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
function renderPowerCard(p,i){
  const isOpen=expandedPowerCards.has(i);
  p.type=normalizePowerType(p.type||"Classe");
  const isAutoClass=p.autoClassFeature===AUTO_CLASS_FEATURE_FLAG;
  const isAutoRace=p.autoRaceAbility===AUTO_RACE_ABILITY_FLAG;
  const isAuto=isAutoClass||isAutoRace;
  const autoText=isAutoClass?`Automático • nível ${p.autoLevel||"?"}`:isAutoRace?"Automático • raça":escapeHtml(p.type);
  const lockAttr=isAuto?" readonly":"";
  const disabledAttr=isAuto?" disabled":"";
  const autoActions=isAuto
    ? `<div class="autoPowerActions"><span class="autoPowerBadge">${isAutoRace?"Raça":"Progressão"}</span><button type="button" class="remove autoRemove deleteIconButton" data-pautodel="${i}" title="Remover este poder automático" aria-label="Remover este poder automático">${DELETE_ICON_HTML}</button></div>`
    : `<button type="button" class="remove deleteIconButton" data-pdel="${i}" title="Excluir poder" aria-label="Excluir poder">${DELETE_ICON_HTML}</button>`;
  return `<div class="card powerAccordionCard ${isOpen?"expanded":""}">
    <button type="button" class="powerAccordionToggle" data-powertoggle="${i}" aria-expanded="${isOpen}">
      <span class="powerAccordionTitle"><strong>${escapeHtml(p.name||"Poder sem nome")}</strong><small>${autoText}</small></span>
      <span class="powerAccordionCue">${isOpen?"Recolher":"Expandir"}</span>
    </button>
    <div class="powerAccordionBody ${isOpen?"":"hidden"}">
      <div class="powerMainFields">
        <label>Nome<input data-p="${i}" data-k="name" value="${escapeHtml(p.name||"")}" placeholder="Nome"${lockAttr}></label>
        <label>Tipo<select data-p="${i}" data-k="type"${disabledAttr}>${powerTypeOptions(p.type||"Classe")}</select></label>
        ${autoActions}
      </div>
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
  bindCollection("p",state.powers,renderPowers);
  $$("[data-pautodel]").forEach(e=>e.onclick=()=>{const idx=+e.dataset.pautodel;suppressAutoPower(state.powers[idx]);expandedPowerCards=new Set([...expandedPowerCards].filter(openIdx=>openIdx!==idx).map(openIdx=>openIdx>idx?openIdx-1:openIdx));renderPowers();save(false)});
  $$("[data-pdel]").forEach(e=>e.onclick=()=>{const idx=+e.dataset.pdel;state.powers.splice(idx,1);expandedPowerCards=new Set([...expandedPowerCards].filter(openIdx=>openIdx!==idx).map(openIdx=>openIdx>idx?openIdx-1:openIdx));renderPowers();save(false)});
}
function currentClassPowerIds(){
  const selected=value("classe");
  const cls=T20_DATA.classes[selected];
  return [...new Set([selected,cls?.idBase].filter(Boolean))];
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
    const cls=T20_DATA.classes[value("classe")];
    return powers.length?`${cls?.nome||"Classe"} • ${powers.length} poderes encontrados`:`${cls?.nome||"Classe"} • nenhum poder catalogado para esta classe`;
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
    desc:power.desc||""
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
    const matchesType=!type || spell.type===type;
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
    return `<div class="grimoireGroup"><div class="grimoireDivider">${circle}º círculo</div>${list.map(({spell:s,index:i})=>`<div class="card"><div class="cardHead"><input data-s="${i}" data-k="name" value="${s.name||''}" placeholder="Nome da magia"><input data-s="${i}" data-k="school" value="${s.school||''}" placeholder="Escola"><button type="button" class="remove deleteIconButton" data-sdel="${i}" title="Excluir magia" aria-label="Excluir magia">${DELETE_ICON_HTML}</button></div><div class="spellMeta"><input data-s="${i}" data-k="circle" type="number" min="1" max="5" value="${s.circle||1}" title="Círculo"><input data-s="${i}" data-k="cost" type="number" min="0" value="${s.cost||1}" title="PM"><input data-s="${i}" data-k="execution" value="${s.execution||''}" placeholder="Execução"><input data-s="${i}" data-k="range" value="${s.range||''}" placeholder="Alcance/alvo"><input data-s="${i}" data-k="resistance" value="${s.resistance||''}" placeholder="Resistência"></div><textarea data-s="${i}" data-k="desc" rows="4" placeholder="Descrição e aprimoramentos">${s.desc||''}</textarea><div class="smallActions"><button class="cast" data-cast="${i}">Conjurar (−${s.cost||1} PM)</button></div></div>`).join('')}</div>`;
  }).join('') || '<p class="muted">Nenhuma magia no Grimório ainda. Vá até a aba Magias para adicionar.</p>';
  bindCollection('s',state.spells,renderSpells);
  $$('[data-sdel]').forEach(e=>e.onclick=()=>{state.spells.splice(+e.dataset.sdel,1);renderSpells();save(false)});
  $$('[data-cast]').forEach(e=>e.onclick=()=>{const spell=state.spells[+e.dataset.cast],cost=Math.max(0,Number(spell.cost||0));applyResourceDelta("pmAtual","pmBonus",-cost,false);recalc();notify(`${spell.name||'Magia'} conjurada: −${cost} PM`)});
}
function renderGrimoireSpellCard(s,i){
  const isOpen=expandedSpellCards.has(i);
  const circle=Math.max(1,Math.min(5,Number(s.circle||1)));
  const cost=Number(s.cost||1);
  const summary=[`${circle}º círculo`,`${cost} PM`,s.type,s.school,s.execution].filter(Boolean).map(escapeHtml).join(" &bull; ");
  return `<div class="card grimoireSpellCard ${isOpen?"expanded":""}">
    <button type="button" class="grimoireSpellToggle" data-spelltoggle="${i}" aria-expanded="${isOpen}">
      <span class="grimoireSpellTitle"><strong>${escapeHtml(s.name||"Magia sem nome")}</strong><small>${summary||"Sem detalhes"}</small></span>
      <span class="grimoireSpellCue">${isOpen?"Recolher":"Expandir"}</span>
    </button>
    <div class="grimoireSpellBody ${isOpen?"":"hidden"}">
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
      <div class="smallActions grimoireSpellActions"><button type="button" class="cast" data-cast="${i}">Conjurar (-${cost} PM)</button><button type="button" class="remove iconRemove deleteIconButton" data-sdel="${i}" aria-label="Excluir magia ${escapeHtml(s.name||"")}" title="Excluir">${DELETE_ICON_HTML}</button></div>
    </div>
  </div>`;
}
function renderSpells(){
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
  $$('[data-cast]').forEach(e=>e.onclick=()=>{const spell=state.spells[+e.dataset.cast],cost=Math.max(0,Number(spell.cost||0));applyResourceDelta("pmAtual","pmBonus",-cost,false);recalc();notify(`${spell.name||'Magia'} conjurada: -${cost} PM`)});
}
function renderItemCard(it,i){
  const isOpen=expandedItemCards.has(i);
  const rawQty=Number(it.qty??1),rawSpaces=Number(it.spaces||0);
  const qty=Number.isFinite(rawQty)?rawQty:0,spaces=Number.isFinite(rawSpaces)?rawSpaces:0,totalSpaces=qty*spaces;
  const description=itemDescription(it);
  const summary=[
    qty?`${qty}x`:null,
    it.category,
    it.price,
    it.source,
    spaces?`${totalSpaces.toFixed(totalSpaces%1?1:0)} espaços`:null,
    it.equipped?"Equipado":null
  ].filter(Boolean).map(escapeHtml).join(" &bull; ");
  return `<div class="card itemAccordionCard ${isOpen?"expanded":""} ${it.equipped?"equipped":""}">
    <button type="button" class="itemAccordionToggle" data-itemtoggle="${i}" aria-expanded="${isOpen}">
      <span class="itemAccordionTitle"><strong>${escapeHtml(it.name||"Item sem nome")}</strong><small>${summary||"Sem detalhes"}</small></span>
      <span class="itemAccordionCue">${isOpen?"Recolher":"Expandir"}</span>
    </button>
    <div class="itemAccordionBody ${isOpen?"":"hidden"}">
      <div class="itemMainFields">
        <label>Item<input data-i="${i}" data-k="name" value="${escapeHtml(it.name||"")}"></label>
        <label>Categoria<input data-i="${i}" data-k="category" value="${escapeHtml(it.category||"")}"></label>
        <button type="button" class="remove deleteIconButton" data-idel="${i}" title="Excluir item" aria-label="Excluir item">${DELETE_ICON_HTML}</button>
      </div>
      <div class="itemDetailFields">
        <label>Qtd.<input data-i="${i}" data-k="qty" type="number" min="0" value="${qty}"></label>
        <label>Espaços<input data-i="${i}" data-k="spaces" type="number" step=".5" value="${spaces}"></label>
        <label>Preço<input data-i="${i}" data-k="price" value="${escapeHtml(it.price||"")}"></label>
        <label>Fonte<input data-i="${i}" data-k="source" value="${escapeHtml(it.source||"")}"></label>
        <label>Equipado<select data-i="${i}" data-k="equipped"><option value="false" ${!it.equipped?"selected":""}>Não</option><option value="true" ${it.equipped?"selected":""}>Sim</option></select></label>
      </div>
      <label>Descri&ccedil;&atilde;o, melhorias e efeitos<textarea data-i="${i}" data-k="notes" rows="5" placeholder="Descricao, melhorias, encantos e efeitos especiais">${escapeHtml(description)}</textarea></label>
    </div>
  </div>`;
}
function renderItems(){
  $("#itemsList").innerHTML=state.items.map((it,i)=>renderItemCard(it,i)).join("") || '<p class="muted">Nenhum item registrado ainda.</p>';
  $$("[data-itemtoggle]").forEach(e=>e.onclick=()=>{const idx=+e.dataset.itemtoggle;if(expandedItemCards.has(idx))expandedItemCards.delete(idx);else expandedItemCards.add(idx);renderItems()});
  bindCollection("i",state.items,renderItems);
  $$("[data-idel]").forEach(e=>e.onclick=()=>{const idx=+e.dataset.idel;state.items.splice(idx,1);expandedItemCards=new Set([...expandedItemCards].filter(openIdx=>openIdx!==idx).map(openIdx=>openIdx>idx?openIdx-1:openIdx));renderItems();renderInventorySummary();save(false)});
}
function renderInventorySummary(){const used=state.items.reduce((sum,it)=>sum+Number(it.qty||0)*Number(it.spaces||0),0);$("#spacesUsed").textContent=used.toFixed(used%1?1:0)+(used>num("spacesLimit")?" ⚠":"")}
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
function catalogInventoryDescription(item){
  if(!itemAllowsCatalogDescription(item)) return "";
  const name=String(item?.name||"").trim().toLowerCase();
  const category=String(item?.category||"").trim().toLowerCase();
  if(!name||!category) return "";
  const source=String(item?.source||"").trim().toLowerCase();
  const catalogs=[
    ...(Array.isArray(window.T20_ITEM_CATALOG)?window.T20_ITEM_CATALOG:[]),
    ...(Array.isArray(window.T20_EXPANSION_ITEM_CATALOG)?window.T20_EXPANSION_ITEM_CATALOG:[]),
    ...(Array.isArray(window.T20_MAGIC_ITEM_CATALOG)?window.T20_MAGIC_ITEM_CATALOG:[]),
    ...(Array.isArray(window.T20_EXPANSION_MAGIC_ITEM_CATALOG)?window.T20_EXPANSION_MAGIC_ITEM_CATALOG:[])
  ];
  const catalogItem=catalogs.find(entry=>
    String(entry.name||"").trim().toLowerCase()===name &&
    String(entry.category||"").trim().toLowerCase()===category &&
    (!source||String(entry.source||"").trim().toLowerCase()===source)
  );
  return itemDescription(catalogItem);
}
function normalizeInventoryItemDescription(item){
  const normalized={...(item||{})};
  const catalogDescription=catalogInventoryDescription(normalized);
  if(!catalogDescription) return normalized;
  const current=itemDescription(normalized);
  if(!current || catalogDescription.startsWith(`${current}\n\n`)){
    normalized.notes=catalogDescription;
  }
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
  state.items.push({
    name:item.name||"Novo item",
    qty:Number.isFinite(qty)?qty:1,
    spaces:Number.isFinite(spaces)?spaces:0,
    category:item.category||"",
    price:item.price||"",
    equipped:!!item.equipped,
    notes:itemDescription(item),
    source:item.source||""
  });
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
function renderAttackCard(a,i){
  const isOpen=expandedAttackCards.has(i);
  const name=escapeHtml(a.name||"Ataque sem nome");
  const bonus=Number(a.bonus||0);
  const bonusText=`${bonus>=0?"+":""}${bonus}`;
  const damage=escapeHtml(a.damage||"sem dano");
  const crit=escapeHtml(a.crit||"20");
  const mult=escapeHtml(a.mult||"x2");
  const notes=escapeHtml(a.notes||"");
  const toggleLabel=isOpen?"Recolher detalhes do ataque":"Expandir detalhes do ataque";
  return `<div class="card combatAttackCard ${isOpen?"expanded":""}">
    <div class="combatAttackHeader">
      <button type="button" class="combatAttackToggle" data-attacktoggle="${i}" aria-expanded="${isOpen}" aria-label="${toggleLabel}" title="${toggleLabel}">
        <span class="combatAttackTitle">
          <strong>${name}</strong>
          <span>${bonusText} ataque • ${damage} dano • ${crit}/${mult}</span>
        </span>
      </button>
      <div class="combatRollActions">
        <button type="button" class="attackDamageRoll" data-combatroll="${i}" aria-label="Rolar ataque e dano" title="Rolar ataque e dano"><img src="attack-roll-icon.png" alt="" draggable="false"></button>
      </div>
    </div>
    <div class="combatAttackBody ${isOpen?"":"hidden"}">
      <div class="attackFields">
        <label>Nome<input data-a="${i}" data-k="name" value="${name}"></label>
        <label>Ataque<input data-a="${i}" data-k="bonus" type="number" value="${bonus}"></label>
        <label>Dano<input data-a="${i}" data-k="damage" value="${damage}" placeholder="1d6+1d12+4"></label>
        <label>Crítico<input data-a="${i}" data-k="crit" value="${crit}"></label>
        <label>Mult.<input data-a="${i}" data-k="mult" value="${mult}"></label>
        <button type="button" class="remove combatRemove deleteIconButton" data-adel="${i}" title="Excluir ataque" aria-label="Excluir ataque">${DELETE_ICON_HTML}</button>
      </div>
      <label class="attackNotes">Notas<textarea data-a="${i}" data-k="notes" rows="2" placeholder="Alcance, munição, melhorias, efeitos especiais...">${notes}</textarea></label>
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
function bindCollection(prefix,arr,rerender){$$(`[data-${prefix}]`).forEach(e=>e.onchange=()=>{let v=e.value;if(e.type==="number")v=Number(v||0);if(e.tagName==="SELECT"&&(v==="true"||v==="false"))v=v==="true";arr[+e.dataset[prefix]][e.dataset.k]=v;if(prefix==="i")renderInventorySummary();save(false);if(prefix==="s"||prefix==="p"||prefix==="i"||prefix==="a")rerender()})}
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
    attacks:Array.isArray(saved.attacks)&&saved.attacks.length?saved.attacks:base.attacks,
    skillData:saved.skillData&&typeof saved.skillData==="object"?saved.skillData:base.skillData,
    conditions:saved.conditions&&typeof saved.conditions==="object"?saved.conditions:base.conditions,
    customConditions:Array.isArray(saved.customConditions)?saved.customConditions:base.customConditions,
    originBenefits:Array.isArray(saved.originBenefits)?saved.originBenefits:base.originBenefits,
    offices:Array.isArray(saved.offices)&&saved.offices.length?saved.offices:base.offices,
    suppressedAutoPowers:Array.isArray(saved.suppressedAutoPowers)?saved.suppressedAutoPowers:base.suppressedAutoPowers
  };
}
function normalizeSheetData(data){
  data=data&&typeof data==="object"?data:{};
  const fields=data.fields&&typeof data.fields==="object"?{...data.fields}:{};
  if(fields.raca==="suraggel") fields.raca="suraggel_aggelus";
  if(fields.classe==="sentinela" && fields.defAttr===undefined) fields.defAttr="INT";
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
  expandedSpellCards.clear();
  expandedPowerCards.clear();
  expandedItemCards.clear();
  expandedAttackCards.clear();
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
  if(!preview||!image) return;
  preview.classList.toggle("hidden",!imageUrl);
  if(imageUrl) image.src=imageUrl;
  else image.removeAttribute("src");
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
  button.classList.toggle("hidden",!cloudFirstMode());
  button.disabled=!campaignId;
  button.textContent=campaignId?"Abrir campanha vinculada":"Sem campanha vinculada";
}
function queueCloudAutosave(){
  if(!cloudFirstMode()||currentCloudReadOnly||!currentCharacterId) return;
  const snapshot={
    localId:currentCharacterId,
    remoteId:mappedCloudCharacterId(),
    data:sheetDataFromCurrent(),
    campaignId:null
  };
  snapshot.campaignId=cloudCampaignIdForSave(snapshot.remoteId)||null;
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
  const preservedCampaignId=snapshot.campaignId||selectedMeta?.campaign_id||null;
  const payload=cloudPayloadFromSheetData(snapshot.data,preservedCampaignId);
  const {data,error}=await supabaseClient
    .from("characters")
    .update(payload)
    .eq("id",snapshot.remoteId)
    .select("id,name,campaign_id,updated_at")
    .single();
  if(error) throw error;
  if(snapshot.localId){
    setCloudMappingForLocal(snapshot.localId,data.id);
    cacheLocalCharacterData(snapshot.localId,payload.sheet_data,data.name||payload.name,data.updated_at);
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
  const cls=T20_DATA.classes[fields.classe];
  const clsName=cls?.nome||fields.classe||"Classe nao definida";
  const lvl=fields.nivel||1;
  const player=fields.jogador?` &bull; ${escapeHtml(fields.jogador)}`:"";
  return `${escapeHtml(race)} &bull; ${escapeHtml(clsName)} nivel ${escapeHtml(lvl)}${player}`;
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
function setHubSection(section="fichas"){
  activeHubSection=section==="campanha"?"campanha":(section==="campanhas"?"campanhas":(section==="inicio"?"inicio":"fichas"));
  $("#hubHome")?.classList.toggle("hidden",activeHubSection!=="inicio");
  $("#hubFichas")?.classList.toggle("hidden",activeHubSection!=="fichas");
  $("#hubCampanhas")?.classList.toggle("hidden",activeHubSection!=="campanhas");
  $("#hubCampaignDashboard")?.classList.toggle("hidden",activeHubSection!=="campanha");
  $$("[data-hub-section]").forEach(button=>button.classList.toggle("active",button.dataset.hubSection===(activeHubSection==="campanha"?"campanhas":activeHubSection)));
}
function openSheetView(){
  closeProfileMenu();
  closeSheetActionMenu();
  stopCampaignRollPolling();
  if(!currentCharacterId){
    document.body.classList.add("hub-open");
    setHubSection("fichas");
    renderCloudPanel();
    renderHub();
    notify("Crie ou abra uma ficha para editar.");
    return;
  }
  document.body.classList.remove("hub-open");
  renderCloudPanel();
}
function openHub(section="fichas"){
  closeProfileMenu();
  closeSheetActionMenu();
  if(section!=="campanha") stopCampaignRollPolling();
  if(!document.body.classList.contains("auth-gated")&&!document.body.classList.contains("hub-open")) save(false);
  if(section==="inicio"||section==="fichas"||section==="campanhas") activeHubCampaignId="";
  document.body.classList.add("hub-open");
  setHubSection(section);
  renderCloudPanel();
  renderHub();
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
    const cls=T20_DATA.classes[fields.classe]?.nome||fields.classe||"";
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
      search:[name,fields.jogador,race,cls,fields.nivel].filter(Boolean).join(" ").toLowerCase()
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
function openCampaignDashboard(campaignId){
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
  const cls=T20_DATA.classes[fields.classe]||{nome:"Classe nao definida",pv1:0,pvNivel:0,pmNivel:0};
  const race=T20_DATA.racas[fields.raca]||{};
  const lvl=Math.max(1,Math.min(20,sheetNum(fields,"nivel")||1));
  const con=sheetNum(fields,"CON");
  const spellAttr=ATTR_KEYS.includes(fields.spellAttr)?fields.spellAttr:"INT";
  const pmAttrBonus=classUsesSpellAttrForPm(cls)?sheetNum(fields,spellAttr):0;
  const pvBase=Number(cls.pv1||0)+con+(lvl-1)*(Number(cls.pvNivel||0)+con);
  const pmBase=lvl*Number(cls.pmNivel||0)+pmAttrBonus;
  const pvMax=pvBase+sheetNum(fields,"pvAjuste");
  const pmMax=pmBase+sheetNum(fields,"pmAjuste");
  const defenseAttr=ATTR_KEYS.includes(fields.defAttr)?fields.defAttr:"DES";
  const defenseAttrBonus=sheetBool(fields,"defUseDex",true)?sheetNum(fields,defenseAttr):0;
  const conditionFx=sheetConditionEffects(savedState);
  const defense=10+defenseAttrBonus+sheetNum(fields,"armadura")+sheetNum(fields,"escudo")+sheetNum(fields,"defBonus")+sheetNum(fields,"defAjuste")+conditionFx.defense;
  const activeConditions=activeConditionNamesFromSheet(data);
  const deathLimit=deathLimitFromPvMax(pvMax);
  const pvAtual=sheetNum(fields,"pvAtual");
  return {
    id:character.id,
    name:character.name||fields.nome||"Personagem sem nome",
    imageUrl:characterImageUrlFromFields(fields),
    player:character.player_name||fields.jogador||"",
    className:cls.nome||"Classe nao definida",
    raceName:race.nome||fields.raca||"Raca nao definida",
    level:lvl,
    attrs:Object.fromEntries(ATTR_KEYS.map(key=>[key,sheetNum(fields,key)])),
    pvAtual,
    pvMax,
    pvTemp:Math.max(0,sheetNum(fields,"pvBonus")),
    pmAtual:sheetNum(fields,"pmAtual"),
    pmMax,
    pmTemp:Math.max(0,sheetNum(fields,"pmBonus")),
    defense,
    rd:sheetNum(fields,"rd"),
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
  return `<div class="masterShieldLayout">
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
  </div>`;
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
async function openCloudCharacter(remoteId){
  if(!cloudRequireLogin()) return;
  const {data,error}=await supabaseClient.from("characters").select("id,name,owner_id,player_name,sheet_data,campaign_id,is_private,updated_at").eq("id",remoteId).single();
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
  openSheetView();
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
function exportSheet(){
  const data=sheetDataFromCurrent();
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`ficha-${(value("nome")||"personagem").replace(/\W+/g,"-")}.json`;
  a.click();
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
    return;
  }
  const {error}=await supabaseClient.from("campaign_rolls").insert(rollRow);
  if(error) throw error;
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
  const label=signedIn?(cloudUser.email||"Conectado"):"Offline";
  const status=signedIn?(currentCloudReadOnly?"Somente leitura":"Nuvem conectada"):"Modo local";
  const initial=(label.trim()[0]||"?").toUpperCase();
  if($("#profileName")) $("#profileName").textContent=label;
  if($("#profileStatus")) $("#profileStatus").textContent=status;
  if($("#profileAvatar")) $("#profileAvatar").textContent=initial;
  $("#profileCloudBtn")?.classList.toggle("hidden",signedIn);
  if($("#profileLogoutBtn")) $("#profileLogoutBtn").textContent=signedIn?"Logout":"Sair";
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
  if(wasGated) openHub("inicio");
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
    setCurrentCloudReadOnly(false);
    renderCloudPanel();
    renderHub();
    return;
  }
  const characterColumns="id,owner_id,name,player_name,campaign_id,is_private,updated_at,sheet_data";
  let [{data:campaigns,error:campaignError},{data:characters,error:characterError}]=await Promise.all([
    supabaseClient.from("campaigns").select("id,owner_id,name,invite_code,updated_at").order("updated_at",{ascending:false}),
    supabaseClient.from("characters").select(characterColumns).order("updated_at",{ascending:false})
  ]);
  if(campaignError) throw campaignError;
  if(characterError&&/is_private|column/i.test(String(characterError.message||""))){
    const fallback=await supabaseClient
      .from("characters")
      .select("id,owner_id,name,player_name,campaign_id,updated_at,sheet_data")
      .order("updated_at",{ascending:false});
    characters=(fallback.data||[]).map(character=>({...character,is_private:false}));
    characterError=fallback.error;
  }
  if(characterError) throw characterError;
  cloudCampaigns=campaigns||[];
  cloudCharacters=characters||[];
  setCurrentCloudReadOnly(isCloudCharacterReadOnly(currentCloudCharacterMeta()));
  if(options.syncCurrent) syncCurrentCharacterFromCloud();
  await loadCampaignRolls();
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
  const payload=cloudPayloadFromCurrent(selected);
  const request=selected
    ? supabaseClient.from("characters").update(payload).eq("id",selected).select("id,name,campaign_id,updated_at").single()
    : supabaseClient.from("characters").insert(payload).select("id,name,campaign_id,updated_at").single();
  const {data,error}=await request;
  if(error) throw error;
  setMappedCloudCharacterId(data.id);
  cacheLocalCharacterData(currentCharacterId,payload.sheet_data,data.name||payload.name,data.updated_at);
  await loadCloudData();
  markSaved("Salvo na nuvem");
  if(show) notify(`Ficha salva na nuvem: <b>${escapeHtml(data.name||payload.name)}</b>`);
}
async function loadSelectedCloudCharacter(){
  if(!cloudRequireLogin()) return;
  const remoteId=value("cloudCharacterSelect");
  if(!remoteId){notify("Escolha uma ficha da nuvem para carregar.");return}
  const {data,error}=await supabaseClient.from("characters").select("id,name,owner_id,player_name,sheet_data,campaign_id,is_private,updated_at").eq("id",remoteId).single();
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
  if(!value("cloudCampaignSelect")){notify("Escolha uma campanha para vincular.");return}
  await saveCloudCharacter(false);
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
async function linkLocalCharacterToCampaign(localId,campaignId){
  const data=localId===currentCharacterId?sheetDataFromCurrent():localCharacterData(localId);
  if(!data){notify("Ficha local nao encontrada.");return}
  const payload=cloudPayloadFromSheetData(data,campaignId);
  const remoteId=readCloudCharacterMap()[localId]||"";
  clearCloudAutosaveTimer(remoteId);
  const request=remoteId
    ? supabaseClient.from("characters").update(payload).eq("id",remoteId).select("id,name,campaign_id,updated_at").single()
    : supabaseClient.from("characters").insert(payload).select("id,name,campaign_id,updated_at").single();
  const {data:cloudData,error}=await request;
  if(error) throw error;
  setCloudMappingForLocal(localId,cloudData.id);
  if(localId===currentCharacterId){
    if($("#cloudCampaignSelect")) $("#cloudCampaignSelect").value=campaignId;
    setMappedCloudCharacterId(cloudData.id);
  }
}
async function linkCloudCharacterToCampaign(remoteId,campaignId){
  const character=cloudCharacters.find(entry=>entry.id===remoteId);
  if(!character||character.owner_id!==cloudUser.id){notify("Voce so pode vincular fichas da sua conta.");return}
  clearCloudAutosaveTimer(remoteId);
  const {error}=await supabaseClient.from("characters").update({campaign_id:campaignId,updated_at:new Date().toISOString()}).eq("id",remoteId);
  if(error) throw error;
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
    clearCloudAutosaveTimer(remoteId);
    const {error:updateError}=await supabaseClient
      .from("characters")
      .update({campaign_id:campaignId,updated_at:new Date().toISOString()})
      .eq("id",remoteId);
    if(updateError) throw updateError;
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
  localStorage.removeItem(AUTH_MODE_KEY);
  sessionStorage.removeItem(AUTH_MODE_KEY);
  showAuthGate();
  notify("Saiu da nuvem.");
}
async function initCloud(){
  if(!SUPABASE_URL||!SUPABASE_PUBLISHABLE_KEY||!window.supabase?.createClient){
    setCloudStatus("Indisponivel");
    if(sessionStorage.getItem(AUTH_MODE_KEY)==="offline") enterApp("offline");
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
    supabaseClient.auth.onAuthStateChange(async(_event,session)=>{
      cloudUser=session?.user||null;
      if(cloudUser) enterApp("cloud");
      try{await loadCloudData({syncCurrent:!!cloudUser})}catch(err){console.error(err);renderCloudPanel()}
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
function renderAll(){normalizeState();renderOffices();renderPowers();renderSpells();renderSpellCatalog();renderItems();renderAttacks();renderConditions();renderOriginBenefits();renderCharacterManager();renderCharacterPortrait();recalc();syncCloudReadOnlyControls()}
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

$$("[data-save]").forEach(e=>e.addEventListener("input",()=>{
  if(e.id==="nivel"){renderPowers();refreshPowerPickerIfOpen()}
  if(e.id==="portraitUrl") renderCharacterPortrait();
  recalc();
  if(e.id==="divindade") refreshPowerPickerIfOpen();
  save(false);
}));
$("#spellAttr").addEventListener("change",()=>{recalc();save(false)});
$("#defAttr").addEventListener("change",()=>{recalc();save(false)});
function syncClassDefenseAttr(){
  if(value("classe")==="sentinela" && (!value("defAttr") || value("defAttr")==="DES")) $("#defAttr").value="INT";
}
$("#classe").addEventListener("change",()=>{state.skillData={};syncClassDefenseAttr();renderPowers();refreshPowerPickerIfOpen();recalc();save(false)});
$("#raca").addEventListener("change",()=>{renderPowers();refreshPowerPickerIfOpen();recalc();save(false)});
$("#origem").addEventListener("change",()=>{refreshPowerPickerIfOpen();recalc();save(false)});
$("#origemTab").addEventListener("change",()=>{$("#origem").value=$("#origemTab").value;refreshPowerPickerIfOpen();recalc();save(false)});
$$("[data-tab]").forEach(b=>b.onclick=()=>{$$("[data-tab]").forEach(x=>x.classList.toggle("active",x===b));$$(".tab").forEach(t=>t.classList.toggle("active",t.id===`tab-${b.dataset.tab}`))});
$$("[data-change]").forEach(b=>b.onclick=()=>{const[id,delta]=b.dataset.change.split(":");applyQuickResourceChange(id,Number(delta));recalc()});
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
$("#applyOriginBtn").onclick=applyOrigin;$("#addOriginBenefit").onclick=()=>{state.originBenefits.push("");renderOriginBenefits();save(false)};$("#addCustomCondition").onclick=()=>{state.customConditions.push({name:"Nova condição",active:true,effect:""});renderCustomConditions();renderConditionMini();save(false)};
$("#addAttack").onclick=()=>{state.attacks.push({name:"Novo ataque",bonus:0,damage:"1d6",crit:"20",mult:"x2",notes:""});expandedAttackCards.add(state.attacks.length-1);renderAttacks();save(false)};
$("#characterSelect").onchange=e=>switchCharacter(e.target.value);
$("#newCharacterBtn").onclick=newCharacter;
$("#duplicateCharacterBtn").onclick=duplicateCharacter;
$("#renameCharacterBtn").onclick=renameCharacter;
$("#deleteCharacterBtn").onclick=deleteCharacter;
function saveFromHeader(){
  return cloudUser&&supabaseClient?runCloudAction(()=>saveCloudCharacter(true)):save(true);
}
$("#saveBtn").onclick=saveFromHeader;
$("#cloudSignInBtn")?.addEventListener("click",()=>runCloudAction(cloudSignIn));
$("#cloudSignUpBtn")?.addEventListener("click",()=>runCloudAction(cloudSignUp));
$("#offlineModeBtn")?.addEventListener("click",()=>enterApp("offline"));
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
initCloud();
