import type { MainResultJSON } from "@/component/snapshot/JSON";
export function getResponseFormRequestURL(links:MainResultJSON["links"], requestURL:string){
  if(links === undefined){
    return null;
  }
  for(const linkItem of links){
    if(linkItem.requestURL === requestURL){
      return linkItem;
    }
  }
  return null;
}