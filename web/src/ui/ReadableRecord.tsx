import {recordFieldLabel,recordScalarLabel} from "./readableRecordValues";
import "./readableRecord.css";

/** Reads existing values only; no requests, mutations or truncation. */
export function ReadableRecord({value,field,ancestors=[]}:{value:unknown;field?:string|undefined;ancestors?:readonly object[]}) {
  if(value===null||typeof value!=="object")return <span className="prisma-record-value">{recordScalarLabel(value,field)}</span>;
  if(ancestors.includes(value))return <span>Referência circular no registro. Conteúdo indisponível para leitura.</span>;
  const next=[...ancestors,value];
  if(Array.isArray(value))return value.length?<ol className="prisma-record-list">{value.map((item,index)=><li key={index}><ReadableRecord value={item} field={field} ancestors={next}/></li>)}</ol>:<span>Nenhum item registrado</span>;
  const entries=Object.entries(value);
  const identifiers=entries.filter(([key])=>key==="id"||key.endsWith("Id")||key.endsWith("_id")||key==="content_hash");
  const content=entries.filter(([key])=>!identifiers.some(([id])=>id===key));
  function rows(items:typeof entries){return <dl className="prisma-readable-record">{items.map(([key,item])=><div className="prisma-record-field" key={key}>
    <dt>{recordFieldLabel(key)}</dt><dd>{item!==null&&typeof item==="object"&&Object.keys(item).length>0?<details className="prisma-record-nested"><summary>Consultar {recordFieldLabel(key).toLocaleLowerCase("pt-BR")} ({Array.isArray(item)?`${item.length} ${item.length===1?"item":"itens"}`:`${Object.keys(item).length} ${Object.keys(item).length===1?"campo":"campos"}`})</summary><ReadableRecord value={item} field={key} ancestors={next}/></details>:<ReadableRecord value={item} field={key} ancestors={next}/>}</dd>
  </div>)}</dl>;}
  return entries.length?<div className="prisma-record-container">{content.length?rows(content):null}{identifiers.length?<details className="prisma-record-nested prisma-record-identifiers"><summary>Identificadores e rastreabilidade ({identifiers.length})</summary>{rows(identifiers)}</details>:null}</div>:<span>Nenhum campo registrado</span>;
}
