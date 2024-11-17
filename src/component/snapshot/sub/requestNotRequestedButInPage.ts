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

    const pageResponse = await getResponseByPageGoto(page, requestURL, {});
    if(pageResponse === null){
      result.response = null;
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
    if(e instanceof Error){
      if(e.message.indexOf('ERR_INVALID_AUTH_CREDENTIALS') !== -1){
        // ERR_INVALID_AUTH_CREDENTIALSはbasic認証エラーとみなす
        result.response = {
            responseURL: null,
            status: 401,
            contentType: '',
            contentLength: -1,
            shaHash:null,
        }
      }else if(e.message.indexOf('[page has closed before requestfinished]') !== -1){
        console.log(`[page has closed before requestfinished] ${requestURL}`);
        result.response = null;
      }else if(e.message.indexOf('[too many redirects]') !== -1){
        console.log(`[too many redirects] ${requestURL}`);
        result.response = null;
      }else if(e.message.indexOf('Target page, context or browser has been closed') !== -1){
        // ブラウザを手動で閉じたとみなすため、強制終了。
        console.error(e);
        console.log('強制終了します')
        process.exit(-1);
      }else if(e.message.indexOf('net::ERR_FAILED') !== -1){
        console.log(`[net::ERR_FAILED] ${requestURL}`);
        result.response = null;
      }else{
        result.response = null;
        console.error((e as any).message);
      }
    }else{
      console.error(e);
      result.response = null;
    }
  }finally{
    console.log(`抽出したURL:「${requestURL}」のリクエスト処理が終了しました`)
    await page.close();
  }
}