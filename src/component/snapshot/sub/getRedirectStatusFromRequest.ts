import { type Request } from "playwright";

async function getRedirectStatusFromRequest(
  targetRequest:Request,
  isNeedTransition:false,
  maxRedirectCount?:number,
): Promise<string>;

async function getRedirectStatusFromRequest(
  targetRequest:Request,
  isNeedTransition:true,
  maxRedirectCount?:number,
): Promise<{count:number|null,transition:{url: string;status: number;}[]}>;

async function getRedirectStatusFromRequest(
  targetRequest:Request,
  isNeedTransition:boolean,
  maxRedirectCount?:number,
){
  const MAX_REDIRECT_COUNT = maxRedirectCount ?? 10;
  if(isNeedTransition === false){
    isNeedTransition
    let redirectCount = 0;
    let prevRequest = targetRequest.redirectedFrom();
    let url = targetRequest.url();
    while(prevRequest!==null && redirectCount <= MAX_REDIRECT_COUNT){
      url = prevRequest.url();
      prevRequest = prevRequest?.redirectedFrom() || null;
      redirectCount++;
    }
    return url;
  }else{
    let redirectCount:number = 0;
    const redirectResult:{
      url: string;
      status: number;
    }[] = [];
    let prevRequest = targetRequest.redirectedFrom();
    while(prevRequest !== null && redirectCount <= MAX_REDIRECT_COUNT){
      const status = (await prevRequest.response())?.status();
      if(status !== undefined){
        redirectResult.push({
          url: prevRequest.url(),
          status: status,
        });
      }
      prevRequest = prevRequest.redirectedFrom();
      redirectCount++;
    };
    return {
      count: redirectCount <= MAX_REDIRECT_COUNT ? redirectCount : null,
      transition: redirectResult,
    };
  }
}

export { getRedirectStatusFromRequest }