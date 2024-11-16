import type { MainResultJSON } from "@/utility/types/json";
export function getResponseFormRequestURL(links:MainResultJSON["links"], requestURL:string){
  if(links === undefined){
    return null;
  }
  for(const linkItem of links){
    if(linkItem.requestURL === requestURL){
      return linkItem.response;
    }
  }
  return null;
}