import { Page } from "playwright"

import { MainResultRecord } from "@/component/snapshot/JSON";
import { getResponseAndBodyFromRequest } from './getResponseAndBodyFromRequest';
import { FileArchive } from "../FileArchive";
import { getResponseByPageGoto } from "./getResponseByPageGoto";
import { ValueOfMap } from "@/utility/types/types";

export const requestNotRequestedButInPage = async (page:Page, requestURL:string, result:ValueOfMap<MainResultRecord['links']>, fileArchive:FileArchive)=>{
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
          responseURL: requestURL,
          status: 401,
          contentType: '',
          contentLength: null,
          shaHash: null,
        }
      }else{
        result.response = null;
      }
    }else{
      const {body, response} = await getResponseAndBodyFromRequest(pageResponse.request());
      result.response = response;
      if(body !== null){
        const archiveIndex = fileArchive.archive({
          requestURL,
          buffer: body,
          contentType: response?.contentType || '',
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