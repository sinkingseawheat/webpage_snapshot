export function getResponseFormRequestURL(links:any[], requestURL:string){
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