import type {ContextualAssessmentQuestion} from '../../../src/domain/positionAssessment.js';
import type {ActivityFacts,QuestionActivityFacts} from '../../../src/domain/assessmentActivityAnalysis.js';

export type ResultMeasure='correct'|'focus'|'focusTime'|'changes'|'responseTime';
export type ResultGrouping='topic'|'difficulty';
export interface ResultFilters {topic:string;difficulty:string;outcome:string;}
export interface ResultRow {question:ContextualAssessmentQuestion;number:number;topic:string;topicLabel:string;difficulty:string;correct:boolean|null;activity:QuestionActivityFacts|null;}
export const difficultyLabels:Record<string,string>={easy:'Fácil',medium:'Média',hard:'Difícil'};
export function resultRows(questions:ContextualAssessmentQuestion[],answers:Record<string,string>,completed:boolean,requirements:Array<{id:string;label:string}>,facts:ActivityFacts):ResultRow[]{
 const labels=new Map(requirements.map(r=>[r.id,r.label]));
 return questions.map((question,index)=>({question,number:index+1,topic:question.requirementId,topicLabel:labels.get(question.requirementId)||question.competencyKey||'Assunto não informado',difficulty:question.difficulty,
  correct:completed&&question.options.some(o=>o.id===answers[question.id])?answers[question.id]===question.correctOptionId:null,
  activity:facts.rows.find(r=>r.questionId===question.id)??null}));
}
export function filterResultRows(rows:ResultRow[],filters:ResultFilters):ResultRow[]{
 return rows.filter(r=>(!filters.topic||r.topic===filters.topic)&&(!filters.difficulty||r.difficulty===filters.difficulty)&&(!filters.outcome||(r.correct!==null&&(filters.outcome==='correct')===r.correct)));
}
export function resultMeasure(rows:ResultRow[],measure:ResultMeasure):number|null{
 if(!rows.length||measure==='responseTime')return null;
 if(measure==='correct')return rows.every(r=>r.correct!==null)?rows.filter(r=>r.correct).length:null;
 if(measure==='focusTime'){
  const observed=rows.filter(r=>r.activity&&r.activity.focusCount>0);
  return observed.length&&observed.every(r=>r.activity!.focusMs!==null)?observed.reduce((n,r)=>n+r.activity!.focusMs!,0):null;
 }
 return rows.reduce((n,r)=>n+((measure==='focus'?r.activity?.focusCount:r.activity?.answerChangeCount)??0),0);
}
export function resultGroups(rows:ResultRow[],grouping:ResultGrouping):Array<{key:string;label:string;rows:ResultRow[]}>{
 const groups=new Map<string,{key:string;label:string;rows:ResultRow[]}>();
 for(const row of rows){const key=row[grouping],label=grouping==='topic'?row.topicLabel:difficultyLabels[key]??'Não informada';const group=groups.get(key)??{key,label,rows:[]};group.rows.push(row);groups.set(key,group);}
 const output=[...groups.values()];
 return grouping==='difficulty'?output.sort((a,b)=>['easy','medium','hard'].indexOf(a.key)-['easy','medium','hard'].indexOf(b.key)):output;
}
export function attemptElapsed(start:string|null|undefined,end:string|null):number|null{
 if(!start||!end)return null;const duration=Date.parse(end)-Date.parse(start);return Number.isFinite(duration)&&duration>=0?duration:null;
}
