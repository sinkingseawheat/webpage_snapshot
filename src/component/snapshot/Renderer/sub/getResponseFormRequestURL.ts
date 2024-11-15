import type { LinksItem } from "../../Note";
export function getResponseFormRequestURL(links:(LinksItem&{requestURL:string})[], requestURL:string){
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