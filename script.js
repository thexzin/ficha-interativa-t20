
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const KEY="t20_sheet_v6_2";
const LEGACY_KEYS=["t20_sheet_v3","t20_sheet_v4","t20_sheet_v5","t20_sheet_v6"];

function normalizeState(){
  const defaults={powers:[],spells:[],items:[],attacks:[],skillData:{},conditions:{},customConditions:[],originBenefits:[],offices:[{name:"",trained:false,adjust:0}]};
  state={...defaults,...(state||{})};
  for(const k of Object.keys(defaults)){
    if(Array.isArray(defaults[k]) && !Array.isArray(state[k])) state[k]=[];
    if(!Array.isArray(defaults[k]) && typeof state[k]!=="object") state[k]={};
  }
  state.spells=state.spells.map(spell=>normalizeSpellDetailFields({...spell}));
}

let state={powers:[],spells:[],items:[],attacks:[{name:"Ataque desarmado",bonus:0,damage:"1d3",crit:"20",mult:"x2",notes:""}],skillData:{},conditions:{},customConditions:[],originBenefits:[],offices:[{name:"",trained:false,adjust:0}]};
let expandedSpellCards=new Set();
let expandedPowerCards=new Set();
let expandedItemCards=new Set();

const ATTR_KEYS=["FOR","DES","CON","INT","SAB","CAR"];
const rawNum=id=>Number($("#"+id)?.value||0);
const num=id=>rawNum(id);
const attrNum=id=>ATTR_KEYS.includes(id)?rawNum(id)+rawNum(`${id}Temp`):rawNum(id);
const value=id=>$("#"+id)?.value||"";
function notify(html){const t=$("#toast");t.innerHTML=html;t.classList.remove("hidden");clearTimeout(window.__to);window.__to=setTimeout(()=>t.classList.add("hidden"),3500)}
function rollD20(bonus,title){const d=Math.floor(Math.random()*20)+1;notify(`<b>${title}</b><br><span style="font-size:2rem;color:var(--gold)">${d+Number(bonus||0)}</span><br>1d20 (${d}) + ${bonus}`)}
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

const CONDITION_LIBRARY={
"Abalado":{desc:"–2 em testes de perícia.",effects:{allSkills:-2}},
"Apavorado":{desc:"–5 em testes de perícia e não pode se aproximar voluntariamente da fonte.",effects:{allSkills:-5}},
"Agarrado":{desc:"Condição restritiva. A ficha aplica –2 em ataques e –5 na Defesa.",effects:{attack:-2,defense:-5}},
"Atordoado":{desc:"Fica desprevenido e não pode fazer ações.",effects:{defense:-5}},
"Caído":{desc:"–5 na Defesa contra ataques corpo a corpo e +5 contra ataques à distância. A ficha usa –5 como alerta geral.",effects:{defense:-5}},
"Cego":{desc:"Fica desprevenido, sofre –5 em testes de ataque e falha automaticamente em testes visuais.",effects:{defense:-5,attack:-5}},
"Confuso":{desc:"Age de maneira aleatória; não possui penalidade numérica global automática.",effects:{}},
"Debilitado":{desc:"–5 em testes de Força, Destreza e Constituição.",effects:{attrs:{FOR:-5,DES:-5,CON:-5}}},
"Desprevenido":{desc:"–5 na Defesa.",effects:{defense:-5}},
"Em Chamas":{desc:"Sofre dano de fogo por rodada; sem penalidade numérica em perícias.",effects:{}},
"Enjoado":{desc:"Só pode realizar uma ação padrão ou de movimento por turno.",effects:{}},
"Enredado":{desc:"Fica lento, vulnerável e sofre –2 em testes de ataque.",effects:{defense:-2,attack:-2}},
"Envenenado":{desc:"Os efeitos variam conforme o veneno.",effects:{}},
"Esmorecido":{desc:"–5 em testes de Inteligência, Sabedoria e Carisma.",effects:{attrs:{INT:-5,SAB:-5,CAR:-5}}},
"Exausto":{desc:"–5 na Defesa, ataques e testes físicos; deslocamento reduzido.",effects:{defense:-5,attack:-5,attrs:{FOR:-5,DES:-5,CON:-5}}},
"Fascinado":{desc:"–5 em Percepção e não pode fazer ações hostis contra a fonte.",effects:{skills:{Percepção:-5}}},
"Fatigado":{desc:"–2 na Defesa, ataques e testes físicos.",effects:{defense:-2,attack:-2,attrs:{FOR:-2,DES:-2,CON:-2}}},
"Fraco":{desc:"–2 em testes de Força, Destreza e Constituição.",effects:{attrs:{FOR:-2,DES:-2,CON:-2}}},
"Frustrado":{desc:"–2 em testes de Inteligência, Sabedoria e Carisma.",effects:{attrs:{INT:-2,SAB:-2,CAR:-2}}},
"Imóvel":{desc:"Deslocamento zero.",effects:{}},
"Inconsciente":{desc:"Fica indefeso e incapaz de agir.",effects:{defense:-10}},
"Lento":{desc:"Só pode realizar uma ação padrão ou de movimento por turno.",effects:{}},
"Ofuscado":{desc:"–2 em ataques e Percepção.",effects:{attack:-2,skills:{Percepção:-2}}},
"Paralisado":{desc:"Fica imóvel e indefeso.",effects:{defense:-10}},
"Pasmo":{desc:"Não pode fazer ações, apenas reações.",effects:{}},
"Petrificado":{desc:"Transformado em pedra e incapaz de agir.",effects:{}},
"Sangrando":{desc:"Pode perder PV a cada rodada; sem modificador fixo automático.",effects:{}},
"Surdo":{desc:"–5 em Iniciativa e falha em testes auditivos.",effects:{skills:{Iniciativa:-5}}},
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
  for(const [name,status] of Object.entries(state.conditions||{})){
    if(!status?.active) continue;
    const e=CONDITION_LIBRARY[name]?.effects||{};
    result.defense+=Number(e.defense||0);
    result.attack+=Number(e.attack||0);
    result.allSkills+=Number(e.allSkills||0);
    for(const [a,v] of Object.entries(e.attrs||{})) result.attrs[a]=(result.attrs[a]||0)+Number(v);
    for(const [s,v] of Object.entries(e.skills||{})) result.skills[s]=(result.skills[s]||0)+Number(v);
  }
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
  const defenseDex=$("#defUseDex")?.checked!==false?num("DES"):0;
  $("#defView").textContent=10+defenseDex+num("armadura")+num("escudo")+num("defBonus")+num("defAjuste")+conditionFx.defense;
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
  renderProgress();renderSkills();renderInventorySummary();save(false);
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
          <span><button data-officeroll="${idx}" data-bonus="${total}">Rolar</button> <button data-officedel="${idx}">×</button></span>
        </div>`);
      });
      rows.push(`<div><button id="addOffice">+ Adicionar Ofício</button></div>`);
      continue;
    }
    const d=state.skillData[name]||{trained:cls.pericias.includes(name),adjust:0};state.skillData[name]=d;
    const total=halfLevel()+attrNum(attr)+(d.trained?trainingBonus():0)+Number(d.adjust||0)+Number(fx.allSkills||0)+Number(fx.attrs[attr]||0)+Number(fx.skills[name]||0);
    rows.push(`<div class="skill"><span>${name} <small>(${attr})</small></span><label><input type="checkbox" data-sktrain="${name}" ${d.trained?"checked":""}> Treino</label><input type="number" data-skadj="${name}" value="${d.adjust||0}"><span class="total">${total>=0?"+":""}${total}</span><button data-skroll="${name}" data-bonus="${total}">Rolar</button></div>`);
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
          <span><button data-officeroll="${idx}" data-bonus="${total}" ${locked?"disabled":""}>Rolar</button> <button data-officedel="${idx}">x</button></span>
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
      <button data-skroll="${escapeHtml(name)}" data-bonus="${total}" ${locked?"disabled":""}>Rolar</button>
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
  $("#powersList").innerHTML=state.powers.map((p,i)=>`<div class="card"><div class="cardHead"><input data-p="${i}" data-k="name" value="${p.name||""}" placeholder="Nome"><select data-p="${i}" data-k="type"><option ${p.type==="Classe"?"selected":""}>Classe</option><option ${p.type==="Raça"?"selected":""}>Raça</option><option ${p.type==="Origem"?"selected":""}>Origem</option><option ${p.type==="Concedido"?"selected":""}>Concedido</option><option ${p.type==="Distinção"?"selected":""}>Distinção</option><option ${p.type==="Outro"?"selected":""}>Outro</option></select><button class="remove" data-pdel="${i}">Excluir</button></div><div class="powerMeta"><input data-p="${i}" data-k="cost" value="${p.cost||""}" placeholder="Custo/uso"><input data-p="${i}" data-k="action" value="${p.action||""}" placeholder="Ação"><input data-p="${i}" data-k="source" value="${p.source||""}" placeholder="Fonte/página"></div><textarea data-p="${i}" data-k="desc" rows="4" placeholder="Descrição">${p.desc||""}</textarea></div>`).join("");
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
  suraggel:["Aggelus","Sulfure"],
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
function syncAutoClassFeatures(){
  state.powers=Array.isArray(state.powers)?state.powers:[];
  const manual=state.powers.filter(power=>power.autoClassFeature!==AUTO_CLASS_FEATURE_FLAG && power.autoRaceAbility!==AUTO_RACE_ABILITY_FLAG && !isRaceAttributeModifierPower(power));
  const manualClassFeatureKeys=new Set(manual
    .filter(power=>normalizePowerType(power.type)==="Classe")
    .map(power=>classFeatureBaseKey(power.name))
    .filter(Boolean));
  const manualRaceAbilityKeys=new Set(manual
    .filter(power=>normalizePowerType(power.type)==="Raça")
    .map(power=>powerCatalogKey(power.name))
    .filter(Boolean));
  const auto=currentAutoClassFeatures().filter(power=>!manualClassFeatureKeys.has(classFeatureBaseKey(power.name)));
  const autoRace=currentAutoRaceAbilities().filter(power=>!manualRaceAbilityKeys.has(powerCatalogKey(power.name)));
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
  return `<div class="card powerAccordionCard ${isOpen?"expanded":""}">
    <button type="button" class="powerAccordionToggle" data-powertoggle="${i}" aria-expanded="${isOpen}">
      <span class="powerAccordionTitle"><strong>${escapeHtml(p.name||"Poder sem nome")}</strong><small>${autoText}</small></span>
      <span class="powerAccordionCue">${isOpen?"Recolher":"Expandir"}</span>
    </button>
    <div class="powerAccordionBody ${isOpen?"":"hidden"}">
      <div class="powerMainFields">
        <label>Nome<input data-p="${i}" data-k="name" value="${escapeHtml(p.name||"")}" placeholder="Nome"${lockAttr}></label>
        <label>Tipo<select data-p="${i}" data-k="type"${disabledAttr}>${powerTypeOptions(p.type||"Classe")}</select></label>
        ${isAuto?`<span class="autoPowerBadge">${isAutoRace?"Raça":"Progressão"}</span>`:`<button type="button" class="remove" data-pdel="${i}">Excluir</button>`}
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
function currentRaceAliases(){
  const raceId=value("raca"), race=T20_DATA.racas[raceId];
  return raceAliasesFor(raceId,race);
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
function formatSpellDescriptionText(desc){
  return splitSpellDescriptionParagraphs(desc).join("\n\n");
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
    return `<div class="grimoireGroup"><div class="grimoireDivider">${circle}º círculo</div>${list.map(({spell:s,index:i})=>`<div class="card"><div class="cardHead"><input data-s="${i}" data-k="name" value="${s.name||''}" placeholder="Nome da magia"><input data-s="${i}" data-k="school" value="${s.school||''}" placeholder="Escola"><button class="remove" data-sdel="${i}">Excluir</button></div><div class="spellMeta"><input data-s="${i}" data-k="circle" type="number" min="1" max="5" value="${s.circle||1}" title="Círculo"><input data-s="${i}" data-k="cost" type="number" min="0" value="${s.cost||1}" title="PM"><input data-s="${i}" data-k="execution" value="${s.execution||''}" placeholder="Execução"><input data-s="${i}" data-k="range" value="${s.range||''}" placeholder="Alcance/alvo"><input data-s="${i}" data-k="resistance" value="${s.resistance||''}" placeholder="Resistência"></div><textarea data-s="${i}" data-k="desc" rows="4" placeholder="Descrição e aprimoramentos">${s.desc||''}</textarea><div class="smallActions"><button class="cast" data-cast="${i}">Conjurar (−${s.cost||1} PM)</button></div></div>`).join('')}</div>`;
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
      <div class="smallActions grimoireSpellActions"><button type="button" class="cast" data-cast="${i}">Conjurar (-${cost} PM)</button><button type="button" class="remove iconRemove" data-sdel="${i}" aria-label="Excluir magia ${escapeHtml(s.name||"")}" title="Excluir">&times;</button></div>
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
        <button type="button" class="remove" data-idel="${i}">Excluir</button>
      </div>
      <div class="itemDetailFields">
        <label>Qtd.<input data-i="${i}" data-k="qty" type="number" min="0" value="${qty}"></label>
        <label>Espaços<input data-i="${i}" data-k="spaces" type="number" step=".5" value="${spaces}"></label>
        <label>Preço<input data-i="${i}" data-k="price" value="${escapeHtml(it.price||"")}"></label>
        <label>Fonte<input data-i="${i}" data-k="source" value="${escapeHtml(it.source||"")}"></label>
        <label>Equipado<select data-i="${i}" data-k="equipped"><option value="false" ${!it.equipped?"selected":""}>Não</option><option value="true" ${it.equipped?"selected":""}>Sim</option></select></label>
      </div>
      <label>Descrição, melhorias e efeitos<textarea data-i="${i}" data-k="notes" rows="5" placeholder="Descricao, melhorias e efeitos">${escapeHtml(it.notes||"")}</textarea></label>
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
    const haystack=[item.name,item.category,item.price,item.source,item.notes].filter(Boolean).join(" ").toLowerCase();
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
    notes:item.notes||"",
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
  const name=escapeHtml(a.name||"Ataque sem nome");
  const bonus=Number(a.bonus||0);
  const bonusText=`${bonus>=0?"+":""}${bonus}`;
  const damage=escapeHtml(a.damage||"sem dano");
  const crit=escapeHtml(a.crit||"20");
  const mult=escapeHtml(a.mult||"x2");
  const notes=escapeHtml(a.notes||"");
  return `<div class="card combatAttackCard">
    <div class="combatAttackHeader">
      <div class="combatAttackTitle">
        <strong>${name}</strong>
        <span>${bonusText} ataque • ${damage} dano • ${crit}/${mult}</span>
      </div>
      <div class="combatRollActions">
        <button type="button" class="attackRoll" data-aroll="${i}">Ataque</button>
        <button type="button" class="damageRoll" data-droll="${i}">Dano</button>
      </div>
    </div>
    <div class="attackFields">
      <label>Nome<input data-a="${i}" data-k="name" value="${name}"></label>
      <label>Ataque<input data-a="${i}" data-k="bonus" type="number" value="${bonus}"></label>
      <label>Dano<input data-a="${i}" data-k="damage" value="${damage}" placeholder="1d6+1d12+4"></label>
      <label>Crítico<input data-a="${i}" data-k="crit" value="${crit}"></label>
      <label>Mult.<input data-a="${i}" data-k="mult" value="${mult}"></label>
      <button type="button" class="remove combatRemove" data-adel="${i}">Excluir</button>
    </div>
    <label class="attackNotes">Notas<textarea data-a="${i}" data-k="notes" rows="2" placeholder="Alcance, munição, melhorias, efeitos especiais...">${notes}</textarea></label>
  </div>`;
}
function renderAttacks(){
  $("#attacksList").innerHTML=state.attacks.map((a,i)=>renderAttackCard(a,i)).join("") || '<p class="muted">Nenhum ataque registrado ainda.</p>';
  bindCollection("a",state.attacks,renderAttacks);$$("[data-adel]").forEach(e=>e.onclick=()=>{state.attacks.splice(+e.dataset.adel,1);renderAttacks();save(false)});$$("[data-aroll]").forEach(e=>e.onclick=()=>rollD20(Number(state.attacks[+e.dataset.aroll].bonus||0)+activeConditionEffects().attack,state.attacks[+e.dataset.aroll].name));$$("[data-droll]").forEach(e=>e.onclick=()=>{try{const a=state.attacks[+e.dataset.droll],r=rollDice(a.damage);notify(`<b>${a.name}</b><br><span style="font-size:2rem;color:var(--gold)">${r.total}</span><br>${r.details.join(" + ")}`)}catch(err){alert(err.message)}});
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
function save(show=true){const fields=collectSavedFields();localStorage.setItem(KEY,JSON.stringify({fields,state}));if(show)notify("Ficha salva neste navegador.")}
function load(){
  let raw=localStorage.getItem(KEY);
  if(!raw){
    for(const legacyKey of LEGACY_KEYS){
      raw=localStorage.getItem(legacyKey);
      if(raw) break;
    }
  }
  if(!raw)return;
  try{
    const d=JSON.parse(raw);
    const saved=d.state||{};
    state={
      powers:Array.isArray(saved.powers)?saved.powers:[],
      spells:Array.isArray(saved.spells)?saved.spells:[],
      items:Array.isArray(saved.items)?saved.items:[],
      attacks:Array.isArray(saved.attacks)&&saved.attacks.length?saved.attacks:[{name:"Ataque desarmado",bonus:0,damage:"1d3",crit:"20",mult:"x2",notes:""}],
      skillData:saved.skillData&&typeof saved.skillData==="object"?saved.skillData:{},
      conditions:saved.conditions&&typeof saved.conditions==="object"?saved.conditions:{},
      customConditions:Array.isArray(saved.customConditions)?saved.customConditions:[],
      originBenefits:Array.isArray(saved.originBenefits)?saved.originBenefits:[],
      offices:Array.isArray(saved.offices)&&saved.offices.length?saved.offices:[{name:"",trained:false,adjust:0}]
    };
    Object.entries(d.fields||{}).forEach(([id,v])=>restoreSavedField(id,v));
    localStorage.setItem(KEY,JSON.stringify({fields:collectSavedFields(),state}));
  }catch(err){
    console.error("Falha ao carregar ficha salva:",err);
  }
}
function exportSheet(){const fields=collectSavedFields();const blob=new Blob([JSON.stringify({fields,state},null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`ficha-${(value("nome")||"personagem").replace(/\W+/g,"-")}.json`;a.click()}
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
      <div class="cardHead"><input data-cc="${i}" data-k="name" value="${name}" placeholder="Nome"><label>Ativa<input data-ccactive="${i}" type="checkbox" ${c.active?"checked":""}></label><button class="remove" data-ccdel="${i}">Excluir</button></div>
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
      <button class="remove" data-obdel="${i}">Excluir</button>
    </div>`).join("");
  $$("[data-ob]").forEach(e=>e.oninput=()=>{state.originBenefits[+e.dataset.ob]=e.value;save(false)});
  $$("[data-obdel]").forEach(e=>e.onclick=()=>{state.originBenefits.splice(+e.dataset.obdel,1);renderOriginBenefits();save(false)});
}
function renderAll(){normalizeState();renderOffices();renderPowers();renderSpells();renderSpellCatalog();renderItems();renderAttacks();renderConditions();renderOriginBenefits();recalc()}
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

$$("[data-save]").forEach(e=>e.addEventListener("input",()=>{if(e.id==="nivel"){renderPowers();refreshPowerPickerIfOpen()}recalc();if(e.id==="divindade")refreshPowerPickerIfOpen()}));$("#spellAttr").addEventListener("change",recalc);$("#classe").addEventListener("change",()=>{state.skillData={};renderPowers();refreshPowerPickerIfOpen();recalc()});$("#raca").addEventListener("change",()=>{renderPowers();refreshPowerPickerIfOpen();recalc();save(false)});$("#origem").addEventListener("change",()=>{refreshPowerPickerIfOpen();recalc()});$("#origemTab").addEventListener("change",()=>{$("#origem").value=$("#origemTab").value;refreshPowerPickerIfOpen();recalc()});
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
$("#addAttack").onclick=()=>{state.attacks.push({name:"Novo ataque",bonus:0,damage:"1d6",crit:"20",mult:"x2",notes:""});renderAttacks();save(false)};
$("#saveBtn").onclick=()=>save(true);$("#exportBtn").onclick=exportSheet;$("#resetBtn").onclick=()=>{if(confirm("Apagar a ficha salva?")){localStorage.removeItem(KEY);location.reload()}};
$("#importInput").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);localStorage.setItem(KEY,JSON.stringify(d));location.reload()}catch{alert("Arquivo inválido.")}};r.readAsText(f)};
