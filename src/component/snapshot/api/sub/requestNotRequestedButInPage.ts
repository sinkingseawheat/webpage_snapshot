import { Page, BrowserContext } from "playwright"

import { MainResultRecord } from "@/component/snapshot/JSON";
import { getResponseAndBodyFromRequest } from './getResponseAndBodyFromRequest';
import { getResponseByPageGoto } from "./getResponseByPageGoto";
import {type ErrorMessage, type ValidURL, type ValueOfMap } from "@/utility/types/types";

export const requestNotRequestedButInPage = async (args:{
  browserContext:BrowserContext,
  requestURLFromPage:ValidURL,
}):Promise<{
  updatedLinksItem:Partial<ValueOfMap<MainResultRecord["links"]>>,
  buffer:Buffer|null,
}>=>{
  const rv:Awaited<ReturnType<typeof requestNotRequestedButInPage>> = {
    updatedLinksItem: {},
    buffer: null
  };
  const {browserContext, requestURLFromPage} = args;
  const page = await browserContext.newPage();
  try{
    // page["route"]はリダイレクトによる再リクエストには反映されないらしいので、これで問題ないはず
    await page.route('**/*',(route, request)=>{
      if(request.isNavigationRequest()){
        route.continue();
      }else{
        route.abort();
      }
    });

    const textNoNeedRequest:ErrorMessage = '[no need to request url]';
    const isNeedRequest = !/^javascript:/.test(requestURLFromPage) && !/^data:/.test(requestURLFromPage);
    const {response:pageResponse, errorMessage, redirectInBrowser} = isNeedRequest ?
      await getResponseByPageGoto(page, requestURLFromPage, {})
      : {response:null, errorMessage:textNoNeedRequest, redirectInBrowser:[]};
    if(pageResponse === null){
      if(errorMessage==='ERR_INVALID_AUTH_CREDENTIALS'){
        rv.updatedLinksItem.response = {
          responseURL: requestURLFromPage,
          status: 401,
          contentType: '',
          contentLength: null,
          shaHash: null,
        }
      }else{
        rv.updatedLinksItem.response = null;
      }
    }else{
      const {body, response} = await getResponseAndBodyFromRequest(pageResponse.request());
      rv.updatedLinksItem.response = response;
      if(body !== null){
        rv.buffer = body;
      }
    }
    rv.updatedLinksItem.errorMessage = errorMessage;
  }catch(e){
    throw e;
  }finally{
    console.log(`抽出したURL:「${requestURLFromPage}」のリクエスト処理が終了しました`)
    await page.close();
    return rv;
  }
}