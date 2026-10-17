import { useEffect } from "react";
import { useViewState } from "./PrismaNavigation";

export interface RecentWork { path:string; title:string; detail:string; }
/** Memory only, cleared with the existing session/user/role/company view scope. */
export function useRecentWork(entry?:RecentWork) {
  const [items,setItems]=useViewState<RecentWork[]>("recentWork",[],"/work-session");
  useEffect(()=>{
    if(!entry?.path||!entry.title)return;
    setItems(previous=>[entry,...previous.filter(item=>item.path!==entry.path)].slice(0,6));
  },[entry?.path,entry?.title,entry?.detail]);
  return items;
}
