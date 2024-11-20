import { type Request } from "playwright";
import { PageResultRecord } from "../../JSON";
import { ValidURL } from "@/utility/types/types";

async function getRedirectStatusFromRequest(
  targetRequest:Request,
  isNeedTransition:false,
  maxRedirectCount?:number,
): Promise<ValidURL>;

async function getRedirectStatusFromRequest(
  targetRequest:Request,
  isNeedTransition:true,
  maxRedirectCount?:number,
): Promise<PageResultRecord["redirectTransition"]>;

async function getRedirectStatusFromRequest(
  targetRequest:Request,
  isNeedTransition:boolean,
  maxRedirectCount?:number,
){
  const MAX_SERVER_REDIRECT_COUNT = maxRedirectCount ?? 10;
  if(isNeedTransition === false){
    let redirectCount = 0;
    let prevRequest = targetRequest.redirectedFrom();
    let url = targetRequest.url();
    while(prevRequest!==null && redirectCount <= MAX_SERVER_REDIRECT_COUNT){
      url = prevRequest.url();
      prevRequest = prevRequest?.redirectedFrom() || null;
      redirectCount++;
    }
    return url;
  }else{
    let redirectCount:number = 0;
    const redirectTransition:{
      url: string;
      status: number;
    }[] = [];
    let prevRequest = targetRequest.redirectedFrom();
    let url = targetRequest.url();
    while(prevRequest !== null && redirectCount <= MAX_SERVER_REDIRECT_COUNT){
      url = prevRequest.url();
      const status = (await prevRequest.response())?.status();
      if(status !== undefined){
        redirectTransition.push({
          url,
          status,
        });
      }
      prevRequest = prevRequest.redirectedFrom();
      redirectCount++;
    };
    return redirectTransition;
  }
}

export { getRedirectStatusFromRequest }