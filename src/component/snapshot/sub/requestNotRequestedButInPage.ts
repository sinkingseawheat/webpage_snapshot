import { Page } from "playwright"

import type { LinksItem } from "../Note";
import { getResponseAndBodyFromRequest } from './getResponseAndBodyFromRequest';
import { FileArchive } from "../FileArchive";
import { getResponseByPageGoto } from "./getResponseByPageGoto";

export const requestNotRequestedButInPage = async (page:Page, requestURL:string, result:LinksItem, fileArchive:FileArchive)=>{
  try{
    // page["route"]はリダイレクトによる再リクエストには反映されないらしいので、これで問題ないはず
    await page.route('**/*',(route, request)=>{
      if(request.url() !== requestURL){
        route.abort();
      }else{
        route.continue();
      }
    });

    const {response:pageResponse, errorMessage} = await getResponseByPageGoto(page, requestURL, {});
    if(pageResponse === null){
      if(errorMessage==='ERR_INVALID_AUTH_CREDENTIALS'){
        result.response = {
          responseURL: null,
          status: 401
        }
      }else{
        result.response = null;
      }
    }else{
      const {body, response} = await getResponseAndBodyFromRequest(pageResponse.request());
      result.response = response;
      if(body !== null){
        fileArchive.archive({
          requestURL,
          buffer: body,
          contentType: response?.contentType || '',
          result,
        });
      }
    }
  }catch(e){
    throw e;
  }finally{
    console.log(`抽出したURL:「${requestURL}」のリクエスト処理が終了しました`)
    await page.close();
  }
}