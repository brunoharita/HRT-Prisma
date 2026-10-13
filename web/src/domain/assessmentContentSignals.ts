/** Observes page commands, never clipboard contents or the general keyboard. */
export const CONTENT_SIGNAL_METHOD = "position-assessment-content-signals-1.0.0";
type Region = "stem" | "options" | "mixed";
type SelectionMetadata = {region:Region;characterCount:number;anchor:Node;focus:Node;anchorOffset:number;focusOffset:number};
function editableTarget(target:EventTarget|null){return target instanceof Element&&!!target.closest("input:not([type=radio]):not([type=checkbox]),textarea,[contenteditable=true]");}
export function selectedQuestionMetadata(root:HTMLElement):SelectionMetadata|null {
 if(editableTarget(root.ownerDocument.activeElement))return null;
 const s=root.ownerDocument.getSelection();
 if(!s||s.isCollapsed||!s.anchorNode||!s.focusNode||!root.contains(s.anchorNode)||!root.contains(s.focusNode))return null;
 const region=(node:Node)=>(node.nodeType===1?node as Element:node.parentElement)?.closest<HTMLElement>("[data-assessment-region]")?.dataset.assessmentRegion;
 const a=region(s.anchorNode),b=region(s.focusNode);
 if(!a||!b||!["stem","options"].includes(a)||!["stem","options"].includes(b))return null;
 const characterCount=Array.from(s.toString()).length;if(!characterCount||characterCount>100000)return null;
 return {region:a===b?a as Region:"mixed",characterCount,anchor:s.anchorNode,focus:s.focusNode,anchorOffset:s.anchorOffset,focusOffset:s.focusOffset};
}
export function captureShortcut(e:Pick<KeyboardEvent,"code"|"metaKey"|"shiftKey"|"ctrlKey">):string|null {
 if(e.code==="PrintScreen")return "PrintScreen";
 if(e.metaKey&&e.shiftKey&&["Digit3","Digit4","Digit5","KeyS"].includes(e.code))return (e.ctrlKey?"Ctrl+":"")+"Meta+Shift+"+e.code;
 return null;
}
export function observeQuestionContent(getRoot:()=>HTMLElement|null,emit:(kind:string,method:string,values:Record<string,unknown>)=>void):()=>void {
 let timer:ReturnType<typeof setTimeout>|undefined,last:SelectionMetadata|null=null,lastRoot:HTMLElement|null=null,lastQuestion:string|undefined;
 let command:{trigger:string;at:number;question:string|undefined}|null=null,printDown=false;const pressed=new Set<string>();
 const visible=()=>{const root=getRoot();return root&&!document.hidden?root:null;};
 const active=()=>document.hasFocus()?visible():null;
 const editable=editableTarget;
 const recordSelection=(root:HTMLElement,selected:SelectionMetadata)=>{
  const question=root.dataset.assessmentQuestion;
  if(lastRoot===root&&lastQuestion===question&&last&&["anchor","focus","anchorOffset","focusOffset","characterCount","region"].every(k=>last![k as keyof SelectionMetadata]===selected[k as keyof SelectionMetadata]))return;
  last=selected;lastRoot=root;lastQuestion=question;emit("text_selection_observed",CONTENT_SIGNAL_METHOD,{region:selected.region,characterCount:selected.characterCount,support:"observed_selection",limitation:"selection_does_not_confirm_copy"});
 };
 const selection=(e:Event)=>{if(!e.isTrusted)return;clearTimeout(timer);const root=active();if(!root)return;const question=root.dataset.assessmentQuestion;
  timer=setTimeout(()=>{if(active()!==root||root.dataset.assessmentQuestion!==question)return;const selected=selectedQuestionMetadata(root);if(!selected){last=null;return;}recordSelection(root,selected);},300);
 };
 const copy=(e:ClipboardEvent)=>{if(!e.isTrusted||editable(e.target))return;const root=visible(),selected=root?selectedQuestionMetadata(root):null;if(!selected||!root)return;clearTimeout(timer);recordSelection(root,selected);
  const trigger=command&&command.question===root?.dataset.assessmentQuestion&&Date.now()-command.at<3000?command.trigger:"not_identified";
  emit("copy_action_observed",CONTENT_SIGNAL_METHOD,{region:selected.region,characterCount:selected.characterCount,trigger,support:"received_copy_event",limitation:"clipboard_result_and_destination_not_observable"});command=null;
 };
 const context=(e:MouseEvent)=>{if(!e.isTrusted||editable(e.target))return;const root=visible(),target=e.target instanceof Element?e.target:null,part=target?.closest<HTMLElement>("[data-assessment-region]");if(!root||!part||!root.contains(part))return;
  const selected=selectedQuestionMetadata(root);if(selected){clearTimeout(timer);recordSelection(root,selected);}command={trigger:"context_menu_correlated",at:Date.now(),question:root.dataset.assessmentQuestion};
  emit("context_menu_observed",CONTENT_SIGNAL_METHOD,{region:part.dataset.assessmentRegion,characterCount:selected?.characterCount??0,support:"received_context_menu",limitation:"menu_does_not_confirm_copy"});
 };
 const keydown=(e:KeyboardEvent)=>{if(!e.isTrusted||!active())return;if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.code==="KeyC")command={trigger:"keyboard_correlated",at:Date.now(),question:active()?.dataset.assessmentQuestion};const shortcut=captureShortcut(e);if(shortcut&&!e.repeat&&!pressed.has(e.code)){pressed.add(e.code);if(e.code==="PrintScreen")printDown=true;emit("capture_shortcut_observed","position-assessment-browser-signals-1.0.0",{shortcut,support:"received_shortcut",limitation:"capture_success_and_other_methods_not_observable"});}};
 const keyup=(e:KeyboardEvent)=>{if(!e.isTrusted)return;if(e.code==="PrintScreen"&&!printDown&&active())emit("capture_shortcut_observed","position-assessment-browser-signals-1.0.0",{shortcut:"PrintScreen",support:"received_shortcut",limitation:"capture_success_and_other_methods_not_observable"});pressed.delete(e.code);if(e.code==="PrintScreen")printDown=false;};
 const blur=()=>{pressed.clear();if(command?.trigger!=="context_menu_correlated")command=null;clearTimeout(timer);};
 document.addEventListener("selectionchange",selection);document.addEventListener("copy",copy);document.addEventListener("contextmenu",context);window.addEventListener("keydown",keydown);window.addEventListener("keyup",keyup);window.addEventListener("blur",blur);
 return()=>{clearTimeout(timer);document.removeEventListener("selectionchange",selection);document.removeEventListener("copy",copy);document.removeEventListener("contextmenu",context);window.removeEventListener("keydown",keydown);window.removeEventListener("keyup",keyup);window.removeEventListener("blur",blur);};
}
