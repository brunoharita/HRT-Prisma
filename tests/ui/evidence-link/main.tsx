import { useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider } from 'antd';
import ptBR from 'antd/locale/pt_BR';
import { PersonProfessionalEvidenceMap } from '../../../web/src/components/profile/PersonProfessionalEvidenceMap';
import { CanonicalProfileHeader } from '../../../web/src/components/profile/CanonicalProfileView';
import { m72Fixture } from '../../fixtures/m72PersonEvidence';
import type { CompetencyCurationAdapter } from '../../../web/src/domain/profileCompetencyCuration';
import type { PrismaProfileView } from '../../../web/src/domain/canonicalProfile';
import { prismaTheme } from '../../../web/src/ui/theme';
import '../../../web/src/styles.css';
import '../../../web/src/ui/foundation.css';
const scenario=new URLSearchParams(location.search).get('case')??'single';
const initial=m72Fixture();initial.associations=initial.associations.filter(x=>x.nature==='declared').slice(0,1);initial.associations[0]!.concept.label='Transformação operacional';
const sources=[{nature:'contextual' as const,index:0,label:'Experiência 1: Diretora · Empresa sintética',quote:'Coordenação de projetos e processos operacionais.'},{nature:'contextual' as const,index:1,label:'Experiência 2: Gerente · Operações sintéticas',quote:'Gestão de entregas e integração de sistemas.'},{nature:'certified' as const,index:0,label:'Credencial 1: Certificação sintética',quote:'Certificação sintética'}];
const profile:PrismaProfileView={identity:{fullName:'Ana Ribeiro',professionalTitle:'Gestora de operações',location:'São Paulo, SP',lifecycleLabel:'Perfil vigente',operationalStatusLabel:'Ativo'},about:null,experiences:[],education:[],competencyGroups:[],credentials:{certifications:[],languages:[]},customSections:[],version:{profileId:initial.profile.id,number:1,publishedAt:initial.profile.publishedAt,current:true}};
let calls:Parameters<CompetencyCurationAdapter['linkEvidence']>[0][]=[];
function Harness(){const adapter=useMemo<CompetencyCurationAdapter>(()=>({canUseGlobal:false,async classify(){return initial;},async loadSubgroups(){return[];},async search(){return[];},async suggestDescription(){return'';},async save(){return{projection:initial,outcome:'alias'};},async refresh(){return initial;},async loadEvidenceSources(){return sources;},async linkEvidence(input){calls.push(structuredClone(input));await new Promise(r=>setTimeout(r,100));if(scenario==='failure')throw Error('Não foi possível gravar os vínculos. Sua seleção foi preservada.');const next=structuredClone(initial);for(const source of input.sources){const association=structuredClone(next.associations[0]!);association.id='link-'+source.nature+source.sourceIndex;association.nature=source.nature;association.evidence={...association.evidence,id:association.id,quote:source.sourceQuote,fact:source.sourceQuote};next.associations.push(association);}return next;}}),[]);return <ConfigProvider locale={ptBR} theme={prismaTheme}><div className="prisma-profile-page"><CanonicalProfileHeader profile={profile}/><PersonProfessionalEvidenceMap profile={profile} projection={initial} projectionError={null} curation={adapter} onOpenSource={()=>undefined}/></div></ConfigProvider>;}
createRoot(document.getElementById('app')!).render(<Harness/>);
const pause=(ms=250)=>new Promise(r=>setTimeout(r,ms));
const button=(text:string)=>[...document.querySelectorAll<HTMLButtonElement>('button')].find(x=>x.textContent===text);
declare global{interface Window{__QA_EVIDENCE_DONE?:boolean;__QA_EVIDENCE_REPORT?:unknown;}}
setTimeout(async()=>{const checks:Record<string,boolean>={};try{
button('Competências')?.click();await pause();document.querySelector<HTMLElement>('.ant-collapse-header')?.click();await pause();button('Vincular evidência')?.click();await pause();
checks.loaded=Boolean(document.querySelector('.ant-modal'));checks.noRationaleField=![...document.querySelectorAll('label')].some(x=>x.textContent?.includes('Justificativa'));checks.noPreselection=document.querySelectorAll('.ant-modal .ant-select-selection-item').length===0 && document.querySelectorAll('.prisma-evidence-link-source').length===0;
const choose=async(index:number)=>{document.querySelector<HTMLElement>('.ant-modal .ant-select-content')?.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));await pause();[...document.querySelectorAll<HTMLElement>('.ant-select-item-option')].find(x=>x.textContent===sources[index]!.label)?.click();await pause();};
await choose(scenario==='credential'?2:0);if(['multiple','remove','failure'].includes(scenario))await choose(1);
if(scenario==='remove'){document.querySelector<HTMLElement>('.ant-modal .ant-select-selection-item-remove')?.click();await pause();checks.removed= document.querySelectorAll('.prisma-evidence-link-source').length===1;}
if(scenario==='credential'){checks.credentialStillRequiresFacts=Boolean(button('Confirmar vínculo')?.disabled);const inputs=[...document.querySelectorAll<HTMLInputElement>('.prisma-evidence-link-source input')];for(const [i,input] of inputs.entries()){Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,i===0?'Credencial sintética':'Emissor sintético');input.dispatchEvent(new Event('input',{bubbles:true}));}await pause();}
checks.correctSourceCards=document.querySelectorAll('.prisma-evidence-link-source').length===(['multiple','failure'].includes(scenario)?2:1);const confirm=button(['multiple','failure'].includes(scenario)?'Confirmar 2 vínculos':'Confirmar vínculo');checks.enabledWithoutJustification=Boolean(confirm&&!confirm.disabled);
document.querySelector<HTMLElement>('.ant-select-content input')?.blur();document.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));await pause();
// Renderer captures the populated modal before continuing the save flow.
document.body.dataset.qaCapture='ready';for(let i=0;i<60&&document.body.dataset.qaCapture==='ready';i++)await pause(100);
confirm?.click();confirm?.click();await pause(450);checks.oneBatchCall=calls.length===1;checks.allSelectedSent=calls[0]?.sources.length===(['multiple','failure'].includes(scenario)?2:1);checks.noClientRationale=calls[0]&&!('reason' in calls[0])&&calls[0].sources.every(x=>!('reason' in x));
if(scenario==='failure'){checks.failurePreservesDraft=Boolean(document.querySelector('.ant-modal'))&&document.querySelectorAll('.prisma-evidence-link-source').length===2&&document.body.textContent!.includes('Sua seleção foi preservada');}else{checks.closedOnSave=!document.querySelector('.ant-modal-wrap:not([style*="display: none"])');checks.projectionUpdated=document.body.textContent!.includes(['multiple'].includes(scenario)?'3 evidências':'2 evidências');}
checks.noOverflow=document.documentElement.scrollWidth<=innerWidth+1;
}catch(e){checks.unexpected=false;}const report={scenario,width:innerWidth,checks,pass:Object.values(checks).every(Boolean)};window.__QA_EVIDENCE_REPORT=report;await fetch('/qa-evidence-report',{method:'POST',body:JSON.stringify(report)});window.__QA_EVIDENCE_DONE=true;},600);
