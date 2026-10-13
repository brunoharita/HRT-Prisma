/** Factual activity only. No hiring, fraud, risk or intent classifications. */
export const ACTIVITY_ANALYSIS_VERSION = "assessment-activity-analysis-1.0.0";
export const ACTIVITY_ANALYSIS_METHOD_VERSION = "assessment-activity-analysis-1.1.0";
export interface ActivityEvent {id:number;question_id:string;question_version:string;kind:string;client_at_ms:number;received_at:string;sequence:number;method:string;payload:Record<string,unknown>;}
export interface ActivityQuestion {id:string;version:string;}
export interface QuestionActivityFacts {
 selectionCount?:number;copyCount?:number;contextMenuCount?:number;number:number;questionId:string;events:ActivityEvent[];focusCount:number;focusMs:number|null;
 mouseMs:number|null;longestMouseMs:number|null;mouseNotApplicable:boolean;mouseObserved:boolean;zoomCount:number;captureCount:number;reopenCount:number;answerChangeCount:number;gapCount:number;
}
export interface ActivityPattern {id:string;title:string;description:string;questionNumbers:number[];eventIds:number[];}
export interface ActivityFacts {
 selectionCount?:number;copyCount?:number;contextMenuCount?:number;contract:typeof ACTIVITY_ANALYSIS_VERSION;questionCount:number;questionsWithEvents:number;eventCount:number;unmatchedEventCount:number;invalidEventCount:number;
 focusCount:number;focusMs:number|null;mouseMs:number|null;longestMouseMs:number|null;zoomCount:number;captureCount:number;reopenCount:number;answerChangeCount:number;gapCount:number;
 rows:QuestionActivityFacts[];patterns:ActivityPattern[];
}
const count=(n:number,singular:string,plural=singular+"s")=>n+" "+(n===1?singular:plural);
const number=(value:unknown):number|null=>typeof value==="number"&&Number.isFinite(value)&&value>=0?value:null;
export function activityDuration(ms:number|null):string {
 if(ms===null)return "Informação indisponível";
 if(ms===0)return "0 segundos";
 if(ms<1000)return "menos de 1 segundo";
 const seconds=Math.round(ms/1000),minutes=Math.floor(seconds/60),rest=seconds%60;
 return [minutes?minutes+" "+(minutes===1?"minuto":"minutos"):"",rest?rest+" "+(rest===1?"segundo":"segundos"):""].filter(Boolean).join(" e ");
}
function sumKnown(values:Array<number|null>):number|null {return values.length&&values.every(v=>v!==null)?values.reduce<number>((n,v)=>n+(v??0),0):null;}
export function buildActivityFacts(questions:readonly ActivityQuestion[],events:readonly ActivityEvent[]):ActivityFacts {
 const seen=new Set<number>();let invalid=0,unmatched=0;
 const accepted:ActivityEvent[]=[];
 for(const event of events){
  if(!Number.isSafeInteger(event.id)||event.id<0||seen.has(event.id)||number(event.client_at_ms)===null||!event.payload||typeof event.payload!=="object"||Array.isArray(event.payload)){invalid++;continue;}
  seen.add(event.id);
  if(!questions.some(q=>q.id===event.question_id&&q.version===event.question_version)){unmatched++;continue;}
  accepted.push(event);
 }
 const rows=questions.map((question,index):QuestionActivityFacts=>{
  const entries=accepted.filter(e=>e.question_id===question.id).sort((a,b)=>a.client_at_ms-b.client_at_ms||a.sequence-b.sequence||a.id-b.id);
  const focus=entries.filter(e=>e.kind==="focus_episode"),mouse=entries.filter(e=>e.kind==="mouse_idle_before_first_choice"),applicable=mouse.filter(e=>e.payload.support==="observed_mouse");
  const mouseValues=applicable.map(e=>number(e.payload.totalIdleMs));
  const longest=applicable.map(e=>number(e.payload.longestIdleMs));
  return {selectionCount:entries.filter(e=>e.kind==="text_selection_observed").length,copyCount:entries.filter(e=>e.kind==="copy_action_observed").length,contextMenuCount:entries.filter(e=>e.kind==="context_menu_observed").length,number:index+1,questionId:question.id,events:entries,focusCount:focus.length,focusMs:sumKnown(focus.map(e=>number(e.payload.durationMs))),mouseMs:sumKnown(mouseValues),longestMouseMs:longest.length&&longest.every(v=>v!==null)?Math.max(...longest as number[]):null,mouseObserved:applicable.length>0,mouseNotApplicable:mouse.length>0&&mouse.every(e=>e.payload.support==="not_applicable"),zoomCount:entries.filter(e=>e.kind==="zoom_observed").length,captureCount:entries.filter(e=>e.kind==="capture_shortcut_observed").length,reopenCount:entries.filter(e=>e.kind==="question_reopened").length,answerChangeCount:entries.filter(e=>e.kind==="answer_changed").length,gapCount:entries.filter(e=>e.kind==="observation_gap").length};
 });
 const total=(key:"focusCount"|"zoomCount"|"captureCount"|"reopenCount"|"answerChangeCount"|"gapCount")=>rows.reduce((n,row)=>n+row[key],0);
 const focusRows=rows.filter(r=>r.focusCount>0),mouseRows=rows.filter(r=>r.mouseObserved),longest=mouseRows.map(r=>r.longestMouseMs);
 const facts:ActivityFacts={selectionCount:rows.reduce((n,r)=>n+(r.selectionCount??0),0),copyCount:rows.reduce((n,r)=>n+(r.copyCount??0),0),contextMenuCount:rows.reduce((n,r)=>n+(r.contextMenuCount??0),0),contract:ACTIVITY_ANALYSIS_VERSION,questionCount:questions.length,questionsWithEvents:rows.filter(r=>r.events.length>0).length,eventCount:accepted.length,unmatchedEventCount:unmatched,invalidEventCount:invalid,focusCount:total("focusCount"),focusMs:sumKnown(focusRows.map(r=>r.focusMs)),mouseMs:sumKnown(mouseRows.map(r=>r.mouseMs)),longestMouseMs:longest.length&&longest.every(v=>v!==null)?Math.max(...longest as number[]):null,zoomCount:total("zoomCount"),captureCount:total("captureCount"),reopenCount:total("reopenCount"),answerChangeCount:total("answerChangeCount"),gapCount:total("gapCount"),rows,patterns:[]};
 const add=(id:string,title:string,description:string,selected:QuestionActivityFacts[],kind:string)=>facts.patterns.push({id,title,description,questionNumbers:selected.map(r=>r.number),eventIds:selected.flatMap(r=>r.events.filter(e=>e.kind===kind).map(e=>e.id))});
 if(focusRows.length)add("focus_occurrences",facts.focusCount>1?"Perda de foco recorrente":"Perda de foco registrada",count(facts.focusCount,"ocorrência")+" em "+focusRows.length+" de "+questions.length+" questões. Tempo acumulado: "+activityDuration(facts.focusMs)+". O destino e o motivo não são observáveis.",focusRows,"focus_episode");
 const repeated=focusRows.filter(r=>r.focusCount>1);if(repeated.length)add("focus_same_question","Mais de uma perda de foco na mesma questão","Repetição nas questões "+repeated.map(r=>r.number).join(", ")+". Cada ocorrência permanece disponível nos acontecimentos.",repeated,"focus_episode");
 if(focusRows.length>1&&focusRows.every(r=>r.focusMs!==null)){const largest=Math.max(...focusRows.map(r=>r.focusMs as number));const selected=focusRows.filter(r=>r.focusMs===largest);add("focus_largest_total","Maior tempo acumulado sem foco",(selected.length===1?"Questão ":"Questões ")+selected.map(r=>r.number).join(", ")+": "+activityDuration(largest)+" no total, sem inferência sobre a duração de cada ocorrência.",selected,"focus_episode");}
 if(mouseRows.length)add("mouse_intervals","Intervalos sem movimento do mouse","Antes da primeira escolha: "+activityDuration(facts.mouseMs)+" no total; maior intervalo observado: "+activityDuration(facts.longestMouseMs)+". Leitura, reflexão e acessibilidade podem explicar ausência de movimento.",mouseRows,"mouse_idle_before_first_choice");
 if(facts.zoomCount)add("zoom_changes","Alterações de zoom registradas",count(facts.zoomCount,"alteração","alterações")+" de escala observada. Zoom e configurações de acessibilidade não indicam irregularidade.",rows.filter(r=>r.zoomCount>0),"zoom_observed");
 if(facts.captureCount)add("capture_shortcuts","Atalhos de captura registrados",count(facts.captureCount,"atalho")+" recebido pelo navegador. Não confirma que uma captura foi realizada.",rows.filter(r=>r.captureCount>0),"capture_shortcut_observed");
 if(facts.selectionCount)add("text_selections","Seleções de texto registradas",count(facts.selectionCount,"seleção","seleções")+" de texto da questão. Selecionar pode apoiar leitura e não confirma cópia.",rows.filter(r=>(r.selectionCount??0)>0),"text_selection_observed");
 if(facts.copyCount)add("copy_operations","Comandos de cópia registrados",count(facts.copyCount,"comando")+" com texto da questão selecionado. Não confirma o conteúdo final da área de transferência nem onde foi colado.",rows.filter(r=>(r.copyCount??0)>0),"copy_action_observed");
 if(facts.contextMenuCount)add("context_menus","Menus de contexto registrados",count(facts.contextMenuCount,"abertura")+" sobre o conteúdo da questão. Abrir o menu não confirma cópia nem outra ação.",rows.filter(r=>(r.contextMenuCount??0)>0),"context_menu_observed");
 if(facts.reopenCount)add("question_returns","Retorno a questões",count(facts.reopenCount,"reabertura")+" registrada. Voltar a uma questão faz parte da navegação permitida.",rows.filter(r=>r.reopenCount>0),"question_reopened");
 if(facts.answerChangeCount)add("answer_changes","Alterações de resposta",count(facts.answerChangeCount,"alteração","alterações")+" de alternativa. Rever respostas é permitido e não indica irregularidade.",rows.filter(r=>r.answerChangeCount>0),"answer_changed");
 if(facts.gapCount)add("observation_gaps","Intervalos com observação incompleta",count(facts.gapCount,"lacuna")+" de observação. O resumo não reconstrói atividade não observada.",rows.filter(r=>r.gapCount>0),"observation_gap");
 return facts;
}
export const ACTIVITY_CONTEXTS={copy:"Seleção e abertura de menu não confirmam cópia. O comando de cópia não revela o conteúdo final da área de transferência, o destino ou a intenção.",focus:"O sistema não identifica a outra página ou aplicativo, nem o motivo da perda de foco.",mouse:"Mouse parado pode corresponder à leitura, reflexão ou uso de acessibilidade.",capture:"Um atalho recebido não comprova captura de tela; outros métodos podem não ser observáveis.",missing:"Ausência de registros não comprova ausência de atividade. Considere também informações indisponíveis e dificuldades técnicas.",navigation:"Retornar às questões e alterar respostas são ações permitidas na avaliação."} as const;
export interface ActivitySelection {patternIds:string[];contextIds:Array<keyof typeof ACTIVITY_CONTEXTS>;}
export function validateActivitySelection(value:unknown,facts:ActivityFacts):ActivitySelection {
 if(!value||typeof value!=="object"||Array.isArray(value))throw Error("ACTIVITY_ANALYSIS_OUTPUT_INVALID");
 const v=value as Record<string,unknown>;
 if(Object.keys(v).sort().join(",")!=="contextIds,patternIds"||!Array.isArray(v.patternIds)||!Array.isArray(v.contextIds)||v.patternIds.length>facts.patterns.length||!v.contextIds.length||v.contextIds.length>Object.keys(ACTIVITY_CONTEXTS).length||new Set(v.patternIds).size!==v.patternIds.length||new Set(v.contextIds).size!==v.contextIds.length||v.patternIds.some(id=>typeof id!=="string"||!facts.patterns.some(p=>p.id===id))||v.contextIds.some(id=>typeof id!=="string"||!Object.hasOwn(ACTIVITY_CONTEXTS,id)))throw Error("ACTIVITY_ANALYSIS_OUTPUT_INVALID");
 if(facts.patterns.length&&!v.patternIds.length)throw Error("ACTIVITY_ANALYSIS_OUTPUT_INVALID");
 const mandatory=facts.patterns.filter(p=>p.id==="copy_operations"||p.id==="focus_same_question"||p.id==="observation_gaps"||p.id==="focus_occurrences"&&facts.focusCount>1).map(p=>p.id);
 if(mandatory.some(id=>!(v.patternIds as unknown[]).includes(id)))throw Error("ACTIVITY_ANALYSIS_OUTPUT_INVALID");
 return {patternIds:v.patternIds as string[],contextIds:v.contextIds as ActivitySelection["contextIds"]};
}
